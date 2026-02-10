/**
 * 앱 기본 설정
 */
export const APP_CONFIG = {
    // 앱 정보
    APP_NAME: '팀 관리 앱',
    APP_VERSION: '1.0.0',

    // 페이지네이션
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // 검색
    SEARCH_DEBOUNCE_MS: 300,
    MAX_SEARCH_HISTORY: 10,

    // 캐시
    CACHE_EXPIRY_MS: 5 * 60 * 1000, // 5분

    // 애니메이션
    ANIMATION_DURATION: 200,
} as const;

/**
 * 기능 플래그
 */
export const FEATURE_FLAGS = {
    ENABLE_DARK_MODE: true,
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_OFFLINE_MODE: false,
    ENABLE_ANALYTICS: false,
} as const;
