# Back-end Rules & Security Architecture Guidelines (back-end/AGENTS.md)

Este documento define as regras de negócio, rotas e travas de segurança do servidor Back-end do Sistema de Almoxarifado & Gestão de Ordens de Serviço.

---

## 1. Regra de Ouro: Unificação de Requisições por O.S. & Saídas Diretas de Balcão (`POST /api/requisicoes`)

- **Trava Anti-Duplicação por O.S.**: Para requisições abertas/remotas, é **estritamente proibido** gerar múltiplos cards pendentes no Almoxarifado para a mesma Ordem de Serviço.
- **Diferenciação por Origem de Fluxo**:
  1. **Saídas Diretas de Balcão (`origem: 'balcao_almoxarifado'` ou `status: 'finalizado'`)**:
     - Gravadas diretamente com `status: 'finalizado'`.
     - **Não passam pelo `PainelPedidos`**: vão direto para o `RelatorioRequisicoes`.
     - Validam vendedor oficial Omie antecipadamente (`buscarVendedorValidoOmie`).
     - Baixam estoque no MariaDB imediatamente (`UPDATE produtos_omie SET quantidade_estoque = quantidade_estoque - ? WHERE codigo = ?`).
     - Se vinculadas a uma O.S., atualizam as peças solicitadas para `ENTREGUE`.
     - Disparam assincronamente a criação da Remessa Omie de saída na hora.
  2. **Pedidos Remotos / Fila de Separação (Chefe de Setor / Técnico)**:
     - Quando recebido com `numeroOS`, se já existir requisição em aberto (`status` diferente de `finalizado`, `entregue` ou `cancelado`), o servidor realiza merge automático dos itens somando quantidades.
     - Se não existir, cria o registro pendente que surge no `PainelPedidos` para conferência/bipagem do almoxarife.

---

## 2. Gerenciamento de Status de Peças e O.S. (`src/routes/osRoutes.js`)

- **Mapeamento de Status de Peças**:
  - `AGUARDANDO_CHEFE_ADICIONAL`: Peças recém-solicitadas pelo Técnico que exigem aprovação/orçamento pelo Chefe de Setor.
  - `AGUARDANDO_ALMOXARIFADO`: Peças devidamente autorizadas pelo Chefe do Setor e prontas para entrega/separação no Almoxarifado.
  - `ENTREGUE`: Peças bipadas/separadas e confirmadas pela entrega do Almoxarifado.
  - `DEVOLVIDA`: Peças devolvidas ao estoque pelo Técnico.

---

## 3. Sistema de Auditoria com Comparador Diff (`PUT /api/os/:codigo`)

- **Captura Automática de Diferenças (Antes vs Depois)**:
  - Sempre que uma edição é recebida com o campo `editorResponsavel`, o servidor intercepta os dados antigos da O.S. no banco de dados.
  - O servidor executa uma comparação profunda campo a campo (`JSON.stringify`).
  - Registra no array `historicoEdicoes`:
    - `data`: Timestamp ISO.
    - `editor`: Nome do colaborador que realizou a alteração.
    - `motivo`: Justificativa preenchida no modal de autorização.
    - `alteracoes`: Array de diferenças `[{ campo, de, para }]` contendo o valor antigo e o valor novo.

---

## 4. Automações de Frota, Geradores e Controle de Revisões

### 4.1. Atualização via Ordens de Serviço (`src/routes/osRoutes.js`)
1. **Ao Concluir O.S. (`situacao = CONCLUIDO`):**
   - O servidor varre todos os veículos utilizados (`osAtualizada.veiculos` e `veiculosNoDiario` dos turnos).
   - **Trava Anti-Retrocesso:** Atualiza `kmAtual` do veículo se `kmFinal` da O.S. for estritamente maior que o registrado no banco.
   - **Reset de Revisões:** Detecta palavras-chave de serviço (*"TROCA DE ÓLEO"*, *"REVISÃO"*) ou flags (`trocouOleo`, `fezRevisao`) e atualiza as metas preventivas `kmTrocaOleo` e `kmRevisao`.
2. **Geradores e Granjas (`frota_geradores`):**
   - Atualiza `horimetroAtual`, `horimetroTrocaOleo` e `dataUltimaRevisao` com base nos apontamentos concluídos.

