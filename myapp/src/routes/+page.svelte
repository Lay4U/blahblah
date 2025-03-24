<script>
  import { onMount } from 'svelte';
  import { user, logout } from '$lib/firebase';
  import { goto } from '$app/navigation';
  
  let currentUser = null;

  // 로그인 상태 확인
  onMount(() => {
    const unsubscribe = user.subscribe(value => {
      currentUser = value;
      
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      if (!value) {
        goto('/login');
      }
      
      // 이메일 인증이 되지 않은 경우 로그아웃 처리
      if (value && !value.emailVerified) {
        handleLogout();
        goto('/login');
      }
    });
    
    return unsubscribe;
  });
  
  async function handleLogout() {
    await logout();
    goto('/login');
  }

  function navigateToBoard() {
    goto('/board');
  }
  
  function navigateToChat() {
    goto('/chat');
  }
</script>

<div class="min-h-screen bg-gray-100">
  <!-- 메인 컨텐츠 -->
  <main class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    <!-- 환영 섹션 -->
    <div class="text-center">
      <h1 class="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
        익명 커뮤니케이션 플랫폼
      </h1>
      <p class="mt-5 max-w-xl mx-auto text-xl text-gray-500">
        같은 회사 동료들과 익명으로 소통하세요. 이메일 도메인을 통해 사내 회원만 참여할 수 있습니다.
      </p>
      
      {#if currentUser?.emailVerified}
        <div class="mt-8 flex justify-center gap-4">
          <button
            on:click={navigateToBoard}
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            게시판으로 이동
          </button>
          <button
            on:click={navigateToChat}
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            채팅으로 이동
          </button>
        </div>
      {:else if currentUser}
        <div class="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md max-w-2xl mx-auto">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-yellow-800">이메일 인증 필요</h3>
              <div class="mt-2 text-sm text-yellow-700">
                <p>
                  이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인하고 인증 링크를 클릭해주세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="mt-8 flex justify-center gap-4">
          <a
            href="/login"
            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            로그인하기
          </a>
          <a
            href="/register"
            class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            회원가입하기
          </a>
        </div>
      {/if}
    </div>
    
    <!-- 기능 소개 -->
    <div class="mt-16">
      <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
        <!-- 익명 게시판 -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div class="ml-4">
                <h2 class="text-lg font-medium text-gray-900">익명 게시판</h2>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-base text-gray-500">
                회사 동료들과 익명으로 소통할 수 있는 게시판입니다. 
                실명 걱정 없이 자유롭게 의견을 나눌 수 있습니다.
              </p>
            </div>
          </div>
        </div>
        
        <!-- 실시간 채팅 -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div class="ml-4">
                <h2 class="text-lg font-medium text-gray-900">실시간 채팅</h2>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-base text-gray-500">
                동료들과 빠르게 소통할 수 있는 실시간 채팅 기능입니다.
                여러 주제별 채팅방에서 익명으로 대화를 나눌 수 있습니다.
              </p>
            </div>
          </div>
        </div>
        
        <!-- 익명 프로필 -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-6">
            <div class="flex items-center">
              <div class="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg class="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div class="ml-4">
                <h2 class="text-lg font-medium text-gray-900">익명 프로필</h2>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-base text-gray-500">
                재미있는 닉네임으로 자신만의 캐릭터를 만들 수 있습니다.
                프로필은 익명으로 유지되며 닉네임은 언제든지 변경 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
