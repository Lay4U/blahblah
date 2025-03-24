# 익명 커뮤니티 (Blind 유사 서비스)

특정 회사 내부 직원들만 익명으로 소통할 수 있는 플랫폼입니다.

## 기능

- 회사 이메일 도메인 인증을 통한 가입 및 접근 제한
- 이메일 인증 필수
- 익명 게시판 (작성, 조회, 삭제, 좋아요 기능)
- 실시간 채팅 (구현 예정)

## 설치 및 실행

1. 프로젝트 클론 및 패키지 설치
```bash
git clone [레포지토리 URL]
cd myapp
npm install
```

2. Firebase 프로젝트 설정
   - [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트 생성
   - Authentication에서 이메일/비밀번호 인증 활성화
   - Firestore 데이터베이스 생성
   - 프로젝트 설정에서 웹 앱 등록
   - 생성된 Firebase 구성 정보를 `src/lib/firebase.js` 파일에 업데이트

3. 개발 서버 실행
```bash
npm run dev
```

4. 빌드 및 배포
```bash
npm run build
```

## 기술 스택

- 프론트엔드: SvelteKit
- 백엔드: Firebase (Authentication, Firestore)
- 스타일링: TailwindCSS

## 프로젝트 구조

```
src/
├── lib/
│   └── firebase.js           # Firebase 설정 및 유틸리티
├── routes/
│   ├── +page.svelte          # 홈페이지
│   ├── login/
│   │   └── +page.svelte      # 로그인 페이지
│   ├── register/
│   │   └── +page.svelte      # 회원가입 페이지
│   └── board/
│       ├── +page.svelte      # 게시판 목록
│       ├── create/
│       │   └── +page.svelte  # 게시글 작성
│       └── [id]/
│           └── +page.svelte  # 게시글 상세
```
