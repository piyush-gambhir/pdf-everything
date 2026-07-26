import { Body, Controller, HttpCode, Post, Query, Res, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HtmlToPdfRequestSchema, MarkdownToPdfRequestSchema } from '@pdf-everything/types';
import type { Response } from 'express';
import { parseOptions } from '../../common/parse-options.js';
import { respondWithPdf } from '../../common/respond.js';
import { FilesService } from '../../files/files.service.js';
import { renderHtml, renderMarkdown } from '../../workers/pdf-render-worker.client.js';

@ApiTags('render')
@Controller('v1/render')
export class RenderController {
  constructor(private readonly files: FilesService) {}

  @Post('html')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('_unused'))
  @ApiOperation({ summary: 'Render HTML to PDF through the private Chromium worker' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ schema: { type: 'object', properties: { options: { type: 'string' } } } })
  async html(
    @Body() body: { options?: unknown } & Record<string, unknown>,
    @Query('output') output: 'binary' | 'ref' = 'binary',
    @Res() res: Response,
  ) {
    const request = parseOptions(body.options ?? body, HtmlToPdfRequestSchema);
    await respondWithPdf({
      res,
      buffer: await renderHtml(request),
      filename: 'html.pdf',
      outputMode: output,
      files: this.files,
    });
  }

  @Post('markdown')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('_unused'))
  @ApiOperation({ summary: 'Render Markdown to PDF through the private Chromium worker' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({ schema: { type: 'object', properties: { options: { type: 'string' } } } })
  async markdown(
    @Body() body: { options?: unknown } & Record<string, unknown>,
    @Query('output') output: 'binary' | 'ref' = 'binary',
    @Res() res: Response,
  ) {
    const request = parseOptions(body.options ?? body, MarkdownToPdfRequestSchema);
    await respondWithPdf({
      res,
      buffer: await renderMarkdown(request),
      filename: 'markdown.pdf',
      outputMode: output,
      files: this.files,
    });
  }
}
