# Documentação Oficial: Módulo de Compras (Pipeline)

Este documento descreve as funcionalidades, o fluxo arquitetural e as regras de negócio implementadas no módulo de **Compras**, além dos próximos passos de integração com a Omie.

---

## 1. Arquitetura de Pipeline (Esteira de Compras)

O sistema de compras foi desenhado com uma arquitetura de "Pipeline" (Funil/Esteira). A requisição não fica estática; ela avança de estágio em estágio, forçando o processo lógico. No banco de dados (`requisicoes.json`), o campo `status_compras` controla onde a requisição se encontra.

### As 5 Fases do Processo:
1. **Fila de Requisições** (`pendente_cotacao`):
   - **O que faz:** Recebe as solicitações de reposição vindas do Almoxarifado.
   - **Ação:** O botão "Iniciar Cotação" sequestra o card, atualiza o status para `em_concorrencia` e envia a requisição para a próxima aba.
2. **Concorrência** (`em_concorrencia`):
   - **O que faz:** Permite adicionar múltiplas propostas comerciais para o mesmo item (lançamento de preços e prazos usando o banco de Fornecedores da Omie).
   - **Ação:** "Finalizar Cotações" agrupa todas as ofertas e avança o status para `em_orcamento`.
3. **Orçamentos** (`em_orcamento`): *(Próxima etapa a desenvolver)*
   - **O que faz:** Tela para o gestor visualizar a "batalha de preços" de cada item, ver qual é o fornecedor mais barato e **Aprovar**.
4. **Compras / Pedidos** (`aguardando_pedido`): *(Próxima etapa a desenvolver)*
   - **O que faz:** Momento de fechamento oficial. Geração da Ordem de Compra.
   - **Integração:** Aqui acontecerá a comunicação vital com a Omie (Criação de Pedido de Compra).
5. **Entrada no Estoque / Manutenção** (`aguardando_entrega`):
   - **O que faz:** Aguarda a chegada física do material.
   - **Ação:** Confirmar Recebimento (pode ser parcial) e finalização do ciclo, impactando os saldos em `produtos.json`.

---

## 2. Recurso Transversal: Substituição por Similaridade

Uma das lógicas mais importantes implementadas é a **Substituição por Similaridade**. 
Durante qualquer fase (Fila, Concorrência, Orçamentos, etc.), caso o produto solicitado esteja em falta ou o fornecedor tenha enviado uma marca/modelo alternativo, o usuário pode clicar no botão **"Substituir Peça por Similar"**.

- **Como funciona:** Um modal global (`ModalSubstituicao`) é aberto. Ele pesquisa em tempo real na base de produtos da Omie.
- **Rastreabilidade:** O usuário seleciona a nova peça e escreve uma justificativa. O banco de dados grava a alteração no item, mas mantém a estrutura `substituicao: { codigoOriginal, descricaoOriginal, motivo, data }` para o Almoxarifado ou a gestão entenderem o porquê de ter chegado um produto diferente do que foi pedido.

---

## 3. Integrações com o ERP Omie (Status Atual)

O sistema opera de forma local consumindo dados que são sincronizados ativamente (ou sob demanda) da plataforma Omie.

### Já Implementado e Funcionando:
1. **Produtos (`produtos.json`):**
   - Script: `sync-omie-produtos.js`
   - O que faz: Baixa milhares de produtos ativos do cadastro da Omie para o sistema utilizar (usado nas requisições e nas substituições).
2. **Fornecedores / Clientes (`fornecedores.json`):**
   - Script: `sync-omie-fornecedores.js`
   - O que faz: Baixa milhares de fornecedores cadastrados na Omie. A API converte os dados simplificados (Nome Fantasia, Razão Social, CNPJ e Código Omie). Utilizado no dropdown da tela de Concorrência.

### Próximos Passos (Para a próxima sessão):
1. **Construir a tela "Orçamentos":**
   - Ler os dados inseridos na tela "Concorrência".
   - Permitir que o usuário escolha o fornecedor vencedor por item ou no pacote total.
2. **Construir a tela "Compras / Pedidos" (O Grande Marco):**
   - Pegar o orçamento vencedor e os itens aprovados.
   - **Integração Omie:** Desenvolver a comunicação via API (POST) que criará um **Pedido de Compra** real dentro do painel da Omie, incluindo o Código do Fornecedor e o valor acordado.
3. **Construir "Entrada no Estoque":**
   - Fechar o fluxo. Confirmar o recebimento físico com base no pedido de compra gerado na etapa anterior.

---
*Este documento reflete o estado atual da arquitetura do módulo de compras. Todo o processo foi desenhado para seguir um fluxo lógico e auditável de ponta a ponta.*
