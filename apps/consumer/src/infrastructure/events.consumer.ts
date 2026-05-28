import { RABBITMQ_QUEUES } from '@libs/common';
import { RabbitMqService } from '@libs/rabbitmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventProcessorService } from '../application/services/event-processor.service';

@Injectable()
export class EventsConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly eventProcessorService: EventProcessorService,
  ) {}

  onModuleInit(): void {
    this.rabbitMqService.registerConsumer({
      queue: RABBITMQ_QUEUES.EVENTS,
      handler: (content, headers) => this.eventProcessorService.process(content, headers),
    });
  }
}
