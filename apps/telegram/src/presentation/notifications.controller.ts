import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { NotificationMessage } from '@libs/common';
import {
  SendNotificationDto,
  SendNotificationResponseDto,
} from '../application/dto/send-notification.dto';
import { NotificationProcessorService } from '../application/services/notification-processor.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationProcessorService: NotificationProcessorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Отправить уведомление напрямую в Telegram' })
  @ApiCreatedResponse({ type: SendNotificationResponseDto })
  async send(
    @Body() dto: SendNotificationDto,
  ): Promise<SendNotificationResponseDto> {
    const notification: NotificationMessage = {
      id: dto.id ?? uuidv4(),
      eventId: dto.eventId,
      text: dto.text,
      parseMode: dto.parseMode,
      metadata: dto.metadata,
      createdAt: new Date().toISOString(),
    };

    const sent = await this.notificationProcessorService.sendDirect(notification);

    return {
      id: sent.id,
      eventId: sent.eventId,
      status: 'sent',
      sentAt: sent.createdAt,
    };
  }
}
