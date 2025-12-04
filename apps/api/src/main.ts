import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { getEnvConfig } from './config/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    // Validate environment configuration before creating app
    const config = getEnvConfig();
    logger.log(`Starting ${config.appName} v${config.appVersion}`);

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // CORS configuration
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
      : ['http://localhost:3001', 'http://localhost:3000'];
    
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Authorization'],
    });

    // Global exception handling
    app.useGlobalFilters(new HttpExceptionFilter());

    // Request validation and transformation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        skipMissingProperties: true,
        skipNullProperties: true,
        skipUndefinedProperties: true,
        stopAtFirstError: true,
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => {
            const constraints = error.constraints || {};
            return Object.values(constraints).join(', ');
          });
          return new BadRequestException(messages.join('; '));
        },
      }),
    );

    // API prefix (health check excluded)
    app.setGlobalPrefix('api/v1', {
      exclude: ['/health'],
    });

    await app.listen(config.port);
    logger.log(`API running on http://localhost:${config.port}/api/v1`);
  } catch (error) {
    logger.error('Failed to start application', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

bootstrap();