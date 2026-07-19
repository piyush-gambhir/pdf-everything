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
import { editMetadata } from '@pdf-everything/pdf-core';
import { MetadataOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';
import { outputName } from '../../organize/shared.js';

@ApiTags('edit')
@Controller('v1/edit')
export class MetadataController {
  constructor(private readonly files: FilesService) {}

  @Post('metadata')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Edit PDF metadata (title, author, subject, keywords, creator, producer)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: {
          type: 'string',
          description: 'JSON: { title?, author?, subject?, keywords?, producer?, creator? }',
        },
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
    const opts = parseOptions(body.options, MetadataOptionsSchema);
    const out = await editMetadata(buffers[0]!, opts);
    await respondWithPdf({
      res,
      buffer: out,
      filename: outputName(originalNames[0], 'metadata'),
      outputMode: output,
      files: this.files,
    });
  }
}
