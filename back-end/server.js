import app from './src/app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📂 Arquitetura MVC/Modular aplicada com sucesso!`);
  console.log(`Rotas principais disponíveis:`);
  console.log(`- GET  http://localhost:${PORT}/api/produtos`);
  console.log(`- GET  http://localhost:${PORT}/api/fornecedores`);
  console.log(`- GET  http://localhost:${PORT}/api/requisicoes`);
  console.log(`- GET  http://localhost:${PORT}/api/os`);
  console.log(`- GET  http://localhost:${PORT}/api/pedidos`);
});
