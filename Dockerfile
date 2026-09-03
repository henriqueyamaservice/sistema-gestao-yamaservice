# Imagem Leve e Segura de Produção (Sem Código-Fonte)
FROM node:20-alpine
WORKDIR /app

# 1. Copiar apenas o package.json do Backend primeiro
COPY back-end/package*.json ./back-end/
WORKDIR /app/back-end

# Instalar dependências de produção rapidamente usando os binários pré-compilados oficiais do Node
RUN npm install --omit=dev

# 2. Copiar os arquivos do Backend (exceto node_modules que já foram gerados acima)
WORKDIR /app
COPY back-end/src ./back-end/src
COPY back-end/server.js ./back-end/server.js
COPY back-end/scripts ./back-end/scripts
COPY dist ./dist

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "back-end/server.js"]
