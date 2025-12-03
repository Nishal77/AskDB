import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AdminService, CreateConnectionDto, UpdateConnectionDto } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/utils/response.util';
import { ConnectionStringParser } from '../../common/utils/connection-string-parser';

@Controller('admin/connections')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post()
  async createConnection(
    @Body() dto: CreateConnectionDto,
    @CurrentUser() user: any,
  ) {
    const connection = await this.adminService.createConnection(user.id, dto);
    return ApiResponse.success(connection, 'Database connection created');
  }

  @Get()
  async getConnections(@CurrentUser() user: any) {
    const connections = await this.adminService.getConnections(user.id);
    return ApiResponse.success(connections, 'Connections retrieved');
  }

  @Get(':id')
  async getConnection(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const connection = await this.adminService.getConnection(id, user.id);
    return ApiResponse.success(connection, 'Connection retrieved');
  }

  @Put(':id')
  async updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto,
    @CurrentUser() user: any,
  ) {
    const connection = await this.adminService.updateConnection(id, user.id, dto);
    return ApiResponse.success(connection, 'Connection updated');
  }

  @Delete(':id')
  async deleteConnection(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.adminService.deleteConnection(id, user.id);
    return ApiResponse.success(null, 'Connection deleted');
  }

  @Post('test')
  async testConnection(
    @Body() dto: CreateConnectionDto,
  ) {
    await this.adminService.testConnection(dto);
    return ApiResponse.success(null, 'Connection test successful');
  }

  @Post('parse')
  async parseConnectionString(
    @Body() body: { connectionString: string },
  ) {
    try {
      const parsed = ConnectionStringParser.parse(body.connectionString);
      // Don't return password in response
      const { password, ...safeParsed } = parsed;
      return ApiResponse.success(safeParsed, 'Connection string parsed successfully');
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Failed to parse connection string');
    }
  }
}

