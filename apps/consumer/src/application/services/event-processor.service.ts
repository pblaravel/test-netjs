import {
  EventMessage,
  MESSAGE_HEADERS,
  NotificationMessage,
  RABBITMQ_EXCHANGE,
  RABBITMQ_ROUTING_KEYS,
} from '@libs/common';
import { RabbitMqService } from '@libs/rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryIdempotencyStore } from '../../domain/idempotency.store';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly idempotencyStore: InMemoryIdempotencyStore,
  ) {}

  async process(content: Buffer, headers: Record<string, unknown>): Promise<void> {
    const event = JSON.parse(content.toString()) as EventMessage;
    const idempotencyKey = String(
      headers[MESSAGE_HEADERS.IDEMPOTENCY_KEY] ?? event.id,
    );

    if (this.idempotencyStore.has(idempotencyKey)) {
      this.logger.warn(`Duplicate event skipped: id=${idempotencyKey}`);
      return;
    }

    this.logger.log(`Processing event: id=${event.id}, type=${event.type}`);
    this.validateEvent(event);

    const notification = this.buildNotification(event);
    await this.rabbitMqService.publish(
      RABBITMQ_EXCHANGE,
      RABBITMQ_ROUTING_KEYS.NOTIFICATIONS,
      notification,
      notification.id,
      { [MESSAGE_HEADERS.IDEMPOTENCY_KEY]: notification.id },
    );

    this.idempotencyStore.add(idempotencyKey);
    this.logger.log(`Event processed and notification queued: eventId=${event.id}`);
  }

  private validateEvent(event: EventMessage): void {
    if (!event.id || !event.type || !event.payload) {
      throw new Error('Invalid event payload');
    }
  }

  private buildNotification(event: EventMessage): NotificationMessage {
    const text = [
      `📢 Событие: ${event.type}`,
      `ID: ${event.id}`,
      `Данные: ${JSON.stringify(event.payload, null, 2)}`,
    ].join('\n');

    return {
      id: uuidv4(),
      eventId: event.id,
      text,
      parseMode: 'HTML',
      metadata: { source: 'consumer-service', eventType: event.type },
      createdAt: new Date().toISOString(),
    };
  }
}
