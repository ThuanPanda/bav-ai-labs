import { SharedDataModule } from '@app/layer-data';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  DrizzleModule,
  DynamicConfigModule,
  LoggerModule,
  drizzleConfiguration,
  drizzleSchema,
} from '@prowerbdigital/common';
import Joi from 'joi';

import { appConfiguration, appSchema } from './common';
import { UsersModule } from './modules';

@Module({
  imports: [
    DynamicConfigModule.register({
      app: 'api',
      opts: {
        validationSchema: Joi.object({
          ...appSchema,
          ...drizzleSchema,
        }),
        load: [appConfiguration, drizzleConfiguration],
      },
    }),
    LoggerModule.forRoot({ service: 'nestjs-mep' }),
    DrizzleModule.forRoot({}),
    SharedDataModule,
    CqrsModule.forRoot(),
    UsersModule,
  ],
})
export class AppModule {}
