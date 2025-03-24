import { db, user } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where, 
  serverTimestamp,
  getDocs,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { writable, get } from 'svelte/store';

// 채팅 메시지 스토어
export const chatMessages = writable([]);
export const activeUsers = writable([]);
export const currentChatRoom = writable('general'); // 기본 채팅방

// 사용자의 도메인 가져오기
export function getUserDomain() {
  let userEmail = '';
  const unsubscribe = user.subscribe(value => {
    if (value && value.email) {
      userEmail = value.email;
    }
  });
  unsubscribe();
  
  return userEmail.split('@')[1] || '';
}

/**
 * 메시지 구독 함수
 * @param {function} callback 메시지 업데이트 콜백 함수
 * @param {string} roomId 채팅방 ID (기본값: 'general')
 * @returns {function} 구독 해제 함수
 */
export function subscribeToMessages(callback, roomId = 'general') {
  try {
    // 사용자가 로그인하지 않은 경우 에러
    if (!get(user)) {
      throw new Error('로그인이 필요합니다.');
    }
    
    // 사용자 도메인 가져오기
    const domain = getUserDomain();
    if (!domain) {
      throw new Error('유효한 회사 도메인이 아닙니다.');
    }
    
    // 도메인별 채팅방 경로: 'domains/{domain}/chats/{roomId}/messages'
    const messagesRef = collection(db, 'domains', domain, 'chats', roomId, 'messages');
    
    // 최근 메시지 50개만 조회, 시간순 정렬
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    // 실시간 메시지 구독
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        // 메시지 데이터 변환
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        // 콜백으로 메시지 전달
        callback(messages);
      } catch (error) {
        console.error('메시지 변환 중 오류가 발생했습니다:', error);
        callback([]);
      }
    }, (error) => {
      console.error('Error listening to messages: ', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('메시지 구독 중 오류가 발생했습니다:', error);
    callback([]);
    return () => {};
  }
}

/**
 * 메시지 전송 함수
 * @param {string} content 메시지 내용
 * @param {string} roomId 채팅방 ID (기본값: 'general')
 * @returns {Promise<boolean>} 성공 여부
 */
export async function sendMessage(content, roomId = 'general') {
  try {
    const currentUser = get(user);
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    // 현재 사용자 정보
    const userEmail = currentUser.email;
    const domain = userEmail.split('@')[1];
    
    if (!domain) {
      throw new Error('유효한 회사 도메인이 아닙니다.');
    }
    
    // 닉네임 가져오기
    let nickname = '';
    const userProfileRef = doc(db, 'userProfiles', currentUser.uid);
    const userProfileDoc = await getDoc(userProfileRef);
    
    if (userProfileDoc.exists()) {
      nickname = userProfileDoc.data().nickname || '';
    }
    
    // 도메인별 채팅방 경로: 'domains/{domain}/chats/{roomId}/messages'
    const messagesRef = collection(db, 'domains', domain, 'chats', roomId, 'messages');
    
    // 새 메시지 문서 추가
    await addDoc(messagesRef, {
      content,
      author: userEmail,
      authorUid: currentUser.uid,
      timestamp: serverTimestamp(),
      domain: domain,
      nickname: nickname

    });
    
    return true;
  } catch (error) {
    console.error('메시지 전송 중 오류가 발생했습니다:', error);
    return false;
  }
}

// 사용자 활동 업데이트
async function updateUserActivity(userStore, nickname = '익명') {
  if (!userStore) return;
  
  try {
    const userRef = doc(db, 'activeUsers', userStore.uid);
    
    // 닉네임이 없는 경우 프로필에서 가져오기
    if (nickname === '익명') {
      const userProfileRef = doc(db, 'userProfiles', userStore.uid);
      const userProfileDoc = await getDoc(userProfileRef);
      
      if (userProfileDoc.exists()) {
        nickname = userProfileDoc.data().nickname || '익명';
      }
    }
    
    await setDoc(userRef, {
      uid: userStore.uid,
      email: userStore.email,
      nickname: nickname,
      lastActive: serverTimestamp(),
      domain: userStore.email.split('@')[1]
    }, { merge: true });
    
  } catch (error) {
    console.error('Error updating user activity: ', error);
  }
}

