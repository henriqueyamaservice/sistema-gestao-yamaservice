# Arquitetura e Dados do Sistema Almoxarifado (MariaDB / Docker)

Este documento descreve a infraestrutura real de persistência de dados do sistema, 100% migrada e operacional em **MariaDB/MySQL** executado via Docker (tanto em ambiente local quanto em produção na VPS).

---

## 1. Infraestrutura do Banco de Dados

- **SGBD:** MariaDB / MySQL (`mysql2/promise` com pool de conexões).
- **Driver:** Abstração unificada em `src/config/database.js` (`getDb()`, com métodos `.exec()`, `.run()`, `.all()`, `.get()`).
- **Resiliência:** Pool automático com até 12 tentativas de reconexão automática e pool de 10 conexões concorrentes.
- **Tipagem Monetária:** `DECIMAL(15,2)` e `DECIMAL(15,4)` para blindagem financeira contra imprecisões de ponto flutuante.

---

## 2. Mapa Completo de Tabelas Ativas no MariaDB

### 2.1. Tabelas Espelho da Integração ERP Omie (Cadastros)

| Tabela | Chave Primária | Finalidade | Campos Principais |
| :--- | :--- | :--- | :--- |
| `produtos_omie` | `codigo VARCHAR(191)` | Catálogo geral com 11.000+ peças e insumos | `descricao`, `ncm`, `ean`, `valor_unitario`, `quantidade_estoque`, `dados_json` (lotes, validades, marca, localização) |
| `fornecedores_omie` | `codigo VARCHAR(191)` | Fornecedores, clientes e colaboradores | `razao_social`, `cnpj_cpf`, `dados_json` |
| `departamentos_omie` | `codigo VARCHAR(191)` | Departamentos e centros de custo oficiais | `descricao`, `dados_json` |
| `projetos_omie` | `codigo VARCHAR(191)` | Projetos e O.S. registradas no ERP | `nome`, `dados_json` |
| `locais_estoque_omie` | `codigo VARCHAR(191)` | Locais de estoque (Almoxarifado Central, etc.) | `descricao`, `dados_json` |
| `vendedores_omie` | `codigo VARCHAR(191)` | Vendedores e operadores habilitados no Omie | `nome`, `dados_json` |

### 2.2. Tabelas Operacionais do Sistema

| Tabela | Chave Primária | Finalidade | Estrutura |
| :--- | :--- | :--- | :--- |
| `ordens_servico` | `id VARCHAR(191)` | Cabeçalho e dados mestre de O.S. | `numero_os` (UNIQUE), `situacao`, `tipo`, `setor`, `centro_custo`, `requisitante`, `tecnico`, `prioridade`, `valor_estimado`, `dados_json` (histórico diff de edições, faturamento, granjas) |
| `os_turnos` | `id VARCHAR(191)` | Apontamento de diário de bordo por turnos | `os_id` (FK CASCADE), `data_apontamento`, `hora_inicio`, `hora_fim1`, `hora_inicio2`, `hora_fim`, `descricao_servico` |
| `os_equipe` | `id VARCHAR(191)` | Equipe de mecânicos por turno | `turno_id` (FK CASCADE), `matricula`, `nome`, `funcao`, `horas` |
| `os_pecas_utilizadas` | `id VARCHAR(191)` | Peças consumidas na O.S. | `turno_id` (FK CASCADE), `codigo`, `descricao`, `quantidade` |
| `os_veiculos_utilizados`| `id VARCHAR(191)` | Veículos utilizados no serviço | `turno_id` (FK CASCADE), `placa`, `km_inicial`, `km_final`, `km_total` |
| `relatorios_custos` | `id VARCHAR(191)` | Relatórios mensais de custos operacionais | `data_inicio`, `data_fim`, `horas_uteis`, `data_fechamento` |
| `relatorios_custos_funcionarios` | `id VARCHAR(191)` | Custos de folha e homem-hora | `relatorio_id` (FK CASCADE), `cpf`, `nome`, `cargo`, `horas_trabalhadas`, `folha_mensal`, `ferias`, `fgts` |
| `requisicoes` | `id VARCHAR(191)` | Requisições (Almoxarifado, Compras, O.S.) | `numero_os`, `status`, `status_compras`, `tipo`, `solicitante`, `departamento`, `entregador`, `local_estoque`, `dados_json` (itens, cotações, orçamentos, conciliação fiscal) |
| `servicos_kits` | `id VARCHAR(191)` | Kits padronizados de revisão preventiva | `nome`, `area_manutencao` (`MECANICA`, `ELETRICA`, `PREDIAL`), `categoria`, `dados_json` (itens do kit) |
| `usuarios` | `id VARCHAR(191)` | Controle de acesso e autenticação | `nome`, `username` (UNIQUE), `senha_hash`, `role`, `setor`, `codigo_omie` |

### 2.3. Módulo Frota & Combustível

| Tabela | Chave Primária | Finalidade | Estrutura |
| :--- | :--- | :--- | :--- |
| `frota_veiculos` | `id VARCHAR(191)` | Frota de caminhões, tratores e veículos leves | `placa` (UNIQUE), `modelo`, `tipo`, `marca`, `ano`, `status`, `dados_json` (`kmAtual`, `kmTrocaOleo`, revisões) |
| `frota_geradores` | `id VARCHAR(191)` | Geradores das granjas e sede | `codigo` (UNIQUE), `nome`, `localizacao`, `status`, `dados_json` (`horimetroAtual`, `horimetroTrocaOleo`) |
| `entradas_combustivel`| `id VARCHAR(191)` | Notas de entrada de Diesel e Arla | `fornecedor`, `tipo_combustivel`, `quantidade_litros`, `valor_total`, `valor_unitario`, `estoque_destino`, `dados_json` |
| `saidas_combustivel` | `id VARCHAR(191)` | Abastecimentos e descarte | `placa`, `modelo`, `veiculo_id`, `motorista`, `tipo_combustivel`, `litros`, `valor_litro`, `valor_total`, `km_abastecimento`, `tanque_origem`, `dados_json` |
| `checklists_veiculos` | `id VARCHAR(191)` | Checklists diários de frotas | `placa`, `modelo`, `condutor_nome`, `data_hora`, `dados_json` |

---

## 3. Resíduo de Migração Mapeado para Pós-Apresentação

- **`pedidos_pendentes`**: Atualmente armazenado no arquivo JSON `data/almoxarifado/pedidos_pendentes.json` via `jsonDbService.js`.
  - Mapeado para migração na tabela MariaDB `recebimentos_pendentes_almoxarifado` após a apresentação de segunda-feira.
