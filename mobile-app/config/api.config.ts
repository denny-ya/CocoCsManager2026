/**
 * API 설정
 * 
 * 실제 배포 시 .env 파일에서 환경변수로 관리하세요.
 */
export const API_CONFIG = {
    // Google Apps Script 웹앱 URL
    APPS_SCRIPT_URL: process.env.EXPO_PUBLIC_APPS_SCRIPT_URL || 'YOUR_APPS_SCRIPT_URL_HERE',

    // 기본 API URL (다른 백엔드 사용 시)
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com',

    // API 타임아웃 (밀리초)
    TIMEOUT: 10000,

    // 재시도 횟수
    RETRY_COUNT: 3,
} as const;

/**
 * API 엔드포인트
 */
export const ENDPOINTS = {
    SEARCH: '/search',
    GET_ALL: '/getAll',
    GET_BY_ID: '/getById',
    CREATE: '/create',
    UPDATE: '/update',
    DELETE: '/delete',
} as const;
