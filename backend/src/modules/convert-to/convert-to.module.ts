import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module.js';
import { ImagesToPdfController } from './images-to-pdf/images-to-pdf.controller.js';

@Module({
  imports: [FilesModule],
  controllers: [ImagesToPdfController],
})
export class ConvertToModule {}
