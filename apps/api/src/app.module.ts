import { Module } from '@nestjs/common';
import { FilesModule } from './files/files.module.js';
import { OrganizeModule } from './modules/organize/organize.module.js';
import { EditModule } from './modules/edit/edit.module.js';
import { ConvertToModule } from './modules/convert-to/convert-to.module.js';
import { ConvertFromModule } from './modules/convert-from/convert-from.module.js';
import { MiscModule } from './modules/misc/misc.module.js';
import { FormsModule } from './modules/forms/forms.module.js';

@Module({
  imports: [
    FilesModule,
    OrganizeModule,
    EditModule,
    ConvertToModule,
    ConvertFromModule,
    MiscModule,
    FormsModule,
  ],
})
export class AppModule {}
