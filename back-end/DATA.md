# Arquitetura e Dados do Sistema Almoxarifado (Agente)

Este documento descreve a estrutura atual de dados do sistema (baseada em arquivos JSON) e o planejamento para a futura migração para um banco de dados relacional (MySQL), além da estratégia de integração com a API da Omie.

---

## 1. Estrutura Atual dos Dados (JSON)

### 1.1. Dados da Empresa (Base e Cadastros)
A base da empresa é composta por informações essenciais de suprimentos e organização, majoritariamente integradas com o ERP Omie:
* **Produtos e Estoque (`produtos.json`):** Catálogo de itens vindos da Omie, incluindo código, EAN, NCM, valor unitário, saldo em estoque, lotes e validade.
* **Estrutura Organizacional:** 
  * Departamentos (`departamentos.json`)
  * Projetos / Centros de Custo (`projetos.json`)
  * Locais de Estoque (`locais_estoque.json`)
* **Terceiros:** Fornecedores (`fornecedores.json`) e Vendedores (`vendedores.json`).

### 1.2. Dados do Relatório da OS (Ordem de Serviço)
Os registros das operações (`ordens_servico.json`) contêm todas as informações gerenciais:
* **Cabeçalho:** Identificação (ID, Código), Data/Hora de criação, Requisitante.
* **Classificação:** Setor, Centro de Custo, Tipo (Corretiva, Melhoria), Prioridade e Complexidade.
* **Métricas de Tempo:** Prazo estipulado, Situação (Concluído, Andamento), Datas e Horas reais de Início e Fim.
* **Recursos Consumidos (Custos):**
  * **Mão de Obra:** Funcionários envolvidos, função (Executor/Ajudante) e horas trabalhadas.
  * **Consumíveis:** Materiais/Produtos do estoque gastos na OS (cruzamento direto com o catálogo da Omie).
  * **Frota:** Placa do veículo utilizado e Km rodado.
* **Detalhamento:** Descrição inicial, passos executados, resultado e observações finais.

---

## 2. Visão de Futuro: Migração para MySQL

Para suportar crescimento, relatórios complexos e concorrência de múltiplos usuários, a base de dados migrará de JSON para um modelo relacional no MySQL. 

### 2.1. Modelagem Sugerida (Tabelas Principais)
1. **`produtos`**: Armazena o espelho do catálogo Omie.
   * `id` (PK), `omie_codigo_produto`, `sku`, `descricao`, `estoque_atual`, `estoque_minimo`, `valor_unitario`, `ultima_sincronizacao`.
2. **`lotes_produtos`**: Tabela filha para controle de lotes e validades.
3. **`ordens_servico`**: Tabela principal da OS.
   * `id` (PK), `codigo`, `requisitante_id`, `setor_id`, `centro_custo_id`, `status`, `data_criacao`, `data_inicio`, `data_fim`, etc.
4. **`os_mao_obra`**: Relação 1:N com as OS.
   * `id`, `os_id` (FK), `matricula`, `nome`, `funcao`, `horas`.
5. **`os_consumiveis`**: Relação N:M entre OS e Produtos.
   * `id`, `os_id` (FK), `produto_id` (FK), `quantidade_utilizada`, `valor_custo_momento`.

---

## 3. Estratégia de Sincronização com Omie (Controle de Limites API)

A API da Omie possui limites de requisição rígidos (geralmente cerca de 4 requisições por segundo / rate limits diários). Para evitar bloqueios ("Too Many Requests") e gargalos, adotaremos as seguintes estratégias na arquitetura futura:

### A. Webhooks (Push em vez de Pull)
Em vez de o nosso sistema ficar "perguntando" para a Omie o tempo todo se o estoque de um produto mudou, nós configuraremos **Webhooks** na Omie. 
* **Como funciona:** A Omie envia uma notificação (um POST HTTP) para o nosso Back-end apenas quando um produto é criado, alterado ou tem seu estoque atualizado lá.
* **Vantagem:** O consumo de API despenca para quase zero no que tange a atualizações de catálogo.

### B. Sincronização Delta (Por Data de Alteração)
Se precisarmos de rotinas ativas de busca (ex: job noturno de verificação de consistência):
* **Como funciona:** Nunca buscaremos a base completa (`ListarProdutos`). Utilizaremos os parâmetros `filtrar_por_data_de` e `filtrar_por_data_ate` ou `filtrar_apenas_inclusao`.
* **Vantagem:** Baixamos apenas as diferenças ("Deltas"), reduzindo o tráfego e o tempo da requisição.

### C. Fila de Sincronização (Queue System) para Escrita
Quando a OS for concluída e precisarmos dar baixa no estoque da Omie (ou gerar requisição de material):
* **Como funciona:** As solicitações não vão direto para a Omie no momento que o usuário clica em "Salvar". Elas entram em uma tabela de "Fila de Integração" local.
* Um processo em background (um *Worker* com Node.js ou cron job) lê essa fila e envia para a Omie de forma cadenciada (ex: com um `sleep(300)` entre requisições ou usando bibliotecas de *rate limiting* como `bottleneck`).
* **Vantagem:** Garante que o usuário não trave a tela esperando a Omie responder, e se a API da Omie cair, a fila segura o processo e tenta novamente mais tarde.

### D. Banco Local como Fonte da Verdade de Leitura
* O usuário do sistema de Almoxarifado sempre fará consultas de relatórios e pesquisas de produtos em cima do nosso banco **MySQL**. O MySQL é o nosso "cache" persistente e rápido.
* O sistema nunca faz uma chamada na API da Omie para popular uma tabela na tela (Dashboard), o que garante velocidade instantânea para o usuário final e protege a franquia de requisições da Omie.
