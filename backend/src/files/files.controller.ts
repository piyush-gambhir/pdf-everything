import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FilesService } from './files.service.js';

@ApiTags('files')
@Controller('v1/files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file and get a fileId for later use' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required (multipart field "file")');
    return this.files.upload(file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata' })
  async meta(@Param('id') id: string) {
    return this.files.meta(id);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Download file content' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const { meta, buffer } = await this.files.getRequired(id);
    res
      .status(200)
      .setHeader('Content-Type', meta.mime)
      .setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(meta.originalName)}"`,
      )
      .send(buffer);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a file immediately' })
  async remove(@Param('id') id: string) {
    await this.files.delete(id);
  }
}
