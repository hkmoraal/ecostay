import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev` the frontend runs on 5173 and the API on 4000.
// We set VITE_API_URL in .env; no proxy needed, but SPA fallback is handled
// by Vite automatically. In production, serve `dist` behind any static host.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 5173 },
});
