# 🛠️ 개발 환경 설정 가이드 (Windows 기준)

React Native + Expo 앱 개발을 시작하기 위해 필요한 도구들과 설치 순서를 정리했습니다.
아래 순서대로 하나씩 진행해주세요.

## ✅ 필수 설치 항목 (반드시 설치)

### 1. Node.js (LTS 버전)
자바스크립트 실행 환경입니다. Expo를 실행하기 위해 필수입니다.
- **다운로드**: [Node.js 공식 홈페이지](https://nodejs.org/ko) (LTS 버전 권장, v18 이상)
- **확인 방법**:
  ```powershell
  node -v
  npm -v
  ```

### 2. Git
소스 코드 버전 관리 도구입니다. GitHub 연동을 위해 필요합니다.
- **다운로드**: [Git 공식 홈페이지](https://git-scm.com/downloads) (Windows용 64-bit)
- **설치 팁**: 설치 중 나오는 옵션은 모두 'Next'를 눌러 기본값으로 진행해도 됩니다.
- **확인 방법**:
  ```powershell
  git --version
  ```

### 3. VS Code (Visual Studio Code)
코드를 작성할 에디터입니다.
- **다운로드**: [VS Code 공식 홈페이지](https://code.visualstudio.com/)
- **추천 확장 프로그램 (Extensions)**:
  - `ES7+ React/Redux/React-Native snippets`
  - `Prettier - Code formatter`
  - `Material Icon Theme` (선택, 아이콘 예쁘게)

### 4. Expo 계정 & CLI
앱 빌드 및 테스트를 위한 클라우드 서비스입니다.
- **가입**: [Expo 웹사이트](https://expo.dev/signup)에서 회원가입
- **CLI 설치**:
  PowerShell을 **관리자 권한**으로 실행 후 아래 명령어 입력:
  ```powershell
  npm install -g @expo/cli
  ```
- **로그인**:
  ```powershell
  npx expo login
  ```

---

## 🟡 선택 설치 항목 (권장하지만 필수는 아님)

### 5. Android Studio (에뮬레이터)
PC 화면에서 가상 휴대폰으로 앱을 실행해볼 수 있습니다.
- **다운로드**: [Android Studio 공식 홈페이지](https://developer.android.com/studio)
- **설치 후 설정**:
  1. `Android SDK Platform 34` (최신) 설치
  2. `Android SDK Build-Tools` 설치
  3. `Virtual Device Manager`에서 가상 기기(Pixel 등) 생성
- **대안**: 실제 안드로이드 폰에 `Expo Go` 앱(Play 스토어)을 설치하면 에뮬레이터 없이도 테스트 가능합니다. (초보자 추천)

---

## 🚀 요약: 설치 순서 체크리스트

1. [x] **Node.js** 설치 (v18+)
2. [x] **Git** 설치
3. [x] **VS Code** 설치
4. [x] **Expo 계정** 생성
5. [x] **Expo CLI** 설치 (`npm install -g @expo/cli`)
6. [x] **Expo 로그인** (`npx expo login`)
7. [x] (선택) **Android Studio** 설치 (최초 실행하여 SDK 설정 필요)

이 준비가 끝나면 `npx create-expo-app` 명령어로 바로 앱을 만들 수 있습니다!
