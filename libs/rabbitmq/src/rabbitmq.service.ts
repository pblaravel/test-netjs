import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';
import {
  DEFAULT_MAX_RETRIES,
  MESSAGE_HEADERS,
  RABBITMQ_EXCHANGE,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from '@libs/common';
import {
  ConsumerRegistration,
  RABBITMQ_MODULE_OPTIONS,
  RabbitMqModuleOptions,
} from './interfaces/rabbitmq.interfaces';

const RETRY_DELAYS_MS = [1000, 2000, 4000];

@Injectable()
export class RabbitMqService
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.ConfirmChannel | null = null;
  private readonly consumers: ConsumerRegistration[] = [];
  private consumersStarted = false;

  constructor(
    @Inject(RABBITMQ_MODULE_OPTIONS)
    private readonly options: RabbitMqModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
    await this.setupTopology();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.startConsumers();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  registerConsumer(registration: ConsumerRegistration): void {
    this.consumers.push(registration);
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: unknown,
    idempotencyKey: string,
    headers: Record<string, unknown> = {},
  ): Promise<void> {
    const channel = await this.getChannel();
    const payload = Buffer.from(JSON.stringify(message));

    await new Promise<void>((resolve, reject) => {
      channel.publish(
        exchange,
        routingKey,
        payload,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: idempotencyKey,
          headers: {
            [MESSAGE_HEADERS.IDEMPOTENCY_KEY]: idempotencyKey,
            [MESSAGE_HEADERS.RETRY_COUNT]: 0,
            ...headers,
          },
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  private async connectWithRetry(): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        this.connection = await amqp.connect(this.options.url);
        this.channel = await this.connection.createConfirmChannel();
        await this.channel.prefetch(this.options.prefetchCount ?? 1);
        this.logger.log('Connected to RabbitMQ');

        this.connection.on('error', (error) => {
          this.logger.error(`RabbitMQ connection error: ${error.message}`);
        });

        this.connection.on('close', () => {
          this.logger.warn('RabbitMQ connection closed');
          this.consumersStarted = false;
        });

        return;
      } catch (error) {
        lastError = error;
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          break;
        }
        this.logger.warn(
          `RabbitMQ connection failed (attempt ${attempt + 1}), retrying in ${delay}ms`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private async setupTopology(): Promise<void> {
    const channel = await this.getChannel();

    await channel.assertExchange(RABBITMQ_EXCHANGE, 'direct', { durable: true });

    await this.assertQueueWithDlq(
      channel,
      RABBITMQ_QUEUES.EVENTS,
      RABBITMQ_QUEUES.EVENTS_DLQ,
      RABBITMQ_ROUTING_KEYS.EVENTS,
    );

    await this.assertQueueWithDlq(
      channel,
      RABBITMQ_QUEUES.NOTIFICATIONS,
      RABBITMQ_QUEUES.NOTIFICATIONS_DLQ,
      RABBITMQ_ROUTING_KEYS.NOTIFICATIONS,
    );
  }

  private async assertQueueWithDlq(
    channel: amqp.ConfirmChannel,
    queue: string,
    dlq: string,
    routingKey: string,
  ): Promise<void> {
    await channel.assertQueue(dlq, { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': RABBITMQ_EXCHANGE,
        'x-dead-letter-routing-key': dlq,
      },
    });
    await channel.bindQueue(queue, RABBITMQ_EXCHANGE, routingKey);
    await channel.bindQueue(dlq, RABBITMQ_EXCHANGE, dlq);
  }

  private async startConsumers(): Promise<void> {
    if (this.consumers.length === 0 || this.consumersStarted) {
      return;
    }

    const channel = await this.getChannel();
    const manualAck = this.options.manualAck ?? true;

    for (const consumer of this.consumers) {
      await channel.consume(
        consumer.queue,
        async (message) => {
          if (!message) {
            return;
          }

          const headers = (message.properties.headers ?? {}) as Record<string, unknown>;
          const retryCount = Number(headers[MESSAGE_HEADERS.RETRY_COUNT] ?? 0);
          const maxRetries = this.options.maxRetries ?? DEFAULT_MAX_RETRIES;

          try {
            await consumer.handler(message.content, headers);

            if (manualAck) {
              channel.ack(message);
            }

            this.logger.log(
              `Message processed successfully from ${consumer.queue} (idempotencyKey=${String(headers[MESSAGE_HEADERS.IDEMPOTENCY_KEY] ?? message.properties.messageId ?? 'unknown')})`,
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
              `Failed to process message from ${consumer.queue}: ${errorMessage}`,
            );

            if (retryCount < maxRetries) {
              await this.republishWithRetry(channel, consumer.queue, message, retryCount + 1);
              channel.ack(message);
              this.logger.warn(
                `Message scheduled for retry ${retryCount + 1}/${maxRetries} on ${consumer.queue}`,
              );
              return;
            }

            channel.nack(message, false, false);
            this.logger.error(
              `Message moved to DLQ after ${maxRetries} retries on ${consumer.queue}`,
            );
          }
        },
        { noAck: !manualAck },
      );

      this.logger.log(`Consumer registered for queue: ${consumer.queue}`);
    }

    this.consumersStarted = true;
  }

  private async republishWithRetry(
    channel: amqp.ConfirmChannel,
    queue: string,
    message: amqp.ConsumeMessage,
    retryCount: number,
  ): Promise<void> {
    const routingKey = this.resolveRoutingKey(queue);
    const headers = {
      ...(message.properties.headers ?? {}),
      [MESSAGE_HEADERS.RETRY_COUNT]: retryCount,
      [MESSAGE_HEADERS.ORIGINAL_QUEUE]: queue,
    };

    await new Promise<void>((resolve, reject) => {
      channel.publish(
        RABBITMQ_EXCHANGE,
        routingKey,
        message.content,
        {
          ...message.properties,
          headers,
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  private resolveRoutingKey(queue: string): string {
    if (queue === RABBITMQ_QUEUES.EVENTS) {
      return RABBITMQ_ROUTING_KEYS.EVENTS;
    }
    if (queue === RABBITMQ_QUEUES.NOTIFICATIONS) {
      return RABBITMQ_ROUTING_KEYS.NOTIFICATIONS;
    }
    return queue;
  }

  private async getChannel(): Promise<amqp.ConfirmChannel> {
    if (!this.channel) {
      await this.connectWithRetry();
      await this.setupTopology();
    }
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }
    return this.channel;
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
    } catch {
      // ignore close errors during shutdown
    }
    try {
      await this.connection?.close();
    } catch {
      // ignore close errors during shutdown
    }
    this.channel = null;
    this.connection = null;
    this.consumersStarted = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
