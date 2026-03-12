import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/depthShift/',
  plugins: [vue()],
  server: {
    host: true
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', 'three/examples/jsm/loaders/GLTFLoader.js']
        }
      }
    }
  }
})
