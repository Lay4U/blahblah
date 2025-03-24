<script>
  import { onMount, onDestroy } from 'svelte';
  import { user } from '$lib/firebase';
  import { goto } from '$app/navigation';
  import { 
    chatMessages, 
    sendMessage, 
    subscribeToMessages, 
    currentChatRoom, 
    getActiveUsers, 
    activeUsers, 
    changeChatRoom,
    maskEmail,
    getDisplayName,
    getChatRooms,
    createChatRoom
  } from '$lib/chat';
  
  let currentUser = null;
  let newMessage = '';
  let unsubscribeChat;
  let isLoadingUsers = false;
  let newRoomName = '';
  let isCreatingRoom = false;
  let isLoadingRooms = false;
  
  // 채팅방 목록 (동적으로 로드됨)
  let chatRooms = [];
  
  // 로그인 상태 확인
  onMount(() => {
    const unsubscribe = user.subscribe(u => {
      currentUser = u;
      
      if (u) {
        // 채팅 메시지 구독
        unsubscribeChat = subscribeToMessages((messages) => {
          chatMessages.set(messages);
        }, $currentChatRoom);
        
        // 활성 사용자 목록 불러오기
        loadActiveUsers();
        
        // 채팅방 목록 불러오기
        loadChatRooms();
      } else {
        goto('/login');
      }
    });
    
    return () => {
      unsubscribe();
      if (unsubscribeChat) unsubscribeChat();
    };
  });

  onDestroy(() => {
    if (unsubscribeChat) unsubscribeChat();
  });
  
  // 활성 사용자 목록 가져오기
  async function loadActiveUsers() {
    isLoadingUsers = true;
    try {
      await getActiveUsers();
    } catch (error) {
      console.error('Error loading active users:', error);
    } finally {
      isLoadingUsers = false;
    }
  }
  
  // 채팅방 목록 가져오기
  async function loadChatRooms() {
    isLoadingRooms = true;
    try {
      const rooms = await getChatRooms();
      chatRooms = rooms;
    } catch (error) {
      console.error('채팅방 목록을 가져오는 중 오류가 발생했습니다:', error);
    } finally {
      isLoadingRooms = false;
    }
  }
  
  // 채팅방 변경
  function handleChangeRoom(roomId) {
    // 이전 구독 취소
    if (unsubscribeChat) unsubscribeChat();
    
    // 채팅방 변경
    changeChatRoom(roomId);
    
    // 새 구독 시작
    unsubscribeChat = subscribeToMessages((messages) => {
      chatMessages.set(messages);
    }, roomId);
  }
  
  // 채팅 메시지 전송
  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    
    if (await sendMessage(newMessage, $currentChatRoom)) {
      newMessage = '';
    }
  }
  
  // 새 채팅방 생성
  async function handleCreateRoom() {
    if (!newRoomName.trim()) return;
    
    const roomId = newRoomName.toLowerCase().replace(/\s+/g, '-');
    
    // 이미 존재하는 채팅방인지 확인
    if (chatRooms.some(room => room.id === roomId)) {
      alert('이미 존재하는 채팅방입니다.');
      return;
    }
    
    try {
      // DB에 채팅방 생성
      const result = await createChatRoom(roomId, newRoomName);
      
      if (result) {
        // 채팅방 목록 갱신
        await loadChatRooms();
        
        // 새 채팅방으로 변경
        handleChangeRoom(roomId);
        
        // 입력 초기화
        newRoomName = '';
        isCreatingRoom = false;
      }
    } catch (error) {
      console.error('채팅방 생성 중 오류가 발생했습니다:', error);
      alert('채팅방 생성 중 오류가 발생했습니다.');
    }
  }
</script>

