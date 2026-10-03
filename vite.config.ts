import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    {
      name: 'fix-mime-types',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url) {
            const cleanUrl = req.url.split('?')[0];
            if (/\.(js|mjs|ts|tsx|jsx)$/i.test(cleanUrl)) {
              res.setHeader('Content-Type', 'text/javascript');
            }
          }
          next();
        });
      },
    },
    react(),
    tailwindcss(),
  ],
})
