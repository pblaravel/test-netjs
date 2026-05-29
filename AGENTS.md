# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

NestJS microservices monorepo (npm workspaces): Producer, Consumer, Telegram — communicating via RabbitMQ. See `README.md` for full architecture and commands.

### Services (local dev)

| Service | How to run | Port |
|---|---|---|
| **RabbitMQ** | `docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.13-management-alpine` | 5672, 15672 |
| **mock-telegram** | `node tools/mock-telegram/server.js` | 8080 |
| **Producer** | `RABBITMQ_URL=amqp://guest:guest@localhost:5672 npm run start:dev -w @app/producer` | 3001 |
| **Consumer** | `RABBITMQ_URL=amqp://guest:guest@localhost:5672 npm run start:dev -w @app/consumer` | — |
| **Telegram** | `RABBITMQ_URL=amqp://guest:guest@localhost:5672 TELEGRAM_BOT_TOKEN=test-bot-token TELEGRAM_CHAT_ID=123456789 TELEGRAM_API_BASE_URL=http://localhost:8080 npm run start:dev -w @app/telegram` | 3003 |

### Startup order

1. RabbitMQ (wait for healthy: `docker exec rabbitmq rabbitmq-diagnostics -q ping`)
2. mock-telegram
3. Producer, Consumer, Telegram (any order)

### Key caveats

- **Shared libs must be built before running apps**: `npm run build -w @libs/common && npm run build -w @libs/rabbitmq`. The update script handles this.
- **ESLint is referenced in lint scripts but not installed as a devDependency** — `npm run lint` will fail with `eslint: not found`. This is a pre-existing gap in the repo.
- **Docker is required** for RabbitMQ. The cloud agent environment needs Docker installed (not included in the update script since it's a system dependency).
- **mock-telegram** replaces the real Telegram Bot API for local dev/testing — no real bot token needed.
- **Swagger docs**: Producer at `http://localhost:3001/api/docs`, Telegram at `http://localhost:3003/api/docs`.

### Testing commands

See `README.md` "Тестирование" section. Quick reference:
- Unit tests: `npm test` (10 tests)
- E2E tests: `npm run test:e2e` (2 tests, no Docker needed)
- Integration tests: `npm run docker:up && npm run test:integration` (requires Docker Compose stack)
