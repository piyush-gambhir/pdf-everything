import {
  Global,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
  PayloadTooLargeException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';
import type { Request } from 'express';
import { positiveNumber } from './env.js';

/**
 * Multipart uploads are buffered in memory before they reach a worker, so each
 * one is bounded: MAX_UPLOAD_MB (default 100) caps the whole request by its
 * declared length, refused before anything is read, and caps each file and
 * text field on its own. The core worker's JSON protocol takes about 110 MiB
 * of files, so a larger upload could not run anyway.
 */
export const MAX_UPLOAD_MB = positiveNumber(process.env.MAX_UPLOAD_MB) ?? 100;
const MAX_UPLOAD_BYTES = Math.floor(MAX_UPLOAD_MB * 1024 * 1024);

/** The most files any route accepts (images-to-pdf takes 100). */
const MAX_FILES = 100;

/**
 * Refuses a multipart request larger than MAX_UPLOAD_MB (413) or one that does
 * not declare its length (411), which only a per-part limit could bound.
 */
@Injectable()
export class MultipartLengthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.is('multipart/form-data')) return true;
    const declared = request.headers['content-length'];
    if (declared === undefined) {
      throw new HttpException(
        'Multipart uploads must declare their Content-Length.',
        HttpStatus.LENGTH_REQUIRED,
      );
    }
    if (Number(declared) > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(`Uploads are limited to ${MAX_UPLOAD_MB} MB.`);
    }
    return true;
  }
}

/** The upload limits, for every route's file interceptor. */
@Global()
@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: MAX_UPLOAD_BYTES,
        fieldSize: MAX_UPLOAD_BYTES,
        files: MAX_FILES,
        fields: 200,
      },
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: MultipartLengthGuard }],
  exports: [MulterModule],
})
export class UploadLimitsModule {}
