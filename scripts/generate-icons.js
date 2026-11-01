import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const distDir = path.resolve('dist');

async function generateAppIcons() {
  const sourceImage = path.join(publicDir, 'assets/aistudio/cave_baadre_logo.png');
  
  if (!fs.existsSync(sourceImage)) {
    console.error('Source emblem not found at:', sourceImage);
    process.exit(1);
  }

  console.log('Generating PWA icons from:', sourceImage);

  // Helper to create a crisp centered icon on white or transparent background
  async function createSquareIcon(size, paddingPercent = 0.12) {
    const innerSize = Math.round(size * (1 - paddingPercent * 2));
    
    // Resize the emblem maintaining aspect ratio
    const resizedEmblem = await sharp(sourceImage)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // Composite onto clean white canvas
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([
      {
        input: resizedEmblem,
        gravity: 'centre'
      }
    ])
    .png({ quality: 100 });
  }

  // 1. 1024x1024 App Store Icon
  await (await createSquareIcon(1024, 0.10)).toFile(path.join(publicDir, 'app-store-icon-1024.png'));
  console.log('Generated app-store-icon-1024.png');

  // 2. 512x512 PWA Icon
  await (await createSquareIcon(512, 0.10)).toFile(path.join(publicDir, 'pwa-icon-512.png'));
  fs.copyFileSync(path.join(publicDir, 'pwa-icon-512.png'), path.join(publicDir, 'pwa-512.png'));
  console.log('Generated pwa-icon-512.png and pwa-512.png');

  // 3. 512x512 Maskable Icon (with 18% safe-zone margin for Android squircle/circle masks)
  await (await createSquareIcon(512, 0.18)).toFile(path.join(publicDir, 'pwa-maskable-512.png'));
  console.log('Generated pwa-maskable-512.png');

  // 4. 192x192 PWA Icon
  await (await createSquareIcon(192, 0.10)).toFile(path.join(publicDir, 'pwa-icon-192.png'));
  fs.copyFileSync(path.join(publicDir, 'pwa-icon-192.png'), path.join(publicDir, 'pwa-192.png'));
  console.log('Generated pwa-icon-192.png and pwa-192.png');

  // 5. Apple Touch Icon 180x180
  await (await createSquareIcon(180, 0.08)).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 6. Favicon 64x64
  await (await createSquareIcon(64, 0.05)).toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');

  // 7. Favicon 32x32 ICO
  await (await createSquareIcon(32, 0.05)).toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  // Copy into dist directory as well if dist exists
  if (fs.existsSync(distDir)) {
    const files = [
      'app-store-icon-1024.png',
      'pwa-icon-512.png',
      'pwa-512.png',
      'pwa-maskable-512.png',
      'pwa-icon-192.png',
      'pwa-192.png',
      'apple-touch-icon.png',
      'favicon.png',
      'favicon.ico'
    ];
    for (const f of files) {
      const src = path.join(publicDir, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(distDir, f));
      }
    }
    console.log('Synced all icons to dist/');
  }

  console.log('All ÇAVÊ BAADRÊ PWA and browser icons created successfully!');
}

generateAppIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
