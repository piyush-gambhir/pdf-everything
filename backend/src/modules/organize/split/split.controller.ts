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
import { splitPdf } from '../../../pdf-core/index.js';
import { SplitOptionsSchema } from '@pdf-everything/types';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';
import { parseOptions } from '../../../common/parse-options.js';

@ApiTags('organize')
@Controller('v1/organize')
export class SplitController {
  constructor(private readonly files: FilesService) {}

  @Post('split')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Split a PDF into multiple PDFs (returns FileMeta[] since output is multi-file)',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        options: {
          type: 'string',
          description:
            'JSON-encoded SplitOptions: { mode: "ranges", ranges: ["1-2","3-5"] } or { mode: "each" }',
        },
      },
    },
  })
  async split(
    @UploadedFile() upload: Express.Multer.File | undefined,
    @Body() body: { fileIds?: string[]; options?: unknown },
  ) {
    const { buffers, originalNames } = await loadInputs({
      uploads: upload ? [upload] : undefined,
      fileIds: body.fileIds,
      files: this.files,
    });
    const opts = parseOptions(body.options, SplitOptionsSchema);
    const parts = await splitPdf(buffers[0]!, opts);
    const baseName = stripExt(originalNames[0] ?? 'document');
    const metas = await Promise.all(
      parts.map((buf, i) =>
        this.files.upload({
          buffer: buf,
          originalname: `${baseName}-part-${i + 1}.pdf`,
          mimetype: 'application/pdf',
        }),
      ),
    );
    return { files: metas };
  }
}

function stripExt(name: string): string {
  return name.replace(/\.pdf$/i, '');
}
