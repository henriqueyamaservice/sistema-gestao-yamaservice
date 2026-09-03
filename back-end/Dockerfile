FROM node:20-alpine

# Instalar ferramentas de compilação C++ para compilar o sqlite3 no Linux Alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar arquivos de dependência do backend
COPY package*.json ./

# Instalar dependências limpas compilando o sqlite3 nativamente no Alpine
RUN npm install --only=production --build-from-source sqlite3

# Copiar código do backend
COPY . .

# Expor a porta do backend Express
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
