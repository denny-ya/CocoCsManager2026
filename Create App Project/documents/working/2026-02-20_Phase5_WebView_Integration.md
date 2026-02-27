# 📝 Phase 5: BS 검색 WebView 연동 작업 기록
> 작성일: 2026-02-20

---

## 📌 배경
- GAS(Google Apps Script) URL을 `fetch`로 호출하면 **JSON이 아닌 HTML**(웹앱 UI)이 반환됨
- 이로 인해 BS 검색 기능이 동작하지 않는 문제 발생

## 🔧 해결 방안 결정

| 방안 | 내용 | 적용 시점 |
|------|------|-----------|
| **B (채택)** | WebView로 GAS 웹앱을 그대로 앱 안에서 표시 | **지금 (테스트)** |
| **A (향후)** | GAS `doGet()` 수정 → JSON API 반환 → 네이티브 UI | **Phase 7** |

## ✅ 구현 내역

### 1. `react-native-webview` 패키지 설치
```bash
npx expo install react-native-webview
```

### 2. 신규 파일: `app/bs-search/webview.tsx`
- 서비스 선택 시 해당 GAS URL을 WebView(웹에서는 iframe)로 로드
- 로딩 인디케이터 표시
- 플랫폼별 분기 처리 (Web: iframe / Native: WebView)

### 3. 수정 파일: `app/bs-search/index.tsx`
- 서비스 카드 터치 시 이동 경로 변경:
  - 변경 전: `/bs-search/search` (네이티브 검색 UI)
  - 변경 후: `/bs-search/webview` (웹앱 WebView)

## 📋 향후 계획 (Phase 7)
1. GAS `doGet()` 함수에 `type=json` 조건 분기 추가
2. `api.ts`를 JSON 모드로 재전환
3. 네이티브 UI(검색 결과 리스트)로 WebView 대체
