import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getJsonData, saveJsonData } from '../services/jsonDbService.js';
import getDb from '../config/database.js';
import sefazDfeService from '../services/sefazDfeService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Armazenamento em memória para notas sincronizadas nesta sessão
let notasSincronizadas = [];

/**
 * GET /api/sefaz/status-certificado
 * Retorna as informações do Certificado Digital configurado no sistema
 */
router.get('/status-certificado', async (req, res) => {
  try {
    const config = await sefazDfeService.obterConfigCertificado();
    const certPath = config?.arquivo_caminho;

    let certExiste = false;
    if (certPath) {
      const resolvedPath = path.isAbsolute(certPath) ? certPath : path.resolve(process.cwd(), certPath);
      certExiste = fs.existsSync(resolvedPath);
    }

    if (!certExiste || !config?.senha) {
      return res.json({
        configurado: false,
        mensagem: 'Nenhum Certificado Digital A1 ativo no momento.'
      });
    }

    res.json({
      configurado: true,
      tipo: config.tipo || (config.cpf ? 'e-PF' : 'e-CNPJ'),
      nomeTitular: config.nomeTitular || 'KAZUNORI YAMAGUCHI',
      documento: config.documento || config.cpf || config.cnpj || '04203372291',
      emissor: config.emissor || 'AC SOLUTI Multipla v5',
      uf: config.uf || 'PA',
      ambiente: config.ambiente === '2' ? 'Homologação' : 'Produção',
      dataInstalacao: config.dataInstalacao || new Date().toISOString()
    });
  } catch (err) {
    console.error('Erro ao verificar status do certificado:', err);
    res.status(500).json({ configurado: false, erro: err.message });
  }
});

/**
 * POST /api/sefaz/upload-certificado
 * Recebe o arquivo .pfx do computador do usuário, valida a senha e instala com segurança
 */
