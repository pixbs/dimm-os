import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['tests/unit/**/*.spec.ts'] },
      },
      {
        extends: true,
        // One database for every file, so one file at a time.
        test: {
          name: 'int',
          environment: 'node',
          include: ['tests/int/**/*.int.spec.ts'],
          fileParallelism: false,
          // views.int starts Payload and fills the whole fixture in a hook, which passes 10 s on ci now and then; a test itself keeps its own limit.
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
