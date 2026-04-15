import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'askyourdatabase-api',
      version: '1.0.0',
    };
  }
}
