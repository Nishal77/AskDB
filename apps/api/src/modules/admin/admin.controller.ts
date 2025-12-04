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
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

interface ParseConnectionStringDto {
  connectionString: string;
}

@Controller('admin/connections')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  async createConnection(
    @Body() dto: CreateConnectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const connection = await this.adminService.createConnection(user.id, dto);
    return ApiResponse.success(connection, 'Database connection created');
  }

  @Get()
  async getConnections(@CurrentUser() user: AuthenticatedUser) {
    const connections = await this.adminService.getConnections(user.id);
    return ApiResponse.success(connections, 'Connections retrieved');
  }

  @Get('status/:id')
  async getConnectionStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const status = await this.adminService.getConnectionStatus(id, user.id);
    return ApiResponse.success(status, 'Connection status retrieved');
  }

  @Get(':id')
  async getConnection(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const connection = await this.adminService.getConnection(id, user.id);
    return ApiResponse.success(connection, 'Connection retrieved');
  }

  @Put(':id')
  async updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const connection = await this.adminService.updateConnection(id, user.id, dto);
    return ApiResponse.success(connection, 'Connection updated');
  }

  @Delete(':id')
  async deleteConnection(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.adminService.deleteConnection(id, user.id);
    return ApiResponse.success(null, 'Connection deleted');
  }

  @Post('test')
  async testConnection(@Body() dto: CreateConnectionDto) {
    await this.adminService.testConnectionDto(dto);
    return ApiResponse.success(null, 'Connection test successful');
  }

  @Post('parse')
  async parseConnectionString(@Body() body: ParseConnectionStringDto) {
    if (!body.connectionString?.trim()) {
      throw new BadRequestException('Connection string is required');
    }

    try {
      const parsed = ConnectionStringParser.parse(body.connectionString);
      const { password, ...safeParsed } = parsed;
      return ApiResponse.success(safeParsed, 'Connection string parsed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse connection string';
      throw new BadRequestException(message);
    }
  }
}