### 4.2. Atualização via Módulo de Combustível (`src/routes/combustivelRoutes.js`)
1. **Abertura de Requisição (`POST /api/combustivel/requisicao`):**
   - Se o operador informar o `km` na abertura da requisição para postos internos (`P YAMAVES`, `ALMOXARIFADO`), o servidor já grava o `km_abastecimento` e atualiza `frota_veiculos.kmAtual` (com trava anti-retrocesso).
2. **Finalização do Abastecimento (`PUT /api/combustivel/abastecimento/:id`):**
   - Atualiza o odômetro da frota (`frota_veiculos.kmAtual`) e horímetro de geradores (`frota_geradores.horimetroAtual`), mantendo o painel de revisões (`RevisaoVeiculo`) sincronizado em tempo real.
3. **Garantia de Identidade de Registros (ID Primário):**
   - Todos os endpoints de retorno (`GET /`, `PUT /abastecimento/:id`, `PUT /cancelar/:id`) retornam explicitamente o `id` da tabela primária do MariaDB (`{ id: row.id, ...dados }`), evitando que campos `id` venham `undefined` e causem duplicações na memória do front-end.

---

## 5. Controle de Combustível & Motor FIFO / PEPS (`src/routes/combustivelRoutes.js`)

- **Primeiro que Entra, Primeiro que Sai (PEPS / FIFO):**
  - Todo abastecimento de Diesel ou Arla consome saldo das entradas mais antigas disponíveis em `entradas_combustivel`.
  - Garante que o custo médio e o saldo contábil reflitam exatamente o valor pago nos lotes adquiridos.

---

## 6. Persistência de Dados (MariaDB Relacional Puro)

- **Docker + MariaDB (Local e VPS):** A infraestrutura de dados utiliza exclusivamente Docker e MariaDB (`almoxarifado_db`), tanto no desenvolvimento local quanto em produção na VPS.
- **Proibido Uso de JSON como Banco em Produção**: Arquivos `.json` em `backup_json` e `data` são considerados apenas backups legados e referências de consulta. Toda operação de leitura e escrita do sistema ocorre nas tabelas do MariaDB.
- **Tabelas Relacionais Dedicadas da Omie**:
  - `produtos_omie`: 11.000+ itens ativos com código, descrição, EAN, NCM, valor e saldo de estoque.
  - `fornecedores_omie`: Cadastro compartilhado de clientes, fornecedores e funcionários da empresa.
  - `departamentos_omie`: Lista oficial de departamentos/centros de custo do ERP.
  - `projetos_omie`: Projetos e Ordens de Serviço cadastradas no ERP.
  - `locais_estoque_omie`: Locais de estoque cadastrados no ERP (padrão Almoxarifado: `687827873`).
  - `vendedores_omie`: Vendedores oficiais cadastrados no módulo comercial da Omie.
- **Tabelas Nativas do Sistema:**
  - `ordens_servico`, `os_turnos`, `os_pecas_utilizadas`, `os_veiculos_utilizados`, `requisicoes`, `frota_veiculos`, `frota_geradores`, `entradas_combustivel`, `saidas_combustivel`, `usuarios`.
  - Valores monetários usam tipagem `DECIMAL(15,2)` e `DECIMAL(15,4)` (Blindagem Financeira contra erros de ponto flutuante).

---

## 7. Notificações em Tempo Real (Socket.IO)

- O servidor emite eventos via `notificationService` ao criar novas O.S. e alterar status, permitindo atualização instantânea nos painéis dos técnicos e chefes de setor sem necessidade de refresh manual.

---

## 8. Ambiente de Produção (VPS) & Local

- **Rotas Relativas:** Todas as rotas são consumidas sob o prefixo `/api/...` para compatibilidade automática entre `localhost` e Nginx na VPS.
- **Isolamento de Rede:** O MariaDB (`almoxarifado-db`) roda isolado na rede `almoxarifado-network`, sem expor portas publicamente.
- **Variáveis de Ambiente:** Arquivo `.env` lido automaticamente via `env_file` no Compose.

---

## 9. Integração de Remessa de Produtos Omie (`src/services/omieRemessaService.js`)

