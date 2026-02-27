# 📋 다음 작업 체크리스트
> 작성일: 2026-02-20
> 현재 버전: `v0.1.4` (GitHub에 push 완료)
> 현재 브랜치: `main`

---

## ✅ 완료된 작업 요약

| Phase | 내용 | 버전 |
|-------|------|------|
| Phase 1~3 | Git 설정, Expo 프로젝트 생성, 메인 화면 UI | `v0.1.0` ~ `v0.1.2` |
| Phase 4 | 검색/필터 로직 + UX 개선 (Skeleton, FAB, DatePicker 등) | `v0.1.2` |
| Phase 5 | BS 검색 WebView 연동 (GAS 웹앱을 앱 안에서 표시) | `v0.1.4` |

---

## 🔲 Phase 5 검증 (WebView 테스트)

> **우선순위: 높음** — WebView가 정상 동작하는지 확인 필요

- [ ] 다른 PC에서 프로젝트 pull 받기
  ```powershell
  cd "Create App Project"
  git pull origin main
  cd mobile-app
  npm install
  ```
- [ ] Expo 앱 실행
  ```powershell
  npx expo start
  ```
- [ ] `BS 및 리워크 검색` → 서비스1 선택 → **기존 웹앱이 앱 안에서 표시되는지** 확인
- [ ] 서비스2 ~ 서비스4도 각각 테스트
- [ ] 웹(w키) / 모바일(QR코드) 양쪽에서 WebView 동작 확인

---

## 🔲 Phase 6: 다른 화면 실제 데이터 연동

> **우선순위: 중간** — GAS URL이 있는 경우에만 진행 가능

### 6-1. 배차 목록 연동
- [ ] 배차 목록용 GAS 웹앱 URL 확보
- [ ] WebView 또는 API 방식으로 연결
- [ ] 테스트

### 6-2. 영업점 주소 연동
- [ ] 영업점 데이터용 GAS URL 확보
- [ ] WebView 또는 API 방식으로 연결
- [ ] 테스트

### 6-3. 실적/통계 연동
- [ ] 통계 데이터용 GAS URL 확보
- [ ] WebView 또는 API 방식으로 연결
- [ ] 테스트

### 6-4. 에러 처리
- [ ] 네트워크 끊김 시 에러 메시지 표시
- [ ] API 타임아웃 처리
- [ ] 로딩 실패 시 재시도 버튼 추가

---

## 🔲 Phase 7: JSON API 전환 (향후 고도화)

> **우선순위: 낮음** — Phase 6 완료 후 진행

- [ ] GAS `doGet()` 함수 수정
  - `type=json` 파라미터가 있으면 JSON 데이터 반환
  - 기존 웹앱 접속(파라미터 없음)은 HTML 그대로 반환
- [ ] 앱의 `api.ts`를 JSON 모드로 재전환
- [ ] WebView를 네이티브 UI(검색 결과 리스트)로 대체
- [ ] 테스트 및 Git 커밋

---

## 💻 다른 PC에서 작업 시작하는 방법

```powershell
# 1. 프로젝트 폴더로 이동
cd "EUNJIN-PROJECT/Create App Project"

# 2. 최신 코드 가져오기
git pull origin main

# 3. 패키지 설치
cd mobile-app
npm install

# 4. 앱 실행
npx expo start
```
