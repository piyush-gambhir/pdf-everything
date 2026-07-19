import {
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { resizePages } from '@pdf-everything/pdf-core';
import { ResizePagesOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';
import { outputName } from '../../organize/shared.js';

@ApiTags('misc')
@Controller('v1/misc')
export class ResizePagesController {
  constructor(private readonly files: FilesService) {}

  @Post('resize-pages')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Scale page dimensions by a multiplier (e.g. 0.5 = half size)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: { type: 'string', description: 'JSON: { scale: 0.1..4, pages? }' },
      },
    },
  })
  async run(
    @UploadedFile() upload: Express.Multer.File | undefined,
    @Body() body: { fileIds?: string[]; options?: unknown },
    @Query('output') output: 'binary' | 'ref' = 'binary',
    @Res() res: Response,
  ) {
    const { buffers, originalNames } = await loadInputs({
      uploads: upload ? [upload] : undefined,
      fileIds: body.fileIds,
      files: this.files,
    });
    const opts = parseOptions(body.options, ResizePagesOptionsSchema);
    const out = await resizePages(buffers[0]!, opts);
    await respondWithPdf({
      res,
      buffer: out,
      filename: outputName(originalNames[0], 'resized'),
      outputMode: output,
      files: this.files,
    });
  }
}
