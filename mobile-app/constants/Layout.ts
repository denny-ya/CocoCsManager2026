import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * 레이아웃 상수
 */
export const Layout = {
    // 화면 크기
    window: {
        width,
        height,
    },

    // 여백
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    // 테두리 반경
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
    },

    // 폰트 크기
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        title: 28,
    },

    // 아이콘 크기
    iconSize: {
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32,
    },

    // 헤더 높이
    headerHeight: 56,

    // 탭바 높이
    tabBarHeight: 60,

    // 검색바 높이
    searchBarHeight: 44,
} as const;

/**
 * 반응형 헬퍼
 */
export const isSmallScreen = width < 375;
export const isMediumScreen = width >= 375 && width < 414;
export const isLargeScreen = width >= 414;
