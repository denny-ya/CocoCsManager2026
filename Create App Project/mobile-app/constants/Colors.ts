/**
 * Coco CS Manager 앱 컬러 팔레트
 * 로고 기반 + Material Design 3 스타일
 */

export const AppColors = {
    // ── 라이트 모드 ──
    light: {
        primary: '#0051A2',        // 진한 파랑 (상단 바, 주요 버튼)
        secondary: '#0073CF',      // 밝은 파랑 (포인트 컬러, 링크)
        primaryLight: '#E3F2FD',   // 연한 파랑 (카드 하이라이트, 선택 상태)
        background: '#FFFFFF',     // 전체 배경
        surface: '#F5F5F5',        // 카드 배경, 구분 영역
        textPrimary: '#212121',    // 본문 텍스트
        textSecondary: '#757575',  // 부제목, 설명 텍스트
        border: '#E0E0E0',        // 테두리
        success: '#4CAF50',        // 성공/완료
        warning: '#FF9800',        // 경고/대기
        error: '#F44336',          // 오류/긴급
        white: '#FFFFFF',
    },

    // ── 다크 모드 ──
    dark: {
        primary: '#4DA8FF',        // 밝게 조정 (가독성)
        secondary: '#64B5F6',
        primaryLight: '#1A3A5C',   // 어두운 파랑
        background: '#121212',     // 다크 배경
        surface: '#1E1E1E',        // 카드 배경
        textPrimary: '#FFFFFF',    // 흰색 텍스트
        textSecondary: '#B0B0B0',  // 밝은 그레이
        border: '#333333',
        success: '#66BB6A',
        warning: '#FFA726',
        error: '#EF5350',
        white: '#FFFFFF',
    },
};

// 메뉴별 포인트 컬러
export const MenuColors = {
    bsSearch: '#1565C0',
    statistics: '#2E7D32',
    storeDirectory: '#E65100',
    dispatch: '#6A1B9A',
    workGuide: '#00838F',
};
