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
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errors = responseObj.message instanceof Array ? responseObj.message : null;
      }
    } else if (exception instanceof Error) {
      // Handle specific error types
      if (exception instanceof TypeError) {
        // Common validation errors like "Cannot read properties of undefined (reading 'toUpperCase')"
        if (exception.message.includes('toUpperCase') || exception.message.includes('Cannot read properties')) {
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid input data. Please check all required fields are provided correctly.';
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    }

    // Log error for debugging
    console.error('Exception caught:', {
      status,
      message,
      errors,
      path: request.url,
      method: request.method,
      body: request.body,
      errorType: exception instanceof Error ? exception.constructor.name : typeof exception,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      success: false,
      error: Array.isArray(errors) ? errors.join(', ') : message,
      message: Array.isArray(errors) ? errors.join(', ') : message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}


