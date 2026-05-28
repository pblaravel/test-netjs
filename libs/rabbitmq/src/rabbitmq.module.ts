import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
  RabbitMqModuleAsyncOptions,
  RabbitMqModuleOptions,
  RABBITMQ_MODULE_OPTIONS,
} from './interfaces/rabbitmq.interfaces';
import { RabbitMqService } from './rabbitmq.service';

@Module({})
export class RabbitMqModule {
  static forRoot(options: RabbitMqModuleOptions): DynamicModule {
    return RabbitMqModule.createDynamicModule({
      provide: RABBITMQ_MODULE_OPTIONS,
      useValue: options,
    });
  }

  static forRootAsync(options: RabbitMqModuleAsyncOptions): DynamicModule {
    return RabbitMqModule.createDynamicModule({
      provide: RABBITMQ_MODULE_OPTIONS,
      inject: options.inject ?? [],
      useFactory: options.useFactory,
    });
  }

  private static createDynamicModule(optionsProvider: Provider): DynamicModule {
    return {
      module: RabbitMqModule,
      providers: [optionsProvider, RabbitMqService],
      exports: [RabbitMqService],
      global: true,
    };
  }
}
