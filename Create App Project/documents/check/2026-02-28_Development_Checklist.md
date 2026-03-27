# 📋 다음 작업 체크리스트
> 작성일: 2026-02-28
> 현재 버전: `v0.2.2` (GitHub에 push 완료)
> 현재 브랜치: `main`

---

## ✅ 완료된 작업 요약

| Phase | 내용 | 버전 |
|-------|------|------|
| Phase 1~3 | Git 설정, Expo 프로젝트 생성, 메인 화면 UI | `v0.1.0` ~ `v0.1.2` |
| Phase 4 | 검색/필터 로직 + UX 개선 | `v0.1.2` |
| Phase 5 | BS 검색 → API 전환 (WebView 제거) | `v0.2.0` |
| Phase 5+| 바코드 V열 검색, 마스터 통계 개선 | `v0.2.1` |
| Phase 6 | AS 일일실적 화면 구성 (초안) | `v0.2.2` |

---

## 🔲 AS 일일실적 검증 및 수정

> **우선순위: 높음** — 실데이터 확인 후 수정 필요

### 화면 동작 확인
- [ ] Expo Go에서 홈 → 실적 및 통계 → AS 실적 진입 확인
- [ ] 달력 팝업 날짜 선택 동작 확인
- [ ] 수리구분 (경수리/중수리) 드롭다운 동작 확인
- [ ] 파트 (서비스1~4, 팩토리) 드롭다운 동작 확인
- [ ] 검색 버튼 클릭 → API 호출 → 결과 출력 확인

### 데이터 정합성 확인
- [ ] 접수 건수(당일/누적)가 엑셀 표와 일치하는지 대조
- [ ] 완료 건수(출동/미출동)가 정확한지 확인
- [ ] 미완료(4일이상) 건수가 정확한지 확인
- [ ] 리드타임 평균값이 올바른지 확인
- [ ] 접수취소 건수가 올바른지 확인

### 경수리/중수리 분류 구현
- [ ] GAS API에 수리구분(repairType) 파라미터 추가
- [ ] 경수리: C열 ≠ 센터수리완료, 공장입고수리, 공장수리완료
- [ ] 중수리 (서비스1~4): C열 = 센터수리완료
- [ ] 중수리 (팩토리): C열 = 공장입고수리 또는 공장수리완료

---

## 🔲 BS 검색 메뉴 개선

> **우선순위: 중간** — 성능 이슈 해결 필요

### 검색 로딩 시간 최적화
- [ ] GAS 캐싱 로직 개선 (CacheService 활용)
- [ ] 데이터 전송량 최소화 (필요한 열만 반환)
- [ ] 앱 측 로딩 UX 개선 (Skeleton UI 등)

### 바코드 검색 검증
- [ ] V열 바코드 데이터가 실제로 매칭되는지 확인
- [ ] 스캔 → 자동검색 → 매칭 차대번호 알림 동작 확인
- [ ] 매칭 안 되는 바코드 경고 메시지 확인

---

## 🔲 기타 메뉴 연동

> **우선순위: 낮음** — AS 실적 완료 후 진행

### 배차 목록
- [ ] 배차 데이터용 GAS URL 확보
- [ ] API 또는 WebView 방식 연결

### 영업점 주소
- [ ] 영업점 데이터용 GAS URL 확보
- [ ] API 또는 WebView 방식 연결

### CS 통계
- [ ] CS 통계 데이터 구조 확인
- [ ] 화면 설계 및 구현

---

## 🔧 환경 설정 참고

### .env 파일 현황
```env
# BS 검색 GAS API
EXPO_PUBLIC_API_URL=https://script.google.com/macros/s/AKfycbxzEg5G.../exec

# AS 실적 GAS API
EXPO_PUBLIC_AS_API_URL=https://script.google.com/macros/s/AKfycbztUQF.../exec
```

### GAS 스크립트 파일
| 파일 | 용도 | 배포 상태 |
|------|------|-----------|
| `gas-api-code.js` | BS 검색 API | ✅ 배포 완료 |
| `gas-as-api-code.js` | AS 실적 API | ✅ 배포 완료 |

### AS 실적 스프레드시트
- ID: `1FvByt2ivNffTArrTaKYX9Cawze-30YL2paHlKUsukGY`
- 핵심 열: A(완료구분), B(접수상태), C(상태구분), H(파트), J(마스터), M(접수일자), Y(완료일자), AK(리드타임), AP(지점)

---

## 💻 다른 PC에서 작업 시작하는 방법

```powershell
# 1. 최신 코드 가져오기
cd "EUNJIN-PROJECT/Create App Project"
git pull origin main

# 2. 패키지 설치 및 실행
cd mobile-app
npm install
npx expo start
```
