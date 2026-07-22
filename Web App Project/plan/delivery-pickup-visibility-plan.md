# 배차관리 회수 메뉴 조회 범위 개선 설계

## 목적
- 배차관리 메뉴의 `[회수]` 탭에서 현재 `배차승인` 상태만 보이는 목록을 개선합니다.
- `배차신청` 상태도 함께 조회되도록 하되, `배차신청` 상태에서는 회수 처리를 할 수 없고 조회만 가능해야 합니다.
- 조회 가능한 상태와 처리 가능한 상태를 명확히 분리하여 기존 배차 승인/취소/배송 로직에 영향을 주지 않습니다.

## 현재 상태
- 서버 함수 `getDriverPickupList(sessionToken, filters)`는 `getDeliveryList(sessionToken, { status: 'APPROVED' })`를 호출해 `배차승인` 상태만 조회합니다.
- 실제 회수 처리 함수 `markDeliveryInTransit(sessionToken, rowNo)`는 현재도 `배차승인` 상태에서만 처리되도록 서버 검증이 들어가 있습니다.
- 프론트 목록 렌더링은 회수 탭 항목에 `회수` 버튼을 표시하는 구조이므로, 조회 범위를 넓힐 경우 버튼 표시 조건을 반드시 함께 정리해야 합니다.

## 설계 원칙
- 공통 조회 함수 `getDeliveryList()`는 가능하면 수정하지 않습니다.
- 회수 탭 전용 정책은 `getDriverPickupList()` 안에 둡니다.
- `조회 가능 상태`와 `처리 가능 상태`를 분리합니다.
- 서버 검증을 최종 방어선으로 유지합니다.
- 프론트 버튼은 사용자 편의용이며, 권한과 상태 검증의 기준은 서버가 담당합니다.

## 상태 정책
| 상태 | 회수 탭 조회 | 회수 버튼 | 회수 처리 |
| --- | --- | --- | --- |
| 배차신청 | 가능 | 표시 안 함 | 불가 |
| 배차승인 | 가능 | 표시 | 가능 |
| 이동 중 | 불가 | 표시 안 함 | 불가 |
| 배송완료 | 불가 | 표시 안 함 | 불가 |
| 배차취소 | 불가 | 표시 안 함 | 불가 |

## 서버 설계
### 대상 함수
- `src/Code.gs`
  - `getDriverPickupList(sessionToken, filters)`
  - `markDeliveryInTransit(sessionToken, rowNo)`

### 조회 흐름
1. `getDriverPickupList()`에서 권한과 세션 검증은 기존대로 유지합니다.
2. `getDeliveryList(sessionToken, { status: 'ALL' })`로 기본 목록을 가져옵니다.
3. 가져온 목록에서 반드시 `배차신청`, `배차승인` 상태만 남깁니다.
4. 날짜 필터는 기존과 동일하게 `item.searchDate` 기준으로 적용합니다.
5. 반환 데이터에는 기존 item 구조를 유지합니다.

### 서버 필터 조건
```javascript
const allowedPickupViewStatuses = ['배차신청', '배차승인'];
const items = (res.items || []).filter(function (item) {
  if (allowedPickupViewStatuses.indexOf(item.status) === -1) return false;
  const targetDate = getDateOnly(item.searchDate);
  if (dateFrom && (!targetDate || targetDate < dateFrom)) return false;
  if (dateTo && (!targetDate || targetDate > dateTo)) return false;
  return true;
});
```

### 처리 방어선
- `markDeliveryInTransit()`의 아래 조건은 유지합니다.

```javascript
if (currentStatus !== '배차승인') {
  return { success: false, message: '배차승인 상태에서만 회수 처리할 수 있습니다.' };
}
```

- 이 조건 때문에 프론트 오류나 직접 호출이 있어도 `배차신청`은 회수 처리되지 않습니다.

## 프론트 설계
### 대상 함수
- `src/JavaScript.html`
  - `loadDeliveryPickupList()`
  - `renderDriverResults(containerId, items, actionType)`
  - 상세 모달 액션 버튼 제어 로직

### 목록 버튼 표시 정책
- `actionType === 'pickup'` 이면서 `item.status === '배차승인'`일 때만 `회수` 버튼을 렌더링합니다.
- `배차신청` 상태는 카드/목록은 표시하지만 액션 버튼은 표시하지 않습니다.
- 가능하면 `배차신청` 항목에는 `조회 전용` 또는 상태 배지를 명확히 보여줍니다.

