/**
 * Serviço de Consulta Online de NF-e e DANFE via consultadanfe.com
 * Permite buscar o XML autorizado e o PDF do DANFE em base64 apenas com a chave de 44 dígitos.
 */

/**
 * Função utilitária para extração rápida de tags XML
 */
export const extrairTag = (xml, tag) => {
  if (!xml) return '';
  const match = xml.match(new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tag}>`, 'i'));
  return match ? match[1].trim() : '';
};

/**
 * Realiza o parsing completo de um XML de NF-e (modelo 55)
 * @param {string} xmlString Conteúdo bruto do XML
 * @returns {object} Dados estruturados da nota fiscal
 */
export const parsearXmlNFe = (xmlString) => {
  if (!xmlString) {
    throw new Error('Conteúdo do XML não informado.');
  }

  // Chave de acesso
  let chave = '';
  const matchId = xmlString.match(/Id="NFe(\d{44})"/i);
  if (matchId) {
    chave = matchId[1];
  } else {
    chave = extrairTag(xmlString, 'chNFe');
  }

  // Cabeçalho ide
  const ideXml = extrairTag(xmlString, 'ide');
  const nNF = extrairTag(ideXml, 'nNF');
  const serie = extrairTag(ideXml, 'serie') || '1';
  const modelo = extrairTag(ideXml, 'mod') || '55';
  const dhEmi = extrairTag(ideXml, 'dhEmi') || extrairTag(ideXml, 'dEmi');

  // Emitente
  const emitXml = extrairTag(xmlString, 'emit');
  const cnpjEmit = extrairTag(emitXml, 'CNPJ') || extrairTag(emitXml, 'CPF');
  const xNomeEmit = extrairTag(emitXml, 'xNome');
  const ieEmit = extrairTag(emitXml, 'IE');
  const enderEmit = extrairTag(emitXml, 'enderEmit');
  const ufEmit = extrairTag(enderEmit, 'UF') || 'PA';

  // Totais (<total> -> <ICMSTot>)
  const totalXml = extrairTag(xmlString, 'total');
  const icmsTotXml = extrairTag(totalXml, 'ICMSTot');
  const vBC = parseFloat(extrairTag(icmsTotXml, 'vBC') || '0');
  const vICMS = parseFloat(extrairTag(icmsTotXml, 'vICMS') || '0');
  const vICMSDeson = parseFloat(extrairTag(icmsTotXml, 'vICMSDeson') || '0');
  const vBCST = parseFloat(extrairTag(icmsTotXml, 'vBCST') || '0');
  const vST = parseFloat(extrairTag(icmsTotXml, 'vST') || '0');
  const vProd = parseFloat(extrairTag(icmsTotXml, 'vProd') || '0');
  const vFrete = parseFloat(extrairTag(icmsTotXml, 'vFrete') || '0');
  const vSeg = parseFloat(extrairTag(icmsTotXml, 'vSeg') || '0');
  const vDesc = parseFloat(extrairTag(icmsTotXml, 'vDesc') || '0');
  const vIPI = parseFloat(extrairTag(icmsTotXml, 'vIPI') || '0');
  const vPIS = parseFloat(extrairTag(icmsTotXml, 'vPIS') || '0');
  const vCOFINS = parseFloat(extrairTag(icmsTotXml, 'vCOFINS') || '0');
  const vOutro = parseFloat(extrairTag(icmsTotXml, 'vOutro') || '0');
  const vTotTrib = parseFloat(extrairTag(icmsTotXml, 'vTotTrib') || '0');
  const vNF = parseFloat(extrairTag(icmsTotXml, 'vNF') || '0');

  // Transporte (<transp>)
  const transpXml = extrairTag(xmlString, 'transp');
  const modFreteCodigo = extrairTag(transpXml, 'modFrete') || '9';
  const mapaModFrete = {
    '0': '0 - Contratação do Frete por conta do Remetente (CIF)',
    '1': '1 - Contratação do Frete por conta do Destinatário (FOB)',
    '2': '2 - Contratação do Frete por conta de Terceiros',
    '3': '3 - Transporte Próprio por conta do Remetente',
    '4': '4 - Transporte Próprio por conta do Destinatário',
    '9': '9 - Sem Ocorrência de Transporte'
  };
  const modFreteDescricao = mapaModFrete[modFreteCodigo] || '9 - Sem Ocorrência de Transporte';

  const transportaXml = extrairTag(transpXml, 'transporta');
  const transportador = {
    xNome: extrairTag(transportaXml, 'xNome'),
    cnpj_cpf: extrairTag(transportaXml, 'CNPJ') || extrairTag(transportaXml, 'CPF'),
    ie: extrairTag(transportaXml, 'IE'),
    uf: extrairTag(transportaXml, 'UF')
  };

  const veicTranspXml = extrairTag(transpXml, 'veicTransp');
  const veiculo = {
    placa: extrairTag(veicTranspXml, 'placa'),
    uf: extrairTag(veicTranspXml, 'UF'),
    rntrc: extrairTag(veicTranspXml, 'RNTRC')
  };

  const volXml = extrairTag(transpXml, 'vol');
  const volumes = {
    qVol: parseFloat(extrairTag(volXml, 'qVol') || '0'),
    esp: extrairTag(volXml, 'esp') || 'VOLUMES',
    marca: extrairTag(volXml, 'marca') || '',
    nVol: extrairTag(volXml, 'nVol') || '',
    pesoL: parseFloat(extrairTag(volXml, 'pesoL') || '0'),
    pesoB: parseFloat(extrairTag(volXml, 'pesoB') || '0'),
    nLacre: extrairTag(volXml, 'nLacre') || ''
  };

  // Observações / Informações Adicionais (<infAdic>)
  const infAdicXml = extrairTag(xmlString, 'infAdic');
  const infCpl = extrairTag(infAdicXml, 'infCpl');
  const infAdFisco = extrairTag(infAdicXml, 'infAdFisco');

  // Itens da Nota (<det>)
  const itens = [];
  const detMatches = xmlString.match(/<(?:[a-zA-Z0-9_-]+:)?det[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?det>/gi) || [];

  detMatches.forEach((detStr, idx) => {
    const prodXml = extrairTag(detStr, 'prod');
    const cProd = extrairTag(prodXml, 'cProd');
    const cEAN = extrairTag(prodXml, 'cEAN') || 'SEM GTIN';
    const xProd = extrairTag(prodXml, 'xProd');
    const ncm = extrairTag(prodXml, 'NCM');
    const cfop = extrairTag(prodXml, 'CFOP');
    const uCom = extrairTag(prodXml, 'uCom') || 'UN';
    const qCom = parseFloat(extrairTag(prodXml, 'qCom') || '1');
    const vUnCom = parseFloat(extrairTag(prodXml, 'vUnCom') || '0');
    const vProdItem = parseFloat(extrairTag(prodXml, 'vProd') || '0');
    const vDescItem = parseFloat(extrairTag(prodXml, 'vDesc') || '0');

    // Impostos do Item (<imposto>)
    const impostoXml = extrairTag(detStr, 'imposto');
    
    // ICMS
    const icmsXml = extrairTag(impostoXml, 'ICMS');
    let cstIcms = '';
    let origIcms = '0';
    let modBcIcms = '3';
    let pRedBcIcms = 0;
    let vBcIcms = 0;
    let pIcms = 0;
    let vIcmsItem = 0;

    // ST
    let vBcIcmsSt = 0;
    let pIcmsSt = 0;
    let vIcmsSt = 0;

    const subIcmsMatch = icmsXml.match(/<(?:[a-zA-Z0-9_-]+:)?ICMS[0-9A-Za-z]+>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?ICMS[0-9A-Za-z]+>/i);
    if (subIcmsMatch) {
      const corpoIcms = subIcmsMatch[1];
      cstIcms = extrairTag(corpoIcms, 'CST') || extrairTag(corpoIcms, 'CSOSN');
      origIcms = extrairTag(corpoIcms, 'orig') || '0';
      modBcIcms = extrairTag(corpoIcms, 'modBC') || '3';
      pRedBcIcms = parseFloat(extrairTag(corpoIcms, 'pRedBC') || '0');
      vBcIcms = parseFloat(extrairTag(corpoIcms, 'vBC') || '0');
      pIcms = parseFloat(extrairTag(corpoIcms, 'pICMS') || '0');
      vIcmsItem = parseFloat(extrairTag(corpoIcms, 'vICMS') || '0');

      vBcIcmsSt = parseFloat(extrairTag(corpoIcms, 'vBCST') || '0');
      pIcmsSt = parseFloat(extrairTag(corpoIcms, 'pICMSST') || '0');
      vIcmsSt = parseFloat(extrairTag(corpoIcms, 'vICMSST') || '0');
    }

    // IPI
    const ipiXml = extrairTag(impostoXml, 'IPI');
    const vIpiItem = parseFloat(extrairTag(ipiXml, 'vIPI') || '0');
    const pIpiItem = parseFloat(extrairTag(ipiXml, 'pIPI') || '0');

    // PIS
    const pisXml = extrairTag(impostoXml, 'PIS');
    const vPisItem = parseFloat(extrairTag(pisXml, 'vPIS') || '0');
    const pPisItem = parseFloat(extrairTag(pisXml, 'pPIS') || '0');

    // COFINS
    const cofinsXml = extrairTag(impostoXml, 'COFINS');
    const vCofinsItem = parseFloat(extrairTag(cofinsXml, 'vCOFINS') || '0');
    const pCofinsItem = parseFloat(extrairTag(cofinsXml, 'pCOFINS') || '0');

    itens.push({
      itemNumero: idx + 1,
      codigo: cProd,
      descricao: xProd,
      ncm,
      cfop,
      ean: cEAN,
      unidade: uCom,
      unidadeEstoque: uCom,
      quantidade: qCom,
      quantidadeRecebida: qCom,
      valorUnitario: vUnCom,
      desconto: vDescItem,
      valorTotal: vProdItem,
      tributos: {
        icms: {
          cst: cstIcms,
          origem: origIcms,
          modalidadeBc: modBcIcms,
          reducaoBcPerc: pRedBcIcms,
          baseCalculo: vBcIcms,
          aliquotaPerc: pIcms,
          valor: vIcmsItem
        },
        st: {
          baseCalculo: vBcIcmsSt,
          aliquotaPerc: pIcmsSt,
          valor: vIcmsSt
        },
        ipi: {
          aliquotaPerc: pIpiItem,
          valor: vIpiItem
        },
        pis: {
          aliquotaPerc: pPisItem,
          valor: vPisItem
        },
        cofins: {
          aliquotaPerc: pCofinsItem,
          valor: vCofinsItem
        }
      }
    });
  });

  // Parcelas / Cobrança (<dup>)
  const parcelas = [];
  const dupMatches = xmlString.match(/<(?:[a-zA-Z0-9_-]+:)?dup[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?dup>/gi) || [];

  if (dupMatches.length > 0) {
    dupMatches.forEach((dupStr, idx) => {
      const nDup = extrairTag(dupStr, 'nDup') || String(idx + 1).padStart(3, '0') + '/' + String(dupMatches.length).padStart(3, '0');
      const dVenc = extrairTag(dupStr, 'dVenc');
      const vDup = parseFloat(extrairTag(dupStr, 'vDup') || '0');

      let dDtVencFormatada = dVenc;
      if (dVenc && dVenc.includes('-')) {
        const [ano, mes, dia] = dVenc.split('-');
        dDtVencFormatada = `${dia}/${mes}/${ano}`;
      }

      parcelas.push({
        nParcela: idx + 1,
        nNumTitulo: nDup,
        dDtVenc: dDtVencFormatada,
        nValor: vDup,
        percentual: vNF > 0 ? Number(((vDup / vNF) * 100).toFixed(1)) : 100
      });
    });
  } else {
    // Cria uma parcela única padrão de 30 dias se não houver dups no XML
    parcelas.push({
      nParcela: 1,
      nNumTitulo: `${nNF}/001`,
      dDtVenc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      nValor: vNF,
      percentual: 100
    });
  }

  return {
    chaveAcesso: chave,
    numeroNF: nNF,
    serie,
    modelo,
    dataEmissao: dhEmi || new Date().toISOString(),
    valorTotal: vNF,
    emitente: {
      nome: xNomeEmit,
      cnpj_cpf: cnpjEmit,
      inscrEstadual: ieEmit,
      uf: ufEmit
    },
    transporte: {
      tipoFrete: modFreteDescricao,
      previsaoEntrega: '',
      transportador,
      veiculo,
      volumes
    },
    totaisTributos: {
      vBC,
      vICMS,
      vICMSDeson,
      vBCST,
      vST,
      vProd,
      vFrete,
      vSeg,
      vDesc,
      vIPI,
      vPIS,
      vCOFINS,
      vOutro,
      vTotTrib,
      vNF,
      vIS: 0,
      vIBS: 0,
      vCBS: 0
    },
    departamentosRateio: [
      {
        codigo: 'ALMOXARIFADO',
        descricao: 'ALMOXARIFADO',
        valor: vNF,
        percentual: 100
      }
    ],
    informacoesAdicionais: {
      categoriaCompra: 'Compra de Material para Uso e Consumo',
      contaCorrente: '01 - Banco Principal',
      dataRegistro: new Date().toLocaleDateString('pt-BR'),
      comprador: 'Setor de Compras',
      projeto: 'ALMOXARIFADO',
      infCpl: infCpl,
      infAdFisco: infAdFisco
    },
    observacoes: infCpl || '',
    itens,
    parcelas
  };
};

/**
 * Dicionário amigável de mensagens para os códigos contratuais estáveis da API (X-Error-Code)
 */
const MENSAGENS_ERRO_CONTRATUAIS = {
  'data_fora_da_janela': 'Esta NF-e foi emitida fora do mês corrente. Para notas de meses anteriores, anexe o arquivo XML para importar todos os itens e tributos.',
  'nao_encontrada': 'A SEFAZ ainda não retornou os dados para esta chave. Confirme se a nota foi autorizada e tente novamente.',
  'pendente': 'Esta NF-e foi emitida em contingência e ainda está pendente de autorização final na SEFAZ.',
  'chave_invalida': 'A chave de acesso digitada é inválida ou possui caracteres incorretos.',
  'dv_invalido': 'O dígito verificador da chave de acesso está incorreto. Confira a digitação.',
  'tipo_nao_suportado': 'Apenas NF-e (modelo 55) pode ser consultada diretamente pela chave. Para outros modelos, envie o arquivo XML.',
  'servico_indisponivel': 'Os servidores da SEFAZ estão momentaneamente indisponíveis ou em manutenção. Tente novamente em instantes.',
  'rate_limit_exceeded': 'Limite de consultas DANFE por minuto atingido.'
};

/**
 * Consulta a NF-e e gera o DANFE na API consultadanfe.com
 * @param {string} chave Chave de acesso de 44 dígitos
 * @returns {Promise<{ sucesso: boolean, nota?: object, xmlString?: string, pdf_base64?: string, aviso?: string, erro?: string, codigoErro?: string, retryAfter?: number }>}
 */
export const consultarNfeDanfeOnline = async (chave) => {
  const chaveLimpa = String(chave || '').replace(/\D/g, '');
  if (chaveLimpa.length !== 44) {
    return {
      sucesso: false,
      erro: 'chave_invalida',
      mensagem: `A chave deve conter exatamente 44 dígitos. Foram recebidos ${chaveLimpa.length}.`
    };
  }

  const apiKey = process.env.CONSULTA_DANFE_API_KEY || process.env.DANFE_API_KEY || '';
  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000); // 18s timeout

    const response = await fetch('https://consultadanfe.com/api/v1/consulta', {
      method: 'POST',
      headers,
      body: JSON.stringify({ chave: chaveLimpa, format: 'json' }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    // Captura headers de contrato estável
    const xErrorCode = response.headers.get('x-error-code');
    const retryAfter = response.headers.get('retry-after');
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');

    const json = await response.json().catch(() => null);

    if (!response.ok || !json || json.error || (json.status !== 'ok' && json.status !== 'multiplas_chaves')) {
      const codigoErro = xErrorCode || json?.error || (response.status === 429 ? 'rate_limit_exceeded' : (response.status === 202 ? 'pendente' : 'falha_consulta'));
      let mensagemAmigavel = MENSAGENS_ERRO_CONTRATUAIS[codigoErro] || json?.message || json?.mensagem || `Consulta retornou status HTTP ${response.status}`;

      if (codigoErro === 'rate_limit_exceeded' && retryAfter) {
        mensagemAmigavel = `Limite de consultas atingido. Aguarde ${retryAfter} segundos para consultar novamente ou anexe o XML.`;
      }

      console.warn(`[ConsultaDanfe] ${codigoErro} (HTTP ${response.status}) | Restantes: ${rateLimitRemaining || 'N/A'}`);

      return {
        sucesso: false,
        erro: codigoErro,
        mensagem: mensagemAmigavel,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : null
      };
    }

    // Suporte tanto a xml_base64 quanto a xml em texto puro (caso de recovery)
    let xmlString = '';
    if (json.xml) {
      xmlString = json.xml;
    } else if (json.xml_base64) {
      xmlString = Buffer.from(json.xml_base64, 'base64').toString('utf-8');
    } else {
      return {
        sucesso: false,
        erro: 'xml_ausente',
        mensagem: 'A API não retornou o XML da NF-e solicitada.'
      };
    }

    const notaFormatada = parsearXmlNFe(xmlString);

    // Anexa o PDF base64 e metadados de auditoria e recuperação
    notaFormatada.pdf_base64 = json.pdf_base64 || null;
    notaFormatada.origemConsulta = 'consultadanfe_online';
    notaFormatada.recovery = Boolean(json.recovery);
    notaFormatada.infoConsulta = json.info || null;
    notaFormatada.avisoConsulta = json.aviso || null;

    return {
      sucesso: true,
      nota: notaFormatada,
      xmlString,
      pdf_base64: json.pdf_base64 || null,
      chave: json.chave || chaveLimpa,
      tipo: json.tipo || 'nfe',
      recovery: Boolean(json.recovery),
      info: json.info || null,
      aviso: json.aviso || null
    };
  } catch (err) {
    console.error(`[ConsultaDanfe] Erro de conexão com https://consultadanfe.com:`, err.message);
    return {
      sucesso: false,
      erro: err.name === 'AbortError' ? 'timeout' : 'erro_conexao',
      mensagem: err.name === 'AbortError' 
        ? 'Tempo limite de espera excedido ao consultar a SEFAZ.'
        : `Erro de conexão com o serviço DANFE: ${err.message}`
    };
  }
};

