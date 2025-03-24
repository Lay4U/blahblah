<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user, db } from '$lib/firebase';
  import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

  let title = '';
  let content = '';
  let isSubmitting = false;
  let error = null;
  let currentUser = null;
  let showPreview = false;

  onMount(() => {
    const unsubscribe = user.subscribe(value => {
      currentUser = value;
      
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      if (!value) {
        goto('/login');
        return;
      }
      
      // 이메일 인증이 되지 않은 경우 게시판으로 리다이렉트
      if (value && !value.emailVerified) {
        goto('/board');
        return;
      }
    });
    
    return unsubscribe;
  });

  async function handleSubmit() {
    isSubmitting = true;
    error = null;
    
    try {
      if (!title.trim()) {
        throw new Error('제목을 입력해주세요.');
      }
      
      if (!content.trim()) {
        throw new Error('내용을 입력해주세요.');
      }
      
      if (!currentUser) {
        throw new Error('로그인이 필요합니다.');
      }
      
      // 게시글 데이터 구성
      const postData = {
        title: title.trim(),
        content: content.trim(),
        author: currentUser.email,
        uid: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        likes: [],
        domain: currentUser.email.split('@')[1]  // 이메일 도메인 저장
      };
      
      // Firestore에 게시글 추가
      const docRef = await addDoc(collection(db, 'posts'), postData);
      
      // 게시판 페이지로 리다이렉트
      goto('/board');
      
    } catch (err) {
      console.error('게시글 작성 중 오류 발생:', err);
      error = err.message;
    } finally {
      isSubmitting = false;
    }
  }
  
  function togglePreview() {
    showPreview = !showPreview;
  }
  
  function formatContent(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
</script>

<div class="min-h-screen bg-gray-100">
  <main class="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-4 py-5 border-b border-gray-200 flex justify-between items-center">
        <h1 class="text-lg font-semibold text-gray-900">게시글 작성</h1>
        <button
          on:click={togglePreview}
          class="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none"
        >
          {showPreview ? '작성 모드' : '미리 보기'}
        </button>
      </div>
      
      {#if error}
        <div class="p-4 bg-red-50 text-red-800">
          <p>{error}</p>
        </div>
      {/if}
      
      <div class="p-6">
        {#if !showPreview}
          <form on:submit|preventDefault={handleSubmit} class="space-y-6">
            <div>
              <label for="title" class="block text-sm font-medium text-gray-700">제목</label>
              <input
                type="text"
                id="title"
                bind:value={title}
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="제목을 입력하세요"
              />
            </div>
            
            <div>
              <label for="content" class="block text-sm font-medium text-gray-700">내용</label>
              <textarea
                id="content"
                bind:value={content}
                rows="15"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="내용을 입력하세요"
              ></textarea>
              <p class="mt-2 text-sm text-gray-500">
                마크다운 문법을 지원합니다: **굵게**, *기울임*, `코드`, ```코드 블록```
              </p>
            </div>
            
            <div class="flex justify-end space-x-3">
              <a
                href="/board"
                class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                취소
              </a>
              <button
                type="submit"
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {#if isSubmitting}
                  <div class="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  저장 중...
                {:else}
                  저장
                {/if}
              </button>
            </div>
          </form>
        {:else}
          <div class="space-y-6">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">{title || '(제목 없음)'}</h2>
            </div>
            
            <div class="prose max-w-none">
              {#if content}
                {@html formatContent(content)}
              {:else}
                <p class="text-gray-500">(내용 없음)</p>
              {/if}
            </div>
            
            <div class="flex justify-end space-x-3">
              <button
                on:click={togglePreview}
                class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                돌아가기
              </button>
              <button
                on:click={handleSubmit}
                class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {#if isSubmitting}
                  <div class="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  저장 중...
                {:else}
                  저장
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div> 