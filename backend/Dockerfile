FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY backend/src ./src
COPY database/seeds /database/seeds
COPY database/migrations /database/migrations
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
