import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    USER_SETTINGS: '@user_settings',
    CACHED_DATA: '@cached_data',
    SEARCH_HISTORY: '@search_history',
} as const;

/**
 * 데이터 저장
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
    try {
        const jsonValue = JSON.stringify(value);
        await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
        console.error('Storage setItem error:', error);
        throw error;
    }
}

/**
 * 데이터 조회
 */
export async function getItem<T>(key: string): Promise<T | null> {
    try {
        const jsonValue = await AsyncStorage.getItem(key);
        return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
        console.error('Storage getItem error:', error);
        throw error;
    }
}

/**
 * 데이터 삭제
 */
export async function removeItem(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
        console.error('Storage removeItem error:', error);
        throw error;
    }
}

/**
 * 사용자 설정 저장
 */
export async function saveUserSettings(settings: Record<string, unknown>): Promise<void> {
    await setItem(STORAGE_KEYS.USER_SETTINGS, settings);
}

/**
 * 사용자 설정 조회
 */
export async function getUserSettings(): Promise<Record<string, unknown> | null> {
    return getItem(STORAGE_KEYS.USER_SETTINGS);
}

/**
 * 검색 기록 저장
 */
export async function addSearchHistory(query: string): Promise<void> {
    const history = await getItem<string[]>(STORAGE_KEYS.SEARCH_HISTORY) || [];
    const updatedHistory = [query, ...history.filter(q => q !== query)].slice(0, 10);
    await setItem(STORAGE_KEYS.SEARCH_HISTORY, updatedHistory);
}

/**
 * 검색 기록 조회
 */
export async function getSearchHistory(): Promise<string[]> {
    return await getItem<string[]>(STORAGE_KEYS.SEARCH_HISTORY) || [];
}

export { STORAGE_KEYS };
