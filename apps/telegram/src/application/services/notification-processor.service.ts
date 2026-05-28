import { MESSAGE_HEADERS, NotificationMessage } from '@libs/common';
import { Injectable, Logger } from '@nestjs/common';
import { InMemoryIdempotencyStore } from '../../domain/idempotency.store';
import { TelegramApiClient } from '../../infrastructure/telegram-api.client';

@Injectable()
export class NotificationProcessorService {
  private readonly logger = new Logger(NotificationProcessorService.name);

  constructor(
    private readonly telegramApiClient: TelegramApiClient,
    private readonly idempotencyStore: InMemoryIdempotencyStore,
  ) {}

  async process(content: Buffer, headers: Record<string, unknown>): Promise<void> {
    const notification = JSON.parse(content.toString()) as NotificationMessage;
    const idempotencyKey = String(
      headers[MESSAGE_HEADERS.IDEMPOTENCY_KEY] ?? notification.id,
    );

    if (this.idempotencyStore.has(idempotencyKey)) {
      this.logger.warn(`Duplicate notification skipped: id=${idempotencyKey}`);
      return;
    }

    await this.telegramApiClient.sendNotification(notification);
    this.idempotencyStore.add(idempotencyKey);
  }

  async sendDirect(notification: NotificationMessage): Promise<NotificationMessage> {
    await this.telegramApiClient.sendNotification(notification);
    this.idempotencyStore.add(notification.id);
    return notification;
  }
}
