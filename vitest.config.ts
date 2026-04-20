import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.tsx'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  })
);
