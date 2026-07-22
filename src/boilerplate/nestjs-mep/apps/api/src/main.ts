import {
  ClassSerializerInterceptor,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  LoggerService,
  NodeEnv,
  ResponseInterceptor,
  SerializerInterceptor,
  SystemExceptionFilter,
  logBootstrapInfo,
  logShutdownInfo,
  setupSwagger,
} from '@prowerbdigital/common';

import { getAppConfig } from './common';
import { AppModule } from './app.module';

async function bootstrap() {
  const { nodeEnv, port } = getAppConfig();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  const reflector = app.get(Reflector);
  app.useLogger(logger);

  app.enableCors();
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new SerializerInterceptor(reflector),
    new ClassSerializerInterceptor(reflector),
  );
  app.useGlobalFilters(new SystemExceptionFilter(logger));

  logShutdownInfo({ app, logger });

  // Swagger only outside production.
  if (nodeEnv !== NodeEnv.Prod) {
    setupSwagger(app, {
      title: 'MEP NestJS API',
      description: 'MEP NestJS service API documentation',
      path: 'api/docs',
      bearerAuthName: 'SWAGGER_BEARER_TOKEN',
    });
  }

  await app.listen(port, () => {
    logBootstrapInfo(app, { nodeEnv, logger, appPort: port });
  });
}
bootstrap();
