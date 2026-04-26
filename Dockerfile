FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.mjs app.js index.html styles.css ./
COPY scripts/ scripts/
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.mjs"]
