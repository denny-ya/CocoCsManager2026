/**
 * API 응답 공통 타입
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/**
 * 페이지네이션 포함 응답
 */
export interface PaginatedResponse<T> {
    items: T[];
    pagination: PaginationInfo;
}

/**
 * 검색 결과 타입
 */
export interface SearchResult<T> {
    query: string;
    results: T[];
    totalCount: number;
}
