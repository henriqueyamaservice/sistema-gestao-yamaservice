# Back-end Rules & Security Architecture Guidelines (back-end/AGENTS.md)

Este documento define as regras de negócio, rotas e travas de segurança do servidor Back-end do Sistema de Almoxarifado & Gestão de Ordens de Serviço.

---

## 1. Regra de Ouro: Unificação Absoluta de Requisições por O.S. (`POST /api/requisicoes`)

- **Trava Anti-Duplicação**: É **estritamente proibido** gerar múltiplos cards/requisições ativos no Almoxarifado para a mesma Ordem de Serviço.
- **Funcionamento no Endpoint `POST /api/requisicoes` (`src/routes/requisicoesRoutes.js`)**:
  - Quando um payload contendo `numeroOS` é recebido, o servidor pesquisa se já existe uma requisição **ABERTA** (`status` diferente de `finalizado`, `entregue` ou `cancelado`).
  - **SE JÁ EXISTIR:** O servidor **NÃO CRIA UM NOVO REGISTRO OU CARD**. Ele realiza a unificação (`merge`) automática dos novos itens no array `itens` do card existente, somando a quantidade caso o código/descrição já exista.
  - **SE NÃO EXISTIR:** O servidor cria o registro inicial único com `id` gerado via `Date.now().toString()`.

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

## 4. Automações de Frota e Geradores na Conclusão de O.S. (`situacao = CONCLUIDO`)

1. **Atualização Automática de KM (`frota_veiculos`)**:
   - Ao concluir uma O.S., o servidor varre todos os veículos utilizados nos turnos do Diário de Bordo.
   - Atualiza o `kmAtual` do veículo caso o `kmFinal` da O.S. seja maior que o atual.
   - Detecta serviços de **Troca de Óleo** (`trocouOleo`) ou **Revisão** (`fezRevisao`) e atualiza as metas preventivas `kmTrocaOleo` e `kmRevisao`.
2. **Atualização Automática de Horímetro (`frota_geradores`)**:
   - Atualiza o `horimetroAtual`, `horimetroTrocaOleo` e `horimetroUltimaRevisao` com base nos apontamentos concluídos.

---

## 5. Controle de Combustível & Motor FIFO / PEPS (`src/routes/combustivelRoutes.js`)

- **Primeiro que Entra, Primeiro que Sai (PEPS)**:
  - Todo abastecimento de Diesel ou Arla consome saldo das entradas mais antigas disponíveis em `combustivel_entradas`.
  - Garante que o custo médio e o saldo contábil reflitam exatamente o valor pago nos lotes adquiridos.

---

## 6. Persistência de Dados (MariaDB Relacional)

- **Docker + MariaDB (Local e VPS)**: A infraestrutura de dados utiliza Docker e MariaDB tanto localmente no desenvolvimento quanto em produção na VPS.
- **Tabelas Relacionais e Blindagem Financeira**:
  - Tabelas nativas: `ordens_servico`, `os_turnos`, `frota_veiculos`, `frota_geradores`, `combustivel_entradas`, `combustivel_saidas`.
  - Valores monetários usam tipagem `DECIMAL(10,2)` (Blindagem Financeira contra erros de ponto flutuante).
- **Tabela Key-Value Omie (`omie_collections`)**:
  - Armazena os 11.000+ produtos, fornecedores e departamentos para consultas instantâneas.
  - Sincronização em background via `syncOmieService.js`.

---

## 7. Notificações em Tempo Real (Socket.IO)

- O servidor emite eventos via `notificationService` ao criar novas O.S. e alterar status, permitindo atualização instantânea nos painéis dos técnicos e chefes de setor sem necessidade de refresh manual.

---

## 8. Ambiente de Produção (VPS) & Local

- **Rotas Relativas**: Todas as rotas são consumidas sob o prefixo `/api/...` para compatibilidade automática entre `localhost` e Nginx na VPS.
- **Isolamento de Rede**: O MariaDB (`almoxarifado-db`) roda isolado na rede `almoxarifado-network`, sem expor portas publicamente.
- **Variáveis de Ambiente**: Arquivo `.env` lido automaticamente via `env_file` no Compose.
