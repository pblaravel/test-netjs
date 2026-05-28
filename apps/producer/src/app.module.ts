import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMqModule } from '@libs/rabbitmq';
import { EventPublisherService } from './application/services/event-publisher.service';
import { EventsController } from './presentation/events.controller';

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
  controllers: [EventsController],
  providers: [EventPublisherService],
})
export class AppModule {}