router.post('/upload-certificado', upload.single('certificado'), async (req, res) => {
  console.log('\n======================================================');
  console.log('[SEFAZ] Recebendo tentativa de instalacao de Certificado Digital...');

  try {
    if (!req.file) {
      console.error('[SEFAZ ERRO] Nenhum arquivo foi enviado na requisicao.');
      console.log('======================================================\n');
      return res.status(400).json({ erro: true, mensagem: 'Selecione o arquivo do Certificado Digital (.pfx ou .p12).' });
    }

    const { senha, uf = 'PA', ambiente = '1', cpfManual, cnpjManual } = req.body;
    console.log(`[SEFAZ] Arquivo: ${req.file.originalname} | Tamanho: ${(req.file.size / 1024).toFixed(1)} KB`);
    console.log(`[SEFAZ] UF: ${uf} | Ambiente: ${ambiente === '1' ? 'Producao (1)' : 'Homologacao (2)'}`);
    console.log(`[SEFAZ] Senha informada: ${senha ? `${senha.length} caracteres` : 'VAZIA'}`);

    if (!senha) {
      console.error('[SEFAZ ERRO] Senha nao foi informada no formulario.');
      console.log('======================================================\n');
      return res.status(400).json({ erro: true, mensagem: 'Informe a senha do Certificado Digital.' });
    }

    // 1. Valida criptograficamente o .pfx e a senha usando o serviço da SEFAZ
    console.log('[SEFAZ] Validando criptografia do arquivo .pfx com a senha no OpenSSL...');
    let infoCertificado;
    try {
      infoCertificado = sefazDfeService.validarEExtrairInfoCertificado(req.file.buffer, senha, req.file.originalname);
      console.log(`[SEFAZ SUCESSO] Certificado descriptografado com sucesso!`);
      console.log(`[SEFAZ DADOS] Titular: ${infoCertificado.nomeTitular}`);
      console.log(`[SEFAZ DADOS] Documento: ${infoCertificado.documento} (${infoCertificado.tipo})`);
      console.log(`[SEFAZ DADOS] Emissor: ${infoCertificado.emissor}`);
    } catch (errVal) {
      console.error(`[SEFAZ FALHA] Erro de validacao criptografica: ${errVal.message}`);
      console.log('======================================================\n');
      return res.status(400).json({ erro: true, mensagem: errVal.message || 'Senha do certificado incorreta ou arquivo inválido.' });
    }

    // 2. Garante a existência da pasta de certificados
    const pastaCertificados = path.resolve(process.cwd(), 'data', 'certificados');
    if (!fs.existsSync(pastaCertificados)) {
      fs.mkdirSync(pastaCertificados, { recursive: true });
    }

    // 3. Salva o arquivo em disco com nome padronizado
    const nomeArquivo = `certificado_sefaz_${Date.now()}.pfx`;
    const caminhoDestino = path.join(pastaCertificados, nomeArquivo);
    fs.writeFileSync(caminhoDestino, req.file.buffer);
    console.log(`[SEFAZ ARQUIVO] Arquivo .pfx gravado com seguranca em: ${caminhoDestino}`);

    // 4. Determina documento (CPF ou CNPJ)
    const docFinal = infoCertificado.documento || cpfManual || cnpjManual || '04203372291';
    const tipoFinal = docFinal.length === 11 ? 'e-PF' : 'e-CNPJ';
    const nomeFinal = infoCertificado.nomeTitular || 'KAZUNORI YAMAGUCHI';

    // 5. Salva configuração no banco de dados (json_collections)
    const dadosConfig = {
      arquivo_caminho: caminhoDestino,
      arquivo_nome_original: req.file.originalname,
      senha: senha,
      tipo: tipoFinal,
      nomeTitular: nomeFinal,
      documento: docFinal,
      cpf: tipoFinal === 'e-PF' ? docFinal : '',
      cnpj: tipoFinal === 'e-CNPJ' ? docFinal : '',
      emissor: infoCertificado.emissor || 'AC SOLUTI Multipla v5',
      uf: (uf || 'PA').toUpperCase(),
      ambiente: ambiente || '1',
      dataInstalacao: new Date().toISOString()
    };

    await saveJsonData('sefaz_certificado_config', dadosConfig);
    console.log('[SEFAZ BANCO] Configuracoes do certificado salvas no banco de dados.');

    // 6. Atualiza em tempo de execução o process.env
    process.env.SEFAZ_CERTIFICADO_PATH = caminhoDestino;
    process.env.SEFAZ_CERTIFICADO_SENHA = senha;
    if (tipoFinal === 'e-PF') {
      process.env.SEFAZ_CPF = docFinal;
    } else {
      process.env.SEFAZ_CNPJ = docFinal;
    }
    process.env.SEFAZ_UF = dadosConfig.uf;
    process.env.SEFAZ_AMBIENTE = dadosConfig.ambiente;

    console.log(`[SEFAZ PRONTO] Certificado A1 ativo e pronto para uso com a SEFAZ!`);
    console.log('======================================================\n');

    res.json({
      erro: false,
      mensagem: `Certificado Digital ${tipoFinal} instalado e validado com sucesso!`,
      info: {
        tipo: tipoFinal,
        nomeTitular: nomeFinal,
        documento: docFinal,
        emissor: dadosConfig.emissor,
        uf: dadosConfig.uf,
        ambiente: dadosConfig.ambiente === '2' ? 'Homologação' : 'Produção'
      }
    });

  } catch (err) {
    console.error('[SEFAZ EXCECAO] Erro inesperado ao processar upload:', err);
    console.log('======================================================\n');
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/sefaz/testar-conexao
 * Dispara uma consulta teste na SEFAZ Nacional para verificar se a conexão mTLS está respondendo
 */
router.post('/testar-conexao', async (req, res) => {
  try {
    const config = await sefazDfeService.obterConfigCertificado();
    const doc = config.documento || config.cpf || config.cnpj || '04203372291';
    const tipo = config.tipo === 'e-CNPJ' || doc.length === 14 ? 'CNPJ' : 'CPF';

    if (!config.arquivo_caminho || !config.senha) {
      return res.status(400).json({
        erro: true,
        mensagem: 'Certificado não configurado. Por favor, adicione o arquivo .pfx e a senha.'
      });
    }

    console.log(`[SEFAZ TESTE] Testando conexao mTLS com SEFAZ Nacional para ${tipo} ${doc}...`);
    const resultado = await sefazDfeService.consultarDistribuicaoDFe({
      docConsulta: doc,
      tipoDoc: tipo
    });

    res.json({
      erro: false,
      mensagem: `Conexão com a SEFAZ bem-sucedida! Retorno SEFAZ: ${resultado.cStat} - ${resultado.xMotivo}`,
      cStat: resultado.cStat,
      xMotivo: resultado.xMotivo,
      ultNSU: resultado.ultNSU,
      maxNSU: resultado.maxNSU,
      totalDocumentos: resultado.totalDocumentos
    });

  } catch (err) {
    console.error('Erro ao testar conexão SEFAZ:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * DELETE /api/sefaz/remover-certificado
 * Remove o certificado configurado
 */
router.delete('/remover-certificado', async (req, res) => {
  try {
    const config = await sefazDfeService.obterConfigCertificado();
    if (config?.arquivo_caminho && fs.existsSync(config.arquivo_caminho)) {
      try {
        fs.unlinkSync(config.arquivo_caminho);
      } catch(e) {}
    }

    await saveJsonData('sefaz_certificado_config', null);
    process.env.SEFAZ_CERTIFICADO_PATH = '';
    process.env.SEFAZ_CERTIFICADO_SENHA = '';

    res.json({ erro: false, mensagem: 'Certificado Digital removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * GET /api/sefaz/notas
 * Lista as notas já baixadas pelo sistema
 */
router.get('/notas', (req, res) => {
  res.json(notasSincronizadas);
});

export default router;
