import { defineConfig } from 'vite';

// Relative base so the build works from any path (GitHub Pages project
// site, custom domain, or a local file preview) without configuration.
export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
    // No proxy needed: `public/api/*.json` is served as-is by Vite's dev
    // server, the same way it's served once built. `server.py` remains
    // available separately for prototyping a dynamic backend.
  },
  preview: {
    port: 4173
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js']
  }
});
