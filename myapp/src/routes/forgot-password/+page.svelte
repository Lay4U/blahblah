<script>
  import { sendPasswordResetEmail } from 'firebase/auth';
  import { auth } from '$lib/firebase';
  import { goto } from '$app/navigation';
  
  let email = '';
  let isLoading = false;
  let message = '';
  let error = '';
  
  async function handleResetPassword() {
    if (!email.trim()) {
      error = '이메일을 입력해주세요.';
      return;
    }
    
    error = '';
    message = '';
    isLoading = true;
    
    try {
      await sendPasswordResetEmail(auth, email);
      message = '비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요.';
      email = '';
    } catch (err) {
      console.error('비밀번호 재설정 이메일 전송 중 오류가 발생했습니다:', err);
      error = '비밀번호 재설정 이메일을 보내는 중 오류가 발생했습니다. 다시 시도해주세요.';
    } finally {
      isLoading = false;
    }
  }
  
  function handleBackToLogin() {
    goto('/login');
  }
</script>

<svelte:head>
  <title>비밀번호 찾기 - 게시판</title>
</svelte:head>

<div class="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
    <div>
      <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
        비밀번호 찾기
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        가입한 이메일 주소를 입력하면 비밀번호 재설정 이메일을 보내드립니다.
      </p>
    </div>
    
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleResetPassword}>
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">이메일 주소</label>
        <div class="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            bind:value={email}
            required
            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="이메일 주소를 입력하세요"
          />
        </div>
      </div>
      
      {#if message}
        <div class="rounded-md bg-green-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-green-800">
                {message}
              </p>
            </div>
          </div>
        </div>
      {/if}
      
      {#if error}
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-red-800">
                {error}
              </p>
            </div>
          </div>
        </div>
      {/if}
      
      <div class="flex items-center justify-between">
        <button
          type="button"
          on:click={handleBackToLogin}
          class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          로그인 페이지로 돌아가기
        </button>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isLoading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {#if isLoading}
            <span class="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            처리중...
          {:else}
            비밀번호 재설정 이메일 보내기
          {/if}
        </button>
      </div>
    </form>
  </div>
</div> 