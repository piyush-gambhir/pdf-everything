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
import { reorderPages } from '@pdf-everything/pdf-core';
import { ReorderOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';
import { outputName } from '../shared.js';

@ApiTags('organize')
@Controller('v1/organize')
export class ReorderController {
  constructor(private readonly files: FilesService) {}

  @Post('reorder')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Reorder pages — order must be a permutation of 1..N' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: { type: 'string', description: 'JSON: { order: [3,1,2,4] }' },
      },
    },
  })
  async reorder(
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
    const opts = parseOptions(body.options, ReorderOptionsSchema);
    const out = await reorderPages(buffers[0]!, opts);
    await respondWithPdf({
      res,
      buffer: out,
      filename: outputName(originalNames[0], 'reordered'),
      outputMode: output,
      files: this.files,
    });
  }
}
