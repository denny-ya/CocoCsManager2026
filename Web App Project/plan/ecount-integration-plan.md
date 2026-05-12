# ECOUNT ERP 연동 운영 계획 (Apps Script + Cloud Run + Cloud Tasks)

## 1. 목표
- Apps Script UI는 빠르게 응답하고, 무거운 ERP 처리 로직은 서버에서 비동기로 처리한다.
- 40명 동시 업무 환경에서 안정성(재시도/중복방지/속도제어)을 확보한다.

## 2. 아키텍처 범위
- `Apps Script (Web App)` : 사용자 입력/조회 UI, 작업 요청 접수
- `Cloud Run API (ingest)` : 요청 검증, 작업 ID 발급, 큐 적재
- `Cloud Tasks` : 비동기 작업 큐, 재시도/백오프
- `Cloud Run Worker` : ECOUNT API 실제 호출, 결과 저장
- `저장소(Firestore 또는 시트)` : 작업 상태(`queued/running/success/failed`) 관리

## 3. 구현 Task
- [ ] `Apps Script`에서 요청 스키마 확정 (`jobType`, `payload`, `requestedBy`)
- [ ] `Apps Script` -> `Cloud Run ingest` 호출 함수 구현 (`UrlFetchApp`)
- [ ] ingest API에서 유효성 검사 및 `jobId` 생성
- [ ] ingest API에서 `Cloud Tasks` enqueue 구현
- [ ] Worker 엔드포인트 구현 (`/tasks/execute`)
- [ ] Worker에서 ECOUNT 인증/요청 모듈 구현
- [ ] 멱등성 처리 (`jobId` 중복 실행 방지)
- [ ] 작업 상태 저장/조회 API 구현
- [ ] Apps Script UI에서 상태 조회/표시 로직 구현

## 4. 보안/IAM Task
- [ ] Cloud Run 서비스 계정 분리 (`ingest`, `worker`)
- [ ] Secret Manager에 ECOUNT 인증정보 저장
- [ ] Worker를 private로 배포하고 Cloud Tasks OIDC 인증 사용
- [ ] Apps Script 호출용 토큰/키 관리 정책 정리

## 5. 성능/안정성 Task
- [ ] Cloud Tasks queue rate 설정 (`maxDispatchesPerSecond`, `maxConcurrentDispatches`)
- [ ] 실패 재시도 정책 설정 (지수 백오프, 최대 재시도 횟수)
- [ ] 타임아웃/에러코드 분류 및 사용자 메시지 정책 정의
- [ ] Apps Script 쓰기 구간 `LockService` 적용
- [ ] 시트 I/O 배치 처리(`getValues/setValues`) 및 캐시 적용

## 6. 모니터링/운영 Task
- [ ] Cloud Logging 구조화 로그 필드 정의 (`jobId`, `user`, `endpoint`, `latencyMs`)
- [ ] 실패율/지연시간 알림 기준 설정
- [ ] 운영 점검 체크리스트 작성 (일일/주간)
- [ ] 장애 대응 Runbook 작성 (재처리, 롤백, 수동 복구)

## 7. 단계별 일정(권장)
- [ ] Phase 1 (1주): ingest + queue + worker 최소 동작 구축
- [ ] Phase 2 (1주): ECOUNT 핵심 업무 API 1~2개 연동
- [ ] Phase 3 (1주): 모니터링/재시도/중복방지 고도화
- [ ] Phase 4 (1주): 부하 테스트 및 사용자 파일럿(5명 -> 40명 확대)

## 8. 완료 기준 (DoD)
- [ ] 요청 접수 성공률 99% 이상
- [ ] 중복 처리율 0% (jobId 기준)
- [ ] 실패 작업 재시도 후 자동 복구율 목표 달성
- [ ] 사용자 화면에서 작업 상태 추적 가능
- [ ] 운영 문서/장애 대응 문서 최신화 완료
