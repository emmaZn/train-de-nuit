import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    // Rules tests need the Firestore emulator: they run under `npm run test:rules`.
    exclude: [...configDefaults.exclude, 'src/rules/**'],
  },
})
