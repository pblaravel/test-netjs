import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationMessage } from '@libs/common';

interface TelegramSendMessageResponse {
  ok: boolean;
  description?: string;
}

@Injectable()
export class TelegramApiClient {
  private readonly logger = new Logger(TelegramApiClient.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.chatId = this.configService.getOrThrow<string>('TELEGRAM_CHAT_ID');
    this.apiBaseUrl = this.configService.get(
      'TELEGRAM_API_BASE_URL',
      'https://api.telegram.org',
    );
  }

  async sendNotification(notification: NotificationMessage): Promise<void> {
    const url = `${this.apiBaseUrl}/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: notification.text,
        parse_mode: notification.parseMode,
      }),
    });

    const body = (await response.json()) as TelegramSendMessageResponse;

    if (!response.ok || !body.ok) {
      throw new Error(
        `Telegram API error: ${body.description ?? response.statusText}`,
      );
    }

    this.logger.log(
      `Telegram notification sent: notificationId=${notification.id}, eventId=${notification.eventId}`,
    );
  }
}
