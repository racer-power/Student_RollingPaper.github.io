# 칭찬 롤링페이퍼

교실에서 로그인 없이 사용하는 학급 칭찬 롤링페이퍼 웹앱입니다. **Vercel**에만 배포합니다 (Supabase 불필요).

## 배포 (Vercel)

1. GitHub 저장소 연결 → Vercel Import
2. 별도 환경 변수 **설정 불필요**
3. Push 시 자동 배포

배포 URL: https://student-rolling-paper-github-io.vercel.app/

## 로컬 개발

```bash
npm install
npm run dev          # 프론트만 (API는 Vercel 배포 후 동작)
npm run dev:vercel   # API 포함 전체 (Vercel CLI 필요)
```

## 데이터 저장

- Vercel Serverless API + **메모리 저장소** (24시간 유효)
- 수업 중(약 30분~1시간) 학생 다기기 동시 접속 지원
- 서버 재시작·콜드 스타트 시 데이터가 초기화될 수 있음 → **수업 후 PDF 저장 권장**

## 기능

- 학급 만들기 / 코드로 참여
- 칭찬 작성 · 롤링페이퍼 보기
- 교사 대시보드 · 전자칠판 모드
- PDF/PNG/ZIP 내보내기

자세한 요구사항: [PRD.md](./PRD.md)
