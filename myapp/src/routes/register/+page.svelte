<script>
  import { register } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import { sendEmailVerification } from '$lib/firebase';
  import { createInitialProfile } from '$lib/profile';
  
  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  let success = '';
  
  async function handleRegister() {
    error = '';
    success = '';
    
    // 입력값 검증
    if (!email || !password || !confirmPassword) {
      error = '모든 필드를 입력해주세요.';
      return;
    }
    
    if (password !== confirmPassword) {
      error = '비밀번호가 일치하지 않습니다.';
      return;
    }
    
    if (password.length < 6) {
      error = '비밀번호는 최소 6자 이상이어야 합니다.';
      return;
    }
    
    // 이메일 도메인 검증
    const emailDomain = email.split('@')[1];
    if (!emailDomain) {
      error = '유효한 이메일 주소를 입력해주세요.';
      return;
    }
    
    loading = true;
    
    try {
      const result = await register(email, password, emailDomain);
      
      if (!result.success) {
        error = result.message || '회원가입 중 오류가 발생했습니다.';
        return;
      }
      
      // 프로필 생성은 register 함수가 성공한 후에 수행
      try {
        if (result.user && result.user.uid) {
          await createInitialProfile(result.user.uid, email);
        }
      } catch (profileError) {
        console.error('프로필 생성 중 오류가 발생했습니다:', profileError);
        // 프로필 생성 실패해도 회원가입은 성공한 것으로 처리
      }
      
      success = '회원가입이 완료되었습니다. 이메일 인증을 완료해주세요.';
      // 5초 후 이메일 인증 안내 페이지로 이동
      setTimeout(() => {
        goto('/register/verify-email');
      }, 5000);
    } catch (err) {
      console.error('회원가입 중 오류가 발생했습니다:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        error = '이미 사용 중인 이메일 주소입니다.';
      } else if (err.code === 'auth/invalid-email') {
        error = '유효하지 않은 이메일 주소입니다.';
      } else if (err.code === 'auth/weak-password') {
        error = '비밀번호는 최소 6자 이상이어야 합니다.';
      } else {
        error = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-100">
  <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
    <h1 class="text-2xl font-bold mb-6 text-center">회원가입</h1>
    
    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <span class="block sm:inline">{error}</span>
      </div>
    {/if}
    
    {#if success}
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
        <span class="block sm:inline">{success}</span>
        <p class="mt-2">잠시 후 이메일 인증 안내 페이지로 이동합니다...</p>
      </div>
    {/if}
    
    <form on:submit|preventDefault={handleRegister} class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="회사 이메일 입력"
          required
        />
        <p class="text-xs text-gray-500 mt-1">회사 이메일을 사용하여 가입해주세요.</p>
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="비밀번호 (6자 이상)"
          minlength="6"
          required
        />
      </div>
      
      <div>
        <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
        <input
          type="password"
          id="confirm-password"
          bind:value={confirmPassword}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="비밀번호 확인"
          required
        />
      </div>
      
      <button
        type="submit"
        class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '처리 중...' : '회원가입'}
      </button>
    </form>
    
    <div class="mt-6 text-center">
      <p class="text-sm text-gray-600">
        이미 계정이 있으신가요? <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">로그인</a>
      </p>
    </div>
  </div>
</div> 