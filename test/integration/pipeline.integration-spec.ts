const PRODUCER_URL = process.env.PRODUCER_URL ?? 'http://localhost:3001';
const TELEGRAM_URL = process.env.TELEGRAM_URL ?? 'http://localhost:3003';
const MOCK_TELEGRAM_URL = process.env.MOCK_TELEGRAM_URL ?? 'http://localhost:8080';
const RABBITMQ_MANAGEMENT_URL =
  process.env.RABBITMQ_MANAGEMENT_URL ?? 'http://localhost:15672';

async function waitFor(
  label: string,
  check: () => Promise<boolean>,
  timeoutMs = 120000,
  intervalMs = 2000,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await check()) {
        return;
      }
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`${label} is not ready after ${timeoutMs}ms`);
}

async function getQueueMessageCount(queueName: string): Promise<number> {
  const credentials = Buffer.from('guest:guest').toString('base64');
  const response = await fetch(`${RABBITMQ_MANAGEMENT_URL}/api/queues/%2F/${queueName}`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch queue ${queueName}: ${response.status}`);
  }

  const body = (await response.json()) as { messages: number };
  return body.messages;
}

describe('Docker integration pipeline', () => {
  beforeAll(async () => {
    await waitFor('RabbitMQ management API', async () => {
      const response = await fetch(`${RABBITMQ_MANAGEMENT_URL}/api/overview`, {
        headers: {
          Authorization: `Basic ${Buffer.from('guest:guest').toString('base64')}`,
        },
      });
      return response.ok;
    });

    await waitFor('Producer service', async () => {
      const response = await fetch(`${PRODUCER_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'health.check', payload: { ping: true } }),
      });
      return response.status === 201;
    });

    await waitFor('Telegram service', async () => {
      const response = await fetch(`${TELEGRAM_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: 'warmup', text: 'warmup' }),
      });
      return response.status === 201;
    });
  }, 120000);

  it('should publish event and deliver notification to mock Telegram API', async () => {
    const eventType = `integration.test.${Date.now()}`;
    const publishResponse = await fetch(`${PRODUCER_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: eventType,
        payload: { source: 'integration-test', value: 42 },
        idempotencyKey: `integration-${Date.now()}`,
      }),
    });

    expect(publishResponse.status).toBe(201);
    const published = (await publishResponse.json()) as { id: string; status: string };
    expect(published.status).toBe('published');

    await waitFor('pipeline processing', async () => {
      const eventsCount = await getQueueMessageCount('events.queue');
      const notificationsCount = await getQueueMessageCount('notifications.queue');
      const mockResponse = await fetch(`${MOCK_TELEGRAM_URL}/messages`);
      const mockBody = (await mockResponse.json()) as { count: number; messages: Array<{ text: string }> };

      return (
        eventsCount === 0 &&
        notificationsCount === 0 &&
        mockBody.messages.some((message) => message.text.includes(eventType))
      );
    }, 60000, 1000);

    const mockResponse = await fetch(`${MOCK_TELEGRAM_URL}/messages`);
    const mockBody = (await mockResponse.json()) as { count: number; messages: Array<{ text: string }> };
    expect(mockBody.count).toBeGreaterThan(0);
    expect(mockBody.messages.some((message) => message.text.includes(eventType))).toBe(true);
  });

  it('should send direct notification through Telegram service REST API', async () => {
    const text = `direct-integration-${Date.now()}`;
    const response = await fetch(`${TELEGRAM_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: `direct-${Date.now()}`,
        text,
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe('sent');

    await waitFor('direct telegram delivery', async () => {
      const mockResponse = await fetch(`${MOCK_TELEGRAM_URL}/messages`);
      const mockBody = (await mockResponse.json()) as { messages: Array<{ text: string }> };
      return mockBody.messages.some((message) => message.text === text);
    }, 30000, 500);
  });
});
