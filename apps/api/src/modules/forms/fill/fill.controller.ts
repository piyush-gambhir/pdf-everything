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
import { fillForm } from '@pdf-everything/pdf-core';
import { FormsFillOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';
import { outputName } from '../../organize/shared.js';

@ApiTags('forms')
@Controller('v1/forms')
export class FormsFillController {
  constructor(private readonly files: FilesService) {}

  @Post('fill')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Fill a PDF form. Returns the filled PDF; missing fields go in X-Missing-Fields header.',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: {
          type: 'string',
          description: 'JSON: { fields: { fieldName: value }, flatten?: boolean }',
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
    const opts = parseOptions(body.options, FormsFillOptionsSchema);
    const { pdf, filled, missing } = await fillForm(buffers[0]!, opts);
    res.setHeader('X-Filled-Fields', filled.join(','));
    res.setHeader('X-Missing-Fields', missing.join(','));
    await respondWithPdf({
      res,
      buffer: pdf,
      filename: outputName(originalNames[0], 'filled'),
      outputMode: output,
      files: this.files,
    });
  }
}
