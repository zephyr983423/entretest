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

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || message;
        errors = (res as any).errors;
      } else {
        message = res as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      data: null,
      error: {
        statusCode: status,
        message,
        errors,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
