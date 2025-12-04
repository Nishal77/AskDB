import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { QueryService, ExecuteQueryDto } from './query.service';
import { QueryHistoryService } from './query.history.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/utils/response.util';
import { InsightsService } from '../insights/insights.service';
import { PrismaService } from '../db/prisma.service';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const DEFAULT_HISTORY_LIMIT = 50;

@Controller('query')
@UseGuards(JwtAuthGuard)
export class QueryController {
  constructor(
    private readonly queryService: QueryService,
    private readonly queryHistoryService: QueryHistoryService,
    private readonly insightsService: InsightsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('execute')
  async executeQuery(
    @Body() dto: ExecuteQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    try {
      const userOpenRouterKey = await this.getUserOpenRouterKey(user.id);
      const result = await this.queryService.executeQuery(
        {
          ...dto,
          userId: user.id,
        },
        userOpenRouterKey,
      );

      const insights = await this.insightsService.generateInsights(
        result.rows,
        result.columns,
        dto.naturalLanguageQuery,
      );

      await this.saveQueryHistory(user.id, dto, result, insights, true);

      return ApiResponse.success(
        {
          ...result,
          insights,
        },
        'Query executed successfully',
      );
    } catch (error) {
      await this.saveQueryHistory(user.id, dto, null, null, false, error);
      throw error;
    }
  }

  @Get('history')
  async getQueryHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : DEFAULT_HISTORY_LIMIT;
    const history = await this.queryHistoryService.getQueryHistory(user.id, parsedLimit);
    return ApiResponse.success(history, 'Query history retrieved');
  }

  @Get('history/:id')
  async getQueryById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const query = await this.queryHistoryService.getQueryById(id, user.id);
    if (!query) {
      throw new NotFoundException('Query not found');
    }
    return ApiResponse.success(query, 'Query retrieved');
  }

  private async getUserOpenRouterKey(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return (user as any)?.openRouterApiKey || null;
  }

  private async saveQueryHistory(
    userId: string,
    dto: ExecuteQueryDto,
    result: { sql: string; rowCount: number; executionTime: number } | null,
    insights: string | null,
    success: boolean,
    error?: unknown,
  ): Promise<void> {
    await this.queryHistoryService.saveQuery({
      userId,
      connectionId: dto.connectionId,
      naturalLanguageQuery: dto.naturalLanguageQuery,
      sqlQuery: result?.sql || '',
      resultRowCount: result?.rowCount || 0,
      executionTime: result?.executionTime || 0,
      success,
      insights: success ? insights : null,
      errorMessage: success ? null : (error instanceof Error ? error.message : 'Unknown error'),
    });
  }
}