1. **Status Obrigatório PENDENTE**:
   - As remessas criadas pela saída do almoxarifado **não devem ser concluídas/faturadas automaticamente**.
   - Permanecem como **Pendentes** no Omie para permitir que a equipe administrativa/contábil preencha o Departamento e Centro de Custo manualmente no ERP antes de faturar.
2. **Posicionamento de Tags da API Omie**:
   - O campo `nCodProj` (código do projeto) pertence **estritamente à aba `infAdic`** (`infAdic.nCodProj`). Não deve ser enviado no bloco `cabec`, sob pena de erro de validação SOAP da Omie.
   - O campo `nCodVend` pertence ao bloco `cabec` (`cabec.nCodVend`) e só pode receber códigos cadastrados na tabela de vendedores da Omie.
3. **Local de Estoque**:
   - Mapeado diretamente para o ID oficial do Almoxarifado (`687827873`), evitando rejeições por local inexistente.

---

## 10. Resolução Inteligente de Projetos e O.S. (`src/services/omieProjetosService.js`)

1. **Normalização e Busca Resiliente**:
   - Ao receber uma O.S. (ex: `102-0826`), o serviço busca na tabela `projetos_omie` do MariaDB considerando o nome exato, o código sem pontuação (`1020826`) e removendo identificadores de veículos entre parênteses (ex: `102-0826 (PLACA: MEQ-0008)` ➔ `102-0826`).
2. **Sincronização Online Sob Demanda**:
   - Caso o projeto não seja encontrado no banco local, o sistema consulta a API `ListarProjetos` da Omie para atualizar a base local.
3. **Auto-Criação de Projetos na Omie**:
   - Se a O.S. ainda não existir na Omie, o sistema dispara `UpsertProjeto` na API da Omie criando o projeto automaticamente (`codInt: OS-1020826`, `nome: 102-0826`), grava na tabela `projetos_omie` e vincula à remessa.

---

## 11. Gestão de Vendedores e Entregadores (`src/services/omieVendedoresService.js`)

1. **Distinção Conceitual (Funcionário vs Vendedor Oficial)**:
   - Na operação física da empresa, o entregador é um funcionário (`fornecedores_omie`).
   - No ERP Omie, `nCodVend` exige cadastro prévio no módulo de Vendedores (`vendedores_omie`).
2. **Sincronização Automática no Startup**:
   - Ao iniciar o servidor (`server.js`), os vendedores oficiais da Omie são sincronizados para a tabela `vendedores_omie` do MariaDB.
3. **Blindagem Anti-Erro 102 (Vendedor Não Cadastrado)**:
   - Se o funcionário selecionado for um vendedor oficial na Omie (ex: *Diego Correia de Souza* - `#12098896163`), o sistema envia o `cabec.nCodVend` correspondente.
   - Se for um funcionário comum que não é vendedor no ERP e não puder ser cadastrado, o sistema **omite o campo `nCodVend` com segurança**, registrando o nome do funcionário em `obs.cObs` (`Entregador: NOME`).
   - A remessa é sempre gerada com 100% de sucesso sem quebras.

---

## 12. Rastreabilidade de Compras e Recebimento no Almoxarifado (`src/routes/produtosRoutes.js` & `src/routes/pedidosRoutes.js`)

1. **Separação de Estados (Em Compra vs Entregue)**:
   - Requisições com `status_compras` ativos (`pendente_cotacao`, `em_concorrencia`, `em_orcamento`, `pedido_gerado`, `aguardando_nfe`, `concluido`) são contabilizadas em `quantidade_pedida` e retornam `pedido_compras_info`.
   - Requisições recebidas fisicamente via `POST /api/pedidos/:id/receber` assumem `status_compras: 'entregue'` ou `'entregue_parcial'`, saindo do cômputo de pendências de compra e alimentando o histórico `ultimo_recebimento_info`.
2. **Atualização Atômica de Saldo**:
   - A conferência de mercadorias no Almoxarifado incrementa o estoque físico na tabela `produtos_omie`, registra lotes e validades se aplicável, e notifica os clientes conectados via WebSockets (`pedidos_pendentes_atualizados`, `estoque_atualizado`, `produtos_atualizados`).

---

## 13. Módulo de Inteligência Artificial & OCR de Orçamentos (`src/routes/iaOrcamentoRoutes.js`)