// 활성 사용자 목록 가져오기
export async function getActiveUsers() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  try {
    const userStore = get(user);
    if (!userStore) throw new Error('User not authenticated');
    
    const domain = userStore.email.split('@')[1];
    const usersRef = collection(db, 'activeUsers');
    const q = query(
      usersRef,
      where('domain', '==', domain),
      where('lastActive', '>', oneDayAgo)
    );
    
    const snapshot = await getDocs(q);
    const users = [];
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        ...userData,
        lastActive: userData.lastActive?.toDate() || new Date()
      });
    });
    
    activeUsers.set(users);
    
  } catch (error) {
    console.error('Error getting active users: ', error);
  }
}

// 채팅방 변경
export function changeChatRoom(roomId) {
  currentChatRoom.set(roomId);
}

/**
 * 익명 표시를 위한 마스킹 함수 (이메일 사용 안 함)
 * @param {string} email 이메일 주소 (더 이상 사용 안 함)
 * @param {string} currentUserEmail 현재 로그인한 사용자의 이메일 (더 이상 사용 안 함)
 * @param {string} uid 사용자 UID
 * @returns {string} 마스킹된 사용자명 
 */
export function maskEmail(email, currentUserEmail, uid = null) {
  // 자기 자신인 경우
  if (email === currentUserEmail) {
    return '나';
  }
  
  // 익명 처리
  return '익명';
}

// 새로운 닉네임 기반 사용자 표시 함수
/**
 * 닉네임 기반 사용자 표시 함수
 * @param {string} uid 사용자 UID
 * @param {string} currentUserUid 현재 사용자 UID
 * @returns {string} 표시할 이름
 */
export function getDisplayName(uid, currentUserUid) {
  if (!uid) return '익명';
  
  if (uid === currentUserUid) {
    return '나';
  }
  
  return getUserNickname(uid);
}

// 댓글 컴포넌트에서 닉네임 표시를 위한 함수 추가
/**
 * 사용자의 닉네임 가져오기
 * @param {string} uid 사용자 UID
 * @returns {Promise<string>} 닉네임
 */
export async function getUserNickname(uid) {
  if (!uid) return '익명';
  
  try {
    const userProfileRef = doc(db, 'userProfiles', uid);
    const userProfileDoc = await getDoc(userProfileRef);
    
    if (userProfileDoc.exists()) {
      return userProfileDoc.data().nickname || '익명';
    } else {
      return '익명';
    }
  } catch (error) {
    console.error('닉네임을 가져오는 중 오류가 발생했습니다:', error);
    return '익명';
  }
}

// 채팅방 목록 가져오기
export async function getChatRooms() {
  try {
    const currentUser = get(user);
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const domain = currentUser.email.split('@')[1];
    if (!domain) {
      throw new Error('유효한 회사 도메인이 아닙니다.');
    }
    
    // 도메인별 채팅방 컬렉션 경로: 'domains/{domain}/chatRooms'
    const roomsRef = collection(db, 'domains', domain, 'chatRooms');
    const snapshot = await getDocs(roomsRef);
    
    const rooms = [];
    snapshot.forEach((doc) => {
      rooms.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // 기본 채팅방이 없는 경우 기본 채팅방 생성
    if (rooms.length === 0) {
      const defaultRooms = [
        { id: 'general', name: '일반' },
        { id: 'random', name: '잡담' },
        { id: 'work', name: '업무' },
        { id: 'help', name: '도움요청' }
      ];
      
      // 기본 채팅방 생성
      for (const room of defaultRooms) {
        const roomRef = doc(db, 'domains', domain, 'chatRooms', room.id);
        await setDoc(roomRef, {
          name: room.name,
          createdAt: serverTimestamp()
        });
      }
      
      return defaultRooms;
    }
    
    return rooms;
  } catch (error) {
    console.error('채팅방 목록을 가져오는 중 오류가 발생했습니다:', error);
    return [
      { id: 'general', name: '일반' },
      { id: 'random', name: '잡담' },
      { id: 'work', name: '업무' },
      { id: 'help', name: '도움요청' }
    ];
  }
}

// 새 채팅방 생성
export async function createChatRoom(roomId, roomName) {
  try {
    const currentUser = get(user);
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const domain = currentUser.email.split('@')[1];
    if (!domain) {
      throw new Error('유효한 회사 도메인이 아닙니다.');
    }
    
    // 도메인별 채팅방 컬렉션 경로: 'domains/{domain}/chatRooms'
    const roomRef = doc(db, 'domains', domain, 'chatRooms', roomId);
    
    await setDoc(roomRef, {
      name: roomName,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });
    
    return true;
  } catch (error) {
    console.error('채팅방 생성 중 오류가 발생했습니다:', error);
    return false;
  }
} 