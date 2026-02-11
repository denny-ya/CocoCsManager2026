# 🏗️ 프로젝트 생성 단계 체크리스트 (Project Creation Phase)

> `implementation_plan.md`와 `development-rules.md`에 기반한 초기 프로젝트 셋업 절차입니다.
> 순서대로 진행하며 체크박스를 채워주세요.

---

## 1. 🐙 Git 초기화 및 GitHub 연결 (~5분)

> ⚠️ **프로젝트 생성 전에 먼저 실행!** 기존 문서(plan, rules 등)를 먼저 GitHub에 올립니다.

- [x] **`.gitignore` 파일 생성** (`Create App Project` 폴더 내) ✅ 2026-02-10 완료
  ```
  node_modules/
  .expo/
  .env
  dist/
  *.log
  ```
- [x] **Git 초기화 및 원격 저장소 연결** ✅ 2026-02-10 완료
  ```powershell
  git init
  git branch -M main
  git remote add origin https://github.com/denny-ya/CocoCsManager2026.git
  ```
- [x] **첫 커밋 및 Push** (기존 plan, rules, process 문서 업로드) ✅ 2026-02-10 완료
  ```powershell
  git add .
  git commit -m "docs: 프로젝트 계획 및 규칙 문서 초기 업로드"
  git push -u origin main
  ```

> ⚠️ **주의**: GitHub에 `CocoCsManager2026` 저장소가 미리 생성되어 있어야 합니다.

---

## 2. 📦 Expo 프로젝트 생성 (~10분)

- [x] **Expo 프로젝트 생성** ✅ 2026-02-11 완료 (SDK 54)
  ```powershell
  npx create-expo-app mobile-app
  ```
- [x] **프로젝트 폴더로 이동** ✅ 2026-02-11 완료
  ```powershell
  cd mobile-app
  ```
- [x] **개발 서버 실행 테스트** (정상 생성 확인 후 `Ctrl+C`로 종료) ✅ 2026-02-11 완료
  ```powershell
  npx expo start
  ```

> ⚠️ **주의**: `npx create-expo-app`은 인터넷 속도에 따라 시간이 걸릴 수 있습니다.

---

## 3. 📂 폴더 구조 잡기 (~5분)

> `implementation_plan.md`의 **프로젝트 구조 설계** 기준

- [x] **주요 폴더 일괄 생성** ✅ 2026-02-11 완료 (기존 3개 + 신규 5개 = 총 8개)
  ```powershell
  mkdir components, services, types, utils, config, hooks, constants, store
  ```
  | 폴더 | 용도 | 생성 시점 |
  |------|------|----------|
  | `components/` | 재사용 UI 컴포넌트 | 지금 |
  | `services/` | API, 스토리지 로직 | 지금 |
  | `types/` | TypeScript 타입 정의 | 지금 |
  | `utils/` | 유틸리티 함수 | 지금 |
  | `config/` | 환경 설정, 상수 | 지금 |
  | `hooks/` | 커스텀 훅 | 지금 |
  | `constants/` | 색상, 스타일 상수 | 지금 |
  | `store/` | Zustand 전역 상태 | 지금 |

---

## 4. 📚 필수 라이브러리 설치 (~5분)

> `development-rules.md` **5. 기술 스택 규칙** 및 **UI 컴포넌트 전략** 기준

- [x] **React Native Paper** (UI 라이브러리) ✅ 2026-02-11 완료
  ```powershell
  npm install react-native-paper react-native-safe-area-context
  ```
- [x] **Expo SecureStore** (보안 저장소) ✅ 2026-02-11 완료
  ```powershell
  npx expo install expo-secure-store
  ```
- [x] **AsyncStorage** (일반 데이터 저장) ✅ 2026-02-11 완료
  ```powershell
  npx expo install @react-native-async-storage/async-storage
  ```

> ⚠️ **주의**: `npm install`과 `npx expo install`을 구분하세요.
> Expo 전용 라이브러리는 반드시 `npx expo install`로 설치해야 버전 호환이 보장됩니다.

---

## 5. ⚙️ 환경 설정 (~10분)

- [x] **`.env` 파일 생성** (API 키 등 민감 정보용) ✅ 2026-02-11 완료
  ```
  API_URL=https://your-apps-script-url
  ```
- [x] **`.env.example` 파일 생성** (팀 공유용, 실제 값 없이 키 이름만) ✅ 2026-02-11 완료
  ```
  API_URL=
  ```
- [x] **PaperProvider 설정** (`app/_layout.tsx`) ✅ 2026-02-11 완료
  - `PaperProvider`로 앱 전체를 감싸기 (테마 적용)
- [x] **절대 경로 설정** (`tsconfig.json`, 선택 사항) ✅ 2026-02-11 이미 설정됨 확인
  - `@/components` 등으로 import 가능하게 설정

> ⚠️ **주의**: `.env` 파일은 절대 GitHub에 올리면 안 됩니다! `.gitignore`에 포함되어 있는지 반드시 확인하세요.

---

## 6. 🚀 두 번째 커밋 및 Push (~3분)

- [ ] **변경사항 확인**
  ```powershell
  git status
  ```
- [ ] **커밋 및 Push**
  ```powershell
  git add .
  git commit -m "chore: Expo 프로젝트 생성 및 초기 환경 설정"
  git push origin main
  ```

> ✅ 여기까지 완료하면 **프로젝트 생성 단계 완료!** 다음은 메인 화면 UI 구현 단계입니다.
