# 🔧 부품 탈거 관리 (Waste Management)

## 프로젝트 개요

차대번호를 입력(또는 바코드 스캔)하면 부품 탈거 수량을 선택하고,
입력 내용을 Google Spreadsheet에 자동 기록하는 관리 앱입니다.

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

## GAS API

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
