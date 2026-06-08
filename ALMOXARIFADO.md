# Documentação: Módulo Almoxarifado

O módulo de **Almoxarifado** é a interface central para a gestão física do estoque da empresa. Ele não cadastra produtos, mas consome a base de dados sincronizada com o ERP Omie e tem as seguintes responsabilidades principais:

## 1. Dashboard Principal (Estoque Atual)
A tela inicial fornece uma visão em tempo real de todos os produtos do estoque.
- **Listagem Dinâmica:** Exibe Código, Descrição, Endereço (Corredor/Prateleira), Marca e a quantidade em Estoque.
- **Leitura Inteligente Omie:** O sistema busca a marca e o endereço não apenas nos campos nativos, mas também varre a matriz de "Características" do produto diretamente da Omie.
- **Indicadores Visuais de Estoque:** A coluna de estoque mostra de forma rápida a saúde do produto, no formato `Verde (Disponível) / Vermelho (Estoque Mínimo)`.
- **Filtros e Busca:** É possível buscar rapidamente por nome ou código do produto.

## 2. Alertas e Requisições (Reposição)
O sistema ajuda o almoxarife a identificar facilmente o que precisa ser comprado e notificar o setor de compras.
- **Botão de Alertas:** Filtra instantaneamente todos os produtos cuja quantidade física está igual ou abaixo do estoque mínimo.
- **Selo "Em Compra":** Produtos que já foram solicitados ganham um selo visual (ex: `🛒 Em Compra (10)`), evitando requisições duplicadas.
- **Gerador de Requisições:** Selecionando os produtos em alerta, o usuário entra numa tela de "Carrinho" onde informa a quantidade necessária para reposição. O sistema calcula o "Valor Total" estimado (sempre exibindo os totais e ocultando preços individuais, por regra de negócio).

## 3. Relatórios de Saídas
Uma tela dedicada ao histórico de requisições concluídas (sejam saídas para OS, uso interno ou ferramentas).
- **Lista de O.S. / Info:** Mostra quem solicitou, data, hora, itens e valor total da requisição.
- **Busca em Tempo Real:** Uma barra de pesquisa permite filtrar as requisições por Nome do Cliente, Número da O.S ou Data (ex: 15/05).
- **Ações de Exportação:**
  - **Baixar Planilha:** Exporta os itens daquela OS para formato Excel (.csv).
  - **Imprimir Comprovante:** Gera um recibo térmico de "Via do Almoxarifado" otimizado para impressão (40/80mm) para assinatura do colaborador que retirou a peça.

## 4. Recebimento de Produtos (Entrada Física)
Interface desenhada para a conferência cega (quando a mercadoria chega fisicamente).
- **Bipagem Individual:** O sistema espera que o almoxarife bipe o código de barras do produto.
- **Tratamento de Pendências:** Caso o pedido venha faltando peças, o almoxarife pode aceitar parcialmente, e o sistema exige uma observação para que o setor de Compras negocie com o fornecedor depois.
