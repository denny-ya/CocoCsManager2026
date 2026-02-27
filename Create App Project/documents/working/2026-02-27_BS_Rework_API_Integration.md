# 2026-02-27 BS 및 리워크 메뉴 앱 API 통합 작업

> **버전**: v0.2.0  
> **작업일**: 2026-02-27  
> **커밋**: `BS 및 리워크 메뉴 구동방식 변경 (url → 앱 api 구동)`

---

## 📋 작업 개요

기존 WebView(URL) 방식으로 동작하던 **BS 및 리워크 검색** 메뉴를 **네이티브 앱 UI + GAS API 직접 호출** 방식으로 전면 재구성.

---

## ✅ 완료된 Task

### 1. GAS API 연동 (`services/api.ts`)

| 함수 | 기능 | GAS action |
|------|------|------------|
| `callGasApi()` | 공통 API 호출 (redirect:follow, CORS 처리) | - |
| `searchBS()` | 차대번호 검색 | `search` |
| `getMasterStats()` | 마스터 통계 조회 | `masterStats` |
| `saveMemo()` | 비고/메모 저장 | `saveMemo` |
| `markAsComplete()` | 점검 완료 처리 | `complete` |
| `pingAPI()` | 연결 테스트 | `ping` |

- API URL: `.env` → `EXPO_PUBLIC_API_URL`로 관리
- GAS 302 리다이렉트 자동 처리

---

### 2. 데이터 타입 정의 (`services/mockData.ts`)

| 타입 | 용도 |
|------|------|
| `VehicleData` | 차량 검색 결과 (vin, bsTarget, exclusionReason, disposalTarget 등) |
| `MasterStatsData` | 마스터 통계 (completionRate, regularTotal, reworkTotal 등) |
| `BranchStat` | 영업점별 현황 (name, rate, regularRate, reworkRate 등) |

---

### 3. 차대번호 검색 UI (`app/bs-search/search.tsx`)

#### 검색 기능
- **2개 탭 구조**: 차대번호 검색 / 마스터 통계
- **파트 필터 칩**: 전체, 서비스1~4
- **바코드 스캐너**: 카메라로 차대번호 바코드 인식
- **검색 결과**: 웹 앱과 동일한 카드 형식

#### 상태 바 표시 (웹 앱과 동일한 로직)

| 조건 | 표시 | 색상 |
|------|------|------|
| `completed` 포함 '완료' | ✅ BS 완료 (점검, 교체...) (날짜) | 초록 |
| `bsTarget` 포함 'O' | ⚠️ BS 점검 대상 | 빨강 |
| `bsTarget` 포함 '리워크' | 🔧 리워크(2026) | 파랑 |
| 위 해당 없음 | ✅ BS 점검 비대상 | 연두 |
| `exclusionReason` 있음 | ⛔ 제외: {사유} | 보라 |
| `disposalTarget` 있음 | 🗑️ 폐기: {내용} | 분홍 |

#### 메모 & 점검 완료
- **메모 편집**: 노란 텍스트 영역, 완료 건은 readonly
- **점검 완료 처리 버튼**: 처리구분 선택 모달 (점검/교체/이관/폐기)
- **완료 후 자동 새로고침**: Alert 없이 즉시 상태 변경 반영

---

### 4. 마스터 통계 UI

- **전체 완료율**: 큰 숫자 + 프로그레스바
- **BS 점검대상 / 리워크(2026)**: 2열 카드, 각각 완료율 + 프로그레스바
- **영업점별 현황**: 영업점별 BS/Rework 비율, 미니 프로그레스바
- **스크롤 가능**: `maxHeight` 제한 제거로 전체 목록 확인 가능

---

## 📁 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/bs-search/search.tsx` | WebView → 네이티브 UI 전면 재구성 |
| `services/api.ts` | GAS API 호출 함수 5개 추가 |
| `services/mockData.ts` | VehicleData, MasterStatsData 타입 정의 |
| `.env` | 앱 전용 GAS API URL 설정 |

---

## 🔧 해결된 이슈

1. **검색 결과 미표시** → 데이터 타입 불일치 해결 (BsSearchResult → VehicleData)
2. **마스터 통계 단순화** → 웹 앱과 동일한 상세 UI로 재구성
3. **상태 바 미표시** → 웹 앱 renderVehicleDetail 로직 완전 이식
4. **영업점 목록 스크롤 불가** → maxHeight 제한 제거
5. **API 연결 실패** → GAS 배포 권한 "모든 사용자"로 변경, URL 갱신

---

## 🚀 다음 단계

- Expo Go 실기기 테스트 완료 확인
- 추가 메뉴 앱 API 전환 검토
- APK 빌드 및 배포 준비
