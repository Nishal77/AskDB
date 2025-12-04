import axios from 'axios';
import type {
  ApiResponse,
  AuthResponse,
  LoginDto,
  RegisterDto,
  User,
  DatabaseConnection,
  CreateConnectionDto,
  UpdateConnectionDto,
  ExecuteQueryDto,
  QueryResult,
  QueryHistory,
  TableMetadata,
} from '@askdb/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    if (response.data.success && response.data.data) {
      localStorage.setItem('access_token', response.data.data.access_token);
      return response.data.data;
    }
    throw new Error(response.data.error || 'Login failed');
  },

  register: async (data: RegisterDto): Promise<User> => {
    try {
      // Ensure phone is undefined if empty string (backend expects null or string)
      const payload: any = {
        ...data,
        phone: data.phone && data.phone.trim() ? data.phone.trim() : null,
      };
      const response = await api.post<ApiResponse<User>>('/auth/register', payload);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || response.data.message || 'Registration failed');
    } catch (error: any) {
      // Extract error message from axios error response
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Registration failed';
      throw new Error(errorMessage);
    }
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get user');
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },

  updateOpenRouterKey: async (openRouterApiKey: string): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/auth/openrouter-key', { openRouterApiKey });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update OpenRouter key');
  },

  deleteOpenRouterKey: async (): Promise<User> => {
    const response = await api.delete<ApiResponse<User>>('/auth/openrouter-key');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to delete OpenRouter key');
  },
};

// Connections API
export const connectionsApi = {
  getAll: async (): Promise<DatabaseConnection[]> => {
    const response = await api.get<ApiResponse<DatabaseConnection[]>>('/admin/connections');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch connections');
  },

  getById: async (id: string): Promise<DatabaseConnection> => {
    const response = await api.get<ApiResponse<DatabaseConnection>>(`/admin/connections/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch connection');
  },

  create: async (data: CreateConnectionDto): Promise<DatabaseConnection> => {
    const response = await api.post<ApiResponse<DatabaseConnection>>('/admin/connections', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create connection');
  },

  update: async (id: string, data: UpdateConnectionDto): Promise<DatabaseConnection> => {
    const response = await api.put<ApiResponse<DatabaseConnection>>(
      `/admin/connections/${id}`,
      data,
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update connection');
  },

  delete: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<null>>(`/admin/connections/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete connection');
    }
  },

  test: async (data: CreateConnectionDto): Promise<void> => {
    const response = await api.post<ApiResponse<null>>('/admin/connections/test', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Connection test failed');
    }
  },

  getStatus: async (id: string): Promise<{
    connected: boolean;
    status: 'connected' | 'disconnected' | 'error';
    message: string;
    lastChecked?: string;
  }> => {
    const response = await api.get<ApiResponse<{
      connected: boolean;
      status: 'connected' | 'disconnected' | 'error';
      message: string;
      lastChecked?: string;
    }>>(`/admin/connections/status/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get connection status');
  },
};

// Schema API
export const schemaApi = {
  getSchema: async (connectionId: string): Promise<TableMetadata[]> => {
    const response = await api.get<ApiResponse<TableMetadata[]>>(
      `/schema/connection/${connectionId}`,
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch schema');
  },

  getTablesWithRowCounts: async (connectionId: string): Promise<Array<{ tableName: string; rowCount: number }>> => {
    const response = await api.get<ApiResponse<Array<{ tableName: string; rowCount: number }>>>(
      `/schema/connection/${connectionId}/tables`,
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch tables with row counts');
  },
};

// Query API
export const queryApi = {
  execute: async (data: ExecuteQueryDto): Promise<QueryResult> => {
    const response = await api.post<ApiResponse<QueryResult>>('/query/execute', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Query execution failed');
  },

  getHistory: async (limit?: number): Promise<QueryHistory[]> => {
    const params = limit ? { limit } : {};
    const response = await api.get<ApiResponse<QueryHistory[]>>('/query/history', { params });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch query history');
  },

  getById: async (id: string): Promise<QueryHistory> => {
    const response = await api.get<ApiResponse<QueryHistory>>(`/query/history/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch query');
  },
};

