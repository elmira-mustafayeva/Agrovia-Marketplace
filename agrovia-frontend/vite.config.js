import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          state: ['@reduxjs/toolkit', 'react-redux'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
          utils: ['axios', 'zod']
        }
      }
    }
  }
});