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
import { imagesToPdf } from '../../../pdf-core/index.js';
import { ImagesToPdfOptionsSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';
import { respondWithPdf } from '../../../common/respond.js';

@ApiTags('convert-to')
@Controller('v1/convert-to')
export class ImagesToPdfController {
  constructor(private readonly files: FilesService) {}

  @Post('images-to-pdf')
  @HttpCode(200)
  @UseInterceptors(FilesInterceptor('files', 100))
  @ApiOperation({ summary: 'Convert one or more images (JPG/PNG/TIFF/HEIC/WebP) into a single PDF' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        options: {
          type: 'string',
          description:
            'JSON: { pageSize: a4|letter|auto|..., orientation: portrait|landscape|auto, margin, fit: contain|cover|stretch }',
        },
      },
    },
  })
  async run(
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
    const opts = parseOptions(body.options, ImagesToPdfOptionsSchema);
    const out = await imagesToPdf(buffers, opts);
    await respondWithPdf({
      res,
      buffer: out,
      filename: 'images.pdf',
      outputMode: output,
      files: this.files,
    });
  }
}
