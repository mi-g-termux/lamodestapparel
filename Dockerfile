# Build once, run anywhere (VPS, Fly, Railway, Render, your own box).
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm install --prefix server && npm install --prefix web

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production DEPLOY_TARGET=node PORT=3000

COPY --from=build /app/server/package.json server/package.json
RUN npm install --omit=dev --prefix server

COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/sql server/sql
COPY --from=build /app/web/dist web/dist
COPY --from=build /app/package.json package.json

RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server/dist/index.js"]
