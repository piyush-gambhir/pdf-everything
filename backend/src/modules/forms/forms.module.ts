import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module.js';
import { FormsFillController } from './fill/fill.controller.js';
import { FormsFlattenController } from './flatten/flatten.controller.js';
import { FormsExtractController } from './extract/extract.controller.js';

@Module({
  imports: [FilesModule],
  controllers: [FormsFillController, FormsFlattenController, FormsExtractController],
})
export class FormsModule {}