1. **Serviço de IA (`src/services/openaiService.js`)**:
   - Apesar do nome do arquivo, a integração atual consome a **API do Google Gemini** (`gemini-3.5-flash-lite`) via requisição HTTP nativa (`fetch`) com `generationConfig: { responseMimeType: "application/json" }`.
   - **Upload de PDF e Imagem (`POST /api/ia-orcamento/upload`)**: Usa `multer.memoryStorage()`. Se PDF, extrai texto com `pdf-parse`; se imagem, converte para base64 e envia inlineData para o Gemini Vision. Extrai arrays estruturados de peças com descrição, valor unitário, marca inferida e prazo de entrega.
   - **Texto Cru Colado (`POST /api/ia-orcamento/texto`)**: Processa buffers diretos colados pelo comprador no front-end.
   - **Chat Consultor Global (`POST /api/ia-orcamento/chat-global`)**: Chat multi-turnos com injeção de contexto de compras para suporte consultivo em tempo real.

---

## 14. Módulo de Recebimento Fiscal, Divergências & Conciliação Omie (`src/routes/recebimentoFiscalRoutes.js`)

1. **Fluxo de Entrada e Validação de XML (`POST /api/recebimento-fiscal/upload-xml`)**:
   - Parser manual de XML de NF-e / DANFE extraindo cabeçalho, chave de 44 dígitos, emitente (CNPJ/Razão Social), itens da nota com NCM, CFOP de origem, GTIN, valor unitário, impostos e duplicatas/parcelas de cobrança.
2. **Conciliação e Salvamento (`POST /api/recebimento-fiscal/salvar-conferencia`)**:
   - Grava de-para de produtos, CFOP de entrada oficial (ex: `1.556` - uso e consumo), local de estoque de destino e conciliação de parcelas financeiras diretamente no registro da requisição no MariaDB.
3. **Faturamento no ERP Omie (`POST /api/recebimento-fiscal/concluir-omie`)**:
   - Aciona `omieNotaEntradaService.js` (`IncluirNotaEnt`), gerando a nota de entrada fiscal no ERP com itens, rateio e duplicatas de Contas a Pagar.
4. **Tratamento de Divergências Físicas (`src/services/divergenciasService.js`)**:
   - Compara fisicamente os itens recebidos no Almoxarifado vs itens faturados na nota.
   - Itens não entregues geram divergência com cálculo exato de falta financeira (`valorDivergencia`), permitindo que Compras/Fiscal abatam valores na conciliação de parcelas antes de concluir no Omie.

---

## 15. Radiografia Atual de Endpoints Multidashboard (Diagnóstico de Acoplamento)

Atualmente, determinados arquivos de rota concentram regras de múltiplos dashboards e setores:

| Arquivo de Rota | Tamanho | Dashboards / Telas Consumidoras | Responsabilidades Acumuladas |
| :--- | :--- | :--- | :--- |
| `src/routes/requisicoesRoutes.js` | ~50 KB | • Almoxarifado (`NovaRequisicao`, `PainelPedidos`, `RelatorioRequisicoes`)<br>• Compras (`RequisicaoCompras`, `Concorrencia`, `Orcamentos`, `EntradaEstoque`, `DivergenciasDevolucao`)<br>• Chefe de Setor (`DashboardChefeSetor`)<br>• Diretoria (`DashboardDiretor`) | Saída de balcão direta, fila de separação remota, fluxo de cotações, geração de pedidos Omie, devolução de peças, simulação de NF-e, autorizações de orçamento e remessas Omie. |
| `src/routes/produtosRoutes.js` | ~34 KB | • Almoxarifado (`Estoque`, `ProdutoModal`)<br>• Compras (`Concorrencia`, `ManutencaoEstoque`)<br>• Recebimento Fiscal (`DashboardRecebimentoFiscal`)<br>• Mecânica / OS (`FormularioServicoOS`, `FormularioPrestacaoServico`)<br>• Chefe e Técnico (`DashboardChefeSetor`, `DashboardTecnico`) | Catálogo geral, busca leve (`/light`), histórico de compras, sugestão de preços de venda, fotos de peças, barcodes, lotes/FEFO, descarte e sincronização Omie. |
| `src/routes/osRoutes.js` | ~33 KB | • Painel OS Mecânica (`DashboardOS`)<br>• Terminal Totem Apontamento (`DashboardApontamentoOS`)<br>• Prestação de Serviços para Granjas (`TabelaPrestacaoServicos`)<br>• Gestão de Custos (`custos-funcionarios`) | CRUD de O.S., fechamento de turnos/diário de bordo, auditoria diff, custos de homem-hora, revisões preventivas de frotas e cadastro de serviços padrão. |
| `src/routes/combustivelRoutes.js` | ~25 KB | • Controle de Combustível Admin (`DashboardControleCombustivel`)<br>• App Motorista (`DashboardMotorista`)<br>• App Frentista (`DashboardFrentistaYamaves`)<br>• Totem / ChatBox (`DashboardChatBoxCombustivel`) | Entradas de tanques, motor FIFO/PEPS, transferências entre postos, requisições de abastecimento, upload de fotos de odômetro e cancelamentos. |

