import { IsEmail, IsString, MinLength, IsNotEmpty, ValidateIf } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @ValidateIf((o) => o.email !== undefined && o.email !== null && typeof o.email === 'string' && o.email.trim().length > 0)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

