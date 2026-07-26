import { Module } from '@nestjs/common';
import { FilesModule } from '../../files/files.module.js';
import { RenderController } from './render.controller.js';

@Module({
  imports: [FilesModule],
  controllers: [RenderController],
})
export class RenderModule {}
