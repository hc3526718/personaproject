import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../shared/marketing-ui'),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/main.jsx'),
      name: 'DaltonMarketingUI',
      formats: ['iife'],
      fileName: () => 'marketing-ui.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'marketing-ui.[ext]',
      },
    },
  },
});
