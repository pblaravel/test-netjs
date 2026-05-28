import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMqService } from '@libs/rabbitmq';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { NotificationProcessorService } from '../src/application/services/notification-processor.service';

describe('Telegram (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_CHAT_ID = '123456';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RabbitMqService)
      .useValue({
        publish: jest.fn(),
        registerConsumer: jest.fn(),
      })
      .overrideProvider(NotificationProcessorService)
      .useValue({
        sendDirect: jest.fn().mockResolvedValue({
          id: 'n-1',
          eventId: 'e-1',
          text: 'Test',
          createdAt: '2026-05-28T12:00:00.000Z',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /notifications should send notification', async () => {
    const response = await request(app.getHttpServer())
      .post('/notifications')
      .send({ eventId: 'e-1', text: 'Test notification' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'n-1',
      eventId: 'e-1',
      status: 'sent',
    });
  });
});
