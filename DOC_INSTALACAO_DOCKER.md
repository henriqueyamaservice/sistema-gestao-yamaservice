# 🚀 Resumo Técnico e Guia de Instalação do Sistema (Versão Docker)

---

## 📌 1. Resumo do que foi feito no Projeto

### A. Banco de Dados (Transição JSON → SQLite):
- Instalamos as bibliotecas `sqlite3` e `sqlite` no backend.
- Criamos o módulo [database.js](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/back-end/src/config/database.js) e o script [migrar-para-sqlite.js](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/back-end/scripts/migrar-para-sqlite.js).
- Todos os registros JSON (OS, abastecimentos, veículos, estoque) foram copiados para o arquivo único de banco de dados **`back-end/data/banco.db`**.
- O backend agora inicializa e conecta automaticamente no SQLite.

### B. Proteção do Código-Fonte (Docker):
- Criamos a estrutura Docker com **Multi-Stage Build** para garantir que o código-fonte (`.jsx`, React, pastas `src/` e `.agents`) **NÃO fique exposto** no computador do cliente.
- Criamos os arquivos:
  1. [Dockerfile](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/Dockerfile): Compila o React em arquivos estáticos de produção (`dist/`) e roda o servidor Node.js.
  2. [docker-compose.yml](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/docker-compose.yml): Configura o container, mapeia as portas `5173`/`3000` e mantém os dados do SQLite salvos na pasta `./back-end/data`.
  3. [.dockerignore](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/.dockerignore): Oculta arquivos desnecessários no build.
  4. [iniciar_docker_OS.bat](file:///c:/Users/Henrique/Desktop/sistema-almoxarifado/iniciar_docker_OS.bat): Script executável para o operador subir o Docker e abrir o sistema em 1 clique.

---

## 📋 2. Passo a Passo Completo para Instalar no Notebook do Escritório

### **Fase 1: Preparar os arquivos no seu Pendrive**
1. Na sua máquina de desenvolvimento, execute a migração para ter a certeza que o banco `banco.db` está atualizado:
   - Abra o terminal em `back-end` e rode: `node scripts/migrar-para-sqlite.js`
2. Copie a pasta do projeto `sistema-almoxarifado` para o seu Pendrive.
   *(Você pode apagar as pastas `.git`, `.agents` e `node_modules` antes de copiar para o pendrive para a cópia ser super rápida).*

---

### **Fase 2: Instalação no Notebook do Escritório (Apenas 1ª vez)**

#### **1. Instalar o Docker Desktop**
- Baixe o instalador oficial em: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- Execute o instalador no Windows do notebook.
- Durante a instalação, certifique-se de marcar a opção **"Use WSL 2 instead of Hyper-V"**.
- Reinicie o notebook após a instalação terminar.
- Abra o aplicativo **Docker Desktop** no Windows e aguarde ele mostrar o status **"Engine Running"** (ícone da baleia verde no canto inferior).

#### **2. Copiar os arquivos do Pendrive**
- Cole a pasta `sistema-almoxarifado` do pendrive em um diretório do notebook (exemplo: `C:\sistema-almoxarifado`).

#### **3. Compilar e Subir o Container (Build Inicial)**
- Abra o **PowerShell** no notebook.
- Acesse a pasta do projeto:
  ```powershell
  cd C:\sistema-almoxarifado
  ```
- Suba o container Docker compilando a imagem (esse processo vai construir tudo automaticamente em background):
  ```powershell
  docker compose up -d --build
  ```
- Aguarde o término do processo (ele baixará a imagem base do Node e criará os arquivos estáticos).

---

### 💻 3. Como o Operador vai usar no dia a dia (Sem abrir código ou terminal)

#### **Opção A: Clique Duplo no Atalho**
1. Vá até a pasta `C:\sistema-almoxarifado`.
2. Clique com o botão direito no arquivo **`iniciar_docker_OS.bat`** > **Enviar para** > **Área de trabalho (criar atalho)**.
3. O operador só precisará dar 2 cliques no atalho. O Docker subirá os serviços e abrirá o navegador direto no **Dashboard OS + Combustível** travado!

#### **Opção B: Abrir AUTOMATICAMENTE ao ligar o computador**
1. Pressione as teclas `Windows + R` no teclado.
2. Digite `shell:startup` e pressione **Enter** (vai abrir a pasta de Inicialização do Windows).
3. Cole um atalho do `iniciar_docker_OS.bat` dentro dessa pasta.
4. **Pronto!** Sempre que a máquina for ligada, o Windows iniciará o container do Docker em segundo plano e abrirá a tela do Dashboard OS automaticamente.
