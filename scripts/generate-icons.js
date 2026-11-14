import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const distDir = path.resolve('dist');

async function generateAppIcons() {
  // Use the exact attached original Royal Blue emblem image (1794320583408.jpg)
  const preferredJpg = path.join(publicDir, 'assets/aistudio/1794320583408_043d0a34.jpg');
  const fallbackPng = path.join(publicDir, 'assets/aistudio/cave_baadre_logo_original.png');
  const sourceImage = fs.existsSync(preferredJpg) ? preferredJpg : fallbackPng;

  if (!fs.existsSync(sourceImage)) {
    console.error('Source emblem not found at:', sourceImage);
    process.exit(1);
  }

  console.log('Generating mobile PWA & iOS/Android icons from:', sourceImage);

  // Trim excess outer whitespace so we have the exact tight bounds of the Royal Blue eye emblem
  const trimmedEmblemBuffer = await sharp(sourceImage)
    .trim({ threshold: 12 })
    .png()
    .toBuffer();

  // Helper to create a crisp centered square icon on a pure #FFFFFF background
  async function createSquareIcon(size, paddingPercent = 0.06) {
    const innerSize = Math.round(size * (1 - paddingPercent * 2));

    const resizedEmblem = await sharp(trimmedEmblemBuffer)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        kernel: sharp.kernel.lanczos3,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        {
          input: resizedEmblem,
          gravity: 'centre',
        },
      ])
      .png({ compressionLevel: 9, quality: 100 });
  }

  // 1. 1024x1024 High-Res App Store Icon
  await (await createSquareIcon(1024, 0.06)).toFile(path.join(publicDir, 'app-store-icon-1024.png'));
  console.log('Generated app-store-icon-1024.png');

  // 2. 512x512 Standard PWA Icon (purpose: "any")
  const icon512Buffer = await (await createSquareIcon(512, 0.06)).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'pwa-icon-512.png'), icon512Buffer);
  fs.writeFileSync(path.join(publicDir, 'pwa-512.png'), icon512Buffer);
  console.log('Generated pwa-icon-512.png and pwa-512.png');

  // 3. 512x512 Maskable Icon (with 14% safe-zone margin for Android circular/squircle adaptive masks)
  await (await createSquareIcon(512, 0.14)).toFile(path.join(publicDir, 'pwa-maskable-512.png'));
  console.log('Generated pwa-maskable-512.png');

  // 4. 192x192 Standard PWA Icon (purpose: "any")
  const icon192Buffer = await (await createSquareIcon(192, 0.06)).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'pwa-icon-192.png'), icon192Buffer);
  fs.writeFileSync(path.join(publicDir, 'pwa-192.png'), icon192Buffer);
  console.log('Generated pwa-icon-192.png and pwa-192.png');

  // 5. Apple Touch Icon 180x180 (iOS Safari Add to Home Screen)
  await (await createSquareIcon(180, 0.06)).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // 6. Favicon 64x64
  await (await createSquareIcon(64, 0.03)).toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');

  // 7. Favicon 32x32
  await (await createSquareIcon(32, 0.03)).toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  // 8. Update pwa-icon.svg with the authentic Royal Blue emblem
  const base64Icon = icon512Buffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FFFFFF" rx="96" />
  <image href="data:image/png;base64,${base64Icon}" x="0" y="0" width="512" height="512" />
</svg>\n`;
  fs.writeFileSync(path.join(publicDir, 'pwa-icon.svg'), svgContent, 'utf8');
  console.log('Generated pwa-icon.svg');

  // Sync into dist directory if it exists
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
      'favicon.ico',
      'pwa-icon.svg',
    ];
    for (const f of files) {
      const src = path.join(publicDir, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(distDir, f));
      }
    }
    console.log('Synced all icons to dist/');
  }

  console.log('All ÇAVÊ BAADRÊ original Royal Blue mobile icons generated successfully!');
}

generateAppIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
