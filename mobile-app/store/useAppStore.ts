import { create } from 'zustand';
import { UserSettings, FilterOption } from '../types';

interface AppState {
    // 사용자 설정
    settings: UserSettings;
    setSettings: (settings: Partial<UserSettings>) => void;

    // 검색 상태
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // 필터 상태
    filters: FilterOption[];
    setFilters: (filters: FilterOption[]) => void;
    toggleFilter: (id: string) => void;
    resetFilters: () => void;

    // 로딩 상태
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;

    // 에러 상태
    error: string | null;
    setError: (error: string | null) => void;
    clearError: () => void;
}

const defaultSettings: UserSettings = {
    notificationsEnabled: true,
    darkModeEnabled: false,
    language: 'ko',
};

const defaultFilters: FilterOption[] = [
    { id: 'filter1', label: '필터 1', selected: false },
    { id: 'filter2', label: '필터 2', selected: false },
    { id: 'filter3', label: '필터 3', selected: false },
];

export const useAppStore = create<AppState>((set) => ({
    // 사용자 설정
    settings: defaultSettings,
    setSettings: (newSettings) =>
        set((state) => ({
            settings: { ...state.settings, ...newSettings },
        })),

    // 검색 상태
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),

    // 필터 상태
    filters: defaultFilters,
    setFilters: (filters) => set({ filters }),
    toggleFilter: (id) =>
        set((state) => ({
            filters: state.filters.map((filter) =>
                filter.id === id ? { ...filter, selected: !filter.selected } : filter
            ),
        })),
    resetFilters: () =>
        set((state) => ({
            filters: state.filters.map((filter) => ({ ...filter, selected: false })),
        })),

    // 로딩 상태
    isLoading: false,
    setIsLoading: (loading) => set({ isLoading: loading }),

    // 에러 상태
    error: null,
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
}));
