import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller';
import { SchemaService } from './schema.service';
import { SchemaVectorService } from './schema.vector.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [SchemaController],
  providers: [SchemaService, SchemaVectorService],
  exports: [SchemaService, SchemaVectorService],
})
export class SchemaModule {}
