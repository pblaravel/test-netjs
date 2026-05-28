import { NotificationMessage } from '@libs/common';
import { InMemoryIdempotencyStore } from '../../domain/idempotency.store';
import { TelegramApiClient } from '../../infrastructure/telegram-api.client';
import { NotificationProcessorService } from './notification-processor.service';

describe('NotificationProcessorService', () => {
  const telegramApiClient = {
    sendNotification: jest.fn().mockResolvedValue(undefined),
  } as unknown as TelegramApiClient;

  const idempotencyStore = new InMemoryIdempotencyStore();
  const service = new NotificationProcessorService(telegramApiClient, idempotencyStore);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send notification from queue payload', async () => {
    const notification: NotificationMessage = {
      id: 'n-1',
      eventId: 'e-1',
      text: 'Hello',
      createdAt: new Date().toISOString(),
    };

    await service.process(Buffer.from(JSON.stringify(notification)), {
      'x-idempotency-key': 'n-1',
    });

    expect(telegramApiClient.sendNotification).toHaveBeenCalledWith(notification);
  });
});
