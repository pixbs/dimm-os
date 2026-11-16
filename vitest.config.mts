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
        },
      },
    ],
  },
})
