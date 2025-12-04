import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from '@node-rs/bcrypt';
import { PrismaService } from '../db/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      // Check if user exists and has a password (not OAuth-only user)
      if (!user || !user.password) {
        return null;
      }

      // Verify password
      if (await compare(password, user.password)) {
        const { password: _, ...result } = user;
        return result;
      }
      return null;
    } catch (error: any) {
      console.error('Error validating user:', error);
      // Check if it's a database schema error
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new BadRequestException(
          'Database schema not initialized. Please contact administrator or run migrations.'
        );
      }
      return null;
    }
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    let failureReason: string | null = null;

    try {
      const user = await this.validateUser(normalizedEmail, loginDto.password);
      if (!user) {
        failureReason = 'Invalid credentials';
        // Log failed login attempt
        try {
          const existingUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
          });
          if (existingUser) {
            await this.prisma.loginHistory.create({
              data: {
                userId: existingUser.id,
                email: normalizedEmail,
                success: false,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
                failureReason: failureReason,
              },
            });
          } else {
            // User doesn't exist - log with a placeholder userId (we'll handle this differently)
            // For now, we'll skip logging non-existent users
          }
        } catch (logError) {
          console.error('Failed to log login attempt:', logError);
        }
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login time
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log successful login
      try {
        await this.prisma.loginHistory.create({
          data: {
            userId: user.id,
            email: user.email,
            success: true,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
          },
        });
      } catch (logError) {
        console.error('Failed to log successful login:', logError);
        // Don't fail the login if logging fails
      }

      const payload = { email: user.email, sub: user.id };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          openRouterApiKey: user.openRouterApiKey ? '***configured***' : null, // Don't expose full key
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException('Login failed: ' + errorMessage);
    }
  }

  async register(registerDto: RegisterDto) {
    try {
      // Validate and sanitize input - ensure all required fields are present and not empty
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
      if (password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters long');
      }

      // Normalize email to lowercase (name can have any case)
      const normalizedEmail = email.toLowerCase();

      // Check if user already exists
      let existingUser;
      try {
        existingUser = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
      } catch (error: any) {
        // Check if it's a database schema error
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          throw new BadRequestException(
            'Database schema not initialized. Please run migrations: pnpm migrate'
          );
        }
        throw error;
      }

      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      const hashedPassword = await hash(password, 10);

      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name, // Keep name as-is (can have capital letters)
          phone: phone,
          provider: 'email', // Mark as email-based registration
        },
      });

      const { password: _, ...result } = user;
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Check if it's a database schema error
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new BadRequestException(
          'Database schema not initialized. Please run migrations: pnpm migrate'
        );
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Registration error:', error);
      throw new BadRequestException('Registration failed: ' + errorMessage);
    }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserById(userId: string) {
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          openRouterApiKey: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error: any) {
      // Check if it's a database schema error
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        throw new BadRequestException(
          'Database schema not initialized. Please run migrations: pnpm migrate'
        );
      }
      throw error;
    }

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Don't expose full key, just indicate if it's set
    return {
      ...user,
      openRouterApiKey: user.openRouterApiKey ? '***configured***' : null,
    };
  }

  async updateOpenRouterKey(userId: string, openRouterApiKey: string | null) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { openRouterApiKey: openRouterApiKey?.trim() || null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        openRouterApiKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Don't expose full key in response
    return {
      ...user,
      openRouterApiKey: user.openRouterApiKey ? '***configured***' : null,
    };
  }
}

