import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          // Die WHO-Tabellen sind ~100 kB Rohdaten und werden nur auf dem
          // Gewichts-Tab gebraucht - eigener Chunk, damit der Start schlank bleibt.
          who: ['./src/lib/who/tables.ts'],
          // Der Supabase-Client wird nur gebraucht, wenn ein Konto eingerichtet
          // ist; getrennt halten, damit er den ersten Start nicht ausbremst.
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
