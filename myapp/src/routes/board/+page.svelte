<script>
  import { onMount, onDestroy } from 'svelte';
  import { user, db } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import { collection, getDocs, getDoc, doc, updateDoc, arrayUnion, arrayRemove, query, where, orderBy } from 'firebase/firestore';
  import { chatMessages, sendMessage, subscribeToMessages, currentChatRoom, maskEmail } from '$lib/chat';
  import { getUserNickname } from '$lib/chat';

  let posts = [];
  let isLoading = true;
  let loadError = null;
  let currentUser = null;
  let newMessage = '';
  let unsubscribeChat;
  let postNicknames = {}; // 포스트 작성자 닉네임 저장용 객체
  
  // 로그인 상태 확인
  onMount(async () => {
    const unsubscribe = user.subscribe(value => {
      currentUser = value;
      
      // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
      if (!value) {
        goto('/login');
        return;
      }
      
      // 이메일 인증이 되지 않은 경우 경고를 표시하고 게시글을 불러오지 않음
      if (value && !value.emailVerified) {
        loadError = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
        isLoading = false;
        return;
      }
      
      // 게시글 로드
      loadPosts();
      
      // 채팅 메시지 구독
      unsubscribeChat = subscribeToMessages((messages) => {
        chatMessages.set(messages);
      }, 'general');
    });
    
    return () => {
      unsubscribe();
      if (unsubscribeChat) unsubscribeChat();
    };
  });

  onDestroy(() => {
    if (unsubscribeChat) unsubscribeChat();
  });
  
  // 게시글 로드
  async function loadPosts() {
    isLoading = true;
    loadError = null;
    
    try {
      // 현재 사용자의 도메인과 일치하는 게시글만 가져오기
      const userDomain = currentUser.email.split('@')[1];
      const q = query(
        collection(db, 'posts'),
        where('domain', '==', userDomain),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      posts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // likes가 배열이 아닌 경우 빈 배열로 초기화
        const likes = Array.isArray(data.likes) ? data.likes : [];
        
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          // 좋아요 수 계산
          likesCount: likes.length || 0,
          // 현재 사용자가 좋아요를 눌렀는지 확인
          isLiked: likes.includes(currentUser.uid) || false
        };
      });
      
      // 모든 게시글 작성자의 닉네임 가져오기
      await Promise.all(posts.map(async (post) => {
        if (post.uid) {
          postNicknames[post.uid] = await getUserNickname(post.uid);
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
  async function toggleLike(postId, isLiked) {
    try {
      const postRef = doc(db, 'posts', postId);
      
      // 좋아요 상태에 따라 좋아요 추가 또는 제거
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      });
      
      // 게시글 목록 업데이트
      posts = posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked: !isLiked,
            likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1
          };
        }
        return post;
      });
    } catch (error) {
      console.error('좋아요 처리 중 오류가 발생했습니다:', error);
      alert('좋아요 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }
  
  // 게시글 상세 페이지로 이동
  function viewPost(postId) {
    goto(`/board/post/${postId}`);
  }
  
  // 게시글 작성 페이지로 이동
  function createPost() {
    goto('/board/create');
  }
  
  // 채팅 메시지 전송
  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    
    if (await sendMessage(newMessage, 'general')) {
      newMessage = '';
    }
  }
  
  // 날짜 형식화
  function formatDate(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    
    // 24시간 이내
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 7일 이내
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()] + '요일';
    }
    
    // 그 외
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
</script>

<div class="min-h-screen bg-gray-100">
  <!-- 메인 컨텐츠 -->
  <main class="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
    <div class="flex flex-col md:flex-row gap-6">
      <!-- 왼쪽: 게시판 -->
      <div class="md:w-2/3 w-full">
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-4 py-5 border-b border-gray-200 flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-900">게시판</h2>
            {#if currentUser && currentUser.emailVerified}
              <button
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                on:click={createPost}
              >
                글 작성
              </button>
            {/if}
          </div>
          
          {#if isLoading}
            <div class="flex justify-center py-8">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          {:else if loadError}
            <div class="p-4 bg-red-50 text-red-800">
              <p>{loadError}</p>
            </div>
          {:else if posts.length === 0}
            <div class="py-8 text-center text-gray-500">
              <p>작성된 게시글이 없습니다.</p>
              <p class="mt-2">첫 번째 게시글을 작성해보세요!</p>
            </div>
          {:else}
            <ul class="divide-y divide-gray-200">
              {#each posts as post}
                <li class="p-4 hover:bg-gray-50 transition-colors">
                  <div class="flex justify-between items-start">
                    <div class="flex-1 min-w-0 cursor-pointer" on:click={() => viewPost(post.id)}>
                      <h3 class="text-base font-medium text-gray-900 truncate">{post.title}</h3>
                      <p class="mt-1 text-sm text-gray-500 line-clamp-2">{post.content}</p>
                      <div class="mt-2 flex items-center text-xs text-gray-500">
                        <span>
                          {#if post.uid === currentUser?.uid}
                            나
                          {:else if postNicknames[post.uid]}
                            {postNicknames[post.uid]}
                          {:else}
                            익명
                          {/if}
                        </span>
                        <span class="mx-1">•</span>
                        <span>{formatDate(post.createdAt)}</span>
                        {#if post.comments && post.comments.length > 0}
                          <span class="mx-1">•</span>
                          <span>댓글 {post.comments.length}개</span>
                        {/if}
                      </div>
                    </div>
                    <button
                      class="ml-4 flex items-center text-sm font-medium {post.isLiked ? 'text-red-600' : 'text-gray-400'}"
                      on:click={() => toggleLike(post.id, post.isLiked)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                      </svg>
                      <span>{post.likesCount}</span>
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
      
      <!-- 오른쪽: 채팅 -->
      <div class="md:w-1/3 w-full">
        <div class="bg-white shadow rounded-lg flex flex-col" style="height: calc(100vh - 180px);">
          <div class="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 class="text-lg font-semibold text-gray-900">채팅</h2>
          </div>
          
          <!-- 채팅 메시지 영역 -->
          <div class="p-4 flex-grow overflow-y-auto bg-gray-50">
            {#if $chatMessages.length === 0}
              <div class="flex flex-col items-center justify-center h-full text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each $chatMessages as message}
                  <div class="flex flex-col {message.authorUid === currentUser?.uid ? 'items-end' : 'items-start'}">
                    <div class="max-w-xs {message.authorUid === currentUser?.uid ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'} rounded-lg px-4 py-2">
                      <p class="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      <span>
                        {#if message.authorUid === currentUser?.uid}
                          나
                        {:else if message.nickname}
                          {message.nickname}
                        {:else}
                          {maskEmail(message.author, currentUser?.email)}
                        {/if}
                      </span>
                      <span class="mx-1">•</span>
                      <span>{new Date(message.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
          
          <!-- 메시지 입력 영역 -->
          <div class="p-4 border-t border-gray-200 flex-shrink-0">
            <form on:submit|preventDefault={handleSendMessage} class="flex space-x-2">
              <input
                type="text"
                bind:value={newMessage}
                class="flex-1 rounded-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="메시지를 입력하세요..."
              />
              <button
                type="submit"
                class="bg-indigo-600 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center"
                disabled={!newMessage.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</div> 