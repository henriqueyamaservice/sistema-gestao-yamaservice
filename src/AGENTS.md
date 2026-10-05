# Frontend Rules & Business Flow Guidelines (src/AGENTS.md)

Este documento define as regras de arquitetura, estilos e fluxo de trabalho do Front-end do Sistema de Almoxarifado & Gestão de Ordens de Serviço.

> **DIRETRIZ MÁXIMA (DOCUMENTAÇÃO VIVA E AUTO-PURGA):** 
> Nenhum Agente tem permissão para deixar este arquivo obsoleto. Se durante uma tarefa você (Agente) modificar, substituir ou remover uma funcionalidade descrita aqui, você é **OBRIGADO** a deletar ou atualizar as regras antigas neste documento. **Não mantenha histórico de coisas que não existem mais.** Se a regra mudou, a documentação tem que ser reescrita no mesmo instante.

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

## 4. Blindagem de Odômetro, Horímetro & Controle de Revisões (`formatadorOdometro.js` & `RevisaoVeiculo`)

### 4.1. Integração nos 4 Dashboards
O odômetro (KM) dos veículos e o horímetro das máquinas/geradores são atualizados de forma centralizada a partir de múltiplos formulários:
1. **`DashboardControleCombustivel` (`FormularioRequisicao` & `FormularioAbastecimento`):**
   - Ao selecionar o veículo ou a granja/gerador, o formulário exibe o badge com o **último registro gravado** (`📌 Último: 408.974,1 km`).
   - O motorista ou operador informa o KM/Horímetro no abastecimento, disparando a atualização no banco.
2. **`DashboardOS` (`FormularioServicoOS`):**
   - Ao concluir a O.S., varre os serviços e veículos utilizados. Se detectar *"Troca de Óleo"* ou *"Revisão"*, atualiza o `kmAtual`, `kmTrocaOleo` e `kmRevisao`.
3. **`DashboardApontamentoOS` (`PainelApontamentoOS` Totem):**
   - Lançamento de KM inicial e final no Diário de Bordo da Oficina.
4. **`DashboardTecnico` (`FormularioServicoTecnico` Mobile):**
   - Lançamento do atendimento de campo com KM vinculado à O.S.

### 4.2. Painel de Controle de Revisões (`RevisaoVeiculo` & `RevisaoGerador`)
- **Cálculo de Metas Preventivas:**
  - Troca de Óleo: Ciclos configuráveis (padrão a cada 10.000 km ou 250 h).
  - Revisão Geral: Ciclos configuráveis (padrão a cada 40.000 km ou 1.000 h).
- **Status Visuais Automatizados:**
  - `EM DIA ✅`: Progresso seguro (< 90% do intervalo).
  - `ATENÇÃO ⚠️`: Próximo do limite (> 90% do intervalo).
  - `ATRASADO 🔴`: Odômetro ultrapassou a quilometragem/hora alvo.
- **Abertura de O.S. Preventiva em 1 Clique:** O botão no card da revisão abre diretamente uma nova O.S. preventiva no setor de mecânica com os dados do veículo e instruções de insumos.

### 4.3. Trava Anti-Retrocesso Global
- Garante que um valor de KM ou Horímetro digitado acidentalmente menor que o registro histórico nunca retroceda o odômetro do veículo no banco de dados.

---

## 5. Classificador de Tipos de Medição (`src/utils/classificadorUnidades.js`)

Todos os produtos e consumíveis do sistema seguem uma categorização universal de medição:
- **📦 Peça / Unidade (`UN`, `PC`, `CX`, `KT`, `PAR`):** Números inteiros (`step="1"`).
- **💧 Líquido em Litros (`L`, `LT`, `GL`, `TB`):** Permite decimais (`step="0.01"`, ex: `2,5 L`, `0,8 L`).
- **📏 Metragem Linear (`M`, `MT`, `RL`):** Permite decimais (`step="0.01"`, ex: `1,50 m`, `12,0 m`).
- **⚖️ Peso / Granel (`KG`, `G`):** Permite decimais (`step="0.01"`, ex: `0,5 kg`).

