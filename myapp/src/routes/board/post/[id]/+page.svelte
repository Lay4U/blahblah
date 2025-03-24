<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { user, db } from '$lib/firebase';
  import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, serverTimestamp } from 'firebase/firestore';
  import { getUserNickname } from '$lib/chat';

  let currentUser = null;
  let post = null;
  let isLoading = true;
  let loadError = null;
  let newComment = '';
  let isSubmittingComment = false;
  let isDeletingPost = false;
  let authorNickname = '';
  let commentNicknames = {}; // 댓글 작성자 닉네임 저장용 객체
  
  // 로그인 상태 확인
  onMount(async () => {
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
      
      // 게시글 로드
      if (value) {
        loadPost();
      }
    });
    
    return unsubscribe;
  });
  
  // 게시글 로드
  async function loadPost() {
    isLoading = true;
    loadError = null;
    
    try {
      const postId = $page.params.id;
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        loadError = '게시글을 찾을 수 없습니다.';
        return;
      }
      
      const postData = postSnap.data();
      // likes가 배열이 아닌 경우 빈 배열로 초기화
      const likes = Array.isArray(postData.likes) ? postData.likes : [];
      
      post = {
        id: postSnap.id,
        ...postData,
        createdAt: postData.createdAt?.toDate() || new Date(),
        updatedAt: postData.updatedAt?.toDate() || new Date(),
        // 좋아요 수 계산
        likesCount: likes.length || 0,
        // 현재 사용자가 좋아요를 눌렀는지 확인
        isLiked: likes.includes(currentUser.uid) || false,
        // 댓글 정보 추가
        comments: postData.comments || [],
        // 현재 사용자가 작성자인지 확인
        isAuthor: postData.uid === currentUser.uid
      };
      
      // 소속 확인 (같은 도메인만 접근 가능)
      const userDomain = currentUser.email.split('@')[1];
      if (post.domain !== userDomain) {
        loadError = '이 게시글에 접근할 수 없습니다.';
        post = null;
        return;
      }
      
      // 작성자 닉네임 가져오기
      if (post.uid) {
        authorNickname = await getUserNickname(post.uid);
      }
      
      // 모든 댓글 작성자의 닉네임 가져오기
      await Promise.all((post.comments || []).map(async (comment) => {
        if (comment.uid) {
          commentNicknames[comment.uid] = await getUserNickname(comment.uid);
        }
      }));
      
    } catch (error) {
      console.error('게시글을 불러오는 중 오류가 발생했습니다:', error);
      loadError = '게시글을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.';
    } finally {
      isLoading = false;
    }
  }
  
  // 좋아요 토글
  async function toggleLike() {
    if (!post || !currentUser) return;
    
    try {
      const postRef = doc(db, 'posts', post.id);
      
      // 좋아요 상태에 따라 좋아요 추가 또는 제거
      await updateDoc(postRef, {
        likes: post.isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
      
      // 게시글 정보 업데이트
      post = {
        ...post,
        isLiked: !post.isLiked,
        likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
      };
    } catch (error) {
      console.error('좋아요 처리 중 오류가 발생했습니다:', error);
      alert('좋아요 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
  
  // 댓글 작성
  async function submitComment() {
    if (!newComment.trim() || !post || !currentUser) return;
    
    isSubmittingComment = true;
    
    try {
      const postRef = doc(db, 'posts', post.id);
      
      // 새 댓글 객체 생성
      const newCommentObj = {
        id: Date.now().toString(),
        content: newComment.trim(),
        author: currentUser.email,
        uid: currentUser.uid,
        createdAt: new Date().toISOString()
      };
      
      // 댓글 배열에 새 댓글 추가
      const updatedComments = [...post.comments, newCommentObj];
      
      // Firestore 업데이트
      await updateDoc(postRef, {
        comments: updatedComments
      });
      
      // 로컬 상태 업데이트
      post = {
        ...post,
        comments: updatedComments
      };
      
      // 입력 필드 초기화
      newComment = '';
      
    } catch (error) {
      console.error('댓글 작성 중 오류가 발생했습니다:', error);
      alert('댓글 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      isSubmittingComment = false;
    }
  }
  
  // 댓글 삭제
  async function deleteComment(commentId) {
    if (!post || !currentUser) return;
    
    try {
      const postRef = doc(db, 'posts', post.id);
      
      // 삭제할 댓글 찾기
      const commentToDelete = post.comments.find(comment => comment.id === commentId);
      
      // 댓글 작성자만 삭제 가능
      if (commentToDelete.uid !== currentUser.uid) {
        alert('자신이 작성한 댓글만 삭제할 수 있습니다.');
        return;
      }
      
      // 댓글 필터링
      const updatedComments = post.comments.filter(comment => comment.id !== commentId);
      
      // Firestore 업데이트
      await updateDoc(postRef, {
        comments: updatedComments
      });
      
      // 로컬 상태 업데이트
      post = {
        ...post,
        comments: updatedComments
      };
      
    } catch (error) {
      console.error('댓글 삭제 중 오류가 발생했습니다:', error);
      alert('댓글 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
  
  // 게시글 삭제
  async function deletePost() {
    if (!post || !currentUser) return;
    
    // 작성자만 삭제 가능
    if (post.uid !== currentUser.uid) {
      alert('자신이 작성한 게시글만 삭제할 수 있습니다.');
      return;
    }
    
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }
    
    isDeletingPost = true;
    
    try {
      const postRef = doc(db, 'posts', post.id);
      
      // Firestore에서 게시글 삭제
      await deleteDoc(postRef);
      
      // 게시판으로 이동
      goto('/board');
      
    } catch (error) {
      console.error('게시글 삭제 중 오류가 발생했습니다:', error);
      alert('게시글 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
      isDeletingPost = false;
    }
  }
  
  // 날짜 형식화
  function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // 마크다운 포맷팅
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
    <!-- 뒤로 가기 링크 -->
    <div class="mb-4">
      <a href="/board" class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        게시판으로 돌아가기
      </a>
    </div>
    
    {#if isLoading}
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    {:else if loadError}
      <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{loadError}</p>
          </div>
        </div>
      </div>
    {:else if post}
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <!-- 게시글 헤더 -->
        <div class="px-6 py-5 border-b border-gray-200">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-2xl font-semibold text-gray-900">{post.title}</h1>
              <div class="mt-2 flex items-center text-sm text-gray-500">
                <span>
                  {#if post.uid === currentUser?.uid}
                    나 (작성자)
                  {:else if authorNickname}
                    {authorNickname}
                  {:else}
                    익명
                  {/if}
                </span>
                <span class="mx-2">•</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <button
                class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                on:click={toggleLike}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 {post.isLiked ? 'text-red-600' : 'text-gray-400'}" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                </svg>
                <span>{post.likesCount}</span>
              </button>
              
              {#if post.isAuthor}
                <button
                  class="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  on:click={deletePost}
                  disabled={isDeletingPost}
                >
                  {#if isDeletingPost}
                    <div class="mr-1 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    삭제 중...
                  {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    삭제
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </div>
        
        <!-- 게시글 내용 -->
        <div class="px-6 py-5 border-b border-gray-200">
          <div class="prose max-w-none">
            {@html formatContent(post.content)}
          </div>
        </div>
        
        <!-- 댓글 섹션 -->
        <div class="px-6 py-5">
          <h2 class="text-lg font-medium text-gray-900 mb-4">댓글 {post.comments.length}개</h2>
          
          <!-- 댓글 입력 -->
          <div class="mb-6">
            <form on:submit|preventDefault={submitComment} class="flex space-x-3">
              <input
                type="text"
                bind:value={newComment}
                placeholder="댓글을 입력하세요"
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button
                type="submit"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={isSubmittingComment || !newComment.trim()}
              >
                {#if isSubmittingComment}
                  <div class="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  저장 중...
                {:else}
                  등록
                {/if}
              </button>
            </form>
          </div>
          
          <!-- 댓글 목록 -->
          {#if post.comments.length === 0}
            <div class="text-center py-6 text-gray-500">
              <p>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each post.comments as comment}
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="flex justify-between items-start">
                    <div>
                      <div class="font-medium text-gray-900">
                        {#if comment.uid === currentUser?.uid}
                          나
                        {:else if commentNicknames[comment.uid]}
                          {commentNicknames[comment.uid]}
                        {:else if comment.author}
                          {comment.author}
                        {:else}
                          익명
                        {/if}
                      </div>
                      <div class="text-sm text-gray-500">{formatDate(comment.createdAt)}</div>
                    </div>
                    
                    {#if comment.uid === currentUser?.uid}
                      <button
                        class="text-gray-400 hover:text-red-600"
                        on:click={() => deleteComment(comment.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    {/if}
                  </div>
                  <div class="mt-2 text-gray-800">
                    <p class="whitespace-pre-line">{comment.content}</p>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </main>
</div> 