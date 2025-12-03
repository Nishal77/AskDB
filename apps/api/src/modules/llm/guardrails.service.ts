import { Injectable } from '@nestjs/common';

@Injectable()
export class GuardrailsService {
  private readonly DANGEROUS_KEYWORDS = [
    'DROP',
    'DELETE',
    'UPDATE',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'INSERT',
    'GRANT',
    'REVOKE',
    'EXEC',
    'EXECUTE',
    'CALL',
  ];

  // private readonly ALLOWED_KEYWORDS = ['SELECT']; // Reserved for future use

  validateSQL(sql: string): { valid: boolean; error?: string } {
    const upperSQL = sql.toUpperCase().trim();

    // Check for dangerous keywords
    for (const keyword of this.DANGEROUS_KEYWORDS) {
      if (upperSQL.includes(keyword)) {
        return {
          valid: false,
          error: `Dangerous operation detected: ${keyword}. Only SELECT queries are allowed.`,
        };
      }
    }

    // Ensure it starts with SELECT
    if (!upperSQL.startsWith('SELECT')) {
      return {
        valid: false,
        error: 'Only SELECT queries are allowed. Query must start with SELECT.',
      };
    }

    // Check for SQL injection patterns
    if (this.detectSQLInjection(sql)) {
      return {
        valid: false,
        error: 'Potential SQL injection detected. Query rejected for security.',
      };
    }

    // Check for semicolon injection (multiple statements)
    const statements = sql.split(';').filter((s) => s.trim().length > 0);
    if (statements.length > 1) {
      return {
        valid: false,
        error: 'Multiple statements detected. Only single SELECT queries are allowed.',
      };
    }

    return { valid: true };
  }

  private detectSQLInjection(sql: string): boolean {
    const suspiciousPatterns = [
      /--/g, // SQL comments
      /\/\*/g, // Multi-line comments
      /;/g, // Statement terminators (already checked separately)
      /UNION.*SELECT/gi,
      /OR\s+1\s*=\s*1/gi,
      /OR\s+'1'\s*=\s*'1'/gi,
      /EXEC\s*\(/gi,
      /xp_/gi, // SQL Server extended procedures
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sql)) {
        // Allow comments in SELECT queries if they're properly formatted
        const patternString = pattern.toString();
        if (patternString === '/--/g' || patternString === '/\\/\\*/g') {
          continue;
        }
        return true;
      }
    }

    return false;
  }

  sanitizeSQL(sql: string): string {
    // Remove comments
    let sanitized = sql.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }
}

