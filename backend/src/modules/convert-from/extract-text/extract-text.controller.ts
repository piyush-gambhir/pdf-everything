import {
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { extractText } from '../../../pdf-core/index.js';
import { ExtractTextOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { Res } from '@nestjs/common';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { outputName } from '../../organize/shared.js';

@ApiTags('convert-from')
@Controller('v1/convert-from')
export class ExtractTextController {
  constructor(private readonly files: FilesService) {}

  @Post('extract-text')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Extract plain text from a PDF (returns text/plain or JSON)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: { type: 'string', description: 'JSON: { preserveBlankLines?: boolean }' },
      },
    },
  })
  async run(
    @UploadedFile() upload: Express.Multer.File | undefined,
    @Body() body: { fileIds?: string[]; options?: unknown },
    @Res() res: Response,
  ) {
    const { buffers, originalNames } = await loadInputs({
      uploads: upload ? [upload] : undefined,
      fileIds: body.fileIds,
      files: this.files,
    });
    const opts = parseOptions(body.options, ExtractTextOptionsSchema);
    const result = await extractText(buffers[0]!, opts);
    const txtName = outputName(originalNames[0], 'extracted').replace(/\.pdf$/i, '.txt');
    res
      .status(200)
      .setHeader('Content-Type', 'text/plain; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(txtName)}"`)
      .setHeader('X-Page-Count', String(result.pageCount))
      .send(result.text);
  }
}
