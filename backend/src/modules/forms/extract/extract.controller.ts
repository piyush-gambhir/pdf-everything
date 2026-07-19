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
import { extractFormData } from '../../../pdf-core/index.js';
import type { FormsExtractResponse } from '@pdf-everything/types';
import { FilesService } from '../../../files/files.service.js';
import { loadInputs } from '../../../common/load-inputs.js';

@ApiTags('forms')
@Controller('v1/forms')
export class FormsExtractController {
  constructor(private readonly files: FilesService) {}

  @Post('extract')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Read all form fields and their current values as JSON' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async run(
    @UploadedFile() upload: Express.Multer.File | undefined,
    @Body() body: { fileIds?: string[] },
  ): Promise<FormsExtractResponse> {
    const { buffers } = await loadInputs({
      uploads: upload ? [upload] : undefined,
      fileIds: body.fileIds,
      files: this.files,
    });
    const fields = await extractFormData(buffers[0]!);
    return { fields };
  }
}
