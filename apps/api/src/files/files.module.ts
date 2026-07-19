import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';
import { LocalFsStorage } from './storage/local-fs.storage.js';
import { STORAGE } from './storage/storage.service.js';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    {
      provide: STORAGE,
      useFactory: () =>
        new LocalFsStorage(
          process.env.STORAGE_DIR ?? './storage',
          Number(process.env.FILE_TTL_HOURS ?? 24),
        ),
    },
  ],
  exports: [FilesService, STORAGE],
})
export class FilesModule {}
