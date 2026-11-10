import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function appAutoUpdatePlugin(buildId: string): Plugin {
  return {
    name: 'baadre-pwa-auto-update',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.end(JSON.stringify({ buildId, builtAt: new Date().toISOString() }));
      });
    },
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(distDir)) return;

      // 1. Write fresh version.json manifest for active mobile version polling
      const versionPayload = JSON.stringify(
        {
          buildId,
          builtAt: new Date().toISOString(),
        },
        null,
        2
      );
      fs.writeFileSync(path.join(distDir, 'version.json'), versionPayload, 'utf8');

      // 2. Stamp Service Workers with unique buildId so browsers detect byte diff on every build
      for (const swFile of ['sw.js', 'firebase-messaging-sw.js']) {
        const swPath = path.join(distDir, swFile);
        if (fs.existsSync(swPath)) {
          const raw = fs.readFileSync(swPath, 'utf8');
          const stamped = raw.replace(/__SW_BUILD_ID__/g, buildId);
          fs.writeFileSync(swPath, stamped, 'utf8');
        }
      }
    },
  };
}

export default defineConfig(({ command }) => {
  const buildId = command === 'build' ? `v${Date.now()}` : 'dev';

  return {
    plugins: [react(), tailwindcss(), appAutoUpdatePlugin(buildId)],
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app'),
        'firebase/app-check': path.resolve(__dirname, 'node_modules/@firebase/app-check'),
        'firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth'),
        'firebase/firestore': path.resolve(__dirname, 'node_modules/@firebase/firestore'),
        'firebase/storage': path.resolve(__dirname, 'node_modules/@firebase/storage'),
        'firebase/messaging': path.resolve(__dirname, 'node_modules/@firebase/messaging'),
        '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app'),
        '@firebase/app-check': path.resolve(__dirname, 'node_modules/@firebase/app-check'),
        '@firebase/component': path.resolve(__dirname, 'node_modules/@firebase/component'),
        '@firebase/firestore': path.resolve(__dirname, 'node_modules/@firebase/firestore'),
        '@firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth'),
        '@firebase/storage': path.resolve(__dirname, 'node_modules/@firebase/storage'),
        '@firebase/messaging': path.resolve(__dirname, 'node_modules/@firebase/messaging'),
        '@firebase/util': path.resolve(__dirname, 'node_modules/@firebase/util'),
        '@firebase/logger': path.resolve(__dirname, 'node_modules/@firebase/logger'),
      },
      dedupe: [
        'react',
        'react-dom',
        'firebase',
        'firebase/app',
        'firebase/app-check',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'firebase/messaging',
        '@firebase/app',
        '@firebase/app-check',
        '@firebase/component',
        '@firebase/firestore',
        '@firebase/auth',
        '@firebase/storage',
        '@firebase/messaging',
        '@firebase/util',
        '@firebase/logger',
      ],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'firebase/app',
        'firebase/app-check',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'firebase/messaging',
        'lucide-react',
        'motion/react',
        'leaflet',
        'hash-wasm',
        'zod',
      ],
    },
    build: {
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          side_effects: false,
        },
        mangle: {
          toplevel: false,
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        treeshake: {
          moduleSideEffects: (id) => {
            if (id.includes('firebase') || id.includes('@firebase')) {
              return true;
            }
            return true;
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: false,
      watch: null,
    },
  };
});

