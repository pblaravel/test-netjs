import { ConfigService } from '@nestjs/config';
import { NotificationMessage } from '@libs/common';
import { TelegramApiClient } from './telegram-api.client';

describe('TelegramApiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should send notification via Telegram API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({ ok: true }),
    }) as unknown as typeof fetch;

    const configService = {
      getOrThrow: (key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return 'token';
        if (key === 'TELEGRAM_CHAT_ID') return 'chat-id';
        throw new Error(`Missing ${key}`);
      },
      get: (_key: string, defaultValue?: string) => defaultValue ?? 'https://api.telegram.org',
    } as unknown as ConfigService;

    const client = new TelegramApiClient(configService);
    const notification: NotificationMessage = {
      id: 'n-1',
      eventId: 'e-1',
      text: 'Hello',
      createdAt: new Date().toISOString(),
    };

    await client.sendNotification(notification);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottoken/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('should throw when Telegram API returns error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ ok: false, description: 'invalid chat' }),
    }) as unknown as typeof fetch;

    const configService = {
      getOrThrow: (key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return 'token';
        if (key === 'TELEGRAM_CHAT_ID') return 'chat-id';
        throw new Error(`Missing ${key}`);
      },
      get: (_key: string, defaultValue?: string) => defaultValue ?? 'https://api.telegram.org',
    } as unknown as ConfigService;

    const client = new TelegramApiClient(configService);

    await expect(
      client.sendNotification({
        id: 'n-1',
        eventId: 'e-1',
        text: 'Hello',
        createdAt: new Date().toISOString(),
      }),
    ).rejects.toThrow('Telegram API error: invalid chat');
  });
});
