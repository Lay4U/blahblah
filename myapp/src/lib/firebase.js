// Firebase 설정
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  sendEmailVerification as browserSendEmailVerification
} from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { writable } from 'svelte/store';

// Firebase 구성 정보
const firebaseConfig = {

};

// Firebase 앱이 이미 초기화되었는지 확인 후 초기화
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Firestore 데이터베이스 초기화
export const db = getFirestore(app);

// Firebase 인증 초기화
export const auth = getAuth(app);

// 사용자 상태 스토어
export const user = writable(null);

// 로그인 상태 감시
auth.onAuthStateChanged((u) => {
  user.set(u);
});

// 이메일 회원가입 함수
export async function register(email, password, companyDomain) {
  try {
    // 사용자 생성
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 이메일 인증 발송
    await browserSendEmailVerification(userCredential.user);
    
    // 도메인 추출 및 저장
    const domain = email.split('@')[1];
    
    try {
      // 사용자 정보 저장 (도메인 포함)
      await addDoc(collection(db, "user_info"), {
        uid: userCredential.user.uid,
        email: email,
        domain: domain,
        registeredAt: new Date().toString() // 문자열로 변환하여 저장
      });
    } catch (storeError) {
      console.error("사용자 정보 저장 중 오류:", storeError);
      // 저장 실패해도 계속 진행 (회원가입은 성공한 것으로 처리)
    }
    
    return { 
      success: true, 
      message: '이메일 인증 링크가 발송되었습니다. 이메일을 확인해주세요.',
      user: userCredential.user
    };
  } catch (error) {
    console.error('회원가입 중 오류가 발생했습니다:', error);
    
    let errorMessage = '회원가입 중 오류가 발생했습니다.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = '이미 사용 중인 이메일 주소입니다.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = '유효하지 않은 이메일 주소입니다.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.';
    }
    
    return { success: false, message: errorMessage, error: error };
  }
}

// 로그인 함수
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 이메일 인증 확인
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      return { success: false, message: '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.' };
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 로그아웃 함수
export async function logout() {
  await signOut(auth);
  return { success: true };
}

// 게시글 관련 함수
export const posts = {
  // 게시글 작성
  create: async (title, content, authorId) => {
    try {
      // 현재 사용자 이메일에서 도메인 추출
      let userEmail = '';
      const unsubscribe = user.subscribe(value => {
        if (value && value.email) {
          userEmail = value.email;
        }
      });
      unsubscribe();
      
      const domain = userEmail.split('@')[1];
      
      const docRef = await addDoc(collection(db, "posts"), {
        title,
        content,
        authorId,
        domain, // 도메인 정보 추가
        createdAt: new Date(),
        likes: 0,
        likedBy: []
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  
  // 게시글 목록 가져오기
  getAll: async () => {
    try {
      // 현재 사용자 이메일에서 도메인 추출
      let userDomain = '';
      const unsubscribe = user.subscribe(value => {
        if (value && value.email) {
          userDomain = value.email.split('@')[1];
        }
      });
      unsubscribe();
      
      // 같은 도메인의 게시글만 가져오기
      const q = query(
        collection(db, "posts"),
        where("domain", "==", userDomain),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const posts = [];
      
      querySnapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, posts };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  
  // 게시글 좋아요 토글
  toggleLike: async (postId, userId) => {
    try {
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        return { success: false, message: '게시글을 찾을 수 없습니다.' };
      }
      
      const postData = postDoc.data();
      const likedBy = postData.likedBy || [];
      const isLiked = likedBy.includes(userId);
      
      if (isLiked) {
        // 좋아요 취소
        await updateDoc(postRef, {
          likes: postData.likes - 1,
          likedBy: likedBy.filter(id => id !== userId)
        });
      } else {
        // 좋아요 추가
        await updateDoc(postRef, {
          likes: postData.likes + 1,
          likedBy: [...likedBy, userId]
        });
      }
      
      return { success: true, isLiked: !isLiked };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
  
  // 게시글 삭제
  delete: async (postId, userId) => {
    try {
      // 작성자 확인 (실제로는 더 복잡한 권한 확인 로직이 필요)
      const postRef = doc(db, "posts", postId);
      await deleteDoc(postRef);
      
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

/**
 * 이메일 인증 메일 발송
 * @returns {Promise<boolean>} 성공 여부
 */
export async function sendEmailVerification() {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('로그인한 사용자가 없습니다.');
    }
    
    // 이미 인증된 경우 메일을 보내지 않음
    if (auth.currentUser.emailVerified) {
      console.log('이미 이메일이 인증되었습니다.');
      return true;
    }
    
    await browserSendEmailVerification(auth.currentUser);
    return true;
  } catch (error) {
    console.error('이메일 인증 메일 발송 중 오류가 발생했습니다:', error);
    
    // 오류 메시지 개선
    if (error.code === 'auth/too-many-requests') {
      error.message = '너무 많은 인증 메일 요청이 있었습니다. 잠시 후 다시 시도해주세요.';
    }
    
    throw error;
  }
}

/*
 * Firebase 보안 규칙 설정 가이드:
 * 
 * 1. Firestore 규칙에서 다음과 같이 userProfiles 컬렉션에 닉네임 필드에 대한 규칙을 추가합니다:
 * 
 * // 닉네임 중복 방지를 위한 규칙
 * match /userProfiles/{userId} {
 *   allow read: if request.auth != null;
 *   allow create: if request.auth != null && request.auth.uid == userId &&
 *                   !exists(/databases/$(database)/documents/userProfiles/byNickname/$(request.resource.data.nickname));
 *   allow update: if request.auth != null && request.auth.uid == userId &&
 *                   (request.resource.data.nickname == resource.data.nickname ||
 *                    !exists(/databases/$(database)/documents/userProfiles/byNickname/$(request.resource.data.nickname)));
 * }
 * 
 * // 닉네임 인덱스 컬렉션
 * match /userProfiles/byNickname/{nickname} {
 *   allow read: if request.auth != null;
 *   allow write: if false; // 앱 내부 함수에서만 작성 가능하도록 제한
 * }
 * 
 * 2. Cloud Functions 또는 트리거를 사용하여 userProfiles 문서가 생성 또는 업데이트될 때마다 
 *    byNickname 컬렉션에 해당 닉네임을 등록하는 기능을 구현합니다.
 */ 