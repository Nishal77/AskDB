import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      name: 'AskYourDatabase API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: {
          register: '/api/v1/auth/register',
          login: '/api/v1/auth/login',
          me: '/api/v1/auth/me',
        },
        admin: {
          connections: '/api/v1/admin/connections',
        },
        schema: {
          getSchema: '/api/v1/schema/connection/:connectionId',
          embed: '/api/v1/schema/connection/:connectionId/embed',
        },
        query: {
          execute: '/api/v1/query/execute',
          history: '/api/v1/query/history',
          getHistory: '/api/v1/query/history/:id',
        },
      },
      documentation: 'https://github.com/your-repo/docs',
    };
  }
}

