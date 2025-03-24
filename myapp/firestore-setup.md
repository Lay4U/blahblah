# Firestore 설정 가이드

## 1. 보안 규칙 설정

Firebase 콘솔에서 Firestore 보안 규칙을 다음과 같이 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 기본적으로 모든 접근 차단
    match /{document=**} {
      allow read, write: if false;
    }
    
    // 인증된 사용자만 접근 가능
    function isSignedIn() {
      return request.auth != null;
    }
    
    // 이메일 인증된 사용자만 접근 가능
    function isEmailVerified() {
      return request.auth.token.email_verified == true;
    }
    
    // 자신의 데이터만 접근 가능
    function isSelf(userId) {
      return request.auth.uid == userId;
    }
    
    // 자신의 도메인인지 확인
    function isSameDomain(domain) {
      return domain == request.auth.token.email.split('@')[1];
    }
    
    // userProfiles 컬렉션 규칙 (사용자 프로필 정보)
    match /userProfiles/{userId} {
      // 모든 인증된 사용자가 프로필 읽기 가능
      allow read: if isSignedIn();
      
      // 자신의 프로필만 생성 가능 (닉네임 중복 검사 추가)
      allow create: if isSignedIn() && isSelf(userId) && 
                      !exists(/databases/$(database)/documents/userNicknames/$(request.resource.data.nickname));
      
      // 자신의 프로필만 수정 가능 (닉네임 중복 검사 추가)
      allow update: if isSignedIn() && isSelf(userId) && 
                      (request.resource.data.nickname == resource.data.nickname || 
                       !exists(/databases/$(database)/documents/userNicknames/$(request.resource.data.nickname)));
      
      // 자신의 프로필만 삭제 가능
      allow delete: if isSignedIn() && isSelf(userId);
    }
    
    // userNicknames 컬렉션 - 닉네임 인덱싱용
    match /userNicknames/{nickname} {
      allow read: if isSignedIn();  // 모든 인증된 사용자가 닉네임 확인 가능
      allow write: if false;        // 클라이언트에서 직접 쓰기 불가 (서버 함수로만 가능)
    }
    
    // 나머지 컬렉션 규칙 추가...
  }
}
```

## 2. 데이터베이스 인덱스 설정

필요한 경우 다음 인덱스를 설정하세요:

1. **닉네임 검색용 인덱스**:
   - 컬렉션: `userProfiles`
   - 필드: `nickname` (Ascending)

## 3. 닉네임 중복 방지 구현

닉네임 중복 방지를 위해 다음 두 가지 방법 중 하나를 선택할 수 있습니다:

### 방법 1: 클라이언트 구현 (현재 방식)

클라이언트에서 닉네임 변경 전에 중복 확인을 수행합니다:

```javascript
async function isNicknameExists(nickname) {
  const q = query(collection(db, 'userProfiles'), where('nickname', '==', nickname));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}
```

### 방법 2: 인덱스 컬렉션 사용 (더 안전하고 강력한 방식)

닉네임 전용 인덱스 컬렉션(`userNicknames`)을 생성하고 관리합니다:

1. 닉네임 생성/변경 시 `userNicknames` 컬렉션에 문서 추가:

```javascript
// 닉네임 인덱스 업데이트
async function updateNicknameIndex(uid, nickname, oldNickname = null) {
  const batch = writeBatch(db);
  
  // 새 닉네임 인덱스 생성
  batch.set(doc(db, 'userNicknames', nickname), { uid, createdAt: new Date() });
  
  // 이전 닉네임 인덱스 삭제 (닉네임 변경 시)
  if (oldNickname && oldNickname !== nickname) {
    batch.delete(doc(db, 'userNicknames', oldNickname));
  }
  
  await batch.commit();
}
```

2. 보안 규칙에서 중복 검사:

```javascript
// 자신의 프로필만 생성 가능 (닉네임 중복 검사 추가)
allow create: if isSignedIn() && isSelf(userId) && 
                !exists(/databases/$(database)/documents/userNicknames/$(request.resource.data.nickname));
```

## 4. Cloud Functions 설정 (선택사항)

사용자 프로필이 변경될 때 닉네임 인덱스를 자동으로 업데이트하는 Cloud Function을 구현할 수 있습니다:

```javascript
exports.updateNicknameIndex = functions.firestore
  .document('userProfiles/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    
    // 프로필이 삭제된 경우
    if (!change.after.exists) {
      const beforeData = change.before.data();
      if (beforeData.nickname) {
        // 이전 닉네임 인덱스 삭제
        await admin.firestore().collection('userNicknames').doc(beforeData.nickname).delete();
      }
      return;
    }
    
    const afterData = change.after.data();
    const beforeData = change.before.exists ? change.before.data() : { nickname: null };
    
    // 닉네임이 변경된 경우
    if (afterData.nickname !== beforeData.nickname) {
      const batch = admin.firestore().batch();
      
      // 새 닉네임 인덱스 생성
      batch.set(admin.firestore().collection('userNicknames').doc(afterData.nickname), {
        uid: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // 이전 닉네임 인덱스 삭제
      if (beforeData.nickname) {
        batch.delete(admin.firestore().collection('userNicknames').doc(beforeData.nickname));
      }
      
      await batch.commit();
    }
  }); 