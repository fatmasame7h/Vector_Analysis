import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps assets working on GitHub Pages; HashRouter handles routing.
export default defineConfig({
  base: './',
  plugins: [react()],
});
