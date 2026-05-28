import { InjectionToken, OptionalFactoryDependency } from '@nestjs/common';

export interface RabbitMqModuleOptions {
  url: string;
  prefetchCount?: number;
  maxRetries?: number;
  manualAck?: boolean;
}

export interface RabbitMqModuleAsyncOptions {
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  useFactory: (
    ...args: unknown[]
  ) => RabbitMqModuleOptions | Promise<RabbitMqModuleOptions>;
}

export const RABBITMQ_MODULE_OPTIONS = 'RABBITMQ_MODULE_OPTIONS';

export interface PublishOptions {
  exchange: string;
  routingKey: string;
  message: unknown;
  idempotencyKey: string;
  headers?: Record<string, unknown>;
}

export interface ConsumeHandler {
  (content: Buffer, headers: Record<string, unknown>): Promise<void>;
}

export interface ConsumerRegistration {
  queue: string;
  handler: ConsumeHandler;
}
