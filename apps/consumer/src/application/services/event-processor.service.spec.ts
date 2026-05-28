import { RabbitMqService } from '@libs/rabbitmq';
import { InMemoryIdempotencyStore } from '../../domain/idempotency.store';
import { EventProcessorService } from './event-processor.service';

describe('EventProcessorService', () => {
  const rabbitMqService = {
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as RabbitMqService;

  let idempotencyStore: InMemoryIdempotencyStore;
  let service: EventProcessorService;

  beforeEach(() => {
    jest.clearAllMocks();
    idempotencyStore = new InMemoryIdempotencyStore();
    service = new EventProcessorService(rabbitMqService, idempotencyStore);
  });

  it('should skip duplicate events by idempotency key', async () => {
    idempotencyStore.add('used-key');

    const payload = Buffer.from(
      JSON.stringify({
        id: 'used-key',
        type: 'order.created',
        payload: { orderId: '1' },
        createdAt: new Date().toISOString(),
      }),
    );

    await service.process(payload, { 'x-idempotency-key': 'used-key' });

    expect(rabbitMqService.publish).not.toHaveBeenCalled();
  });

  it('should publish notification for valid event', async () => {
    const payload = Buffer.from(
      JSON.stringify({
        id: 'new-event',
        type: 'payment.completed',
        payload: { amount: 100 },
        createdAt: new Date().toISOString(),
      }),
    );

    await service.process(payload, { 'x-idempotency-key': 'new-event' });

    expect(rabbitMqService.publish).toHaveBeenCalledTimes(1);
  });
});
