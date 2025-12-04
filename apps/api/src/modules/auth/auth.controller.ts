import { Controller, Post, Body, UseGuards, Get, Delete, Req, HttpCode, HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../common/utils/response.util';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    try {
      const user = await this.authService.register(registerDto);
      return ApiResponse.success(user, 'User registered successfully');
    } catch (error: any) {
      // Return proper error response
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Registration error:', error);
      throw new BadRequestException(error?.message || 'Registration failed');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: any,
  ) {
    try {
      const ipAddress = request.ip || request.connection?.remoteAddress || request.headers['x-forwarded-for'] || 'unknown';
      const userAgent = request.headers['user-agent'] || 'unknown';
      const result = await this.authService.login(loginDto, ipAddress, userAgent);
      return ApiResponse.success(result, 'Login successful');
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    // Get full user data including OpenRouter key status
    const fullUser = await this.authService.getUserById(user.id);
    return ApiResponse.success(fullUser, 'Profile retrieved successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Post('openrouter-key')
  @HttpCode(HttpStatus.OK)
  async updateOpenRouterKey(
    @Body() body: { openRouterApiKey: string },
    @CurrentUser() user: any,
  ) {
    const updatedUser = await this.authService.updateOpenRouterKey(user.id, body.openRouterApiKey);
    return ApiResponse.success(updatedUser, 'OpenRouter API key updated successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Delete('openrouter-key')
  @HttpCode(HttpStatus.OK)
  async deleteOpenRouterKey(@CurrentUser() user: any) {
    const updatedUser = await this.authService.updateOpenRouterKey(user.id, null);
    return ApiResponse.success(updatedUser, 'OpenRouter API key removed successfully');
  }
}

