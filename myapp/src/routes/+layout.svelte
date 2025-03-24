<script>
	import { onMount } from 'svelte';
	import { user, logout } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import '../app.css';
	
	let currentUser = null;
	let isMenuOpen = false;
	let isUserMenuOpen = false;

	// 로그인 상태 확인
	onMount(() => {
		const unsubscribe = user.subscribe(value => {
			currentUser = value;
		});
		
		return unsubscribe;
	});
	
	async function handleLogout() {
		try {
			await logout();
			goto('/login');
		} catch (error) {
			console.error('로그아웃 중 오류가 발생했습니다:', error);
		}
	}
	
	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	// 현재 페이지가 활성화된 링크인지 확인
	function isActive(path) {
		return $page.url.pathname.startsWith(path);
	}
</script>

<div class="min-h-screen bg-gray-100">
	<nav class="bg-white shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-16">
				<div class="flex">
					<div class="flex-shrink-0 flex items-center">
						<a href="/" class="font-bold text-xl text-indigo-600">익명 커뮤니티 (플럭시티 전용 초기 버전)</a>
					</div>
					<div class="hidden sm:ml-6 sm:flex sm:space-x-8">
						<a 
							href="/" 
							class="{isActive('/') && !isActive('/board') && !isActive('/chat') ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
						>
							홈
						</a>
						<a 
							href="/board" 
							class="{isActive('/board') ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
						>
							게시판
						</a>
						<a 
							href="/chat" 
							class="{isActive('/chat') ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
						>
							채팅
						</a>
					</div>
				</div>
				<div class="hidden sm:ml-6 sm:flex sm:items-center">
					{#if currentUser}
						<div class="relative ml-3">
							<div>
								<button 
									type="button" 
									id="user-menu-button" 
									class="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" 
									on:click={() => isUserMenuOpen = !isUserMenuOpen}
								>
									<span class="sr-only">사용자 메뉴 열기</span>
									<div class="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium">
										{$user?.email?.charAt(0).toUpperCase() || '?'}
									</div>
								</button>
							</div>
							
							{#if isUserMenuOpen}
								<div 
									class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" 
									role="menu" 
									aria-orientation="vertical" 
									aria-labelledby="user-menu-button" 
									tabindex="-1"
								>
									<a href="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">내 프로필</a>
									<button 
										class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
										role="menuitem" 
										on:click={handleLogout}
									>
										로그아웃
									</button>
								</div>
							{/if}
						</div>
					{:else}
						<div class="flex items-center space-x-4">
							<a href="/login" class="text-gray-500 hover:text-gray-700 text-sm font-medium">로그인</a>
							<a href="/register" class="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium">회원가입</a>
						</div>
					{/if}
				</div>
				<div class="-mr-2 flex items-center sm:hidden">
					<button type="button" class="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500" aria-controls="mobile-menu" aria-expanded="false" on:click={toggleMenu}>
						<span class="sr-only">Open main menu</span>
						<svg class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- 모바일 메뉴 -->
		{#if isMenuOpen}
			<div class="sm:hidden" id="mobile-menu">
				<div class="pt-2 pb-3 space-y-1">
					<a 
						href="/" 
						class="{isActive('/') && !isActive('/board') && !isActive('/chat') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					>
						홈
					</a>
					<a 
						href="/board" 
						class="{isActive('/board') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					>
						게시판
					</a>
					<a 
						href="/chat" 
						class="{isActive('/chat') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
					>
						채팅
					</a>
					{#if currentUser}
						<a 
							href="/profile" 
							class="{isActive('/profile') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
						>
							내 프로필
						</a>
						<button 
							class="w-full text-left border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
							on:click={handleLogout}
						>
							로그아웃
						</button>
					{:else}
						<a 
							href="/login" 
							class="{isActive('/login') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
						>
							로그인
						</a>
						<a 
							href="/register" 
							class="{isActive('/register') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'} block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
						>
							회원가입
						</a>
					{/if}
				</div>
			</div>
		{/if}
	</nav>
	
	<div class="py-4">
		<slot></slot>
	</div>
</div>
