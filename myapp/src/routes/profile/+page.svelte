<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import {
    userProfile,
    loadUserProfile,
    updateUserProfile,
    changeNickname,
    generateRandomNickname,
    generateUniqueRandomNickname,
    isNicknameExists
  } from '$lib/profile';

  let currentUser = null;
  let profile = null;
  let isLoading = true;
  let isSaving = false;
  let errorMessage = null;
  let successMessage = null;
  let nicknameStatus = { checking: false, available: true, message: '' };

  // 편집 가능한 프로필 정보
  let editableNickname = '';
  let editableBio = '';

  // 로그인 상태 확인
  onMount(async () => {
    const unsubscribe = user.subscribe(async (value) => {
      currentUser = value;

      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      if (!value) {
        goto('/login');
        return;
      }

      // 프로필 정보 불러오기
      isLoading = true;
      errorMessage = null;

      try {
        profile = await loadUserProfile(value.uid);

        // 편집 가능한 필드 초기화
        if (profile) {
          editableNickname = profile.nickname || '';
          editableBio = profile.bio || '';
        }
      } catch (error) {
        console.error('프로필 정보를 불러오는 중 오류가 발생했습니다:', error);
        errorMessage = '프로필 정보를 불러오는 중 오류가 발생했습니다.';
      } finally {
        isLoading = false;
      }
    });

    // 프로필 스토어 구독
    const profileUnsubscribe = userProfile.subscribe(value => {
      profile = value;
      
      if (profile) {
        editableNickname = profile.nickname || '';
        editableBio = profile.bio || '';
      }
    });

    return () => {
      unsubscribe();
      profileUnsubscribe();
    };
  });

  // 닉네임 실시간 중복 확인
  async function checkNicknameAvailability() {
    if (!editableNickname.trim()) {
      nicknameStatus = { checking: false, available: false, message: '닉네임을 입력해주세요.' };
      return;
    }

    // 닉네임이 이전과 동일한 경우 체크 불필요
    if (profile && editableNickname.trim() === profile.nickname) {
      nicknameStatus = { checking: false, available: true, message: '' };
      return;
    }

    nicknameStatus = { checking: true, available: false, message: '확인 중...' };
    
    try {
      const isDuplicate = await isNicknameExists(editableNickname);
      
      if (isDuplicate) {
        nicknameStatus = { checking: false, available: false, message: '이미 사용 중인 닉네임입니다.' };
      } else {
        nicknameStatus = { checking: false, available: true, message: '사용 가능한 닉네임입니다.' };
      }
    } catch (error) {
      nicknameStatus = { checking: false, available: false, message: '확인 중 오류가 발생했습니다.' };
    }
  }

  // 프로필 업데이트
  async function handleUpdateProfile() {
    if (!currentUser) return;

    isSaving = true;
    errorMessage = null;
    successMessage = null;

    try {
      // 닉네임이 사용 가능한지 마지막으로 확인
      if (editableNickname !== profile.nickname) {
        const isDuplicate = await isNicknameExists(editableNickname);
        if (isDuplicate) {
          errorMessage = '이미 사용 중인 닉네임입니다. 다른 닉네임을 선택해주세요.';
          isSaving = false;
          return;
        }
      }
      
      // 닉네임 변경 처리
      const nicknameResult = await changeNickname(editableNickname);
      if (!nicknameResult.success) {
        errorMessage = nicknameResult.message;
        isSaving = false;
        return;
      }

      // 자기소개 등 나머지 정보 업데이트
      const success = await updateUserProfile({
        bio: editableBio
      });

      if (success) {
        successMessage = nicknameResult.message || '프로필이 업데이트되었습니다';
        setTimeout(() => {
          successMessage = null;
        }, 3000);
      } else {
        errorMessage = '프로필을 업데이트하는 중 오류가 발생했습니다.';
      }
    } catch (error) {
      console.error('프로필을 업데이트하는 중 오류가 발생했습니다:', error);
      errorMessage = '프로필을 업데이트하는 중 오류가 발생했습니다.';
    } finally {
      isSaving = false;
    }
  }

  // 랜덤 닉네임 생성
  async function generateNewRandomNickname() {
    editableNickname = await generateUniqueRandomNickname();
    nicknameStatus = { checking: false, available: true, message: '사용 가능한 닉네임입니다.' };
  }
</script>

<div class="min-h-screen bg-gray-100">
  <main class="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
    <div class="bg-white shadow rounded-lg overflow-hidden max-w-2xl mx-auto">
      <div class="px-6 py-5 border-b border-gray-200">
        <h1 class="text-2xl font-semibold text-gray-900">내 프로필</h1>
      </div>

      {#if isLoading}
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      {:else if errorMessage}
        <div class="p-6 bg-red-50 text-red-800">
          <p>{errorMessage}</p>
        </div>
      {:else if profile}
        <div class="p-6">
          {#if successMessage}
            <div class="mb-6 p-4 bg-green-50 text-green-800 rounded-md">
              <p>{successMessage}</p>
            </div>
          {/if}

          <form on:submit|preventDefault={handleUpdateProfile}>
            <!-- 사용자 기본 정보 -->
            <div class="mb-6 border-b border-gray-200 pb-6">
              <h2 class="text-lg font-medium text-gray-900 mb-4">기본 정보</h2>

              <div class="flex items-center mb-4">
                <div class="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-800 mr-4">
                  {currentUser?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p class="text-sm text-gray-500">이메일</p>
                  <p class="font-medium">{currentUser?.email || ''}</p>
                </div>
              </div>
            </div>

            <!-- 닉네임 섹션 -->
            <div class="mb-6">
              <div class="flex justify-between items-center mb-2">
                <label for="nickname" class="block text-sm font-medium text-gray-700">닉네임</label>  
                <button
                  type="button"
                  class="text-sm text-indigo-600 hover:text-indigo-800"
                  on:click={generateNewRandomNickname}
                >
                  랜덤 닉네임 생성
                </button>
              </div>
              <div class="flex space-x-2">
                <input
                  id="nickname"
                  type="text"
                  bind:value={editableNickname}
                  on:input={checkNicknameAvailability}
                  on:blur={checkNicknameAvailability}
                  class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="닉네임을 입력하세요"
                  required
                />
              </div>
              {#if nicknameStatus.message}
                <p class="mt-1 text-sm {nicknameStatus.available ? 'text-green-600' : 'text-red-600'}">{nicknameStatus.message}</p>
              {:else}
                <p class="mt-1 text-sm text-gray-500">다른 사용자에게 표시되는 이름입니다.</p>      
              {/if}
            </div>

            <!-- 자기소개 섹션 -->
            <div class="mb-6">
              <label for="bio" class="block text-sm font-medium text-gray-700 mb-2">자기소개</label>
              <textarea
                id="bio"
                bind:value={editableBio}
                rows="4"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="자기소개를 입력하세요 (선택사항)"
              ></textarea>
            </div>

            <!-- 저장 버튼 -->
            <div class="flex justify-end">
              <button
                type="submit"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={isSaving || (!nicknameStatus.available && editableNickname !== profile.nickname)}
              >
                {#if isSaving}
                  <div class="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  저장 중...
                {:else}
                  변경사항 저장
                {/if}
              </button>
            </div>
          </form>
        </div>
      {/if}
    </div>
  </main>
</div>