import express from 'express';
import cors from 'cors';
import compression from 'compression';
import 'dotenv/config';
import dns from 'dns';
import fs from 'fs';

// Força o Node a priorizar IPv4 para evitar erro "fetch failed" em requisições de API na rede local/nativa
dns.setDefaultResultOrder('ipv4first');

// Importando Rotas
import sefazRoutes from './routes/sefazRoutes.js';
import produtosRoutes from './routes/produtosRoutes.js';
import cadastrosRoutes from './routes/cadastrosRoutes.js';
import osRoutes from './routes/osRoutes.js';
import pedidosRoutes from './routes/pedidosRoutes.js';
import estoqueRoutes from './routes/estoqueRoutes.js';
import cotacaoRoutes from './routes/cotacaoRoutes.js';
import requisicoesRoutes from './routes/requisicoesRoutes.js';
import veiculosRoutes from './routes/veiculosRoutes.js';
import combustivelRoutes from './routes/combustivelRoutes.js';
import geradoresRoutes from './routes/geradoresRoutes.js';
import remessaRoutes from './routes/remessaRoutes.js';
import checklistRoutes from './routes/checklistRoutes.js';
import calendarioRoutes from './routes/calendarioRoutes.js';
import saudeRoutes from './routes/saudeRoutes.js';
import authRoutes from './routes/authRoutes.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import servicosKitsRoutes from './routes/servicosKitsRoutes.js';
import iaOrcamentoRoutes from './routes/iaOrcamentoRoutes.js';
import recebimentoFiscalRoutes from './routes/recebimentoFiscalRoutes.js';
import cotacoesArquivadasRoutes from './routes/cotacoesArquivadasRoutes.js';

const app = express();

import path from 'path';

// Criar diretórios de armazenamento caso não existam
const dataDir = path.join(process.cwd(), 'data');
const almoxarifadoDir = path.join(dataDir, 'almoxarifado');
const omieCollectionDir = path.join(dataDir, 'omie_collection');
const uploadsDir = path.join(dataDir, 'uploads');
const dashboardOsDir = path.join(dataDir, 'dashboard-os');
const frotaCombustivelDir = path.join(dataDir, 'frota-combustivel');
const geradoresDir = path.join(dataDir, 'geradores');
const comprasDir = path.join(dataDir, 'compras');
const projetosDir = path.join(dataDir, 'projetos');
const calendarioDir = path.join(dataDir, 'calendario');
const checklistDir = path.join(dataDir, 'checklist');
const certificadosDir = path.join(dataDir, 'certificados');

[
  dataDir, almoxarifadoDir, omieCollectionDir, uploadsDir,
  dashboardOsDir, frotaCombustivelDir, geradoresDir,
  comprasDir, projetosDir, calendarioDir, checklistDir, certificadosDir
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middlewares
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Registro de Rotas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.use('/api', saudeRoutes);
app.use('/api/sefaz', sefazRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/os', osRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/requisicoes', requisicoesRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/combustivel', combustivelRoutes);
app.use('/api/geradores', geradoresRoutes);
app.use('/api/remessa', remessaRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/servicos-kits', servicosKitsRoutes);
app.use('/api/ia-orcamento', iaOrcamentoRoutes);
app.use('/api/recebimento-fiscal', recebimentoFiscalRoutes);
app.use('/api/cotacoes-arquivadas', cotacoesArquivadasRoutes);

// Rotas mistas (fornecedores, departamentos, cotacao, calendario)
app.use('/api', cadastrosRoutes);
app.use('/api', osRoutes);
app.use('/api', cotacaoRoutes);
app.use('/api', calendarioRoutes);

// Servir arquivos estáticos do Frontend compilado (Vite build / dist) se existir
const distPathRoot = path.join(process.cwd(), 'dist');
const distPathParent = path.join(process.cwd(), '..', 'dist');
const distPath = fs.existsSync(distPathRoot) ? distPathRoot : distPathParent;

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