### Aplicações no Front-end:
1. **Almoxarifado & Estoque (`Estoque` e `ProdutoModal`):** Badges coloridos por tipo de material e saldo exibido com precisão decimal.
2. **Totem & Apontamento (`PainelApontamentoOS` e `ModalEdicaoDiaTotem`):** Input adapta o `step` e o sufixo da unidade automaticamente ao escolher o produto.
3. **Chefe de Setor (`ModalOrcamentoChefeSetor`):** Preço unitário exibido com a unidade correspondente (`R$ 28,00/L`, `R$ 15,00/m`).
4. **Impressão da O.S. (`ImpressaoOS`):** Coluna de materiais consumidos imprime o valor com a unidade exata (ex: `2,5 L`, `1,8 m`, `3 un`).

---

## 6. Sincronização e Tabela de Combustível (`DashboardControleCombustivel`)

1. **Sincronização sem Mutações Locais:**
   - Adições, abastecimentos e cancelamentos recarregam o estado via `fetchRequisicoes()` direto da API (`?_t=${Date.now()}`), evitando inconsistências de memória.
2. **Busca Multicritério:**
   - O filtro pesquisa simultaneamente por Nº Requisição, Motorista, Requisitante, Veículo, Placa, Fornecedor, Cupom e Tipo de Combustível.
3. **Blindagem de Chaves de Renderização:**
   - Todas as linhas utilizam chaves com prefixo seguro (`key={req.id ? req-${req.id} : nr-${req.numeroRequisicao}-${index}}`).

---

## 7. Terminal de Apontamento da Oficina (`DashboardApontamentoOS`)

1. **Fluxo Passo-a-Passo para Totem / Tablet:**
   - **Passo 1 (Executor):** Identificação de quem está realizando o apontamento.
   - **Passo 2 (O.S.):** Seleção da Ordem de Serviço aberta.
   - **Passo 3 (Diário de Bordo):** Lançamento de turnos e horas trabalhadas.
   - **Passo 4 (Materiais & Peças):** Lançamento de peças de estoque ou externas com foto da NF.
   - **Passo 5 (Frota):** Veículos utilizados com KM inicial/final.
   - **Passo 6 (Conclusão):** Revisão e envio com comprovante.
2. O nome do executor é persistido na O.S. e gera o selo **"Apontamento do Colaborador"** no `FormularioServicoOS`.

---

## 8. Listagem Global de O.S. (`TabelaOS`)

1. **Ordenação Cronológica Inteligente de 3 Níveis:**
   - **1º Nível (Ano):** 2026 > 2025.
   - **2º Nível (Mês):** O.S. do mês atual (ex: Setembro `09`) ficam sempre acima do mês anterior (ex: Agosto `08`).
   - **3º Nível (Número):** Dentro do mesmo mês, ordena decrescente (`162-0826` > `01-0826`).
2. **Otimização de Espaço:** A coluna numérica redundante ("Or") foi removida para priorizar as colunas de negócio.

---

## 9. Mapa dos Componentes Front-end

| Módulo / Arquivo | Responsabilidade |
| :--- | :--- |
| `src/componentes/DashboardOS/index.jsx` | Painel principal administrativo da mecânica/oficina |
| `src/componentes/DashboardOS/componentes/TabelaOS/` | Tabela geral de O.S. com filtros, gráficos e ordenação inteligente |
| `src/componentes/DashboardOS/componentes/FormularioServicoOS/` | Fechamento administrativo, frota, diário de bordo e auditoria diff |
| `src/componentes/DashboardOS/DashboardControleCombustivel/` | Gestão de diesel, arla, veículos, revisões e geradores |
| `src/componentes/DashboardApontamentoOS/` | Terminal totem para apontamento de mecânicos na oficina |
| `src/componentes/DashboardChefeSetor/` | Triagem de chamados e autorização de orçamentos pelo gestor |
| `src/componentes/DashboardTecnico/` | Painel mobile-first para técnicos em campo |
| `src/componentes/DashboardOS/componentes/TabelaPrestacaoServicos/` | Listagem dedicada de serviços prestados para granjas com KPIs financeiros |
| `src/componentes/DashboardOS/componentes/FormularioPrestacaoServico/` | Fechamento/faturamento com cobrança detalhada de HH, TRA, MAT e VEI |
| `src/componentes/DashboardOS/componentes/ImpressaoPrestacaoServico/` | Espelho de impressão idêntico ao modelo oficial físico de atendimento 278-0726 |
| `src/utils/classificadorUnidades.js` | Classificação universal de medições (unidades, litros, metros, kg) |
| `src/utils/formatadorOdometro.js` | Formatação e validação anti-retrocesso de KM e Horímetro |

