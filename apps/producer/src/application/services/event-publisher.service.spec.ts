import { RabbitMqService } from '@libs/rabbitmq';
import { EventPublisherService } from './event-publisher.service';

describe('EventPublisherService', () => {
  const rabbitMqService = {
    publish: jest.fn().mockResolvedValue(undefined),
  } as unknown as RabbitMqService;

  const service = new EventPublisherService(rabbitMqService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should publish event with provided idempotency key', async () => {
    const event = await service.publish('order.created', { orderId: '1' }, 'fixed-id');

    expect(event.id).toBe('fixed-id');
    expect(event.type).toBe('order.created');
    expect(rabbitMqService.publish).toHaveBeenCalledTimes(1);
  });

  it('should retry publish on temporary failure', async () => {
    jest
      .spyOn(rabbitMqService, 'publish')
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(undefined);

    const event = await service.publish('user.registered', { userId: '42' });

    expect(event.id).toBeDefined();
    expect(rabbitMqService.publish).toHaveBeenCalledTimes(2);
  });
});
