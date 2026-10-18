import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// The shared workspace package (../shared) is consumed as source, so Vite must be allowed to read outside root.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/admin/' : '/'),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173, fs: { allow: ['..'] } },
  preview: { port: 5173 },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/recharts|d3-|victory-vendor/.test(id)) return 'charts';
          if (/react-router|react-dom|[\/]react[\/]|scheduler/.test(id)) return 'react';
          if (/@tanstack|zustand|zod|react-hook-form|@hookform/.test(id)) return 'query';
          return undefined;
        },
      },
    },
  },
});
