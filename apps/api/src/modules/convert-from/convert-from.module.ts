import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module.js';
import { ExtractTextController } from './extract-text/extract-text.controller.js';

@Module({
  imports: [FilesModule],
  controllers: [ExtractTextController],
})
export class ConvertFromModule {}
