import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
  },
  envPrefix: ['VITE_'],
  server: {
    proxy: {
      '/api/zoho-accounts': {
        target: 'https://accounts.zoho.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/zoho-accounts/, ''),
      },
      '/api/zoho': {
        target: 'https://www.zohoapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/zoho/, ''),
      },
    },
  },
});