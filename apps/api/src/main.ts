import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
