import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SchemaService } from './schema.service';
// import { SchemaVectorService } from './schema.vector.service'; // Reserved for future use
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/utils/response.util';

@Controller('schema')
@UseGuards(JwtAuthGuard)
export class SchemaController {
  constructor(
    private schemaService: SchemaService,
    // private vectorService: SchemaVectorService, // Reserved for future use
  ) {}

  @Get('connection/:connectionId')
  async getSchema(
    @Param('connectionId') connectionId: string,
    @CurrentUser() _user: any,
  ) {
    const metadata = await this.schemaService.getDatabaseMetadata(connectionId);
    return ApiResponse.success(metadata, 'Schema retrieved successfully');
  }

  @Get('connection/:connectionId/embed')
  async embedSchema(
    @Param('connectionId') connectionId: string,
    @CurrentUser() _user: any,
  ) {
    const metadata = await this.schemaService.getDatabaseMetadata(connectionId);
    
    // This would typically be called by a background job
    // For now, just return the metadata
    return ApiResponse.success(metadata, 'Schema ready for embedding');
  }

  @Get('connection/:connectionId/tables')
  async getTablesWithRowCounts(
    @Param('connectionId') connectionId: string,
    @CurrentUser() _user: any,
  ) {
    const tables = await this.schemaService.getTablesWithRowCounts(connectionId);
    return ApiResponse.success(tables, 'Tables with row counts retrieved successfully');
  }
}

