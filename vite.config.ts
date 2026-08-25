import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/meta-placement-preview/',
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    sourcemap: false,
  },
});
