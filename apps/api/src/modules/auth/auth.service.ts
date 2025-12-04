import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from '@node-rs/bcrypt';
import { PrismaService } from '../db/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  openRouterApiKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    openRouterApiKey: string | null;
  };
}

const MIN_PASSWORD_LENGTH = 6;
const BCRYPT_ROUNDS = 10;
const MASKED_API_KEY = '***configured***';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithoutPassword | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        return null;
      }

      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
      return null;
      }

      const { password: _, ...result } = user;
      return {
        id: result.id,
        email: result.email,
        name: result.name,
        phone: result.phone,
        openRouterApiKey: (result as any).openRouterApiKey || null,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error) {
      this.handlePrismaError(error);
      return null;
    }
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
      const user = await this.validateUser(normalizedEmail, loginDto.password);

      if (!user) {
      await this.logFailedLogin(normalizedEmail, ipAddress, userAgent);
        throw new UnauthorizedException('Invalid credentials');
      }

    await this.updateLastLogin(user.id);
    await this.logSuccessfulLogin(user.id, user.email, ipAddress, userAgent);

      const payload = { email: user.email, sub: user.id };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        openRouterApiKey: this.maskApiKey(user.openRouterApiKey),
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<UserWithoutPassword> {
    const { name, email, password, phone } = this.validateRegistrationInput(registerDto);
    const normalizedEmail = email.toLowerCase();

    await this.checkUserExists(normalizedEmail);

    const hashedPassword = await hash(password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        phone,
        provider: 'email',
      },
    });

    const { password: _, ...result } = user;
    return {
      id: result.id,
      email: result.email,
      name: result.name,
      phone: result.phone,
      openRouterApiKey: (result as any).openRouterApiKey || null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async validateToken(token: string): Promise<unknown> {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserById(userId: string): Promise<UserWithoutPassword> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        openRouterApiKey: this.maskApiKey((user as any).openRouterApiKey),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  async updateOpenRouterKey(
    userId: string,
    openRouterApiKey: string | null,
  ): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { openRouterApiKey: openRouterApiKey?.trim() || null } as any,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      openRouterApiKey: this.maskApiKey((user as any).openRouterApiKey),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private validateRegistrationInput(registerDto: RegisterDto) {
      const name = registerDto.name?.trim();
      const email = registerDto.email?.trim();
      const password = registerDto.password?.trim();
      const phone = registerDto.phone?.trim() || null;

      if (!name || name.length === 0) {
        throw new BadRequestException('Name is required');
      }
      if (!email || email.length === 0) {
        throw new BadRequestException('Email is required');
      }
      if (!password || password.length === 0) {
        throw new BadRequestException('Password is required');
      }
    if (password.length < MIN_PASSWORD_LENGTH) {
          throw new BadRequestException(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
          );
        }

    return { name, email, password, phone };
      }

  private async checkUserExists(email: string): Promise<void> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
      throw error;
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() } as any,
      });
    } catch {
      // Silently fail - login tracking is not critical
    }
  }

  private async logSuccessfulLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      await (this.prisma as any).loginHistory.create({
        data: {
          userId,
          email,
          success: true,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch {
      // Silently fail - login logging is not critical
    }
  }

  private async logFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        await (this.prisma as any).loginHistory.create({
          data: {
            userId: existingUser.id,
            email,
            success: false,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            failureReason: 'Invalid credentials',
          },
        });
  }
    } catch {
      // Silently fail - login logging is not critical
    }
  }

  private maskApiKey(apiKey: string | null): string | null {
    return apiKey ? MASKED_API_KEY : null;
  }

  private handlePrismaError(error: unknown): void {
    if (this.isPrismaSchemaError(error)) {
      throw new BadRequestException(
        'Database schema not initialized. Please run migrations: pnpm migrate',
      );
    }
  }

  private isPrismaSchemaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.message?.includes('does not exist') ||
      (error as any).code === '42P01' ||
      (error as any).code === 'P2021'
    );
  }
}
