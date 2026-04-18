import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// express is the underlying HTTP adapter used by NestJS's platform-express.
// We don't declare @types/express directly; import the runtime bindings and
// type them loosely here — these middlewares are only referenced from main.ts.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { json, raw } = require('express') as {
  json: (...args: any[]) => any;
  raw: (...args: any[]) => any;
};
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Stripe webhook signature verification requires the exact raw request body.
  // Install raw-body middleware for the webhook path BEFORE the global JSON
  // parser so req.body is a Buffer for that route; every other route still
  // receives parsed JSON.
  app.use('/api/v1/webhooks/stripe', raw({ type: 'application/json' }));
  app.use(json());

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors();

  // OpenAPI / Swagger
  const config = new DocumentBuilder()
    .setTitle('HAIP — Hotel AI Platform')
    .setDescription(
      'Open-source, API-first hotel Property Management System. ' +
      'Part of Telivity\'s open-source travel infrastructure.',
    )
    .setVersion('0.0.1')
    .addBearerAuth()
    .addTag('properties', 'Property management')
    .addTag('rooms', 'Room inventory and status')
    .addTag('room-types', 'Room type definitions')
    .addTag('reservations', 'Reservation lifecycle')
    .addTag('guests', 'Guest profiles')
    .addTag('folios', 'Billing and charges')
    .addTag('payments', 'Payment processing')
    .addTag('rate-plans', 'Rate plans and restrictions')
    .addTag('housekeeping', 'Housekeeping tasks')
    .addTag('health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  console.log(`HAIP API running on http://localhost:${port}`);
  console.log(`OpenAPI docs at http://localhost:${port}/docs`);
}

bootstrap();
