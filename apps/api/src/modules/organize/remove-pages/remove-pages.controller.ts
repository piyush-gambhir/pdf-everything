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
import { removePages } from '@pdf-everything/pdf-core';
import { RemovePagesOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';
import { outputName } from '../shared.js';

@ApiTags('organize')
@Controller('v1/organize')
export class RemovePagesController {
  constructor(private readonly files: FilesService) {}

  @Post('remove-pages')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Remove specified pages from a PDF' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: { type: 'string', description: 'JSON: { pages: "2,4,6-9" }' },
      },
    },
  })
  async remove(
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
    const opts = parseOptions(body.options, RemovePagesOptionsSchema);
    const out = await removePages(buffers[0]!, opts);
    await respondWithPdf({
      res,
      buffer: out,
      filename: outputName(originalNames[0], 'pages-removed'),
      outputMode: output,
      files: this.files,
    });
  }
}
