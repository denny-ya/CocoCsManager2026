import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

/**
 * 스택 네비게이션 파라미터 타입
 */
export type RootStackParamList = {
    '(tabs)': undefined;
    Detail: { id: string };
    Modal: { title?: string };
};

/**
 * 탭 네비게이션 파라미터 타입
 */
export type TabParamList = {
    index: undefined;
    search: { query?: string };
    list: { filter?: string };
    settings: undefined;
};

/**
 * 네비게이션 프롭 타입 헬퍼
 */
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * 라우트 프롭 타입 헬퍼
 */
export type DetailRouteProp = RouteProp<RootStackParamList, 'Detail'>;
