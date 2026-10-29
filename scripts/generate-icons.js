import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Clean, Flat, Light Background - Completely Borderless & Frameless -->
  <rect width="512" height="512" fill="#FAFAF8" />

  <!-- Architectural Dual-Tier Roof Gable (Exact Loading Logo) -->
  <g transform="translate(0, 15)">
    <!-- Main Outer Roof Gable in Brand Forest Green -->
    <path
      d="M 96 230 L 256 130 L 416 230"
      stroke="#46674D"
      stroke-width="26"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />

    <!-- Inner Secondary Accent Roof Line -->
    <path
      d="M 152 230 L 256 165 L 360 230"
      stroke="#3E5E44"
      stroke-width="14"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
      opacity="0.8"
    />
  </g>

  <!-- Main Brand Title: ESTATE -->
  <text
    x="256"
    y="335"
    font-family="'Cinzel', 'Montserrat', 'Segoe UI', system-ui, -apple-system, sans-serif"
    font-weight="900"
    font-size="60"
    fill="#46674D"
    text-anchor="middle"
    letter-spacing="14"
  >
    ESTATE
  </text>

  <!-- Subtitle: REAL ESTATE -->
  <text
    x="256"
    y="382"
    font-family="'Montserrat', 'Cairo', 'Segoe UI', system-ui, sans-serif"
    font-weight="700"
    font-size="18"
    fill="#6C9775"
    text-anchor="middle"
    letter-spacing="6"
  >
    REAL ESTATE
  </text>
</svg>`;

// Write the master SVG file
const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-icon.svg'), svgContent, 'utf-8');
console.log('Saved public/pwa-icon.svg');

async function generatePngs() {
  const svgBuffer = Buffer.from(svgContent);

  // 1. 512x512 PWA Icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-icon-512.png'));
  fs.copyFileSync(path.join(publicDir, 'pwa-icon-512.png'), path.join(publicDir, 'pwa-512.png'));
  console.log('Generated pwa-icon-512.png and pwa-512.png');

  // 2. 192x192 PWA Icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'pwa-icon-192.png'));
  fs.copyFileSync(path.join(publicDir, 'pwa-icon-192.png'), path.join(publicDir, 'pwa-192.png'));
  console.log('Generated pwa-icon-192.png and pwa-192.png');

  // 3. Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 4. Favicon PNG 64x64
  await sharp(svgBuffer)
    .resize(64, 64)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');

  // 5. Favicon ICO 32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png({ quality: 100 })
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  console.log('All light flat icons successfully created!');
}

generatePngs().catch(console.error);