/**
 * Gera DANFE em PDF a partir de um arquivo/string XML usando a rota /api/v1/danfe
 * (Aceita XMLs de qualquer data sem limite de mês, até 5MB, com 500 req/min)
 * @param {string} xmlString Conteúdo bruto do XML
 * @returns {Promise<{ sucesso: boolean, pdf_base64?: string, erro?: string, mensagem?: string }>}
 */
export const gerarDanfeDeXmlOnline = async (xmlString) => {
  if (!xmlString) {
    return { sucesso: false, erro: 'xml_obrigatorio', mensagem: 'XML não informado.' };
  }

  const apiKey = process.env.CONSULTA_DANFE_API_KEY || process.env.DANFE_API_KEY || '';
  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }

  try {
    const response = await fetch('https://consultadanfe.com/api/v1/danfe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ xml: xmlString, format: 'json' })
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json || !json.pdf_base64) {
      const xErrorCode = response.headers.get('x-error-code');
      return {
        sucesso: false,
        erro: xErrorCode || json?.error || 'falha_danfe',
        mensagem: json?.message || 'Falha ao gerar DANFE a partir do XML.'
      };
    }

    return {
      sucesso: true,
      pdf_base64: json.pdf_base64,
      chave: json.chave,
      tipo: json.tipo || 'nfe'
    };
  } catch (err) {
    console.error('[ConsultaDanfe] Erro ao gerar DANFE de XML:', err.message);
    return {
      sucesso: false,
      erro: 'erro_conexao',
      mensagem: err.message
    };
  }
};
