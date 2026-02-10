import { API_CONFIG } from '../config/api.config';
import { ApiResponse } from '../types/api.types';

/**
 * 기본 API 호출 함수
 */
async function request<T>(
    endpoint: string,
    options?: RequestInit
): Promise<ApiResponse<T>> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.message || 'API 요청 실패',
            };
        }

        return {
            success: true,
            data,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
        };
    }
}

/**
 * GET 요청
 */
export async function get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'GET' });
}

/**
 * POST 요청
 */
export async function post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * PUT 요청
 */
export async function put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

/**
 * DELETE 요청
 */
export async function del<T>(endpoint: string): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'DELETE' });
}
