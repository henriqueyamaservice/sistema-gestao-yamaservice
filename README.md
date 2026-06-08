# Sistema de Almoxarifado

Um sistema completo de gerenciamento de almoxarifado, desenvolvido com separação entre Front-end e Back-end. O sistema permite listar produtos, criar requisições de material e interagir com pedidos, contando com rotinas de integração com o ERP Omie.

## 🗂 Estrutura do Projeto

O projeto é um monorepo simples contendo as duas aplicações:

- **Raiz do projeto (`/`)**: Front-end (React + Vite)
- **Pasta `/back-end`**: Back-end (Node.js + Express)

## 🚀 Tecnologias Utilizadas

### Front-end
- **React 19**
- **Vite** (Bundler e Dev Server)
- **Lucide React** (Biblioteca de ícones)
- **CSS** (Vanilla CSS)

### Back-end
- **Node.js**
- **Express.js** (Framework de rotas)
- **CORS** & **Dotenv** (Gerenciamento de ambiente)
- **Armazenamento (JSON)**: Os dados são simulados em arquivos `.json` salvos localmente na pasta `back-end/data/`.

---

## 🛠️ Como Executar o Sistema Localmente

### 1. Inicializando o Back-end
O back-end roda por padrão na porta **3000**.
```bash
# Entre na pasta do back-end
cd back-end

# Instale as dependências (caso não tenha feito ainda)
npm install

# Inicie o servidor
npm run dev
# ou
node server.js
```

### 2. Inicializando o Front-end
O front-end roda com o Vite na porta padrão (ex: **5173**).
Em um novo terminal:
```bash
# Na raiz do projeto (pasta sistema-almoxarifado)

# Instale as dependências do front-end
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

## 📏 Regras de Negócio e Processos

### Perfis de Usuários
- **Almoxarifado**: Solicita a reposição de itens (Requisição) e é o responsável físico por receber a mercadoria quando o caminhão chega. **Não tem permissão/função para cadastrar produtos novos**.
- **Compras**: Recebe a requisição do Almoxarifado, faz a cotação, **cadastra produtos novos diretamente na Omie** (gerando o Pedido de Compra) e envia para faturamento.

### Recebimento de Produtos & Estoque
- **Estoque Físico x Trânsito**: O fato do setor de Compras ter feito o pedido na Omie **não soma o produto no estoque**. O produto fica com status de "Aguardando Recebimento".
- **Bipagem Individual**: Quando o produto chega, o funcionário do Almoxarifado usa a tela de "Recebimento de Produtos" e bipa item a item usando o código de barras, garantindo conferência cega. Apenas neste momento o estoque físico no sistema é atualizado.
- **Recebimento Parcial**: Caso falte algum produto na entrega (ex: comprou 100, chegaram 90), o Almoxarifado recebe apenas os 90, e o sistema exige uma **Observação Obrigatória**. O pedido ganha o status de "Recebido Parcialmente" para que o setor de Compras possa gerenciar a pendência junto ao fornecedor.

---

## 🔌 API e Rotas do Back-end

A API está configurada para gerenciar os produtos, requisições e integração simulada com o Omie.

- `GET /api/produtos`: Retorna os produtos (requer sincronização prévia com a Omie).
- `POST /api/requisicao`: Cria uma nova requisição de itens no almoxarifado.
- `GET /api/requisicoes`: Lista todas as requisições geradas.
- `GET /api/pedidos`: Lista pedidos que estão com status de "Aguardando Recebimento" na Omie.
- `POST /api/pedidos/:id/receber`: Confirma o recebimento de um pedido e atualiza (simulado) na Omie.

---

## ⚙️ Integração com a Omie

O sistema possui uma rotina preparada para sincronizar informações diretamente com o ERP Omie:

1. Acesse a pasta `back-end`.
2. Renomeie o arquivo `.env.example` para `.env` e preencha as variáveis de ambiente necessárias (App Key / App Secret).
3. Para buscar os produtos da Omie, rode o script de sincronização:
   ```bash
   npm run sync:omie
   ```
Esse comando irá preencher/atualizar o arquivo `produtos.json` dentro da pasta `back-end/data/`.
