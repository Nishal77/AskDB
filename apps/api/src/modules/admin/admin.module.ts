import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DbModule } from '../db/db.module';
import { SchemaModule } from '../schema/schema.module';

@Module({
  imports: [DbModule, SchemaModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