---

## 10. Módulo de Prestação de Serviços para Granjas (Cobrança Externa)

1. **Separação Visual e Funcional:**
   - As O.S. de Prestação de Serviços não se misturam com as manutenções internas da oficina.
   - Navegação pelo submenu dedicado **"Serviços Prestados"** (`abaRelatorio === 'prestacao-servicos'`).
2. **Abertura Integrada:**
   - Reutiliza o `FormularioOS` com o tipo `PRESTACAO_SERVICO`.
   - Campo de destino sugere dinamicamente a lista oficial de granjas (`G. KAWAMURA`, `G. ITA`, `G. MOSQUEIRO`, etc.).
3. **Diário de Bordo por Dias / Turnos (`FormularioPrestacaoServico`):**
   - Suporte a múltiplos dias de atendimento (1 dia, 5 dias, 15 dias ou mais).
   - O gestor adiciona os dias com `+ Adicionar Dia / Turno` (Dia #1, Dia #2, etc.).
   - Cada dia registra sua **data**, **horários de trabalho em 2 turnos com intervalo de almoço**, **descrição das atividades executadas** e sua própria lista de recursos cobrados no dia:
     - `HH`: Homem-Hora (funcionários e horas trabalhadas na data).
     - `TRA`: Tratores e Máquinas (horas operadas no dia).
     - `MAT`: Materiais e Consumíveis (produtos retirados do estoque Omie).
     - `EXT`: **Peça Externa / Compra Fora (com NF)**: Peças compradas no comércio local com nome livre, valor pago, nº da NF e anexo de foto comprimida do cupom/comprovante com zoom e impressão anexa.
     - `VEI`: Veículos da frota (diárias ou viagens utilizadas no dia).
   - Apresenta o **Subtotal individual de cada dia** e permite alternar para a aba **Extrato Geral Consolidado** com todos os recursos cronológicos.
   - Cálculo automático do período total (`Data/Hora Início` do primeiro dia até `Data/Hora Fim` do último dia).
4. **Controle Inteligente de Turnos nos 4 Módulos de O.S.:**
   - Aplicado em: `FormularioPrestacaoServico`, `FormularioServicoOS`, `PainelApontamentoOS` / `ModalEdicaoDiaTotem` e `DashboardTecnico`.
   - Seletor rápido de 4 modos: `Dia Todo (Almoço)` (Integral), `Só Manhã`, `Só Tarde` e `Contínuo`.
   - Desconto automático do almoço e badge em tempo real com `Total Efetivo: XhXXm (X.XX hrs)`.
   - Sincronização automática das horas calculadas com os membros da equipe (`maoDeObra`).
   - Compatibilidade retroativa garantida via `detectarModoTurno()`.
5. **Espelho de Impressão Oficial Paginado (`ImpressaoPrestacaoServico`):**
   - Layout vetorial compatível com folha A4 reproduzindo com fidelidade a folha física `278-0726` da Yamaservice.
   - Cabeçalho exibe o período completo calculado do Diário de Bordo.
   - Página extra anexa gerada automaticamente para visualização das fotos dos comprovantes fiscais anexados.
   - Quebra de página segura para serviços longos de 15+ dias com preservação de formatação contábil e campos de assinatura.

---

## 11. Módulo Almoxarifado, Separação de Pedidos & Sincronização Omie

### 11.1. Abertura Manual de Saída no Balcão (`NovaRequisicao`)
1. **Atribuição Automática de Vendedor / Estoquista pelo Login**:
   - O campo Vendedor / Estoquista vem pré-preenchido automaticamente a partir do usuário autenticado no sistema (`localStorage.getItem('almoxarifado_user')`).
   - O sistema cruza o nome com a lista de vendedores oficiais (`vendedores_omie`) vinculando `codigoVendedorOmie`.
   - Permite alteração caso outro operador esteja operando o balcão.
2. **Conclusão Direta e Imediata de Balcão**:
   - Como os itens já estão sendo entregues presencialmente no balcão, ao clicar em "Concluir Entrega e Imprimir", a requisição é gravada com `status: 'finalizado'` e `origem: 'balcao_almoxarifado'`.
   - **NÃO entra na fila do `PainelPedidos`**: cai diretamente no `RelatorioRequisicoes` como concluída.
   - Faz a baixa imediata no saldo de estoque do MariaDB e dispara a criação da Remessa Omie de saída automaticamente.
3. **Classificação Universal de Medições e Metadados do Produto (`Endereço`, `Marca`, `Validade`)**:
   - Integrado ao `classificadorUnidades.js`: reconhece automaticamente se o item é medido em **Metros** (`m`), **Peso** (`kg`), **Líquidos** (`L`) ou **Quantidade Inteira** (`un`, `pc`, `cx`).
   - Se a unidade admitir fracionamento (metro, peso, líquido), o input de quantidade habilita decimais (`step="0.01"`, `min="0.01"`).
   - O bloco de adição de produtos e o carrinho exibem visualmente:
     - 📍 **Endereço**: Posição física no armazém (ex: corredor, prateleira, gaveta).
     - 🏷️ **Marca**: Fabricante/marca do produto.
     - ⏳ **Validade**: Badge com cálculo dinâmico de vencimento (verde se no prazo, laranja se próximo de 30 dias, vermelho se vencido).
     - 📦 **Estoque Disponível**: Saldo formatado com a unidade de medida.
4. **Bipagem Contínua via Scanner de Código de Barras**:
   - O campo de busca de produtos aceita bipagem física direta (EAN, código ou código de lote).
   - Ao teclar `Enter` no leitor: seleciona o produto e foca automaticamente no campo de quantidade.
   - Ao teclar `Enter` na quantidade: adiciona o item ao carrinho e devolve o foco imediatamente para a busca.
5. **Alerta Inteligente FEFO (First Expire, First Out)**:
   - Se o produto tiver múltiplos lotes cadastrados, exibe alerta modal obrigatório indicando o lote de validade mais próxima a ser retirado prioritariamente.
6. **Mapeamento de Clientes e Projetos Omie**:
   - Datalist de Clientes captura o ID Omie (`codigoClienteOmie`).
   - Datalist de Projetos / O.S. normaliza a numeração (`102-0826` ↔ `1020826`) e vincula o `codigoProjetoOmie` automaticamente.
7. **Comprovante de Saída Térmico**:
   - Emissão de extrato para impressoras térmicas (48mm/80mm) com cabeçalho Yamaservice, data, solicitante, vendedor/estoquista, itens formatados com sua respectiva unidade de medida e campos de assinatura.

### 11.2. Painel de Separação de Pedidos Remotos (`PainelPedidos`)
1. **Fila Exclusiva para Solicitações à Distância**:
   - O `PainelPedidos` recebe e gerencia **apenas** requisições pendentes solicitadas à distância pelo **Chefe de Setor** ou **Técnico de Campo** via O.S.
   - Não se mistura com as saídas diretas de balcão já concluídas.
2. **Scanner de Conferência no Almoxarifado**:
   - Modal de entrega com scanner de código de barras para bipar e conferir cada peça antes da liberação.
   - Vendedor pré-preenchido com o usuário logado para agilidade.
   - Suporte a entrega parcial com controle de saldo restante.
3. **Disparo Automático de Remessa Omie**:
   - Ao confirmar a entrega no modal, o backend atualiza o status para `finalizado`, baixa estoque e dispara a criação da Remessa de Saída na Omie com status **PENDENTE**.

### 11.3. Gestão e Auditoria de Remessas (`RelatorioRequisicoes`)
1. **Badges de Rastreabilidade Omie**:
   - 🟢 `Omie #12345 (Pendente)`: Remessa criada com sucesso no ERP pronta para conferência de departamento.
   - 🔴 `⚠️ Falha Omie`: Alerta em vermelho indicando inconsistência no envio, acompanhado do botão **Reenviar Remessa**.
2. **Reenvio Resiliente**:
   - Botão **"Reenviar Remessa"** (`POST /api/requisicoes/:id/reenviar-remessa`) permite reprocessar remessas pendentes com resolução automática de projetos e vendedores.
3. **Devolução e Estorno**:
   - Registro de devolução de peças não utilizadas com reabastecimento imediato no estoque local e geração de registro de devolução na Omie.

### 11.4. Necessidade de Compras & Reposição Preventiva de Estoque (`NecessidadeCompras`)
1. **Reposição Livre do Catálogo com Layout Split-View Panorâmico (Opção A)**:
   - Botão **"+ Adicionar Produto do Estoque"** abre o modal ultra-amplo (`max-width: 1650px; height: 94vh;`) estruturado em **2 colunas independentes (Split-View)**:
     - **Coluna da Esquerda (Catálogo & Busca de Materiais - `1fr`)**:
       - Campo de busca em largura total com foco automático, ícone SVG `<Search />` e botão de limpeza rápida;
       - Tabela/cards de produtos em 4 colunas verticais com ícones vetoriais (`lucide-react`): código/unidade, descrição limpa sanitizada, localização/marca, métricas de saldo/mínimo/em compra, e botão `Selecionar →`;
       - Ao selecionar um material: painel de ajuste com saldo, estoque mínimo, localização, campo de quantidade (com suporte a decimais para metros/litros/kg), atalhos rápidos (+10, +25, +50, +100, +200) e botões de ação para adicionar.
     - **Coluna da Direita (Painel / Carrinho do Pedido Atual - `390px` fixos)**:
       - Sidebar vertical dedicada que lista em tempo real todos os materiais adicionados à requisição;
       - Cabeçalho com ícone `<ShoppingCart />`, título claro e contador dinâmico de itens;
       - Cada material é exibido em um cartão vertical individual contendo o código em badge, descrição completa legível (sem quebra inadequada de texto), badge de quantidade em destaque (`Qtd: 10 UN`) e botão de exclusão individual com `<Trash2 />`;
       - Rodapé fixo da sidebar com totalizador e botão primário em largura total: **`Finalizar Pedido (X itens) →`**, sem truncamento de texto.
   - **Adição Contínua de Múltiplos Materiais**:
     - O usuário pode adicionar quantos materiais desejar ao mesmo pedido;
     - Se o mesmo item for adicionado novamente, o sistema funde e soma a quantidade automaticamente;
     - Botão `+ Adicionar ao Pedido e Buscar Próximo` exibe toast de confirmação e volta imediatamente a pesquisa de materiais com a sidebar da direita mantendo todo o histórico visualmente acessível.
2. **Ciclo Completo de Status do Compras até o Recebimento Físico**:
   - **Em Processo de Compra**: Itens solicitados exibem badge com a etapa real atualizada pelo setor de compras (*Aguardando Cotação*, *Em Cotação*, *Pedido Feito ao Fornecedor*, *Aguardando Entrada / NF-e*).
   - **Recebidos no Almoxarifado**: Quando o almoxarife confere a mercadoria no `RecebimentoProdutos`, a requisição é marcada como entregue e o produto passa a exibir o badge verde de confirmação `✅ Recebido no Estoque (+X un em DD/MM/AAAA)`, deixando explícito que a compra foi concluída e o material já deu entrada física no estoque.
3. **Abas Organizadoras e Métricas em Tempo Real**:
   - Abas dedicadas: *Aguardando Solicitação*, *Em Processo de Compra*, *Recebidos no Estoque* e *Todos em Alerta*.
   - Métricas no topo contabilizam cada estado para visibilidade instantânea da equipe.

---

## 12. Tríade de Agentes Especialistas Front-end & Regra de Purga Contínua

Para manter o ecossistema front-end 100% atualizado, modular e livre de código morto ou órfão, o desenvolvimento é guiado por três agentes especialistas locais, governados pelo protocolo unificado de auto-sincronização:

1. **Protocolo Geral de Sincronização & Purga**: [.agents/rules/regra-sincronizacao-e-purga.md](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/regra-sincronizacao-e-purga.md)
   - Proibido manter pastas ou arquivos órfãos após substituições funcionais.
   - Sincronização obrigatória dos mapas de estado e APIs após qualquer intervenção.
   - Proibição absoluta de URLs absolutas com `localhost:3000` (sempre `/api/...`).
   - Uso restrito de CSS Modules (`.module.css`) e variáveis `var()`. Proibido Tailwind.
   - Proibido emojis no código; usar ícones de `lucide-react`.

2. **Agente Especialista do Almoxarifado**: [.agents/rules/agente-almoxarifado.md](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/agente-almoxarifado.md)
   - Escopo: `NovaRequisicao`, `PainelPedidos`, `RecebimentoProdutos`, `NecessidadeCompras`, `RelatorioRequisicoes`, `DevolucaoMateriais` e `EstoqueLocais`.
   - Regras-chave: Bipagem contínua via scanner físico, alerta FEFO de lotes, saídas diretas de balcão concluídas na hora com vendedor pelo login, remessas Omie automáticas com status PENDENTE e WebSockets em tempo real.

3. **Agente Especialista de Compras & Inteligência Artificial**: [.agents/rules/agente-compras.md](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/agente-compras.md)
   - Escopo: `Orcamentos`, `PedidosCompra`, `Fornecedores`, `ProdutosCompras`, `AssistenteIAOrcamento` e `AssistenteComprasGlobal`.
   - Regras-chave: Ciclo de status de compras conectado ao almoxarifado, IA para leitura de cotações em PDF/imagem (Groq `llama-3.3-70b-versatile`), assistente em popover global flutuante e auditoria de cotações.

4. **Agente Especialista de Recebimento Fiscal**: [.agents/rules/agente-recebimento-fiscal.md](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.agents/rules/agente-recebimento-fiscal.md)
   - Escopo: `DashboardRecebimentoFiscal`, `MenuRecebimentoFiscal`, `ModalBiparChaveNFe` (Tela 1), `ModalConferenciaNFe` (Tela 2 com as 7 abas oficiais do Omie) e Submodal de Detalhamento Tributário por Item (Tela 3).
   - Regras-chave: Importação e parsing completo de XML de NF-e / DANFE, conferência fiscal oficial Omie em 7 abas (*Itens*, *Transporte*, *Totais*, *Parcelas*, *Departamentos/Rateio*, *Informações Adicionais* e *Observações*), submodal com 8 sub-abas tributárias e de custos por item, conciliação e abatimento de contas a pagar por falta física, e blindagem anti-fechamento de modais.

5. **Pelotão de Frota, Oficina e Operação Mobile**:
   - Foram criados 8 novos agentes cirúrgicos para garantir a especialização de cada tela:
   - `agente-os.md`: Gerência master do `DashboardOS`.
   - `agente-apontamento-os.md`: Totem de mecânicos e diário de bordo.
   - `agente-chefe-setor.md`: Triagem, orçamentação e delegação.
   - `agente-tecnico.md`: Painel mobile-first individual do mecânico.
   - `agente-bloco-requisicao.md`: App de requisição (carrinho de compras) para operários de fábrica.
   - `agente-frentista-yamaves.md`: Lançamento cego de litros de bomba e foto do visor.
   - `agente-motorista.md`: App para SOS de quebra na estrada e pedido de combustível.
   - `agente-error-boundary.md`: Escudo anti-crash geral do React (`ErrorBoundary.jsx`).

