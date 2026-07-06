import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 로 두면 GitHub Pages 프로젝트 주소(/저장소이름/)가
// 무엇이든 상관없이 정상 작동합니다. 저장소 이름을 바꿔도 수정할 필요가 없습니다.
export default defineConfig({
  plugins: [react()],
  base: './',
})