---

## 16. Radiografia de Serviços e Background Workers

1. **Sincronização em Background Omie (`server.js`)**:
   - Executa 5 segundos após a subida do servidor: `sincronizarProdutosPrd()` e `sincronizarVendedoresParaBanco()`.
   - Agendador automático em loop roda às **00:00, 07:00, 12:00 e 17:00** para atualização do catálogo.
2. **Comunicação em Tempo Real via Socket.IO (`server.js` & `notificationService.js`)**:
   - Emite eventos: `pedidos_pendentes_atualizados`, `estoque_atualizado`, `produtos_atualizados`, `nova_os`, `status_os_atualizado`, garantindo atualização instantânea nos navegadores.
3. **Serviços de Integração Especializados (`src/services/`)**:
   - `omieRemessaService.js`: Saídas de materiais com status PENDENTE e `nCodProj` em `infAdic`.
   - `omieProjetosService.js`: Auto-resolução e `UpsertProjeto` na Omie.
   - `omieVendedoresService.js`: Sincronização e blindagem SOAP 102.
   - `omieNotaEntradaService.js`: Inclusão de notas fiscais de compra no ERP.
   - `omieComprasService.js`: Histórico de pedidos de compra via `PesquisarPedCompra`.
   - `divergenciasService.js`: Gestão matemática de faltas físicas de mercadoria.
   - `cadastrosSyncService.js`: Cache e consulta de fornecedores, departamentos e projetos.

---

## 17. Plano Diretor de Refatoração Pós-Apresentação (Segunda-Feira)

> [!IMPORTANT]
> **Fase 0 (Atual): Congelamento de Código.** O sistema está estável para a apresentação de segunda-feira. Nenhuma pasta, rota ou arquivo de código executável será renomeado ou refatorado antes do evento.

### Proposta de Organização Modular Pós-Apresentação:
1. **Ativação da Pasta `src/controllers/`**:
   - Atualmente vazia (0 arquivos). As rotas concentram regras de negócio pesadas e queries SQL diretamente nos callbacks.
   - Separar em: `RequisicaoAlmoxarifadoController`, `RequisicaoComprasController`, `OrdemServicoController`, `CombustivelController`, etc.
2. **Segregação de `requisicoesRoutes.js` por Domínio**:
   - `requisicoesAlmoxarifadoRoutes.js`: foco em saídas de balcão, separação de pedidos e devoluções.
   - `comprasFluxoRoutes.js`: cotações, orçamentos, aprovação de diretoria e geração de pedidos Omie.
   - Manter aliases/redirecionamentos retrocompatíveis para evitar quebras em chamadas antigas.
3. **Migração do `pedidos_pendentes` de JSON para MariaDB**:
   - Atualmente `pedidos_pendentes` é um dos únicos dados ainda manipulados via `getJsonData('pedidos_pendentes')`.
   - Criar tabela dedicada `recebimentos_pendentes_almoxarifado` no MariaDB, eliminando completamente a dependência de arquivos JSON em runtime.
4. **Limpeza de Rotas Duplicadas / Órfãs**:
   - Desativar `src/routes/healthRoutes.js` (duplicata de `saudeRoutes.js`).
   - Normalizar a montagem de `osRoutes.js` (remover o duplo `app.use('/api/os', osRoutes)` e `app.use('/api', osRoutes)`).
   - Renomear conceitualmente `openaiService.js` para `iaService.js` (ou `geminiService.js`), mantendo a exportação para compatibilidade.
