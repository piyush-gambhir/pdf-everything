import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module.js';
import { WatermarkController } from './watermark/watermark.controller.js';
import { PageNumbersController } from './page-numbers/page-numbers.controller.js';
import { MetadataController } from './metadata/metadata.controller.js';

@Module({
  imports: [FilesModule],
  controllers: [WatermarkController, PageNumbersController, MetadataController],
})
export class EditModule {}
