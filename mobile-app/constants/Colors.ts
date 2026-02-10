/**
 * 앱 색상 팔레트
 */
export const Colors = {
    // Primary
    primary: '#007AFF',
    primaryLight: '#5AC8FA',
    primaryDark: '#0051A8',

    // Secondary
    secondary: '#5856D6',
    secondaryLight: '#AF52DE',

    // Status
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',

    // Grayscale
    white: '#FFFFFF',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    divider: '#F0F0F0',

    // Text
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textDisabled: '#CCCCCC',
    textInverse: '#FFFFFF',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',

} as const;

/**
 * 다크 모드 색상
 */
export const DarkColors = {
    ...Colors,
    background: '#1C1C1E',
    surface: '#2C2C2E',
    border: '#3A3A3C',
    divider: '#48484A',
    textPrimary: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',
} as const;

export type ColorScheme = typeof Colors;
