import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { PdfCoreWorkerError } from '../../workers/pdf-core-worker.client.js';
import { PdfRenderWorkerError } from '../../workers/pdf-render-worker.client.js';
import type { Problem } from '@pdf-everything/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const problem = toProblem(exception, req.url);

    if (problem.status >= 500) {
      this.logger.error(exception);
    }

    res.status(problem.status).setHeader('Content-Type', 'application/problem+json').json(problem);
  }
}

function toProblem(exception: unknown, instance: string): Problem {
  if (exception instanceof ZodError) {
    return {
      type: 'about:blank',
      title: 'Validation failed',
      status: 400,
      detail: 'One or more fields failed validation',
      instance,
      errors: exception.issues,
    };
  }
  if (exception instanceof PdfCoreWorkerError || exception instanceof PdfRenderWorkerError) {
    return {
      type: 'about:blank',
      title: exception.code,
      status: exception.status,
      detail: exception.message,
      instance,
    };
  }
  if (exception instanceof HttpException) {
    const res = exception.getResponse();
    const detail =
      typeof res === 'string'
        ? res
        : (((res as Record<string, unknown>).message as string | undefined) ?? exception.message);
    return {
      type: 'about:blank',
      title: exception.name,
      status: exception.getStatus(),
      detail,
      instance,
    };
  }
  return {
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: exception instanceof Error ? exception.message : 'Unknown error',
    instance,
  };
}
