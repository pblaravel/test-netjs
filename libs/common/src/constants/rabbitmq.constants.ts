export const RABBITMQ_EXCHANGE = 'app.direct';

export const RABBITMQ_QUEUES = {
  EVENTS: 'events.queue',
  EVENTS_DLQ: 'events.dlq',
  NOTIFICATIONS: 'notifications.queue',
  NOTIFICATIONS_DLQ: 'notifications.dlq',
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  EVENTS: 'events',
  NOTIFICATIONS: 'notifications',
} as const;

export const MESSAGE_HEADERS = {
  IDEMPOTENCY_KEY: 'x-idempotency-key',
  RETRY_COUNT: 'x-retry-count',
  ORIGINAL_QUEUE: 'x-original-queue',
} as const;

export const DEFAULT_MAX_RETRIES = 3;
