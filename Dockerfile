FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.mjs app.js index.html styles.css ./
COPY scripts/ scripts/
RUN mkdir -p /app/data
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.mjs"]
