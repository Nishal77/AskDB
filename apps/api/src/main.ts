import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { getEnvConfig } from './config/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = getEnvConfig();

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe with better error handling
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Changed to false to be more lenient
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      skipMissingProperties: true, // Skip missing properties to prevent validation on undefined
      skipNullProperties: true, // Skip null properties
      skipUndefinedProperties: true, // Skip undefined to prevent toUpperCase errors
      stopAtFirstError: true, // Stop on first error to prevent cascading validation issues
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        });
        return new BadRequestException(messages.join('; '));
      },
    }),
  );

  // Global prefix - exclude health and root
  app.setGlobalPrefix('api/v1', {
    exclude: ['/health'],
  });

  await app.listen(config.port);
  console.log(`🚀 ${config.appName} API is running on: http://localhost:${config.port}/api/v1`);
}

bootstrap();

