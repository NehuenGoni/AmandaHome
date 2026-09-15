# syntax=docker/dockerfile:1

# Se construye desde la raíz del monorepo porque el server depende de
# @amanda/shared vía npm workspaces (no se puede armar la imagen solo
# con packages/server).

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build:shared && npm run build -w packages/server

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/client/package.json packages/client/package.json
RUN npm ci --omit=dev --workspace=packages/shared --workspace=packages/server

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server/dist ./packages/server/dist

EXPOSE 4000
CMD ["node", "packages/server/dist/index.js"]
