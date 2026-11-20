# 🔧 부품 탈거 관리 (Waste Management)

## 프로젝트 개요

차대번호를 입력(또는 바코드 스캔)하면 부품 탈거 수량을 선택하고,
입력 내용을 Google Spreadsheet에 자동 기록하는 관리 앱입니다.

## 현재 웹앱 적용 파일

- `code.gs`: 웹앱 서버 코드. Apps Script의 Code.gs에 반영합니다.
- `index.html`: 웹앱 화면. 이번 부품 확장에서는 변경하지 않았습니다.
- `gas-code.js`: 예전 별도 JSON API 참고 코드입니다. 위치 고정 방식이므로 현재 웹앱에 추가하거나 `code.gs`와 함께 배포하지 않습니다.

### 2026-11-20 부품 확장

- `1. 데이터(탈거)`의 3행을 부품명 기준으로 연결합니다. 목록 순서와 저장 열 순서는 달라도 됩니다.
- M3: `메인 PCB(진우/캐리어)`, N3: `디스플레이 PCB(진우/캐리어)`로 통일했습니다.
- BM3: `모터엔코더`, BN3: `HY파이프브라켓`, BO3: `HYDC리어허브-28π`, BP3: `SWITCH ASSY LH`.
- `2. 부품명`의 63종을 탈거 등록, 재사용품 이관, 월 목표, 결과 작성에서 공유합니다.
- 선택 부품의 저장 열 누락, 중복 헤더, 중복 선택, 잘못된 수량은 쓰기 전에 오류로 안내합니다.
- PCB 2종의 예전 명칭도 정확한 두 별칭으로 연결하며, 다른 부품명은 임의로 바꾸지 않습니다.
- 기존 탈거 기록 수정 시 A/B열의 수식을 보존합니다.
- 운영 시트의 과거 수량은 이동하거나 0으로 채우지 않습니다. 신규 열의 과거 행은 빈칸입니다.

검증: `node "[Waste Management]/tests/parts-expansion.cjs"` (저장소 루트에서 실행).

운영 반영 순서: 시트 백업과 헤더 정리 후 `code.gs`를 운영 Apps Script에 반영하고 기존 배포를 새 버전으로 갱신합니다. 사용자는 앱을 다시 열어 최신 목록을 불러옵니다. 로컬 파일 변경만으로 운영 Apps Script가 갱신되지는 않습니다.

## 스프레드시트

- **ID**: `1esBI7e8vqyHwcPYXmMvPxbg9DB3qsxaNK3yRoR5gXyc`
- **URL**: [스프레드시트 열기](https://docs.google.com/spreadsheets/d/1esBI7e8vqyHwcPYXmMvPxbg9DB3qsxaNK3yRoR5gXyc/edit)

### 시트 구조

| 시트명 | 용도 | 주요 열 |
|--------|------|---------|
| 부품명 | 부품 마스터 목록 (26개) | B:분류, C:부품명, D:기본수량, E:최대수량 |
| 사용자 정보 | 로그인 가능 사원 목록 | A:사원번호, B:성명 |
| 차대정보 | 바코드↔차대번호 매핑 | A:바코드, B:차대번호 |
| 데이터(탈거) | 탈거 기록 RAW 데이터 | C:차대번호, D:등록자, E:등록날짜, F~AE:부품수량 |

## 예전 별도 GAS API 참고

### 배포 방법

1. [Google Apps Script](https://script.google.com/) 에서 새 프로젝트 생성
2. `gas-code.js` 내용을 `코드.gs`에 붙여넣기
3. **배포** → **새 배포** → **웹 앱** 선택
4. 액세스 권한: **모든 사용자** 설정
5. 배포 URL 복사 → 앱에서 사용

### API 엔드포인트

| Method | Action | 설명 | 파라미터 |
|--------|--------|------|----------|
| GET | `login` | 사원번호 검증 | `empNo` |
| GET | `getPartsList` | 부품 목록 조회 | 없음 |
| GET | `lookupBarcode` | 바코드→차대번호 | `barcode` |
| POST | `submitRecord` | 탈거 기록 저장 | `vin, empNo, parts[]` |
| POST | `uploadPhoto` | 사진 업로드 | `base64, filename, vin` |

### 호출 예시

```
GET: {배포URL}?mode=api&action=login&empNo=190302
GET: {배포URL}?mode=api&action=getPartsList
GET: {배포URL}?mode=api&action=lookupBarcode&barcode=ABC123
```

## 파일 구조

```
[Waste Management]/
├── README.md           ← 이 파일
├── gas-code.js         ← GAS API 코드
└── spreadsheet-setup.md ← 스프레드시트 설정 가이드
```
