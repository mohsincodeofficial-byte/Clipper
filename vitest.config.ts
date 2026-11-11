import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'electron/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['electron/store.ts', 'electron/clipboard.ts', 'electron/sensitiveFilter.ts', 'electron/screenshot.ts'],
      thresholds: { lines: 80, functions: 80, branches: 70 }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@electron': resolve(__dirname, 'electron')
    }
  }
})
