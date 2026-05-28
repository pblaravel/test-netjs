import { MESSAGE_HEADERS, RABBITMQ_EXCHANGE, RABBITMQ_ROUTING_KEYS } from '@libs/common';
import { RabbitMqService } from './rabbitmq.service';

describe('RabbitMqService', () => {
  it('should register consumers without invoking handler immediately', () => {
    const service = new RabbitMqService({
      url: 'amqp://guest:guest@localhost:5672',
      manualAck: true,
      maxRetries: 3,
    });

    const handler = jest.fn();
    service.registerConsumer({ queue: 'events.queue', handler });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should publish JSON payload with idempotency headers', async () => {
    const publish = jest.fn(
      (
        _exchange: string,
        _routingKey: string,
        payload: Buffer,
        options: { messageId: string; headers: Record<string, unknown> },
        callback: (error: Error | null) => void,
      ) => {
        expect(payload.toString()).toContain('"type":"test"');
        expect(options.messageId).toBe('idempotency-key');
        expect(options.headers[MESSAGE_HEADERS.IDEMPOTENCY_KEY]).toBe('idempotency-key');
        callback(null);
      },
    );

    const channel = { publish };
    const service = new RabbitMqService({
      url: 'amqp://guest:guest@localhost:5672',
    });

    (service as unknown as { channel: typeof channel }).channel = channel;

    await service.publish(
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEYS.EVENTS,
      { id: '1', type: 'test', payload: {}, createdAt: 'now' },
      'idempotency-key',
    );

    expect(publish).toHaveBeenCalledTimes(1);
  });
});