### 버튼 렌더링 설계 예시
```javascript
const canPickup = actionType === 'pickup' && item.status === '배차승인';
const canComplete = actionType === 'complete';
const actionButtonHtml = canPickup || canComplete
  ? `<button class="complete-btn" onclick="${actionFn}">${actionLabel}</button>`
  : `<span class="readonly-badge">조회 전용</span>`;
```

### 상세 모달 정책
- 상세 모달은 이미 `activeDeliveryTabId === 'pickup' && item.status === '배차승인'` 조건일 때만 회수 버튼을 표시하는 구조입니다.
- 구현 시 이 조건이 유지되는지 확인합니다.
- `배차신청` 상세 화면에서는 하단 액션 버튼이 보이지 않아야 합니다.

## 충돌 방지 설계
- `getDeliveryList()`의 상태 필터 조건은 수정하지 않습니다.
- `getDriverDeliveryList()`는 기존처럼 `이동 중` + 본인 회수 건만 조회하도록 유지합니다.
- `approveDeliveryRequest()`는 기존처럼 `배차신청 -> 배차승인`만 처리합니다.
- `cancelDeliveryRequest()`는 기존처럼 `배차신청 -> 배차취소`만 처리합니다.
- `markDeliveryCompleted()`는 기존처럼 `이동 중 -> 배송완료`만 처리합니다.
- 회수 탭 변경은 `getDriverPickupList()`와 회수 버튼 렌더링 조건으로 범위를 제한합니다.

## 해야 할 작업
- [x] `Code.gs`의 `getDriverPickupList()`에서 조회 상태를 `배차신청` + `배차승인`으로 확장합니다.
- [x] `getDriverPickupList()` 내부에서 `배차신청`, `배차승인`만 통과시키는 서버 필터를 추가합니다.
- [x] `JavaScript.html`의 회수 목록 렌더링에서 `item.status === '배차승인'`일 때만 `회수` 버튼을 표시합니다.
- [x] `배차신청` 상태 항목은 목록과 상세 조회만 가능하도록 유지합니다.
- [x] 상세 모달의 회수 버튼 조건이 `배차승인` 상태에만 표시되는지 재확인합니다.
- [x] `markDeliveryInTransit()`의 서버 검증은 유지하여, 프론트 오류가 있어도 `배차신청` 회수 처리가 불가능하도록 합니다.
- [x] 상태 배지 또는 안내 문구로 `배차신청` 항목이 조회 전용임을 사용자가 알 수 있는지 UX를 점검합니다.

## 검증 항목
- [ ] 회수 탭에서 `배차신청` 상태 항목이 표시됩니다.
- [ ] 회수 탭에서 `배차승인` 상태 항목이 기존처럼 표시됩니다.
- [ ] 회수 탭에서 `이동 중`, `배송완료`, `배차취소` 상태 항목은 표시되지 않습니다.
- [ ] `배차신청` 상태 항목에는 회수 버튼이 표시되지 않습니다.
- [ ] `배차승인` 상태 항목에는 회수 버튼이 표시됩니다.
- [ ] `배차승인` 상태 항목은 회수 처리가 정상 동작합니다.
- [ ] 직접 호출 또는 비정상 호출 시에도 `배차신청` 상태는 서버에서 회수 처리되지 않습니다.
- [ ] 날짜 필터가 `배차신청`, `배차승인` 항목 모두에 정상 적용됩니다.
- [ ] 승인/취소/배송완료/기사 배송관리 탭의 기존 동작에 변화가 없습니다.

## 예상 영향도
- 서버 영향도: 낮음
- 프론트 영향도: 중간 이하
- 다른 배차 메뉴 영향도: 낮음
- 주요 리스크: 프론트에서 `배차신청`에 회수 버튼이 노출되는 문제
- 리스크 대응: 서버 필터와 프론트 버튼 조건을 동시에 적용하고, 서버 처리 검증은 유지합니다.

## 최종 결론
- 권장 구현 방향으로 진행해도 기존 로직 충돌 가능성은 낮습니다.
- 안전한 구현의 핵심은 `조회 가능 상태`와 `처리 가능 상태`를 분리하는 것입니다.
- `getDeliveryList()` 공통 함수를 수정하지 않고 회수 탭 전용 함수와 버튼 표시 조건만 수정하는 방식이 가장 안정적입니다.
