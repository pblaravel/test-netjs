# syntax=docker/dockerfile:1

ARG SERVICE=producer

FROM node:22-alpine AS builder
ARG SERVICE
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY libs/common/package.json libs/common/tsconfig.json ./libs/common/
COPY libs/rabbitmq/package.json libs/rabbitmq/tsconfig.json ./libs/rabbitmq/
COPY apps/producer/package.json apps/producer/nest-cli.json apps/producer/tsconfig.json apps/producer/tsconfig.build.json ./apps/producer/
COPY apps/consumer/package.json apps/consumer/nest-cli.json apps/consumer/tsconfig.json apps/consumer/tsconfig.build.json ./apps/consumer/
COPY apps/telegram/package.json apps/telegram/nest-cli.json apps/telegram/tsconfig.json apps/telegram/tsconfig.build.json ./apps/telegram/

RUN npm install

COPY libs ./libs
COPY apps ./apps

RUN npm run build -w @libs/common \
  && npm run build -w @libs/rabbitmq \
  && npm run build -w @app/${SERVICE}

FROM node:22-alpine AS runner
ARG SERVICE
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder /app/libs/common/dist ./libs/common/dist
COPY --from=builder /app/libs/rabbitmq/package.json ./libs/rabbitmq/package.json
COPY --from=builder /app/libs/rabbitmq/dist ./libs/rabbitmq/dist
COPY --from=builder /app/apps/${SERVICE}/package.json ./apps/${SERVICE}/package.json
COPY --from=builder /app/apps/${SERVICE}/dist ./apps/${SERVICE}/dist

WORKDIR /app/apps/${SERVICE}
EXPOSE 3001 3003

CMD ["node", "dist/main.js"]
