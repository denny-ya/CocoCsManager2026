import { API_CONFIG } from '../config/api.config';

/**
 * Google Sheets 데이터를 Apps Script를 통해 조회
 */
export async function fetchSheetData<T>(action: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(API_CONFIG.APPS_SCRIPT_URL);
    url.searchParams.append('action', action);

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        console.error('Google Sheets API Error:', error);
        throw error;
    }
}

/**
 * 검색 실행
 */
export async function searchData<T>(query: string): Promise<T[]> {
    return fetchSheetData<T[]>('search', { query });
}

/**
 * 전체 데이터 조회
 */
export async function getAllData<T>(): Promise<T[]> {
    return fetchSheetData<T[]>('getAll');
}

/**
 * 특정 ID로 데이터 조회
 */
export async function getDataById<T>(id: string): Promise<T> {
    return fetchSheetData<T>('getById', { id });
}
