import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/utils/response.util';
import { AuthenticatedUser } from './strategies/jwt.strategy';

interface UpdateOpenRouterKeyDto {
  openRouterApiKey: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.authService.register(registerDto);
      return ApiResponse.success(user, 'User registered successfully');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Registration failed';
      throw new BadRequestException(message);
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() request: Request) {
    try {
    const ipAddress =
      request.ip ||
      (request as any).connection?.remoteAddress ||
      request.headers['x-forwarded-for'] ||
      'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';
      const result = await this.authService.login(loginDto, ipAddress, userAgent);
      return ApiResponse.success(result, 'Login successful');
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        this.logger.warn(`Login failed: ${error.message}`);
        throw error;
      }
      this.logger.error('Login error', error instanceof Error ? error.stack : error);
      const message = error instanceof Error ? error.message : 'Login failed';
      throw new BadRequestException(message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const fullUser = await this.authService.getUserById(user.id);
    return ApiResponse.success(fullUser, 'Profile retrieved successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Post('openrouter-key')
  @HttpCode(HttpStatus.OK)
  async updateOpenRouterKey(
    @Body() body: UpdateOpenRouterKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const updatedUser = await this.authService.updateOpenRouterKey(
      user.id,
      body.openRouterApiKey,
    );
    return ApiResponse.success(updatedUser, 'OpenRouter API key updated successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Delete('openrouter-key')
  @HttpCode(HttpStatus.OK)
  async deleteOpenRouterKey(@CurrentUser() user: AuthenticatedUser) {
    const updatedUser = await this.authService.updateOpenRouterKey(user.id, null);
    return ApiResponse.success(updatedUser, 'OpenRouter API key removed successfully');
  }
}