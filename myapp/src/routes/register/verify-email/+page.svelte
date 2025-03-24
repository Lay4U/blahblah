<script>
  import { onMount } from 'svelte';
  import { user, sendEmailVerification, logout } from '$lib/firebase';
  import { goto } from '$app/navigation';
  
  let currentUser = null;
  let isLoading = false;
  let message = '';
  let errorMessage = '';
  
  onMount(() => {
    const unsubscribe = user.subscribe(value => {
      currentUser = value;
      
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      if (!value) {
        goto('/login');
        return;
      }
      
      // 이미 이메일 인증이 완료된 경우 홈페이지로 리다이렉트
      if (value && value.emailVerified) {
        goto('/');
        return;
      }
    });
    
    return unsubscribe;
  });
  
  // 이메일 인증 메일 재발송
  async function handleResendVerification() {
    errorMessage = '';
    isLoading = true;
    
    try {
      await sendEmailVerification();
      message = '인증 이메일이 재발송되었습니다. 이메일을 확인해주세요.';
    } catch (err) {
      console.error('이메일 인증 메일 재발송 중 오류가 발생했습니다:', err);
      
      if (err.code === 'auth/too-many-requests') {
        errorMessage = '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.';
      } else {
        errorMessage = '인증 이메일 재발송 중 오류가 발생했습니다. 다시 시도해주세요.';
      }
    } finally {
      isLoading = false;
    }
  }
  
  // 로그아웃
  async function handleLogout() {
    try {
      await logout();
      goto('/login');
    } catch (error) {
      console.error('로그아웃 중 오류가 발생했습니다:', error);
      errorMessage = '로그아웃 중 오류가 발생했습니다.';
    }
  }
  
  // 메일 확인 후 로그인 페이지로 이동
  function goToLogin() {
    goto('/login');
  }
</script>

<div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">이메일 인증</h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      계정 활성화를 위해 이메일 인증이 필요합니다.
    </p>
  </div>
  
  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      <div class="rounded-md bg-blue-50 p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3 flex-1 md:flex md:justify-between">
            <p class="text-sm text-blue-700">
              {currentUser?.email} 주소로 인증 메일이 발송되었습니다. 메일함을 확인하고 인증 링크를 클릭해주세요.
            </p>
          </div>
        </div>
      </div>
      
      {#if message}
        <div class="rounded-md bg-green-50 p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-800">{message}</p>
            </div>
          </div>
        </div>
      {/if}
      
      {#if errorMessage}
        <div class="rounded-md bg-red-50 p-4 mb-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      {/if}
      
      <div class="space-y-4">
        <div class="text-sm mb-6">
          <p class="mb-2">이메일 인증을 완료하려면:</p>
          <ol class="list-decimal list-inside space-y-2 text-gray-600">
            <li>메일함에서 인증 메일을 확인하세요.</li>
            <li>메일에 포함된 인증 링크를 클릭하세요.</li>
            <li>인증이 완료되면 아래 '로그인하기' 버튼을 클릭하세요.</li>
          </ol>
        </div>
        
        <div class="flex items-center justify-between space-x-4">
          <button
            type="button"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            on:click={handleResendVerification}
            disabled={isLoading}
          >
            {#if isLoading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              처리 중...
            {:else}
              인증 메일 재발송
            {/if}
          </button>
          
          <button
            type="button"
            class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            on:click={goToLogin}
          >
            로그인하기
          </button>
        </div>
        
        <div class="text-center mt-4">
          <button 
            class="text-sm text-gray-600 hover:text-indigo-500" 
            on:click={handleLogout}
          >
            다른 계정으로 로그인하기
          </button>
        </div>
      </div>
    </div>
  </div>
</div> 