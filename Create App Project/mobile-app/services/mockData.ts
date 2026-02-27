/**
 * GAS API 응답 타입 정의 (실제 API 필드명 기준)
 */

// ── 차대번호 검색 결과 ──
export type VehicleData = {
    row: number;
    cartVersion: string;    // 카트버전
    vin: string;            // 차대번호
    branch: string;         // 지점
    salesOffice: string;    // 영업소
    salesPoint: string;     // 영업점
    district: string;       // 지구
    branchPointDistrict: string;
    manufactureDate: string; // 제조일
    productionYear: string;  // 생산년도
    bsTarget: string;       // BS점검대상 (BS점검대상 / 리워크(2026) / 비대상)
    part: string;           // 부품 (서비스1~4)
    master: string;         // 마스터
    completed: string;      // 완료 여부
    completedDate: string;  // 완료일
    memo: string;           // 비고/메모
    exclusionReason: string; // 제외사유
    disposalTarget: string;  // 폐차대상
    processInspection: string; // 점검
    processReplace: string;    // 교체
    processTransfer: string;   // 이관
    processDisposal: string;   // 폐기
    barcodeVin: string;        // 차대번호(바코드) - V열
};

// ── 마스터 통계 ──
export type MasterStatsData = {
    total: number;
    completed: number;
    remaining: number;
    completionRate: number;
    regularTotal: number;
    regularCompleted: number;
    regularRemaining: number;
    regularCompletionRate: number;
    reworkTotal: number;
    reworkCompleted: number;
    reworkRemaining: number;
    reworkCompletionRate: number;
    branches: BranchStat[];
};

export type BranchStat = {
    name: string;
    total: number;
    completed: number;
    remaining: number;
    regularTotal: number;
    regularCompleted: number;
    reworkTotal: number;
    reworkCompleted: number;
};

// ── 하위 호환용 (기존 BsSearchResult 타입 alias) ──
export type BsSearchResult = VehicleData;

// ── UI 테스트용 더미 데이터 (사용 안 함) ──
export const MOCK_BS_RESULTS: VehicleData[] = [];
