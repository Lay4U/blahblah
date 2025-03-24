<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user, db } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import { doc, getDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
  
  let currentUser = null;
  let post = null;
  let comments = [];
  let newComment = '';
  let loading = true;
  let commentLoading = false;
  let error = null;
  
  // 로그인 상태 확인
  onMount(() => {
    const unsubscribe = user.subscribe(value => {
      currentUser = value;
      
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      if (!value) {
        goto('/login');
        return;
      }
      
      // 이메일 인증이 되지 않은 경우 로그인 페이지로 리다이렉트
      if (value && !value.emailVerified) {
        goto('/login');
        return;
      }
      
      // 게시글 및 댓글 로드
      loadPost();
    });
    
    return unsubscribe;
  });
  
  async function loadPost() {
    const postId = $page.params.id;
    
    if (!postId) {
      error = '게시글을 찾을 수 없습니다.';
      loading = false;
      return;
    }
    
    try {
      // 게시글 정보 가져오기
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        error = '게시글을 찾을 수 없습니다.';
        loading = false;
        return;
      }
      
      post = { id: postSnap.id, ...postSnap.data() };
      
      // 댓글 가져오기
      await loadComments();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  // 댓글 가져오기
  async function loadComments() {
    try {
      const commentsRef = collection(db, "posts", post.id, "comments");
      const q = query(commentsRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      
      const commentsData = [];
      querySnapshot.forEach((doc) => {
        commentsData.push({ id: doc.id, ...doc.data() });
      });
      
      comments = commentsData;
    } catch (err) {
      console.error('댓글 로드 중 오류 발생:', err);
    }
  }
  
  // 댓글 작성
  async function submitComment() {
    if (!newComment.trim()) return;
    
    commentLoading = true;
    
    try {
      const commentsRef = collection(db, "posts", post.id, "comments");
      await addDoc(commentsRef, {
        content: newComment,
        authorId: currentUser.uid,
        createdAt: new Date()
      });
      
      // 댓글 카운트 업데이트 필요 (실제 구현 시)
      
      // 댓글 초기화 및 새로고침
      newComment = '';
      await loadComments();
    } catch (err) {
      console.error('댓글 작성 중 오류 발생:', err);
    } finally {
      commentLoading = false;
    }
  }
  
  // 게시글 삭제
  async function deletePost() {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) return;
    
    try {
      // 현재 사용자가 작성자인지 확인 (실제로는 더 복잡한 권한 확인 로직이 필요)
      if (post.authorId === currentUser.uid) {
        await deleteDoc(doc(db, "posts", post.id));
        goto('/board');
      } else {
        alert('삭제 권한이 없습니다.');
      }
    } catch (err) {
      console.error('게시글 삭제 중 오류 발생:', err);
    }
  }
  
  // 날짜 포맷팅
  function formatDate(date) {
    if (!date) return '';
    
    if (typeof date === 'string') {
      date = new Date(date);
    } else if (date.toDate) {
      date = date.toDate(); // Firestore Timestamp 객체인 경우
    }
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="min-h-screen bg-gray-100">
  <!-- 메인 컨텐츠 -->
  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 sm:px-0">
      <div class="mb-6">
        <a href="/board" class="text-indigo-600 hover:text-indigo-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          게시판으로 돌아가기
        </a>
      </div>
      
      {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span class="block sm:inline">{error}</span>
        </div>
      {/if}
      
      {#if loading}
        <div class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      {:else if post}
        <!-- 게시글 상세 -->
        <div class="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div class="p-6">
            <div class="flex justify-between items-start">
              <h1 class="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
              
              {#if currentUser && post.authorId === currentUser.uid}
                <div class="flex space-x-2">
                  <a href="/board/edit/{post.id}" class="text-gray-600 hover:text-indigo-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </a>
                  <button on:click={deletePost} class="text-gray-600 hover:text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              {/if}
            </div>
            
            <div class="text-sm text-gray-500 mb-4">
              <span>익명</span>
              <span class="mx-2">•</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
            
            <div class="prose max-w-none mb-6">
              <p class="whitespace-pre-line">{post.content}</p>
            </div>
            
            <div class="flex items-center justify-end text-sm text-gray-500">
              <div class="flex items-center">
                <button class="flex items-center space-x-1 text-gray-500 hover:text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{post.likes || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 댓글 섹션 -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">댓글 {comments.length}개</h2>
            
            <!-- 댓글 작성 -->
            <div class="mb-6">
              <form on:submit|preventDefault={submitComment} class="flex items-start space-x-3">
                <div class="min-w-0 flex-1">
                  <textarea
                    id="comment"
                    bind:value={newComment}
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="댓글을 작성해주세요."
                    required
                  ></textarea>
                </div>
                <button
                  type="submit"
                  class="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  disabled={commentLoading}
                >
                  {commentLoading ? '작성 중...' : '작성'}
                </button>
              </form>
            </div>
            
            <!-- 댓글 목록 -->
            {#if comments.length === 0}
              <div class="text-center text-gray-500 py-4">
                <p>아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each comments as comment}
                  <div class="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <div class="flex justify-between">
                      <div class="text-sm font-medium text-gray-900">익명</div>
                      <div class="text-sm text-gray-500">{formatDate(comment.createdAt)}</div>
                    </div>
                    <div class="mt-2 text-sm text-gray-700 whitespace-pre-line">
                      {comment.content}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </main>
</div> 