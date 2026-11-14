import { defineConfig } from 'vitest/config'

// Security-rules tests: node, no jsdom, run against the Firestore emulator
// (see the `test:rules` script). Kept out of the main suite on purpose.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/rules/**/*.test.ts'],
  },
})
