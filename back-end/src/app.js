import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import dns from 'dns';

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

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Registro de Rotas
app.use('/api/sefaz', sefazRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/os', osRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/requisicoes', requisicoesRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/combustivel', combustivelRoutes);
app.use('/api/geradores', geradoresRoutes);

// Rotas mistas que estavam na raiz do server.js antigo (ex: fornecedores, departamentos)
app.use('/api', cadastrosRoutes); // Cobre /api/fornecedores, /api/departamentos, etc
app.use('/api', osRoutes); // Cobre /api/servicos-padrao (também estavam misturados)
app.use('/api', cotacaoRoutes); // Cobre /api/cotacao-link e /api/cotacao-externa

export default app;
