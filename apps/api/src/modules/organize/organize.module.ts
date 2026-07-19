import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module.js';
import { MergeController } from './merge/merge.controller.js';
import { SplitController } from './split/split.controller.js';
import { RotateController } from './rotate/rotate.controller.js';
import { RemovePagesController } from './remove-pages/remove-pages.controller.js';
import { ExtractPagesController } from './extract-pages/extract-pages.controller.js';
import { ReorderController } from './reorder/reorder.controller.js';
import { CropController } from './crop/crop.controller.js';

@Module({
  imports: [FilesModule],
  controllers: [
    MergeController,
    SplitController,
    RotateController,
    RemovePagesController,
    ExtractPagesController,
    ReorderController,
    CropController,
  ],
})
export class OrganizeModule {}
