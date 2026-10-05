# Project Rules & System Documentation (AGENTS.md)

Este repositório é composto por dois módulos principais. Consulte a documentação de cada módulo para regras detalhadas:

1. **Front-end (`src/AGENTS.md`)**: [Link para regras do Front-end](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/src/AGENTS.md)
   - Estilização estrita via **CSS Modules** (`.module.css`) e variáveis CSS `var()`. Proibido Tailwind.
   - Fluxo de triagem, alertas do Chefe de Setor (`AGUARDANDO_CHEFE_ADICIONAL`) e Diário de Bordo por Turno.
   - Blindagem de Odômetro/Horímetro e Painel de **Controle de Revisões Preventivas** (`RevisaoVeiculo` & `RevisaoGerador`).
   - Classificação universal de medições (unidades inteiras, líquidos em litros, metros e kg em `classificadorUnidades.js`).
   - Terminal de Apontamento da Oficina (`DashboardApontamentoOS`).
   - Desbloqueio de O.S. finalizada com registro de auditoria e Comparador Visual de Alterações (Diff Antes/Depois).
   - Sincronização anti-duplicação na Tabela de Combustível e ordenação cronológica inteligente na `TabelaOS`.
   - **Tríade de Agentes Especialistas e Purga Contínua (`.agents/rules/`)**:
     - [Regra de Auto-Sincronização e Purga](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/regra-sincronizacao-e-purga.md): Proibição de código morto/órfão, portas relativas `/api/...`, banimento de emojis e manutenção contínua da arquitetura.
     - [Agente Almoxarifado](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/agente-almoxarifado.md): Bipagem via scanner, alerta FEFO, saídas de balcão diretas, fila remota em `PainelPedidos` e remessas Omie automáticas.
     - [Agente Compras & IA](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/agente-compras.md): Gestão de cotações, orçamentos, pedidos de compra, assistente IA Groq para leitura de propostas/PDFs e chat consultor.
     - [Agente Recebimento Fiscal](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/agente-recebimento-fiscal.md): Fluxo oficial Omie em 3 telas, 7 abas de conferência fiscal (*Itens, Transporte, Totais, Parcelas, Departamentos, Info Adicionais, Observações*), submodal com 8 sub-abas de tributos por item, conciliação com abatimento por falta física e blindagem de modais.

2. **Back-end (`back-end/AGENTS.md`)**: [Link para regras do Back-end](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/back-end/AGENTS.md)
   - Regra de Ouro: **Trava Anti-Duplicação por O.S.** em `POST /api/requisicoes`.
   - **Banco de Dados 100% MariaDB**: Tabelas dedicadas `produtos_omie`, `fornecedores_omie`, `departamentos_omie`, `projetos_omie`, `locais_estoque_omie`, `vendedores_omie`. Proibido usar arquivos JSON como banco em produção.
   - **Integração Omie Remessas (`omieRemessaService.js`)**: Status sempre **PENDENTE** para inclusão manual de Departamento no ERP. `nCodProj` estritamente dentro de `infAdic`.
   - **Gestão de Projetos Omie (`omieProjetosService.js`)**: Resolução inteligente de O.S., busca sem formatação e auto-criação de projetos na Omie (`UpsertProjeto`).
   - **Gestão de Vendedores Omie (`omieVendedoresService.js`)**: Sincronização automática, diferenciação entre funcionário interno e vendedor oficial, e blindagem anti-bloqueio (erro SOAP 102).
   - Auditoria automática com captura profunda de diferenças (`diff`) no `PUT /api/os/:codigo`.
   - Automação contínua de frota/geradores com **Trava Anti-Retrocesso de KM** em O.S. (`PUT /api/os/:codigo`) e Abastecimentos (`/api/combustivel`).
   - Rotas consumindo `/api/...` relativas para compatibilidade automática na VPS.

3. **Ambiente de Produção (VPS Docker)**:
   - Contêiner Node e MariaDB rodam na `almoxarifado-network`.
   - Variáveis em `.env` lidas automaticamente via `env_file`.
   - As montagens de volume apontam de `./back-end/data` no Host para `/app/data` no Contêiner Node.
