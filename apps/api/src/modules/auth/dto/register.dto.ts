import { IsEmail, IsString, MinLength, Matches, IsNotEmpty, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name!: string;

  // Validate email step by step to prevent toUpperCase error
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @ValidateIf((o) => o.email !== undefined && o.email !== null && typeof o.email === 'string' && o.email.trim().length > 0)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @ValidateIf((o) => o.phone !== undefined && o.phone !== null && o.phone !== '')
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, {
    message: 'Please provide a valid phone number',
  })
  phone?: string | null;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}

