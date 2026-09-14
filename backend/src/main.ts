import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  // Document renders arrive as JSON with inlined assets (data URI logos), so the
  // express default of 100kb is far too small. Cap generously; the workers cap
  // the actual render size.
  const bodyLimit = process.env.API_JSON_BODY_LIMIT ?? '8mb';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: bodyLimit });
  app.useBodyParser('urlencoded', { limit: bodyLimit, extended: true });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('pdf-everything API')
    .setDescription('PDF tools API — same surface used by the web frontend')
    .setVersion('1.0')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc);

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`api listening on http://localhost:${port}`);
  console.log(`swagger ui   on http://localhost:${port}/api/docs`);
}

bootstrap();
