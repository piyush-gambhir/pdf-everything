import {
  Body,
  Controller,
  HttpCode,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { mergePdfs } from '@pdf-everything/pdf-core';
import { MergeOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';

@ApiTags('organize')
@Controller('v1/organize')
export class MergeController {
  constructor(private readonly files: FilesService) {}

  @Post('merge')
  @HttpCode(200)
  @UseInterceptors(FilesInterceptor('files', 50))
  @ApiOperation({ summary: 'Merge multiple PDFs into one' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        options: { type: 'string', description: 'JSON-encoded MergeOptions' },
      },
    },
  })
  async merge(
    @UploadedFiles() uploads: Express.Multer.File[] | undefined,
    @Body() body: { fileIds?: string[]; options?: unknown },
    @Query('output') output: 'binary' | 'ref' = 'binary',
    @Res() res: Response,
  ) {
    const { buffers } = await loadInputs({
      uploads,
      fileIds: body.fileIds,
      files: this.files,
    });
    const opts = parseOptions(body.options, MergeOptionsSchema);
    const out = await mergePdfs(buffers);
    await respondWithPdf({
      res,
      buffer: out,
      filename: opts.outputFilename ?? 'merged.pdf',
      outputMode: output,
      files: this.files,
    });
  }
}
