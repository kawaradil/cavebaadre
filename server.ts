import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { apiRouter } from './server/apiRouter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Disable x-powered-by to prevent server fingerprinting
app.disable('x-powered-by');

// High-performance, zero-overhead security headers middleware
app.use((_req, res, next) => {
  // Prevent MIME-sniffing exploits
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Protect sensitive user URLs and referrers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Legacy browser cross-site scripting filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Restrict sensitive hardware features to self only and block microphone/payment misuse
  res.setHeader(
    'Permissions-Policy',
    'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()'
  );

  // Enable Cross-Origin Opener Isolation while supporting Firebase Auth popups
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Flexible Content Security Policy ensuring smooth Firebase, Maps, and AI Studio iframe operation
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://apis.google.com https://*.gstatic.com https://www.google.com https://*.google.com https://www.recaptcha.net https://*.recaptcha.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https: wss: http://localhost:* ws://localhost:*",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self' https://*.firebaseapp.com https://*.google.com https://www.recaptcha.net https://*.recaptcha.net",
    "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.aistudio.google.com https://*.run.app",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint for deployment probes
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// Mount secure API routes
app.use('/api', apiRouter);

// Set up Vite middlewares in development or static serving in production
async function setupApp() {
  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite middleware could not be loaded, falling back to static files:', err);
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) res.sendFile(indexPath);
        else res.status(404).send('Build files not found.');
      });
    }
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build files not found. Please run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

setupApp();
