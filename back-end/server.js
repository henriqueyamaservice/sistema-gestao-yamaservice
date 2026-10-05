import app from './src/app.js';
import omieProdutosService from './src/services/omieProdutosService.js';
import { sincronizarVendedoresParaBanco } from './src/services/omieVendedoresService.js';
import getDb from './src/config/database.js';

import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Novo cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  try {
    const db = await getDb();
    console.log(`💾 Banco de dados (${db.driver}) inicializado com sucesso.`);
  } catch (err) {
    console.error(`❌ Erro ao inicializar o banco de dados:`, err.message);
  }

  console.log(`📂 Arquitetura MVC/Modular aplicada com sucesso!`);
  console.log(`Rotas principais disponíveis:`);
  console.log(`- GET  http://localhost:${PORT}/api/produtos`);
  console.log(`- GET  http://localhost:${PORT}/api/fornecedores`);
  console.log(`- GET  http://localhost:${PORT}/api/requisicoes`);
  console.log(`- GET  http://localhost:${PORT}/api/os`);
  console.log(`- GET  http://localhost:${PORT}/api/pedidos`);
  console.log(`- POST http://localhost:${PORT}/api/remessa/enviar`);

  // Iniciar sincronização em background da Omie
  setTimeout(() => {
    omieProdutosService.sincronizarProdutosPrd(); // Chama 5 segundos após subir o servidor
    sincronizarVendedoresParaBanco();

    // Agendador manual: Roda às 07:00, 12:00, 17:00 e 00:00
    setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();

      if ((hours === 7 || hours === 12 || hours === 17 || hours === 0) && mins === 0) {
        if (!global.lastSyncTime || (now.getTime() - global.lastSyncTime) > 60000) {
          global.lastSyncTime = now.getTime();
          console.log(`[AGENDADOR] Iniciando sincronização automática programada para as ${hours}:00`);
          omieProdutosService.sincronizarProdutosPrd();
        }
      }
    }, 30000); // Checa a cada 30 segundos

    // Agendador Fiscal (SEFAZ e Omie NF-e): Roda a cada 40 minutos (2400000 ms)
    setInterval(async () => {
      console.log(`[AGENDADOR FISCAL] Disparando busca automatica de NF-e na SEFAZ e Omie...`);
      try {
        const resSefaz = await fetch(`http://127.0.0.1:${PORT}/api/recebimento-fiscal/sincronizar-sefaz`, { method: 'POST' });
        const dataSefaz = await resSefaz.json();
        console.log(`[AGENDADOR FISCAL] SEFAZ:`, dataSefaz.mensagem || dataSefaz.erro);

        const resOmie = await fetch(`http://127.0.0.1:${PORT}/api/recebimento-fiscal/sincronizar-omie`, { method: 'POST' });
        const dataOmie = await resOmie.json();
        console.log(`[AGENDADOR FISCAL] OMIE:`, dataOmie.mensagem || dataOmie.erro);
      } catch (err) {
        console.error(`[AGENDADOR FISCAL] Erro na execucao automatica:`, err.message);
      }
    }, 40 * 60 * 1000);

  }, 5000);
});
