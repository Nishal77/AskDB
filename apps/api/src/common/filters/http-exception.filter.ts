import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        const errorMessage = responseObj.message;
        message = Array.isArray(errorMessage)
          ? errorMessage.join(', ')
          : errorMessage || message;
      }
    } else if (exception instanceof Error) {
        message = exception.message;
      // Handle CORS errors
      if (message.includes('CORS')) {
        status = HttpStatus.FORBIDDEN;
      }
    }

    // Log error for debugging (production should use proper logger)
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('Internal Server Error:', {
      status,
      message,
      path: request.url,
      method: request.method,
      stack: exception instanceof Error ? exception.stack : undefined,
    });
    }

    const errorResponse = {
      success: false,
      error: message,
      message: message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
        path: request.url,
        method: request.method,
      }),
    };

    // Ensure response is sent even if headers are already sent
    if (!response.headersSent) {
      response.status(status).json(errorResponse);
    }
  }
}


