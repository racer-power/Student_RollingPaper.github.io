# 칭찬 롤링페이퍼

교실에서 로그인 없이 사용하는 학급 칭찬 롤링페이퍼 웹앱입니다.

## 시작하기

```bash
npm install
npm run dev
```

`.env` 파일에 Supabase URL과 anon key를 설정하세요. (`.env.example` 참고)

## 사용 방법

1. **선생님**: 「학급 만들기」→ 학급명·학생 명단 입력 → 코드/QR 공유 → 「시작하기」
2. **학생**: 「참여하기」→ 코드 입력 → 이름 선택 → 칭찬 작성
3. **마무리**: 선생님이 「마무리하기」→ PDF/PNG 저장

## 기술 스택

- React + Vite + TypeScript
- Supabase (Realtime)
- jsPDF + html2canvas + JSZip (내보내기)

## 문서

자세한 요구사항은 [PRD.md](./PRD.md)를 참고하세요.
