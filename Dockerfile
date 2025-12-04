# Usar Node.js oficial
FROM node:20-alpine

WORKDIR /app


# Copiar package.json y package-lock.json
COPY package.json package-lock.json ./
RUN npm install --production

COPY server.js ./

EXPOSE 8080

CMD ["npm", "start"]