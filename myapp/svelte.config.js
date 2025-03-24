import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// 기본 빌드 폴더를 build로 설정
			fallback: 'index.html',
			pages: 'build',
			assets: 'build'
		})
	}
};

export default config;
