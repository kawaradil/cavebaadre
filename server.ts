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

const SERVER_BOOT_BUILD_ID = `v${Date.now()}`;

function setNoCacheHeaders(res: express.Response) {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

function getActiveBuildMetadata(): { buildId: string; builtAt: string } {
  if (!isProd) {
    return { buildId: 'dev', builtAt: new Date().toISOString() };
  }
  try {
    const versionFilePath = path.join(__dirname, 'dist', 'version.json');
    if (fs.existsSync(versionFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
      if (parsed && parsed.buildId) {
        return {
          buildId: String(parsed.buildId),
          builtAt: String(parsed.builtAt || new Date().toISOString()),
        };
      }
    }
  } catch {}
  return { buildId: SERVER_BOOT_BUILD_ID, builtAt: new Date().toISOString() };
}

// Health check endpoint for deployment probes
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

// Live version check endpoints for installed mobile PWAs (never cached)
app.get(['/version.json', '/api/app-version'], (_req, res) => {
  setNoCacheHeaders(res);
  res.json(getActiveBuildMetadata());
});

// Prevent mobile browsers / WebAPK / iOS WebClip from HTTP-caching entry HTML, Manifest, or Service Workers
app.use((req, res, next) => {
  const reqPath = req.path || '';
  if (
    reqPath === '/' ||
    reqPath === '/index.html' ||
    reqPath === '/sw.js' ||
    reqPath === '/firebase-messaging-sw.js' ||
    reqPath === '/manifest.json'
  ) {
    setNoCacheHeaders(res);
  }
  next();
});

// Mount secure API routes
app.use('/api', apiRouter);

function serveProductionDist() {
  const distPath = path.join(__dirname, 'dist');
  app.use(
    express.static(distPath, {
      etag: true,
      setHeaders: (res, filePath) => {
        const normalized = filePath.replace(/\\/g, '/');
        if (
          normalized.endsWith('/index.html') ||
          normalized.endsWith('/sw.js') ||
          normalized.endsWith('/firebase-messaging-sw.js') ||
          normalized.endsWith('/manifest.json') ||
          normalized.endsWith('/version.json')
        ) {
          setNoCacheHeaders(res);
        } else if (
          normalized.includes('/dist/assets/') &&
          (normalized.endsWith('.js') || normalized.endsWith('.css'))
        ) {
          // Content-hashed Vite JS/CSS chunks can be cached safely
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // Icons & images revalidate quickly so updated branding reflects immediately
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      },
    })
  );
  app.get('*', (_req, res) => {
    setNoCacheHeaders(res);
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Build files not found. Please run npm run build.');
    }
  });
}

// Set up Vite middlewares in development or static serving in production
async function setupApp() {
  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite middleware could not be loaded, falling back to static files:', err);
      serveProductionDist();
    }
  } else {
    serveProductionDist();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

setupApp();