<div class="min-h-screen bg-gray-100">
  <!-- 메인 컨텐츠 -->
  <main class="max-w-7xl mx-auto py-6 px-2 sm:px-6 lg:px-8">
    <div class="flex flex-col md:flex-row gap-4">
      <!-- 왼쪽: 채팅방 목록 및 사용자 목록 -->
      <div class="w-full md:w-1/4 space-y-4">
        <!-- 채팅방 목록 -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-900">채팅방</h2>
            <button 
              class="text-indigo-600 hover:text-indigo-800" 
              on:click={() => isCreatingRoom = !isCreatingRoom}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {#if isCreatingRoom}
            <div class="p-4 border-b border-gray-200">
              <form on:submit|preventDefault={handleCreateRoom} class="flex space-x-2">
                <input
                  type="text"
                  bind:value={newRoomName}
                  class="flex-1 rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="새 채팅방 이름"
                />
                <button
                  type="submit"
                  class="bg-indigo-600 text-white rounded-md p-2 h-9 flex items-center justify-center"
                  disabled={!newRoomName.trim()}
                >
                  생성
                </button>
              </form>
            </div>
          {/if}
          
          <div class="divide-y divide-gray-100">
            {#if isLoadingRooms}
              <div class="flex justify-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            {:else if chatRooms.length === 0}
              <p class="text-gray-500 text-sm text-center py-4">채팅방이 없습니다.</p>
            {:else}
              {#each chatRooms as room}
                <button
                  class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors {$currentChatRoom === room.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}"
                  on:click={() => handleChangeRoom(room.id)}
                >
                  <div class="font-medium"># {room.name}</div>
                </button>
              {/each}
            {/if}
          </div>
        </div>
        
        <!-- 활성 사용자 목록 -->
        <!-- <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="p-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">활성 사용자</h2>
          </div>
          
          <div class="p-4">
            {#if isLoadingUsers}
              <div class="flex justify-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            {:else if $activeUsers.length === 0}
              <p class="text-gray-500 text-sm text-center py-4">활성 사용자가 없습니다.</p>
            {:else}
              <div class="space-y-3">
                {#each $activeUsers as user}
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                      <span class="text-indigo-800 font-medium text-sm">
                        {#if user.uid === currentUser?.uid}
                          나
                        {:else if user.nickname}
                          {user.nickname}
                        {:else}
                          익명
                        {/if}
                      </span>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {#if user.uid === currentUser?.uid}
                          나
                        {:else if user.nickname}
                          {user.nickname}
                        {:else}
                          익명
                        {/if}
                      </div>
                      <div class="text-xs text-gray-500">
                        최근 활동: {new Date(user.lastActive).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div> -->
      </div>
      
      <!-- 오른쪽: 채팅 메시지 -->
      <div class="w-full md:w-3/4 bg-white shadow rounded-lg flex flex-col" style="height: calc(100vh - 180px);">
        <div class="p-4 border-b border-gray-200 flex-shrink-0">
          <h2 class="text-lg font-semibold text-gray-900">
            # {chatRooms.find(room => room.id === $currentChatRoom)?.name || '채팅'}
          </h2>
        </div>
        
        <!-- 채팅 메시지 영역 -->
        <div class="p-4 flex-grow overflow-y-auto bg-gray-50">
          {#if $chatMessages.length === 0}
            <div class="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each $chatMessages as message}
                <div class="flex flex-col {message.authorUid === currentUser?.uid ? 'items-end' : 'items-start'}">
                  <div class="max-w-xl {message.authorUid === currentUser?.uid ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'} rounded-lg px-4 py-2">
                    <p class="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <span>
                      {#if message.authorUid === currentUser?.uid}
                        나
                      {:else if message.nickname}
                        {message.nickname}
                      {:else}
                        익명
                      {/if}
                    </span>
                    <span class="mx-1">·</span>
                    <span>{new Date(message.timestamp).toLocaleString('ko-KR')}</span>
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
              class="flex-1 rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="메시지를 입력하세요..."
            />
            <button
              type="submit"
              class="bg-indigo-600 text-white rounded-md p-2 h-9 flex items-center justify-center"
              disabled={!newMessage.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  </main>
</div> 