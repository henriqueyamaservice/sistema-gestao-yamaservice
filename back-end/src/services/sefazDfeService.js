import fs from 'fs';
import path from 'path';
import https from 'https';
import zlib from 'zlib';
import tls from 'tls';
import getDb from '../config/database.js';
import { getJsonData, saveJsonData } from './jsonDbService.js';

const MAPA_UF_IBGE = {
  'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
  'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
  'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
  'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
  'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
  'SE': '28', 'TO': '17'
};

class SefazDfeService {
  /**
   * Obtém a URL oficial do Webservice da SEFAZ Nacional para DFe
   */
  getUrlWebservice(ambiente = '1') {
    return ambiente === '1'
      ? 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
      : 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
  }

  /**
   * Helper para extrair conteúdo de tags XML com tolerância a namespaces (ex: <nfe:cStat> ou <cStat>)
   */
  extrairTag(xml, tag) {
    if (!xml) return '';
    const match = xml.match(new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?${tag}>`, 'i'));
    return match ? match[1].trim() : '';
  }

  /**
   * Helper para extrair todas as ocorrências de uma tag XML repetida com tolerância a namespaces
   */
  extrairTagsMultiplas(xml, tag) {
    if (!xml) return [];
    const regex = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?${tag}>`, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  }

  /**
   * Obtém as configurações do certificado do banco de dados ou do .env
   */
  async obterConfigCertificado() {
    try {
      const configDb = await getJsonData('sefaz_certificado_config');
      if (configDb && configDb.arquivo_caminho && configDb.senha) {
        if (!configDb.documento && !configDb.cpf && !configDb.cnpj) {
          configDb.documento = process.env.SEFAZ_CPF || '04203372291';
          configDb.cpf = configDb.documento;
          configDb.tipo = 'e-PF';
          configDb.nomeTitular = (configDb.nomeTitular && configDb.nomeTitular !== 'Certificado Digital A1') ? configDb.nomeTitular : 'KAZUNORI YAMAGUCHI';
          configDb.emissor = configDb.emissor || 'AC SOLUTI Multipla v5';
          await saveJsonData('sefaz_certificado_config', configDb).catch(() => {});
        }
        return configDb;
      }
    } catch(e) {}

    return {
      arquivo_caminho: process.env.SEFAZ_CERTIFICADO_PATH,
      senha: process.env.SEFAZ_CERTIFICADO_SENHA,
      cnpj: process.env.SEFAZ_CNPJ || '',
      cpf: process.env.SEFAZ_CPF || '04203372291',
      documento: process.env.SEFAZ_CPF || '04203372291',
      tipo: 'e-PF',
      nomeTitular: 'KAZUNORI YAMAGUCHI',
      emissor: 'AC SOLUTI Multipla v5',
      uf: process.env.SEFAZ_UF || 'PA',
      ambiente: process.env.SEFAZ_AMBIENTE || '1'
    };
  }

  /**
   * Valida a senha do certificado .pfx e extrai dados do titular e documento (CPF/CNPJ)
   */
  validarEExtrairInfoCertificado(pfxBuffer, senha, nomeArquivoOriginal = '') {
    let senhaValida = senha;
    let validou = false;
    let ultimoErro = null;

    const tentativasSenha = [senha];
    if (typeof senha === 'string' && senha.trim() !== senha) {
      tentativasSenha.push(senha.trim());
    }

    console.log(`[SEFAZ CRIPTO] Iniciando teste de abertura PKCS#12 (tamanho: ${pfxBuffer.length} bytes)...`);

    for (let i = 0; i < tentativasSenha.length; i++) {
      const s = tentativasSenha[i];
      try {
        console.log(`[SEFAZ CRIPTO] Tentativa ${i + 1}/${tentativasSenha.length}: aplicando senha no OpenSSL...`);
        tls.createSecureContext({
          pfx: pfxBuffer,
          passphrase: s
        });
        senhaValida = s;
        validou = true;
        console.log(`[SEFAZ CRIPTO] Senha aceita com sucesso pelo OpenSSL!`);
        break;
      } catch (err) {
        ultimoErro = err;
        console.warn(`[SEFAZ CRIPTO AVISO] Tentativa ${i + 1} rejeitada:`, err.message);
      }
    }

    if (!validou) {
      console.error('[SEFAZ CRIPTO FALHA] Nenhuma das tentativas de senha foi aceita pelo OpenSSL.');
      console.error('[SEFAZ CRIPTO FALHA] Detalhes do erro retornado pelo OpenSSL:');
      console.error(`- Mensagem: ${ultimoErro?.message || ultimoErro}`);
      if (ultimoErro?.code) console.error(`- Code: ${ultimoErro.code}`);
      if (ultimoErro?.library) console.error(`- Library: ${ultimoErro.library}`);
      if (ultimoErro?.reason) console.error(`- Reason: ${ultimoErro.reason}`);

      const msgErro = (ultimoErro?.message || '').toLowerCase();
      if (msgErro.includes('mac verify failure')) {
        throw new Error('Senha do certificado incorreta. Por favor, verifique a senha digitada.');
      } else if (msgErro.includes('unsupported') || msgErro.includes('digital envelope routines') || ultimoErro?.code === 'ERR_CRYPTO_UNSUPPORTED_OPERATION') {
        throw new Error('O certificado utiliza algoritmo criptográfico legado da ICP-Brasil/Soluti (RC2-40/3DES). Por favor, inicie o servidor no terminal com: node --openssl-legacy-provider server.js (ou npm run dev na pasta back-end).');
      } else {
        throw new Error(`Erro ao validar arquivo .pfx: ${ultimoErro?.message || 'Falha na descriptografia'}`);
      }
    }

    // 2. Extração de Nome do Titular e CPF/CNPJ
    const bufferString = pfxBuffer.toString('latin1');
    const bufferSemNulos = bufferString.replace(/\0/g, '');
    let nomeTitular = '';
    let documento = '';
    let tipo = 'e-PF';

    const matchCpf = bufferSemNulos.match(/([A-Z0-9\s\.\-_]{3,80}):(\d{11})/i);
    const matchCnpj = bufferSemNulos.match(/([A-Z0-9\s\.\-_]{3,80}):(\d{14})/i);

    if (matchCnpj) {
      nomeTitular = matchCnpj[1].trim();
      documento = matchCnpj[2].trim();
      tipo = 'e-CNPJ';
    } else if (matchCpf) {
      nomeTitular = matchCpf[1].trim();
      documento = matchCpf[2].trim();
      tipo = 'e-PF';
    } else {
      const matchQualquerDoc = bufferSemNulos.match(/\b(\d{14}|\d{11})\b/);
      if (matchQualquerDoc) {
        documento = matchQualquerDoc[1];
        tipo = documento.length === 14 ? 'e-CNPJ' : 'e-PF';
      }
    }

    // Se o buffer não expôs o documento (por estar criptografado em SafeBags), extrai do nome do arquivo
    if (!documento && nomeArquivoOriginal) {
      const matchDocNome = nomeArquivoOriginal.match(/(\d{14}|\d{11})/);
      if (matchDocNome) {
        documento = matchDocNome[1];
        tipo = documento.length === 14 ? 'e-CNPJ' : 'e-PF';
      }
      const matchNomeLimpo = nomeArquivoOriginal.replace(/\.(pfx|p12)$/i, '').replace(/\d{11,14}/g, '').replace(/[_\-\.]+/g, ' ').trim();
      if (matchNomeLimpo) {
        nomeTitular = matchNomeLimpo;
      }
    }

    // Fallback de segurança com os dados do titular oficial
    if (!documento) {
      documento = process.env.SEFAZ_CPF || '04203372291';
      tipo = 'e-PF';
    }
    if (!nomeTitular || nomeTitular === 'Certificado Digital A1') {
      nomeTitular = 'KAZUNORI YAMAGUCHI';
    }

    return {
      valido: true,
      tipo,
      nomeTitular,
      documento,
      emissor: 'AC SOLUTI Multipla v5',
      dataInstalacao: new Date().toISOString()
    };
  }

  /**
   * Carrega o agente HTTPS com o Certificado Digital A1
   */
  async obterHttpsAgent() {
    const config = await this.obterConfigCertificado();
    const certPath = config.arquivo_caminho;
    const certSenha = config.senha;

    if (!certPath || !certSenha) {
      throw new Error('Certificado Digital A1 da SEFAZ não foi configurado. Abra as configurações para selecionar o arquivo .pfx e informar a senha.');
    }

    const resolvedPath = path.isAbsolute(certPath) ? certPath : path.resolve(process.cwd(), certPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Arquivo de Certificado Digital não encontrado no caminho: ${resolvedPath}`);
    }

    const pfxBuffer = fs.readFileSync(resolvedPath);

    return new https.Agent({
      pfx: pfxBuffer,
      passphrase: certSenha,
      rejectUnauthorized: false
    });
  }

  /**
   * Executa chamada SOAP 1.2 com mTLS nativo (https.request) para o Webservice da SEFAZ
   */
  enviarRequisicaoSoap(url, envelopeSoap) {
    return new Promise(async (resolve, reject) => {
      try {
        const agent = await this.obterHttpsAgent();
        const urlObj = new URL(url);

        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          agent: agent,
          headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse',
            'Content-Length': Buffer.byteLength(envelopeSoap, 'utf8')
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            console.log(`[SEFAZ HTTP] Status code: ${res.statusCode} ${res.statusMessage}`);
            resolve(data);
          });
        });

        req.on('error', (err) => {
          console.error('[SEFAZ HTTP ERRO]', err);
          reject(err);
        });

        req.write(envelopeSoap);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Constrói o Envelope SOAP 1.2 oficial para NfeDistribuicaoDFe
   */
  montarEnvelopeSoap({ ambiente, cUF, doc, tipoDoc, ultNSU, chaveAcesso }) {
    let corpoConsulta = '';
    if (chaveAcesso) {
      corpoConsulta = `<consChNFe><chNFe>${chaveAcesso}</chNFe></consChNFe>`;
    } else {
      const nsuFormatado = String(ultNSU || '0').padStart(15, '0');
      corpoConsulta = `<distNSU><ultNSU>${nsuFormatado}</ultNSU></distNSU>`;
    }

    const docTag = tipoDoc === 'CPF' ? `<CPF>${doc}</CPF>` : `<CNPJ>${doc}</CNPJ>`;

    return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${ambiente}</tpAmb>
          <cUFAutor>${cUF}</cUFAutor>
          ${docTag}
          ${corpoConsulta}
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
  }

  /**
   * Realiza a consulta de notas na SEFAZ Nacional para um CNPJ ou CPF
   */
  async consultarDistribuicaoDFe({ docConsulta, tipoDoc = null, chaveAcesso = null } = {}) {
    const config = await this.obterConfigCertificado();
    const ambiente = config.ambiente || process.env.SEFAZ_AMBIENTE || '1';
    const uf = (config.uf || process.env.SEFAZ_UF || 'PA').toUpperCase();
    const cUF = MAPA_UF_IBGE[uf] || '15';
    const docBruto = docConsulta || config.documento || config.cpf || config.cnpj || '04203372291';
    const docLimpo = String(docBruto).replace(/\D/g, '');
    const tipoReal = tipoDoc || (docLimpo.length === 11 ? 'CPF' : 'CNPJ');

    if (!docLimpo) {
      throw new Error('CNPJ ou CPF para consulta na SEFAZ não foi informado.');
    }

    const url = this.getUrlWebservice(ambiente);

    // Recupera o último NSU consultado para não baixar notas repetidas
    const controleNSUKey = `sefaz_nsu_${docLimpo}`;
    let controleNSU = await getJsonData(controleNSUKey) || { ultNSU: '0', maxNSU: '0' };
    const ultNSU = controleNSU.ultNSU || '0';

    const envelopeSoap = this.montarEnvelopeSoap({
      ambiente,
      cUF,
      doc: docLimpo,
      tipoDoc: tipoReal,
      ultNSU,
      chaveAcesso
    });

    console.log(`[SEFAZ DFe] Consultando notas para ${tipoReal} ${docLimpo} (Ambiente: ${ambiente}, NSU atual: ${ultNSU})...`);

    const xmlResposta = await this.enviarRequisicaoSoap(url, envelopeSoap);

    // Extração do Status de Retorno da SEFAZ (busca direto no XML completo)
    const cStat = this.extrairTag(xmlResposta, 'cStat');
    const xMotivo = this.extrairTag(xmlResposta, 'xMotivo');
    const novoUltNSU = this.extrairTag(xmlResposta, 'ultNSU') || ultNSU;
    const maxNSU = this.extrairTag(xmlResposta, 'maxNSU') || controleNSU.maxNSU || '0';

    console.log(`[SEFAZ DFe] Resposta: cStat=${cStat} - ${xMotivo} (Novo ultNSU: ${novoUltNSU}, maxNSU: ${maxNSU})`);

    if (!cStat) {
      console.warn('[SEFAZ DFe AVISO] Resposta bruta do webservice (primeiros 400 caracteres):', xmlResposta.slice(0, 400));
    }

    // Atualiza o NSU persistido
    if (novoUltNSU && novoUltNSU !== ultNSU) {
      await saveJsonData(controleNSUKey, { ultNSU: novoUltNSU, maxNSU, atualizado_em: new Date().toISOString() });
    }

    // Se cStat = 138 (Documentos localizados)
    const docsZipXml = this.extrairTagsMultiplas(xmlResposta, 'docZip');
    const notasDescompactadas = [];

    for (const docZipBase64 of docsZipXml) {
      try {
        const buffer = Buffer.from(docZipBase64, 'base64');
        const xmlDescompactado = zlib.gunzipSync(buffer).toString('utf8');

        // Identifica se é resumo (resNFe) ou nota completa (procNFe / NFe)
        const notaFormatada = this.parsearXmlNota(xmlDescompactado);
        if (notaFormatada) {
          notasDescompactadas.push(notaFormatada);
        }
      } catch (errDescompactar) {
        console.warn('[SEFAZ DFe] Falha ao descompactar pacote docZip:', errDescompactar.message);
      }
    }

    return {
      cStat,
      xMotivo,
      ultNSU: novoUltNSU,
      maxNSU,
      totalDocumentos: docsZipXml.length,
      notas: notasDescompactadas
    };
  }

  /**
   * Converte um XML (completo procNFe ou resumo resNFe) no objeto padrão do sistema
   */
  parsearXmlNota(xmlString) {
    if (!xmlString) return null;

    let chave = '';
    const matchId = xmlString.match(/Id="NFe(\d{44})"/i);
    if (matchId) {
      chave = matchId[1];
    } else {
      chave = this.extrairTag(xmlString, 'chNFe');
    }

    if (!chave) return null;

    const ideXml = this.extrairTag(xmlString, 'ide');
    const nNF = this.extrairTag(ideXml, 'nNF') || String(parseInt(chave.substring(25, 34), 10));
    const serie = this.extrairTag(ideXml, 'serie') || '1';
    const dhEmi = this.extrairTag(ideXml, 'dhEmi') || this.extrairTag(ideXml, 'dEmi') || new Date().toISOString();

    const emitXml = this.extrairTag(xmlString, 'emit');
    const cnpjEmit = this.extrairTag(emitXml, 'CNPJ') || this.extrairTag(emitXml, 'CPF') || chave.substring(6, 20);
    const xNomeEmit = this.extrairTag(emitXml, 'xNome') || this.extrairTag(xmlString, 'xNome');
    const ieEmit = this.extrairTag(emitXml, 'IE');

    const totalXml = this.extrairTag(xmlString, 'total');
    const icmsTotXml = this.extrairTag(totalXml, 'ICMSTot');
    const vNF = parseFloat(this.extrairTag(icmsTotXml, 'vNF') || this.extrairTag(xmlString, 'vNF') || '0');

    // Parse de Itens
    const detXmlArray = this.extrairTagsMultiplas(xmlString, 'det');
    const itens = [];

    detXmlArray.forEach((det, idx) => {
      const prodXml = this.extrairTag(det, 'prod');
      const cProd = this.extrairTag(prodXml, 'cProd') || `ITEM-${idx + 1}`;
      const xProd = this.extrairTag(prodXml, 'xProd') || 'Produto sem descrição';
      const ncm = this.extrairTag(prodXml, 'NCM');
      const cfop = this.extrairTag(prodXml, 'CFOP');
      const uCom = this.extrairTag(prodXml, 'uCom') || 'UN';
      const qCom = parseFloat(this.extrairTag(prodXml, 'qCom') || '1');
      const vUnCom = parseFloat(this.extrairTag(prodXml, 'vUnCom') || '0');
      const vProdItem = parseFloat(this.extrairTag(prodXml, 'vProd') || '0');
      const cEAN = this.extrairTag(prodXml, 'cEAN');

      // Lote e Validade (<rastro>)
      const rastroXml = this.extrairTag(prodXml, 'rastro');
      const nLote = this.extrairTag(rastroXml, 'nLote');
      const dVal = this.extrairTag(rastroXml, 'dVal');

      itens.push({
        numeroItem: idx + 1,
        codigo: cProd,
        descricao: xProd,
        ncm,
        cfop,
        unidade: uCom,
        quantidade: qCom,
        valorUnitario: vUnCom,
        valorTotal: vProdItem,
        ean: cEAN && cEAN !== 'SEM GTIN' ? cEAN : '',
        lote: nLote,
        validade: dVal
      });
    });

    // Parse de Duplicatas / Parcelas
    const dupXmlArray = this.extrairTagsMultiplas(xmlString, 'dup');
    const parcelas = [];

    dupXmlArray.forEach((dup, idx) => {
      const nDup = this.extrairTag(dup, 'nDup') || `${nNF}/${idx + 1}`;
      const dVenc = this.extrairTag(dup, 'dVenc');
      const vDup = parseFloat(this.extrairTag(dup, 'vDup') || '0');

      parcelas.push({
        nParcela: idx + 1,
        nNumTitulo: nDup,
        dDtVenc: dVenc,
        nValor: vDup
      });
    });

    return {
      chaveAcesso: chave,
      numeroNF: nNF,
      serie: serie,
      dataEmissao: dhEmi,
      valorTotal: vNF,
      emitente: {
        cnpj_cpf: cnpjEmit,
        nome: xNomeEmit,
        ie: ieEmit
      },
      itens: itens.length > 0 ? itens : [
        {
          numeroItem: 1,
          codigo: 'PRD001',
          descricao: 'Mercadoria da Nota Fiscal (Resumo)',
          unidade: 'UN',
          quantidade: 1,
          valorUnitario: vNF,
          valorTotal: vNF
        }
      ],
      parcelas: parcelas.length > 0 ? parcelas : [
        {
          nParcela: 1,
          nNumTitulo: `${nNF}/1`,
          dDtVenc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          nValor: vNF
        }
      ],
      origem: 'SEFAZ'
    };
  }
}

export default new SefazDfeService();
