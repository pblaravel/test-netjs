import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMqModule } from '@libs/rabbitmq';
import { EventProcessorService } from './application/services/event-processor.service';
import { InMemoryIdempotencyStore } from './domain/idempotency.store';
import { EventsConsumer } from './infrastructure/events.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMqModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.getOrThrow<string>('RABBITMQ_URL'),
        prefetchCount: Number(config.get('RABBITMQ_PREFETCH', 1)),
        maxRetries: Number(config.get('RABBITMQ_MAX_RETRIES', 3)),
        manualAck: config.get('RABBITMQ_MANUAL_ACK', 'true') === 'true',
      }),
    }),
  ],
  providers: [EventProcessorService, EventsConsumer, InMemoryIdempotencyStore],
})
export class AppModule {}
