import { Body, Controller, HttpCode, Post, Query, Res, UseInterceptors } from '@nestjs/common';
import { NoFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  type ApiBodyOptions,
  type ApiResponseOptions,
} from '@nestjs/swagger';
import {
  FileMetaSchema,
  HtmlToPdfRequestSchema,
  MarkdownToPdfRequestSchema,
} from '@pdf-everything/types';
import type { Response } from 'express';
import { z } from 'zod';
import { parseOptions } from '../../common/parse-options.js';
import { respondWithPdf } from '../../common/respond.js';
import { FilesService } from '../../files/files.service.js';
import { renderHtml, renderMarkdown } from '../../workers/pdf-render-worker.client.js';

/** A zod schema as an OpenAPI schema object. */
function openApiSchema(schema: z.ZodType, io: 'input' | 'output') {
  const { $schema: _dialect, ...body } = z.toJSONSchema(schema, { io });
  return body;
}

/** A render request as OpenAPI documents it: the schema that validates it. */
function requestBody(schema: z.ZodType): ApiBodyOptions {
  return {
    description:
      'The request as a JSON body. A multipart/form-data request (the console sends one) ' +
      'carries this object JSON-encoded in a single `options` text field, and no files. ' +
      'The document loads nothing over the network and runs no scripts: embed images, ' +
      'fonts and stylesheets as data: URIs.',
    schema: openApiSchema(schema, 'input'),
  } as ApiBodyOptions;
}

const RENDERED = {
  description: 'The PDF, or with `?output=ref` the stored file reference.',
  content: {
    'application/pdf': { schema: { type: 'string', format: 'binary' } },
    'application/json': { schema: openApiSchema(FileMetaSchema, 'output') },
  },
} as ApiResponseOptions;

@ApiTags('render')
@Controller('v1/render')
export class RenderController {
  constructor(private readonly files: FilesService) {}

  @Post('html')
  @HttpCode(200)
  @UseInterceptors(NoFilesInterceptor())
  @ApiOperation({ summary: 'Render HTML to PDF through the private Chromium worker' })
  @ApiConsumes('application/json')
  @ApiBody(requestBody(HtmlToPdfRequestSchema))
  @ApiOkResponse(RENDERED)
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
  @UseInterceptors(NoFilesInterceptor())
  @ApiOperation({ summary: 'Render Markdown to PDF through the private Chromium worker' })
  @ApiConsumes('application/json')
  @ApiBody(requestBody(MarkdownToPdfRequestSchema))
  @ApiOkResponse(RENDERED)
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
