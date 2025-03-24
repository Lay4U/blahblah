import { db, user } from './firebase';
import { writable, get } from 'svelte/store';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

// 사용자 프로필 스토어
export const userProfile = writable(null);

// 한글 닉네임 생성을 위한 형용사와 명사 목록
const adjectives = ['귀여운', '멋진', '행복한', '똑똑한', '친절한', '용감한', '현명한', '재미있는', '활발한', '엉뚱한', 
                     '따뜻한', '즐거운', '상냥한', '씩씩한', '당당한', '화려한', '소심한', '착한', '열정적인', '조용한'];

const nouns = ['고양이', '강아지', '토끼', '사자', '호랑이', '판다', '여우', '코끼리', '원숭이', '기린',
               '하늘', '바다', '산', '구름', '별', '꽃', '나무', '숲', '달', '햇님',
               '학생', '선생님', '의사', '작가', '화가', '음악가', '과학자', '요리사', '배우', '운동선수'];

/**
 * 랜덤 한글 닉네임 생성
 * @returns {string} 생성된 닉네임
 */
export function generateRandomNickname() {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun}`;
}

/**
 * 닉네임 중복 확인 (userNicknames 컬렉션 활용)
 * @param {string} nickname 확인할 닉네임
 * @returns {Promise<boolean>} 중복 여부 (true: 중복, false: 사용 가능)
 */
export async function isNicknameExists(nickname) {
  if (!nickname.trim()) return false;
  
  try {
    // 1. 먼저 userNicknames 컬렉션에서 확인 (더 빠름)
    const nicknameRef = doc(db, 'userNicknames', nickname.trim());
    const nicknameDoc = await getDoc(nicknameRef);
    
    if (nicknameDoc.exists()) {
      // 자신의 닉네임인지 확인 (자기 자신의 닉네임은 중복으로 간주하지 않음)
      const currentUser = get(user);
      if (currentUser && nicknameDoc.data().uid === currentUser.uid) {
        return false;
      }
      return true;
    }
    
    // 2. 보완적으로 userProfiles에서도 확인 (이전 데이터나 동기화 문제를 위해)
    const userProfilesRef = collection(db, 'userProfiles');
    const q = query(userProfilesRef, where('nickname', '==', nickname.trim()));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // 자신의 닉네임인지 확인
      const currentUser = get(user);
      for (const doc of querySnapshot.docs) {
        if (currentUser && doc.id !== currentUser.uid) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('닉네임 중복 확인 중 오류가 발생했습니다:', error);
    return false;
  }
}

/**
 * 랜덤 한글 닉네임 생성 (고유성 보장)
 * @returns {Promise<string>} 생성된 닉네임
 */
export async function generateUniqueRandomNickname() {
  let nickname = generateRandomNickname();
  let attempts = 0;
  const maxAttempts = 10;
  
  // 최대 10번까지 시도하여 고유한 닉네임 생성
  while (await isNicknameExists(nickname) && attempts < maxAttempts) {
    nickname = generateRandomNickname();
    attempts++;
  }
  
  // 모든 시도 후에도 고유한 닉네임을 찾지 못한 경우 랜덤 숫자 추가
  if (await isNicknameExists(nickname)) {
    const randomSuffix = Math.floor(Math.random() * 10000);
    nickname = `${nickname}${randomSuffix}`;
  }
  
  return nickname;
}

/**
 * 닉네임 인덱스 업데이트 (userNicknames 컬렉션)
 * @param {string} uid 사용자 UID
 * @param {string} nickname 닉네임
 * @param {string|null} oldNickname 이전 닉네임 (수정 시)
 * @returns {Promise<boolean>} 성공 여부
 */
async function updateNicknameIndex(uid, nickname, oldNickname = null) {
  if (!nickname || !uid) return false;
  
  try {
    // 기존 닉네임이 있는지 확인하고 에러 처리
    if (oldNickname && oldNickname !== nickname) {
      try {
        const oldNicknameRef = doc(db, 'userNicknames', oldNickname);
        const oldDoc = await getDoc(oldNicknameRef);
        if (oldDoc.exists() && oldDoc.data().uid === uid) {
          await deleteDoc(oldNicknameRef);
        }
      } catch (err) {
        console.log('기존 닉네임 삭제 중 오류 발생 (무시됨):', err);
        // 무시하고 계속 진행
      }
    }
    
    // 새 닉네임 문서 생성
    try {
      const newNicknameRef = doc(db, 'userNicknames', nickname);
      const newDoc = await getDoc(newNicknameRef);
      
      // 이미 존재하고 다른 사용자의 것이면 생성하지 않음
      if (newDoc.exists() && newDoc.data().uid !== uid) {
        console.log('이미 사용 중인 닉네임입니다.');
        return false;
      }
      
      // 자신의 것이거나 존재하지 않으면 생성
      await setDoc(newNicknameRef, { 
        uid,
        nickname,
        createdAt: new Date().toISOString() 
      });
    } catch (err) {
      console.log('새 닉네임 생성 중 오류 발생 (무시됨):', err);
      // 무시하고 계속 진행
    }
    
    return true;
  } catch (error) {
    console.error('닉네임 인덱스 업데이트 중 오류가 발생했습니다:', error);
    return false;
  }
}

/**
 * 사용자 프로필 불러오기
 * @param {string} uid 사용자 UID
 * @returns {Promise<Object>} 프로필 정보
 */
export async function loadUserProfile(uid) {
  if (!uid) return null;
  
  try {
    const userRef = doc(db, 'userProfiles', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const profileData = userDoc.data();
      userProfile.set(profileData);
      return profileData;
    } else {
      // 프로필이 없는 경우 새로 생성
      const nickname = await generateUniqueRandomNickname();
      
      const newProfile = {
        uid,
        nickname,
        bio: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(userRef, newProfile);
      
      // 닉네임 인덱스 업데이트
      await updateNicknameIndex(uid, nickname);
      
      userProfile.set(newProfile);
      return newProfile;
    }
  } catch (error) {
    console.error('프로필을 불러오는 중 오류가 발생했습니다:', error);
    return null;
  }
}

/**
 * 사용자 프로필 업데이트
 * @param {Object} profileData 업데이트할 프로필 데이터
 * @returns {Promise<boolean>} 성공 여부
 */
export async function updateUserProfile(profileData) {
  const currentUser = get(user);
  if (!currentUser) return false;
  
  try {
    const userRef = doc(db, 'userProfiles', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('프로필이 존재하지 않습니다.');
      return false;
    }
    
    const currentProfile = userDoc.data();
    
    const updatedData = {
      ...profileData,
      updatedAt: new Date().toISOString()
    };
    
    // 닉네임이 변경되었는지 확인
    if (profileData.nickname && profileData.nickname !== currentProfile.nickname) {
      // 닉네임 중복 확인
      const isDuplicate = await isNicknameExists(profileData.nickname);
      if (isDuplicate) {
        console.error('이미 사용 중인 닉네임입니다.');
        return false;
      }
      
      // 닉네임 인덱스 업데이트
      await updateNicknameIndex(currentUser.uid, profileData.nickname, currentProfile.nickname);
    }
    
    await updateDoc(userRef, updatedData);
    
    // 스토어 업데이트
    userProfile.update(profile => ({
      ...profile,
      ...updatedData
    }));
    
    return true;
  } catch (error) {
    console.error('프로필을 업데이트하는 중 오류가 발생했습니다:', error);
    return false;
  }
}

/**
 * 닉네임 변경 (중복 검사 포함)
 * @param {string} newNickname 새 닉네임
 * @returns {Promise<Object>} 성공 여부와 메시지
 */
export async function changeNickname(newNickname) {
  if (!newNickname.trim()) return { success: false, message: '닉네임을 입력해주세요.' };
  
  try {
    // 현재 사용자 정보 가져오기
    const currentUser = get(user);
    if (!currentUser) return { success: false, message: '로그인이 필요합니다.' };
    
    // 현재 사용자의 닉네임 가져오기
    const userRef = doc(db, 'userProfiles', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().nickname === newNickname.trim()) {
      // 닉네임이 변경되지 않은 경우
      return { success: true, message: '닉네임이 유지되었습니다.' };
    }
    
    // 닉네임 중복 확인
    const isDuplicate = await isNicknameExists(newNickname);
    if (isDuplicate) {
      return { success: false, message: '이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.' };
    }
    
    // 중복이 아닌 경우 닉네임 변경
    const success = await updateUserProfile({ nickname: newNickname.trim() });
    return { success, message: success ? '닉네임이 변경되었습니다.' : '닉네임 변경에 실패했습니다.' };
  } catch (error) {
    console.error('닉네임 변경 중 오류가 발생했습니다:', error);
    return { success: false, message: '닉네임 변경 중 오류가 발생했습니다.' };
  }
}

/**
 * 새 사용자 등록 시 프로필 자동 생성
 * @param {string} uid 사용자 UID
 * @param {string} email 사용자 이메일
 * @returns {Promise<Object>} 생성된 프로필
 */
export async function createInitialProfile(uid, email) {
  if (!uid || !email) return null;
  
  try {
    const userRef = doc(db, 'userProfiles', uid);
    
    // 고유한 닉네임 생성
    const nickname = await generateUniqueRandomNickname();
    
    const newProfile = {
      uid,
      email,
      nickname,
      bio: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(userRef, newProfile);
    
    // 닉네임 인덱스 업데이트
    await updateNicknameIndex(uid, nickname);
    
    return newProfile;
  } catch (error) {
    console.error('초기 프로필을 생성하는 중 오류가 발생했습니다:', error);
    return null;
  }
} 