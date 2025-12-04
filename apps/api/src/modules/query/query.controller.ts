import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { QueryService, ExecuteQueryDto } from './query.service';
import { QueryHistoryService } from './query.history.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/utils/response.util';
import { InsightsService } from '../insights/insights.service';
import { PrismaService } from '../db/prisma.service';

@Controller('query')
@UseGuards(JwtAuthGuard)
export class QueryController {
  constructor(
    private queryService: QueryService,
    private queryHistoryService: QueryHistoryService,
    private insightsService: InsightsService,
    private prisma: PrismaService,
  ) {}

  @Post('execute')
  async executeQuery(
    @Body() dto: ExecuteQueryDto,
    @CurrentUser() user: any,
  ) {
    try {
      // Get user's OpenRouter key if they have one
      const userRecord = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { openRouterApiKey: true },
      });

      const result = await this.queryService.executeQuery(
        {
          ...dto,
          userId: user.id,
        },
        userRecord?.openRouterApiKey,
      );

      // Generate insights
      const insights = await this.insightsService.generateInsights(
        result.rows,
        result.columns,
        dto.naturalLanguageQuery,
      );

      // Save to history
      await this.queryHistoryService.saveQuery({
        userId: user.id,
        connectionId: dto.connectionId,
        naturalLanguageQuery: dto.naturalLanguageQuery,
        sqlQuery: result.sql,
        resultRowCount: result.rowCount,
        executionTime: result.executionTime,
        success: true,
        insights,
      });

      return ApiResponse.success(
        {
          ...result,
          insights,
        },
        'Query executed successfully',
      );
    } catch (error: any) {
      // Save failed query to history
      await this.queryHistoryService.saveQuery({
        userId: user.id,
        connectionId: dto.connectionId,
        naturalLanguageQuery: dto.naturalLanguageQuery,
        sqlQuery: '',
        resultRowCount: 0,
        executionTime: 0,
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  @Get('history')
  async getQueryHistory(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    const history = await this.queryHistoryService.getQueryHistory(
      user.id,
      limit ? parseInt(limit.toString(), 10) : 50,
    );
    return ApiResponse.success(history, 'Query history retrieved');
  }

  @Get('history/:id')
  async getQueryById(@Param('id') id: string, @CurrentUser() user: any) {
    const query = await this.queryHistoryService.getQueryById(id, user.id);
    if (!query) {
      return ApiResponse.error('Query not found', 'Query not found');
    }
    return ApiResponse.success(query, 'Query retrieved');
  }
}

