// API Types
export * from './api.types';

// Navigation Types
export * from './navigation.types';

/**
 * 공통 데이터 아이템 타입
 */
export interface DataItem {
    id: string;
    title: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * 사용자 설정 타입
 */
export interface UserSettings {
    notificationsEnabled: boolean;
    darkModeEnabled: boolean;
    language: 'ko' | 'en';
}

/**
 * 필터 옵션 타입
 */
export interface FilterOption {
    id: string;
    label: string;
    selected: boolean;
}
