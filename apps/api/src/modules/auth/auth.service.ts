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
    } catch (error) {
      console.error('Error validating user:', error);
      return null;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { email: user.email, sub: user.id };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
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
}

