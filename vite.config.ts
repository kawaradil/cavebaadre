import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

