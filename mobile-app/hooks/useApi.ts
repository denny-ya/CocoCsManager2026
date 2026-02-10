import { useState, useCallback } from 'react';
import { ApiResponse } from '../types';

interface UseApiOptions {
    onSuccess?: (data: unknown) => void;
    onError?: (error: string) => void;
}

/**
 * API 호출 커스텀 훅
 */
export function useApi<T>(
    apiFunction: (...args: unknown[]) => Promise<ApiResponse<T>>,
    options?: UseApiOptions
) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const execute = useCallback(
        async (...args: unknown[]) => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await apiFunction(...args);

                if (response.success && response.data) {
                    setData(response.data);
                    options?.onSuccess?.(response.data);
                    return response.data;
                } else {
                    const errorMessage = response.error || '요청 처리 중 오류가 발생했습니다';
                    setError(errorMessage);
                    options?.onError?.(errorMessage);
                    return null;
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
                setError(errorMessage);
                options?.onError?.(errorMessage);
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [apiFunction, options]
    );

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        data,
        isLoading,
        error,
        execute,
        reset,
    };
}
