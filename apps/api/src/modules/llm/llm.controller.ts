import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiResponse } from '../../common/utils/response.util';

export interface OpenRouterKeyInfo {
  label: string;
  limit: number | null;
  limitReset: string | null;
  limitRemaining: number | null;
  usage: number;
  usageDaily: number;
  usageWeekly: number;
  usageMonthly: number;
  isFreeTier: boolean;
}

@Controller('llm')
@UseGuards(JwtAuthGuard)
export class LlmController {
  constructor(private readonly configService: ConfigService) {}

  @Get('key-info')
  async getKeyInfo() {
    const apiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      return ApiResponse.success(null, 'No API key configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/key', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      return ApiResponse.success(null, 'Unable to fetch key info');
    }

    const json = (await response.json()) as { data: Record<string, unknown> };
    const d = json.data;

    const info: OpenRouterKeyInfo = {
      label: (d.label as string) || '',
      limit: (d.limit as number | null) ?? null,
      limitReset: (d.limit_reset as string | null) ?? null,
      limitRemaining: (d.limit_remaining as number | null) ?? null,
      usage: (d.usage as number) ?? 0,
      usageDaily: (d.usage_daily as number) ?? 0,
      usageWeekly: (d.usage_weekly as number) ?? 0,
      usageMonthly: (d.usage_monthly as number) ?? 0,
      isFreeTier: (d.is_free_tier as boolean) ?? false,
    };

    return ApiResponse.success(info, 'Key info retrieved');
  }
}
