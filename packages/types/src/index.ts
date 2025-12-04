// Database Connection Types
export interface DatabaseConnection {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  type: 'postgresql' | 'mysql' | 'sqlite';
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionDto {
  name: string;
  connectionString?: string; // Connection string/URL
  anonKey?: string; // Anon key (for Supabase and similar services)
  accessMode?: 'read' | 'write' | 'update' | 'full'; // Access mode for the connection
  // Legacy fields (for backward compatibility)
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  type?: 'postgresql' | 'mysql' | 'sqlite';
}

export interface UpdateConnectionDto {
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

// Schema Types
export interface TableMetadata {
  tableName: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyMetadata[];
  indexes: IndexMetadata[];
}

export interface ColumnMetadata {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: any;
  characterMaximumLength?: number;
}

export interface ForeignKeyMetadata {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface IndexMetadata {
  indexName: string;
  columnNames: string[];
  isUnique: boolean;
}

// Query Types
export interface ExecuteQueryDto {
  connectionId: string;
  naturalLanguageQuery: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
  sql: string;
  insights?: string;
}

export interface QueryHistory {
  id: string;
  userId: string;
  connectionId: string;
  naturalLanguageQuery: string;
  sqlQuery: string;
  resultRowCount: number;
  executionTime: number;
  success: boolean;
  errorMessage?: string;
  insights?: string;
  createdAt: string;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  openRouterApiKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// LLM Types
export interface LLMPrompt {
  system: string;
  user: string;
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

// Chart Types
export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'scatter';

export interface ChartConfig {
  type: ChartType;
  xAxis?: string;
  yAxis?: string;
  labels?: string[];
  data: any[];
}

