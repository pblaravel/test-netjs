# NestJS Microservices: RabbitMQ + Telegram

Микросервисная архитектура на **NestJS** с брокером сообщений **RabbitMQ** и отправкой уведомлений в **Telegram**.

## Архитектура

```mermaid
flowchart LR
  Client[HTTP Client] --> Producer[Producer Service :3001]
  Producer -->|events.queue| RabbitMQ[(RabbitMQ)]
  RabbitMQ --> Consumer[Consumer Service]
  Consumer -->|notifications.queue| RabbitMQ
  RabbitMQ --> Telegram[Telegram Service :3003]
  Telegram --> TG[Telegram Bot API]
  Client -->|POST /notifications| Telegram
```

### Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| **producer** | 3001 | REST API для публикации событий в RabbitMQ |
| **consumer** | — | Обработка событий, формирование уведомлений |
| **telegram** | 3003 | Отправка уведомлений в Telegram (очередь + REST API) |
| **rabbitmq** | 5672 / 15672 | Брокер сообщений и Management UI |

### Поток данных

1. Клиент отправляет `POST /events` в **Producer**.
2. Producer публикует JSON-событие с UUID (идемпотентность) в очередь `events.queue`.
3. **Consumer** получает событие, проверяет дубликаты, формирует уведомление и публикует в `notifications.queue`.
4. **Telegram** сервис получает уведомление и отправляет его через Bot API.

## Возможности

### Producer (Sender)
- UUID / idempotency key для каждого сообщения
- JSON-сериализация
- Publisher confirms (подтверждение доставки в брокер)
- Retry при временных ошибках соединения

### Consumer (Receiver)
- Ручное подтверждение (ack) / автоматическое (`RABBITMQ_MANUAL_ACK=false`)
- Retry с счётчиком попыток и Dead Letter Queue (DLQ)
- Логирование успешных и неуспешных обработок
- In-memory store для идемпотентности

### Telegram Service
- Потребление из `notifications.queue`
- Прямой REST API `POST /notifications`
- Swagger-документация

## Быстрый старт (Docker)

### 1. Настройка окружения

```bash
cp .env.example .env
```

Укажите в `.env`:
- `TELEGRAM_BOT_TOKEN` — токен бота от [@BotFather](https://t.me/BotFather)
- `TELEGRAM_CHAT_ID` — ID чата (можно получить через [@userinfobot](https://t.me/userinfobot))

### 2. Запуск

```bash
docker compose up --build
```

### 3. Проверка

**Swagger:**
- Producer: http://localhost:3001/api/docs
- Telegram: http://localhost:3003/api/docs

**RabbitMQ Management UI:** http://localhost:15672 (guest / guest)

**Отправка тестового события:**

```bash
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order.created",
    "payload": { "orderId": "123", "amount": 99.99 }
  }'
```

**Прямая отправка в Telegram:**

```bash
curl -X POST http://localhost:3003/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "manual-1",
    "text": "Привет из Telegram-сервиса!"
  }'
```

## Локальная разработка

### Требования
- Node.js >= 20
- RabbitMQ (локально или через Docker)

### Установка

```bash
npm install
npm run build -w @libs/common
npm run build -w @libs/rabbitmq
```

### Запуск RabbitMQ

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:4.1-management-alpine
```

### Запуск сервисов

```bash
# Терминал 1
RABBITMQ_URL=amqp://guest:guest@localhost:5672 npm run start:dev -w @app/producer

# Терминал 2
RABBITMQ_URL=amqp://guest:guest@localhost:5672 npm run start:dev -w @app/consumer

# Терминал 3
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
TELEGRAM_BOT_TOKEN=your_token \
TELEGRAM_CHAT_ID=your_chat_id \
npm run start:dev -w @app/telegram
```

## Тестирование

```bash
npm test
npm run test:e2e
```

## Структура проекта

```
.
├── apps/
│   ├── producer/          # Producer (Sender) Service
│   ├── consumer/          # Consumer (Receiver) Service
│   └── telegram/          # Telegram Notification Service
├── libs/
│   ├── common/            # Общие интерфейсы и константы
│   └── rabbitmq/          # RabbitMQ модуль (publish/consume/retry/DLQ)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Конфигурация

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `RABBITMQ_URL` | URL подключения к RabbitMQ | — |
| `RABBITMQ_PREFETCH` | Prefetch count | `1` |
| `RABBITMQ_MAX_RETRIES` | Макс. повторов обработки | `3` |
| `RABBITMQ_MANUAL_ACK` | Ручное подтверждение сообщений | `true` |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота | — |
| `TELEGRAM_CHAT_ID` | ID чата для уведомлений | — |

## Очереди RabbitMQ

| Очередь | Назначение |
|---------|------------|
| `events.queue` | Входящие события от Producer |
| `events.dlq` | Dead Letter Queue для событий |
| `notifications.queue` | Уведомления для Telegram |
| `notifications.dlq` | Dead Letter Queue для уведомлений |

## Принципы проектирования

- **Модульная архитектура NestJS** — каждый сервис изолирован
- **Clean Architecture** — разделение на domain / application / infrastructure / presentation
- **SOLID** — интерфейсы, инверсия зависимостей, single responsibility
- **Shared library** — общий RabbitMQ-модуль и контракты сообщений

## Лицензия

MIT
