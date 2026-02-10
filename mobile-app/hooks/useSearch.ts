import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../store';
import { searchData } from '../services/googleSheets';
import { addSearchHistory } from '../services/storage';
import { APP_CONFIG } from '../config';

/**
 * 검색 기능 커스텀 훅
 */
export function useSearch<T>() {
    const [results, setResults] = useState<T[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { searchQuery, setSearchQuery, setError, clearError } = useAppStore();

    // 디바운스된 검색 실행
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            clearError();

            try {
                const data = await searchData<T>(searchQuery);
                setResults(data);
                await addSearchHistory(searchQuery);
            } catch (error) {
                setError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다');
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, APP_CONFIG.SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [searchQuery, clearError, setError]);

    // 검색어 변경
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
    }, [setSearchQuery]);

    // 검색 초기화
    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setResults([]);
    }, [setSearchQuery]);

    return {
        query: searchQuery,
        results,
        isSearching,
        search: handleSearch,
        clear: clearSearch,
    };
}
