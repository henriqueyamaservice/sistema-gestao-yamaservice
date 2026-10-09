# 🏢 Sistema de Gestão Yamaservice

[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Framework-Express.js-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MariaDB](https://img.shields.io/badge/Database-MariaDB%20%2F%20MySQL-003545?logo=mariadb&logoColor=white)](https://mariadb.org/)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

Plataforma corporativa integrada para gestão operacional, logística, compras, oficina e recebimento fiscal, contando com sincronização nativa em tempo real com o **ERP Omie**, leitura automatizada de **DF-e SEFAZ** e inteligência artificial para cotações.

---

## 🧭 Módulos do Sistema

### 📦 1. Almoxarifado & Controle de Estoque
- **Estoque em Tempo Real**: Visão completa dos produtos cadastrados, saldos físicos e integração com o Omie.
- **Controle de Lotes e Validades (FEFO)**: Rastreamento inteligente de vencimentos (*First Expired, First Out*).
- **Requisições de Materiais**: Terminal para saídas de balcão, requisição rápida por técnicos e aprovações.
- **Conferência Física**: Bipagem ágil por leitor de código de barras (EAN).
- **Remessas Omie**: Integração automática de saídas e requisições no ERP com vínculo de Projetos e Departamentos.

### 💼 2. Compras & Inteligência Artificial
- **Gestão de Cotações & Orçamentos**: Controle completo de cotações com múltiplos fornecedores e concorrência de preços.
- **Assistente IA de Orçamentos**: Leitura inteligente e extração automatizada de itens, preços e condições de propostas comerciais em PDF ou texto.
- **Histórico de Compras**: Rastreamento histórico de aquisições por item e fornecedor.
- **Geração de Pedidos**: Emissão direta de pedidos de compra no ERP Omie.

### 🧾 3. Recebimento Fiscal (NF-e)
- **Entrada Automatizada**: Importação via chave de acesso de 44 dígitos ou upload de arquivos XML.
- **Integração SEFAZ DF-e**: Consulta e download direto de notas fiscais emitidas contra o CNPJ utilizando Certificado Digital A1.
- **Conferência Fiscal em 7 Abas**:
  - *Itens*: Vínculo De-Para entre produto da nota e cadastro Omie.
  - *Transporte*: Dados do frete, transportadora e volumes.
  - *Totais & Impostos*: Conferência dos valores fiscais da NF-e.
  - *Parcelas (Duplicatas)*: Prazos e valores financeiros.
  - *Departamentos & Projetos*: Rateio contábil e de centro de custo.
  - *Informações Adicionais*: Mensagens fiscais e de interesse do contribuinte.
  - *Observações Internas*: Registro de ocorrências no recebimento.
- **Submodal de Tributação**: Conferência minuciosa de ICMS, IPI, PIS, COFINS e substituição tributária.
- **Conciliação Física x Fiscal**: Abatimento financeiro automático em caso de falta física comprovada.

### 🛠️ 4. Ordens de Serviço & Oficina
- **Gestão Completa de O.S.**: Abertura, diagnóstico, apontamento de peças, serviços e finalização.
- **Terminal Totem da Oficina**: Interface de apontamento dedicada para mecânicos e técnicos registrarem tempo e materiais utilizados.
- **Plano de Manutenção Preventiva**: Acompanhamento de revisões periódicas de frotas e geradores com alerta preditivo.
- **Blindagem de Odômetro/Horímetro**: Travas contra retrocesso de quilometragem e horímetro.
- **Auditoria com Diff Visual**: Comparador de alterações antes/depois no desbloqueio e edição de ordens de serviço finalizadas.

### ⛽ 5. Controle de Combustível & Abastecimento
- Registro de abastecimentos de veículos e geradores com cálculo automatizado de consumo médio (km/l).
- Assistente rápido de abastecimento e integração com o estoque de combustíveis.

### 🔐 6. Usuários & Permissões
- Gestão granular de perfis de acesso por módulo (*Almoxarifado, Compras, Oficina, Recebimento Fiscal, Frentista, Gerência*).
- Autenticação protegida e alternância rápida de módulos pelo menu do usuário.

---

## 🏗️ Arquitetura e Tecnologias

### Front-end
- **React 19**: Interface moderna, reativa e componentizada.
- **Vite**: Build tool veloz e ambiente de desenvolvimento otimizado.
- **CSS Modules (`.module.css`)**: Estilização isolada por componente, sem classes globais conflitantes, utilizando variáveis CSS nativas (`var(--cor-...)`) para suporte a temas.
- **Lucide React**: Ícones corporativos consistentes.

### Back-end
- **Node.js + Express**: API REST modular e performática.
- **MariaDB / MySQL**: Banco de dados relacional com pool assíncrono de conexões (`mysql2`).
- **Axios & Integrações SOAP/REST**: Comunicação com APIs da Omie e WebServices SEFAZ.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [MariaDB](https://mariadb.org/) ou [MySQL](https://www.mysql.com/) (porta padrão 3306)
- Git

---

### 1. Configurando o Banco de Dados
Crie a base de dados no seu servidor MariaDB/MySQL:
```sql
CREATE DATABASE almoxarifado_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### 2. Configurando e Iniciando o Back-end
1. Acesse o diretório do servidor:
   ```bash
   cd back-end
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo `.env` baseado no `.env.example`:
   ```env
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_NAME=almoxarifado_db

   # Integração Omie ERP
   OMIE_APP_KEY=sua_app_key
   OMIE_APP_SECRET=seu_app_secret

   # Integração IA (Opcional para Assistente de Cotações)
   GROQ_API_KEY=sua_chave_groq
   OPENAI_API_KEY=sua_chave_openai
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   # ou
   node --openssl-legacy-provider server.js
   ```
   *O backend estará rodando em `http://localhost:3000`.*

---

### 3. Configurando e Iniciando o Front-end
1. Em outro terminal, na raiz do projeto:
   ```bash
   npm install
   ```
2. Inicie o servidor Vite:
   ```bash
   npm run dev
   ```
3. Abra o navegador no endereço indicado (geralmente `http://localhost:5173`).

---

## 🐳 Executando com Docker

O projeto possui suporte a Docker Compose para deploy integrado em servidores VPS:

```bash
# Na raiz do projeto
docker-compose up -d --build
```

Os serviços subirão automaticamente na rede isolada com persistência de volumes de dados.

---

## 📄 Licença
Propriedade de **Yamaservice Gestão**. Todos os direitos reservados.
