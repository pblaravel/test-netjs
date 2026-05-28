import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RabbitMqService } from '@libs/rabbitmq';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EventPublisherService } from '../src/application/services/event-publisher.service';

describe('Producer (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RabbitMqService)
      .useValue({
        publish: jest.fn(),
        registerConsumer: jest.fn(),
      })
      .overrideProvider(EventPublisherService)
      .useValue({
        publish: jest.fn().mockResolvedValue({
          id: 'test-id',
          type: 'order.created',
          payload: { orderId: '1' },
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

  it('POST /events should publish event', async () => {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send({ type: 'order.created', payload: { orderId: '1' } })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'test-id',
      type: 'order.created',
      status: 'published',
    });
  });
});
