/**
 * UI 테스트용 더미 데이터
 */

// ── BS 검색 결과 ──
export type BsSearchResult = {
    id: string;
    code: string;         // 차대번호 (추가)
    storeName: string;    // 영업점명
    model: string;        // 모델명
    symptom: string;      // 증상
    status: '완료' | '진행중' | '대기';
    date: string;
    serviceId: number;    // 서비스 ID (0: 서비스1, 1: 서비스2, ...)
};

export const MOCK_BS_RESULTS: BsSearchResult[] = [
    { id: '1', code: 'HYM001', storeName: '가락점', model: 'WM-F700B', symptom: '세탁 안됨', status: '완료', date: '2026-02-10', serviceId: 0 },
    { id: '2', code: 'HYM002', storeName: '강남점', model: 'REF-G900S', symptom: '냉각 불량', status: '진행중', date: '2026-02-11', serviceId: 0 },
    { id: '3', code: 'HYM003', storeName: '잠실점', model: 'AC-W500K', symptom: '소음 발생', status: '대기', date: '2026-02-12', serviceId: 1 },
    { id: '4', code: 'HYM004', storeName: '목동점', model: 'DW-H300L', symptom: '누수', status: '완료', date: '2026-02-09', serviceId: 2 },
    { id: '5', code: 'HYM005', storeName: '신도림점', model: 'WM-F700B', symptom: '탈수 이상', status: '진행중', date: '2026-02-11', serviceId: 3 },
    { id: '6', code: 'HYM006', storeName: '부산점', model: 'REF-B100', symptom: '전원 안켜짐', status: '대기', date: '2026-02-12', serviceId: 0 },
    { id: '7', code: 'HYM007', storeName: '대전점', model: 'AC-D200', symptom: '필터 청소', status: '완료', date: '2026-02-10', serviceId: 0 },
];

// ── 영업점 목록 ──
export type StoreInfo = {
    id: string;
    name: string;       // 영업점명
    address: string;    // 주소
    phone: string;      // 연락처
    region: string;     // 지역
};

export const MOCK_STORES: StoreInfo[] = [
    { id: '1', name: '가락점', address: '서울시 송파구 가락로 100', phone: '02-1234-5678', region: '서울' },
    { id: '2', name: '강남점', address: '서울시 강남구 테헤란로 200', phone: '02-2345-6789', region: '서울' },
    { id: '3', name: '잠실점', address: '서울시 송파구 올림픽로 300', phone: '02-3456-7890', region: '서울' },
    { id: '4', name: '부산센텀점', address: '부산시 해운대구 센텀로 50', phone: '051-234-5678', region: '부산' },
    { id: '5', name: '대전둔산점', address: '대전시 서구 둔산로 80', phone: '042-345-6789', region: '대전' },
    { id: '6', name: '인천송도점', address: '인천시 연수구 송도대로 120', phone: '032-456-7890', region: '인천' },
];

// ── 배차 목록 ──
export type DispatchItem = {
    id: string;
    storeName: string;  // 목적지 영업점
    driver: string;     // 기사명
    time: string;       // 배차 시간
    status: '완료' | '이동중' | '대기';
    vehicleNo: string;  // 차량번호
};

export const MOCK_DISPATCHES: DispatchItem[] = [
    { id: '1', storeName: '가락점', driver: '김기사', time: '09:00', status: '완료', vehicleNo: '12가 3456' },
    { id: '2', storeName: '강남점', driver: '이기사', time: '10:30', status: '이동중', vehicleNo: '34나 5678' },
    { id: '3', storeName: '잠실점', driver: '박기사', time: '13:00', status: '대기', vehicleNo: '56다 7890' },
    { id: '4', storeName: '목동점', driver: '최기사', time: '14:30', status: '대기', vehicleNo: '78라 1234' },
];

// ── 업무 가이드 ──
export type GuideItem = {
    id: string;
    title: string;
    icon: string;
    content: string;
};

export const MOCK_GUIDES: GuideItem[] = [
    {
        id: '1',
        title: 'AS 접수 절차',
        icon: 'description',
        content: '1. 고객 연락 접수\n2. 증상 확인 및 기록\n3. 방문 일정 조율\n4. 부품 사전 확인\n5. 방문 수리 진행\n6. 결과 보고서 작성',
    },
    {
        id: '2',
        title: '리워크 처리 방법',
        icon: 'build',
        content: '1. 리워크 대상 확인\n2. 원인 분석\n3. 수리 계획 수립\n4. 부품 교체/수리\n5. 품질 검사\n6. 완료 보고',
    },
    {
        id: '3',
        title: '부품 교체 가이드',
        icon: 'handyman',
        content: '1. 교체 부품 확인\n2. 재고 조회\n3. 부품 발주\n4. 교체 작업 진행\n5. 테스트 및 확인\n6. 교체 이력 등록',
    },
    {
        id: '4',
        title: '고객 응대 매뉴얼',
        icon: 'people',
        content: '1. 인사 및 자기소개\n2. 증상 청취\n3. 예상 소요시간 안내\n4. 수리 진행 상황 공유\n5. 완료 후 사용법 안내\n6. 고객 만족도 확인',
    },
    {
        id: '5',
        title: '안전 수칙',
        icon: 'security',
        content: '1. 작업 전 전원 차단\n2. 보호 장구 착용\n3. 작업 구역 정리\n4. 위험 요소 사전 확인\n5. 응급 연락처 숙지',
    },
];

// ── 서비스 선택 옵션 (BS 검색용) ──
export const SERVICE_OPTIONS = {
    service1: ['전체', '세탁기', '냉장고', '에어컨', '식기세척기'],
    service2: ['전체', '설치', '수리', '점검', '리워크'],
    service3: ['전체', '서울', '경기', '부산', '대전', '인천'],
    service4: ['전체', '완료', '진행중', '대기'],
};
