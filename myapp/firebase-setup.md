# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성
1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속
2. '프로젝트 추가' 버튼 클릭
3. 프로젝트 이름 입력 (예: 'anonymous-community')
4. Google 애널리틱스 설정 (선택 사항)
5. '프로젝트 만들기' 버튼 클릭

## 2. Firebase Authentication 설정
1. 왼쪽 메뉴에서 'Authentication' 선택
2. '시작하기' 버튼 클릭
3. '이메일/비밀번호' 제공업체 선택 후 '사용 설정' 활성화
4. '저장' 버튼 클릭

## 3. Firestore 데이터베이스 생성
1. 왼쪽 메뉴에서 'Firestore Database' 선택
2. '데이터베이스 만들기' 버튼 클릭
3. '프로덕션 모드' 또는 '테스트 모드' 선택 (개발 중에는 '테스트 모드' 권장)
4. 데이터베이스 위치 선택 (가장 가까운 리전 권장)
5. '사용 설정' 버튼 클릭

## 4. 웹 앱 등록
1. 프로젝트 개요 페이지에서 '</>' 아이콘 클릭
2. 앱 닉네임 입력 (예: 'anonymous-community-web')
3. '앱 등록' 버튼 클릭
4. Firebase SDK 설정 정보 복사 (firebaseConfig 객체)

## 5. Firebase 구성 정보 업데이트
1. 복사한 firebaseConfig 객체를 `src/lib/firebase.js` 파일의 firebaseConfig 객체에 붙여넣기

```javascript
// Firebase 구성 정보
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 6. Firestore 보안 규칙 설정
1. 왼쪽 메뉴에서 'Firestore Database' 선택
2. '규칙' 탭 선택
3. `firestore.rules` 파일의 내용을 복사하여 붙여넣기
4. '게시' 버튼 클릭

**참고**: 개발 단계에서는 간단한 테스트 규칙을 사용하고, 배포 전에 보안 규칙을 강화하세요.

```
// 테스트용 간단한 규칙 (개발 단계에서만 사용)
match /{document=**} {
  allow read, write: if true;
}
```

## 7. Firebase 배포 설정 (선택사항)
1. Firebase CLI 설치: `npm install -g firebase-tools`
2. Firebase 로그인: `firebase login`
3. 프로젝트 초기화: `firebase init`
4. 프로젝트 빌드: `npm run build`
5. Firebase 배포: `firebase deploy` 