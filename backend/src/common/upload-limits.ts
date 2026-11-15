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

export const MAX_UPLOAD_MB = positiveNumber(process.env.MAX_UPLOAD_MB) ?? 100;
const MAX_UPLOAD_BYTES = Math.floor(MAX_UPLOAD_MB * 1024 * 1024);

const MAX_FILES = 100;

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
