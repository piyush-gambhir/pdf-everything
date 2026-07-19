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
import { convertPageSize } from '@pdf-everything/pdf-core';
import { PageSizeConvertOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';
import { outputName } from '../../organize/shared.js';

@ApiTags('misc')
@Controller('v1/misc')
export class PageSizeConvertController {
  constructor(private readonly files: FilesService) {}

  @Post('page-size-convert')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Convert pages to a standard size (A4, Letter, A3, A5, Legal)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: {
          type: 'string',
          description:
            'JSON: { targetSize: a4|a3|a5|letter|legal, orientation: portrait|landscape, fitMode: scale|box-only, pages? }',
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
    const opts = parseOptions(body.options, PageSizeConvertOptionsSchema);
    const out = await convertPageSize(buffers[0]!, opts);
    await respondWithPdf({
      res,
      buffer: out,
      filename: outputName(originalNames[0], opts.targetSize),
      outputMode: output,
      files: this.files,
    });
  }
}
