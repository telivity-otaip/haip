FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.mjs ./
EXPOSE 4001
CMD ["node", "server.mjs"]
