# Frontend Rules & Business Flow Guidelines (src/AGENTS.md)

Este documento define as regras de arquitetura, estilos e fluxo de trabalho do Front-end do Sistema de Almoxarifado & Gestão de Ordens de Serviço.

---

## 1. Estilos e Temas (CSS Modules)

- **Proibido TailwindCSS**: Toda estilização deve utilizar **CSS Modules** (`.module.css`).
- **Variáveis CSS Obrigatórias**:
  - `var(--cor-destaque)`: Laranja principal (#FF6B00) para botões principais e destaques.
  - `var(--cor-destaque-hover)`: Estado hover de ações primárias.
  - `var(--cor-fundo-principal)`: Background principal da aplicação (suporta Dark/Light).
  - `var(--cor-fundo-secundario)`: Background de sidebars, cabeçalhos e seções de formulários.
  - `var(--cor-fundo-cartao)`: Background para cards e modais.
  - `var(--cor-fundo-sutil)` e `var(--cor-fundo-sutil-forte)`: Transparências para hovers e sombras.
  - `var(--cor-texto-principal)`: Cor padrão dos textos.
  - `var(--cor-texto-secundario)`: Textos secundários, legendas e placeholders.
  - `var(--cor-texto-inverso)`: Sempre branco para textos dentro de botões preenchidos.
  - `var(--cor-borda-cartao)`: Linhas divisórias, tabelas e contornos.
  - `var(--cor-sucesso)`: Verde para badges e mensagens de sucesso.
  - `var(--cor-erro)`: Vermelho para badges e mensagens de erro.

---

## 2. Fluxo da Máquina de Estados da Ordem de Serviço (O.S.)

### 2.1. Triagem e Orçamento pelo Chefe de Setor (`DashboardChefeSetor`)
1. O painel é dividido em **3 Abas de Trabalho**:
   - **Triagem / Orçar:** Chamados novos (`AGUARDANDO_CHEFE_SETOR`, `EMERGENCIA_CHEFE_SETOR`) ou O.S. com solicitações de peças adicionais (`AGUARDANDO_CHEFE_ADICIONAL`).
   - **Em Execução:** O.S. autorizadas que estão ativas na oficina (`EM_ANDAMENTO`, `AGUARDANDO_INSUMO`, `ATRIBUIDO_TECNICO`, `AGUARDANDO_ALMOXARIFADO`, `ENTREGUE`).
   - **Histórico:** O.S. encerradas (`CONCLUIDO`, `CANCELADO`).
2. **Notificação em Tempo Real (`DashboardBlocoRequisicao` ➔ `DashboardChefeSetor`):**
   - Auto-polling a cada 6 segundos.
   - Quando um funcionário envia um novo pedido via `DashboardBlocoRequisicao`, o Chefe recebe Toast verde com som/ícone de sino: `🔔 NOVA REQUISIÇÃO RECEBIDA DE [Solicitante]! O.S. #[Código]`.
   - Card ganha destaque imediato com o badge verde `✨ NOVA REQUISIÇÃO RECEBIDA`.
3. **Trava de Segurança dos Botões do Modal:**
   - Em Triagem inicial: Botão **`Autorizar & Mandar ao Técnico`** (ou `Enviar p/ Diretoria`).
   - Com peças adicionais (`AGUARDANDO_CHEFE_ADICIONAL`): Botão **`Aprovar Lote Adicional (Enviar Almoxarifado)`**.
   - Em execução/histórico: Apenas **`Salvar Alterações`**.
4. **Campos Obrigatórios para Autorização:**
   - Técnico / Mecânico Responsável (`tecnicoResponsavel`).
   - Prazo de Entrega / Previsão (`prazo`).
   - Setor de Execução (`setor`).
   - Centro de Custo / Veículo (`centroCusto`).
5. **Cálculo dos Custos de Peças:**
   - Exibe colunas **Valor Unit. (R$)** e **Total Peça (R$)** com soma em tempo real no rodapé do modal.

### 2.2. Solicitação de Peças Adicionais pelo Técnico (`ModalRequisicaoPecasTecnico`)
1. Toda peça nova solicitada durante o atendimento recebe status `AGUARDANDO_CHEFE_ADICIONAL`.
2. Card no `DashboardChefeSetor` exibe: `⚠️ ALERTA: O Técnico adicionou mais peças ao orçamento desta O.S.!`.
3. Ao aprovar, o status passa para `AGUARDANDO_ALMOXARIFADO` e a requisição unificada é disparada.

### 2.3. Painel do Técnico (`DashboardTecnico` & `HeaderTecnico`)
1. **Design Mobile-First:** Otimizado para smartphones em campo.
2. **Atualização em Tempo Real (3 segundos, Anti-Cache):** Auto-polling com timestamp dinâmico `?_t=${Date.now()}`.
3. **Regra de Validação de Datas do Atendimento:**
   - `Data Início *` e `Hora Início *`: Obrigatórias para manter em andamento.
   - `Data Término` e `Hora Término`: Iniciam vazias.
   - Ao concluir (`CONCLUIDO`): `Data Término *`, `Hora Término *` e `Motivo / Causa *` tornam-se estritamente obrigatórios.

---

## 3. Gestão e Fechamento de O.S. (`FormularioServicoOS`)

### 3.1. Bloqueio e Desbloqueio de O.S. Finalizada
1. **Modo Somente Leitura:** Se a O.S. estiver com situação `CONCLUIDO` ou `CANCELADO`, todos os campos (incluindo o cabeçalho) iniciam bloqueados para edição.
2. **Desbloqueio com Auditoria:** Para editar, o usuário clica em **"Desbloquear Edição Completa"**, que abre o `ModalAutorizacaoEdicao` exigindo:
   - **Nome do Editor (*)**
   - **Motivo da Alteração (Opcional)**
3. **Histórico Permanente de Auditoria:**
   - A seção **"🛡️ Histórico de Edições / Auditoria"** fica localizada no rodapé geral do formulário (sempre visível).
   - Registra permanentemente quem editou, data/hora e o botão **"👁️ Detalhes"**.

### 3.2. Comparador Visual de Alterações (Antes e Depois / Diff)
- O botão **"👁️ Detalhes"** abre um modal amplo (1000px) exibindo lado a lado:
  - **🔴 Antes** (valor original no banco) ➔ **🟢 Depois** (valor editado).
- Nomes dos campos 100% traduzidos para português amigável.
- Ícones React (`lucide-react`) em vez de emojis para equipe, peças, veículos e turnos.

---

## 4. Blindagem de Odômetro, Horímetro & Frota (`formatadorOdometro.js`)

1. **Formatação Visual Padrão Brasileiro:** Odômetros e horímetros são formatados em tempo real (`3.337.273 km`, `1.250,5 h`).
2. **Exibição do Último Registro:** Exibe etiqueta clara com o último KM registrado no banco de dados do caminhão/veículo.
3. **Trava Anti-Retrocesso:** Se um KM digitado for menor que o último KM registrado da frota, o campo fica com borda vermelha e exibe aviso impeditivo imediato contra erros de digitação.

---

## 5. Terminal de Apontamento da Oficina (`DashboardApontamentoOS`)

1. **Fluxo Passo-a-Passo para Totem / Tablet:**
   - **Passo 1 (Executor):** Identificação de quem está realizando o apontamento.
   - **Passo 2 (O.S.):** Seleção da Ordem de Serviço aberta.
   - **Passo 3 (Diário de Bordo):** Lançamento de turnos e horas trabalhadas.
   - **Passo 4 (Materiais & Peças):** Lançamento de peças de estoque ou externas com foto da NF.
   - **Passo 5 (Frota):** Veículos utilizados com KM inicial/final.
   - **Passo 6 (Conclusão):** Revisão e envio com comprovante.
2. O nome do executor é persistido na O.S. e gera o selo **"Apontamento do Colaborador"** no `FormularioServicoOS`.

---

## 6. Listagem Global de O.S. (`TabelaOS`)

1. **Ordenação Cronológica Inteligente de 3 Níveis:**
   - **1º Nível (Ano):** 2026 > 2025.
   - **2º Nível (Mês):** O.S. do mês atual (ex: Setembro `09`) ficam sempre acima do mês anterior (ex: Agosto `08`).
   - **3º Nível (Número):** Dentro do mesmo mês, ordena decrescente (`162-0826` > `01-0826`).
2. **Otimização de Espaço:** A coluna numérica redundante ("Or") foi removida para priorizar as colunas de negócio.

---

## 7. Mapa dos Componentes Front-end

| Módulo / Arquivo | Responsabilidade |
| :--- | :--- |
| `src/componentes/DashboardOS/index.jsx` | Painel principal administrativo da mecânica/oficina |
| `src/componentes/DashboardOS/componentes/TabelaOS/` | Tabela geral de O.S. com filtros, gráficos e ordenação inteligente |
| `src/componentes/DashboardOS/componentes/FormularioServicoOS/` | Fechamento administrativo, frota, diário de bordo e auditoria diff |
| `src/componentes/DashboardOS/DashboardControleCombustivel/` | Gestão de diesel, arla, veículos e geradores |
| `src/componentes/DashboardApontamentoOS/` | Terminal totem para apontamento de mecânicos na oficina |
| `src/componentes/DashboardChefeSetor/` | Triagem de chamados e autorização de orçamentos pelo gestor |
| `src/componentes/DashboardTecnico/` | Painel mobile-first para técnicos em campo |
| `src/componentes/DashboardBlocoRequisicao/` | Abertura de novos chamados e requisições pelos setores |
