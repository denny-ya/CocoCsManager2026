# 🔄 GitHub 동기화 가이드 (CocoCsManager2026)

> **저장소**: https://github.com/denny-ya/CocoCsManager2026
> **핵심 규칙**: 시작 전 Pull, 종료 후 Push!

---

## 🚀 1. 최초 설정 (현재 PC - 한 번만)

`Create App Project` 폴더를 GitHub에 연결합니다.

```powershell
cd "c:\Users\user\Desktop\HYM-PROJECT\Create App Project"
git init
git branch -M main
git remote add origin https://github.com/denny-ya/CocoCsManager2026.git
git add .
git commit -m "feat: 프로젝트 초기 설정 및 문서 추가"
git push -u origin main
```

---

## 🏠 2. 다른 PC(집)에서 처음 시작할 때 (한 번만)

```powershell
git clone https://github.com/denny-ya/CocoCsManager2026.git
cd CocoCsManager2026/mobile-app
npm install
```

---

## ☀️ 3. 매일 작업 시작 전 (Pull)

```powershell
git status                # 이전 작업이 커밋 안 된 게 있는지 확인
git pull origin main      # 최신 코드 받기
```

> ⚠️ `git status`에서 변경 사항이 있으면 먼저 커밋하거나 `git stash`로 임시 저장 후 Pull하세요.

---

## 🌙 4. 매일 작업 종료 후 (Push)

```powershell
git add .
git commit -m "feat: 오늘의 작업 내용 요약"
git push origin main
```

### 커밋 메시지 규칙 (`development-rules.md` 참조)

| Type | 용도 | 예시 |
|------|------|------|
| `feat:` | 새 기능 | `feat: 검색 기능 구현` |
| `fix:` | 버그 수정 | `fix: 검색 결과 오류 수정` |
| `style:` | UI 변경 | `style: 버튼 색상 변경` |
| `docs:` | 문서 수정 | `docs: README 업데이트` |
| `chore:` | 기타 | `chore: 패키지 업데이트` |

---

## ⚠️ 5. 주의사항 및 충돌 방지

### 🔴 반드시 지켜야 할 것
1. **동시 작업 금지**: 회사/집 PC에서 동시에 같은 파일을 수정하지 마세요.
2. **Pull 먼저**: 작업 시작 전 무조건 `git pull` 하세요.
3. **Push 잊지 말기**: 퇴근/이동 전 반드시 `git push` 하세요.

### 🟡 충돌 발생 시 해결 방법
`Automatic merge failed` 메시지가 나오면:

1. VS Code에서 **Source Control 탭** (좌측 세 번째 아이콘) 클릭
2. 충돌 파일에 `!` 표시가 보임 → 클릭하여 열기
3. `<<<<<<< HEAD` ~ `>>>>>>> origin/main` 구간에서 원하는 코드를 선택
4. 수정 후 저장 → `git add .` → `git commit` → `git push`

> 💡 **팁**: 충돌이 복잡하면 저한테 물어보세요!

### 🟢 VS Code에서 GUI로 사용하기
터미널 명령어 대신 VS Code의 **Source Control** 탭에서도 동일한 작업이 가능합니다:
- `+` 버튼 = `git add`
- 메시지 입력 후 `✓` 버튼 = `git commit`
- `...` 메뉴 → Push = `git push`
