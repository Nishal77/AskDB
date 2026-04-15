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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  AdminService,
  CreateConnectionDto,
  UpdateConnectionDto,
} from './admin.service';
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

  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * POST /admin/connections
   * Saves a new connection. Does NOT perform a live test — connection format is
   * validated but the live test is deferred to POST :id/test or the query page.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createConnection(
    @Body() dto: CreateConnectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const connection = await this.adminService.createConnection(user.id, dto);
    return ApiResponse.success(connection, 'Database connection created successfully');
  }

  // ── List ────────────────────────────────────────────────────────────────────

  @Get()
  async getConnections(@CurrentUser() user: AuthenticatedUser) {
    const connections = await this.adminService.getConnections(user.id);
    return ApiResponse.success(connections, 'Connections retrieved');
  }

  // ── Pre-save test (no auth required for the connection itself) ──────────────

  /**
   * POST /admin/connections/test
   * Tests a connection from raw credentials BEFORE saving it.
   * Returns a result object (never throws a 4xx) so the UI can show status.
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testConnectionPreSave(@Body() dto: CreateConnectionDto) {
    const result = await this.adminService.testConnectionPreSave(dto);
    return ApiResponse.success(result, result.success ? 'Connection test successful' : 'Connection test failed');
  }

  // ── Parse connection string ─────────────────────────────────────────────────

  /**
   * POST /admin/connections/parse
   * Parses a connection string and returns the structured fields (no live test).
   */
  @Post('parse')
  @HttpCode(HttpStatus.OK)
  async parseConnectionString(@Body() body: ParseConnectionStringDto) {
    if (!body.connectionString?.trim()) {
      throw new BadRequestException('connectionString is required');
    }

    try {
      const parsed = ConnectionStringParser.parse(body.connectionString.trim());
      // Never return the password to the frontend
      const { password: _, ...safeParsed } = parsed;
      return ApiResponse.success(safeParsed, 'Connection string parsed successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to parse connection string';
      throw new BadRequestException(message);
    }
  }

  // ── Get by ID ───────────────────────────────────────────────────────────────

  /**
   * NOTE: This route must come AFTER all fixed-segment routes (test, parse)
   * so that NestJS does not match ":id" against those literal segments.
   */
  @Get(':id')
  async getConnection(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const connection = await this.adminService.getConnection(id, user.id);
    return ApiResponse.success(connection, 'Connection retrieved');
  }

  // ── Status ──────────────────────────────────────────────────────────────────

  @Get('status/:id')
  async getConnectionStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const status = await this.adminService.getConnectionStatus(id, user.id);
    return ApiResponse.success(status, 'Connection status retrieved');
  }

  // ── Test existing connection ────────────────────────────────────────────────

  /**
   * POST /admin/connections/:id/test
   * Performs a live test against an already-saved connection.
   * Returns a result object (never throws a 4xx) so the UI can display status gracefully.
   */
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async testExistingConnection(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.adminService.testExistingConnection(id, user.id);
    return ApiResponse.success(result, result.success ? 'Connection test successful' : 'Connection test failed');
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  @Put(':id')
  async updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const connection = await this.adminService.updateConnection(id, user.id, dto);
    return ApiResponse.success(connection, 'Connection updated');
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteConnection(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.adminService.deleteConnection(id, user.id);
    return ApiResponse.success(null, 'Connection deleted');
  }
}
