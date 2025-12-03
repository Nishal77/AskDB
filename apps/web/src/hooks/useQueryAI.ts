import { useState, useCallback } from 'react';
import { queryApi } from '../lib/api';
import type { ExecuteQueryDto, QueryResult } from '@askdb/types';

export const useQueryAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  const executeQuery = useCallback(async (dto: ExecuteQueryDto) => {
    setLoading(true);
    setError(null);
    try {
      const data = await queryApi.execute(dto);
      setResult(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Query execution failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    executeQuery,
    loading,
    error,
    result,
    reset,
  };
};

