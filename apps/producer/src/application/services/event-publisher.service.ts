import { EventMessage, RABBITMQ_EXCHANGE, RABBITMQ_ROUTING_KEYS } from '@libs/common';
import { RabbitMqService } from '@libs/rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

const PUBLISH_RETRY_DELAYS_MS = [500, 1000, 2000];

@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(private readonly rabbitMqService: RabbitMqService) {}

  async publish(
    type: string,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<EventMessage> {
    const event: EventMessage = {
      id: idempotencyKey ?? uuidv4(),
      type,
      payload,
      createdAt: new Date().toISOString(),
    };

    await this.publishWithRetry(event);
    this.logger.log(`Event published: id=${event.id}, type=${event.type}`);
    return event;
  }

  private async publishWithRetry(event: EventMessage): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= PUBLISH_RETRY_DELAYS_MS.length; attempt++) {
      try {
        await this.rabbitMqService.publish(
          RABBITMQ_EXCHANGE,
          RABBITMQ_ROUTING_KEYS.EVENTS,
          event,
          event.id,
        );
        return;
      } catch (error) {
        lastError = error;
        const delay = PUBLISH_RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          break;
        }
        this.logger.warn(
          `Publish failed (attempt ${attempt + 1}), retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
