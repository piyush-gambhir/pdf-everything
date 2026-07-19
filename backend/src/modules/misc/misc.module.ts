import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module.js';
import { ResizePagesController } from './resize-pages/resize-pages.controller.js';
import { PageSizeConvertController } from './page-size-convert/page-size-convert.controller.js';

@Module({
  imports: [FilesModule],
  controllers: [ResizePagesController, PageSizeConvertController],
})
export class MiscModule {}
