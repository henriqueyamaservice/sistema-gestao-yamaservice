import app from './src/app.js';
import omieProdutosService from './src/services/omieProdutosService.js';
import omieEstoqueService from './src/services/omieEstoqueService.js';
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

    // Helper para obter data/hora garantida no Fuso do Brasil (UTC-3), mesmo em VPS Docker em UTC
    function getAgoraBrasil() {
      try {
        const dataString = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        return new Date(dataString);
      } catch {
        return new Date();
      }
    }

    // Agendador Inteligente com Fuso de Brasília (Blindado contra atrasos de timer)
    setInterval(() => {
      const brasil = getAgoraBrasil();
      const hours = brasil.getHours();
      const dataChaveHoje = `${brasil.getFullYear()}-${String(brasil.getMonth() + 1).padStart(2, '0')}-${String(brasil.getDate()).padStart(2, '0')}`;
      const horaChave = `${dataChaveHoje}_H${hours}`;

      // 1. Sincronização de Cadastros PRD (07:00, 12:00, 17:00, 00:00 no Brasil)
      if (hours === 7 || hours === 12 || hours === 17 || hours === 0) {
        if (global.lastSyncPrdHour !== horaChave) {
          global.lastSyncPrdHour = horaChave;
          console.log(`[AGENDADOR CADASTROS ${String(hours).padStart(2, '0')}:00 BRT] 📦 Sincronizando produtos PRD da Omie...`);
          omieProdutosService.sincronizarProdutosPrd();
        }
      }

      // 2. Sincronização Noturna de Estoque Omie (das 19:00 às 06:00 BRT, a cada 1 hora)
      const isPeriodoNoturno = (hours >= 19 || hours <= 6);
      if (isPeriodoNoturno) {
        if (global.lastSyncEstoqueHour !== horaChave) {
          global.lastSyncEstoqueHour = horaChave;
          console.log(`[AGENDADOR NOTURNO ${String(hours).padStart(2, '0')}:00 BRT] 🌙 Disparando varredura geral de estoque com a Omie...`);
          omieEstoqueService.sincronizarPosicaoEstoqueGeral('AUTOMATICO_NOTURNO', `Agendador Noturno (${String(hours).padStart(2, '0')}:00)`);
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
