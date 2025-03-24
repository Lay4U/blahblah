<script>
  import { login, user } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  
  // 이미 로그인된 경우 홈으로 리다이렉트
  onMount(() => {
    const unsubscribe = user.subscribe(value => {
      if (value && value.emailVerified) {
        goto('/');
      }
    });
    
    return unsubscribe;
  });
  
  async function handleLogin() {
    error = '';
    
    if (!email || !password) {
      error = '이메일과 비밀번호를 입력해주세요.';
      return;
    }
    
    loading = true;
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        goto('/');
      } else {
        error = result.message;
      }
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-100">
  <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
    <h1 class="text-2xl font-bold mb-6 text-center">로그인</h1>
    
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <span class="block sm:inline">{error}</span>
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleLogin} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="company@example.com"
          required
        />
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="비밀번호"
          required
        />
      </div>
      
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label for="remember-me" class="ml-2 block text-sm text-gray-900">
            로그인 상태 유지
          </label>
        </div>
        
        <div class="text-sm">
          <a href="/forgot-password" class="font-medium text-indigo-600 hover:text-indigo-500">
            비밀번호를 잊으셨나요?
          </a>
        </div>
      </div>
      
      <button
        type="submit"
        class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
    
    <div class="mt-6 text-center">
      <p class="text-sm text-gray-600">
        계정이 없으신가요? <a href="/register" class="font-medium text-indigo-600 hover:text-indigo-500">회원가입</a>
      </p>
    </div>
  </div>
</div> 