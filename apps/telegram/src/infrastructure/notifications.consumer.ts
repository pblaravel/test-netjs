import { RABBITMQ_QUEUES } from '@libs/common';
import { RabbitMqService } from '@libs/rabbitmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationProcessorService } from '../application/services/notification-processor.service';

@Injectable()
export class NotificationsConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly notificationProcessorService: NotificationProcessorService,
  ) {}

  onModuleInit(): void {
    this.rabbitMqService.registerConsumer({
      queue: RABBITMQ_QUEUES.NOTIFICATIONS,
      handler: (content, headers) =>
        this.notificationProcessorService.process(content, headers),
    });
  }
}
