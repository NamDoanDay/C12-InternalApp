FROM node:22-alpine AS dependencies
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=dependencies /app/backend/node_modules ./node_modules
COPY backend/package.json ./package.json
COPY backend/src ./src
COPY database /app/database
RUN mkdir -p /app/storage/uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
