/**
 * @file Vite 构建与开发服务器配置
 * @description 注册 Vue 与 Vue DevTools 插件，配置 @ 路径别名指向 src 目录，
 *              并在开发环境将 /api 请求代理到本地 Express 后端（3000 端口）。
 * @see https://vite.dev/config/
 */
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 开发环境将 /api 请求代理到本地 Express 后端（3000 端口）；生产环境由 Worker 直接处理
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
