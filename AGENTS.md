# Project Rules & System Documentation (AGENTS.md)

Este repositório é composto por dois módulos principais. Consulte a documentação de cada módulo para regras detalhadas:

1. **Front-end (`src/AGENTS.md`)**: [Link para regras do Front-end](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/src/AGENTS.md)
   - Estilização estrita via **CSS Modules** (`.module.css`) e variáveis CSS `var()`. Proibido Tailwind.
   - Fluxo de triagem, alertas do Chefe de Setor (`AGUARDANDO_CHEFE_ADICIONAL`) e Diário de Bordo por Turno.
   - Blindagem de Odômetro/Horímetro com trava anti-retrocesso (`formatadorOdometro.js`).
   - Terminal de Apontamento da Oficina (`DashboardApontamentoOS`).
   - Desbloqueio de O.S. finalizada com registro de auditoria e Comparador Visual de Alterações (Diff Antes/Depois).
   - Ordenação cronológica inteligente na `TabelaOS` (Ano ➔ Mês ➔ Número O.S.).

2. **Back-end (`back-end/AGENTS.md`)**: [Link para regras do Back-end](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/back-end/AGENTS.md)
   - Regra de Ouro: **Trava Anti-Duplicação por O.S.** em `POST /api/requisicoes`.
   - Banco de Dados isolado em contêiner MariaDB. Cadastros na tabela Key-Value `omie_collections`.
   - Auditoria automática com captura profunda de diferenças (`diff`) no `PUT /api/os/:codigo`.
   - Automação de frota/geradores ao concluir O.S. (`situacao = CONCLUIDO`).
   - Rotas consumindo `/api/...` relativas para compatibilidade automática na VPS.

3. **Ambiente de Produção (VPS Docker)**:
   - Contêiner Node e MariaDB rodam na `almoxarifado-network`.
   - Variáveis em `.env` lidas automaticamente via `env_file`.
   - As montagens de volume apontam de `./back-end/data` no Host para `/app/data` no Contêiner Node.
