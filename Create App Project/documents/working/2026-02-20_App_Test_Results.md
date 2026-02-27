# 📋 앱 테스트 결과 보고서
> 작성일: 2026-02-20
> 테스트 방법: 코드 리뷰 + GAS URL 직접 호출 테스트

---

## 🔴 발견된 문제

### 1. [Critical] BS 검색 - GAS URL이 JSON이 아닌 HTML을 반환함

**문제**: 현재 `api.ts`에서 4개의 Google Apps Script URL을 `fetch`로 호출하면, **JSON 데이터가 아닌 HTML 웹 페이지**가 반환됩니다.

**원인**: GAS 웹앱 URL은 기본적으로 브라우저용 HTML UI를 반환합니다. `?type=json&keyword=HYM` 파라미터를 붙여도 HTML이 돌아옵니다.

**증거**:
```
요청: https://script.google.com/macros/s/.../exec?type=json&keyword=HYM
응답: <!doctype html><html>...<title>HY Mobility BS 점검</title>...
```
→ JSON이 아닌 **웹앱 UI 페이지(HTML)**가 반환됨

**영향**: 검색 버튼을 눌러도 항상 "검색 결과가 없습니다"가 표시됨

**해결 방안 (2가지 중 선택)**:
- **방안 A**: GAS 웹앱의 `doGet()` 함수를 수정하여 `type=json` 파라미터가 있을 때 JSON 데이터를 반환하도록 변경
- **방안 B**: 앱에서 GAS 웹앱을 WebView로 그대로 띄워서 기존 웹 UI를 사용

---

## 🟢 정상 동작 확인된 항목

| 화면 | 항목 | 상태 | 비고 |
|------|------|------|------|
| 홈 | 메뉴 구성 (5개) | ✅ | BS검색, 통계, 영업점, 배차, 업무가이드 |
| BS 검색 | 서비스 선택 화면 | ✅ | 4개 서비스 카드 정상 |
| BS 검색 | 스켈레톤 로딩 | ✅ | 코드 구현 확인 |
| BS 검색 | 필터 칩 | ✅ | 전체/완료/진행중/대기 |
| BS 검색 | Pull to Refresh | ✅ | 코드 구현 확인 |
| 배차 목록 | Bottom Sheet DatePicker | ✅ | 코드 구현 확인 |
| 배차 목록 | 스켈레톤 + Pull to Refresh | ✅ | Mock 데이터로 동작 |
| 영업점 검색 | 검색 필터링 | ✅ | Mock 데이터로 동작 |
| 영업점 검색 | Scroll-to-Top FAB | ✅ | 코드 구현 확인 |
| 영업점 검색 | 스켈레톤 로딩 | ✅ | 1초 초기 로딩 |
| 통계 | AS 실적 화면 이동 | ✅ | router.push 연결 확인 |
| 통계 | CS 통계 화면 이동 | ✅ | router.push 연결 확인 |

---

## 📌 결론

- **BS 검색 API 연동**만 문제가 있고, 나머지 화면은 Mock 데이터 기반으로 정상 동작합니다.
- GAS 웹앱이 JSON API를 지원하지 않으므로, **WebView 방식(방안 B)**으로 우선 전환하였고, 향후 **GAS 코드 수정(방안 A)**으로 전환할 예정입니다.
