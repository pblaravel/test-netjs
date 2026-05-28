import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMqModule } from '@libs/rabbitmq';
import { NotificationProcessorService } from './application/services/notification-processor.service';
import { InMemoryIdempotencyStore } from './domain/idempotency.store';
import { NotificationsConsumer } from './infrastructure/notifications.consumer';
import { TelegramApiClient } from './infrastructure/telegram-api.client';
import { NotificationsController } from './presentation/notifications.controller';

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
  controllers: [NotificationsController],
  providers: [
    NotificationProcessorService,
    NotificationsConsumer,
    TelegramApiClient,
    InMemoryIdempotencyStore,
  ],
})
export class AppModule {}
