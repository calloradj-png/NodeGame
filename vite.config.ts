import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vite';

// Замена __dirname для корректной работы в ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    // 1. Делает все пути к ассетам (js, css, картинки) относительными
    base: './', 
    
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // Использование безопасного __dirname
        '@': path.resolve(__dirname, './src'), // Обычно настраивают на './src', но если нужно на корень, оставьте '.'
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});