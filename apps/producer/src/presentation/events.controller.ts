import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PublishEventDto,
  PublishEventResponseDto,
} from '../application/dto/publish-event.dto';
import { EventPublisherService } from '../application/services/event-publisher.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventPublisherService: EventPublisherService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Опубликовать событие в RabbitMQ' })
  @ApiCreatedResponse({ type: PublishEventResponseDto })
  async publish(@Body() dto: PublishEventDto): Promise<PublishEventResponseDto> {
    const event = await this.eventPublisherService.publish(
      dto.type,
      dto.payload,
      dto.idempotencyKey,
    );

    return {
      id: event.id,
      type: event.type,
      status: 'published',
      publishedAt: event.createdAt,
    };
  }
}
