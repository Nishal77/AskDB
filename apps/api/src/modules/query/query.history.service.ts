import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

export interface SaveQueryHistoryDto {
  userId: string;
  connectionId: string;
  naturalLanguageQuery: string;
  sqlQuery: string;
  resultRowCount: number;
  executionTime: number;
  success: boolean;
  errorMessage?: string;
  insights?: string;
}

@Injectable()
export class QueryHistoryService {
  constructor(private prisma: PrismaService) {}

  async saveQuery(dto: SaveQueryHistoryDto) {
    // This will be implemented with Prisma schema
    // For now, placeholder implementation
    return await this.prisma.queryHistory.create({
      data: {
        userId: dto.userId,
        connectionId: dto.connectionId,
        naturalLanguageQuery: dto.naturalLanguageQuery,
        sqlQuery: dto.sqlQuery,
        resultRowCount: dto.resultRowCount,
        executionTime: dto.executionTime,
        success: dto.success,
        errorMessage: dto.errorMessage,
        insights: dto.insights,
      },
    });
  }

  async getQueryHistory(userId: string, limit: number = 50) {
    return await this.prisma.queryHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getQueryById(queryId: string, userId: string) {
    return await this.prisma.queryHistory.findFirst({
      where: {
        id: queryId,
        userId,
      },
    });
  }
}

