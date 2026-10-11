import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputSource = path.resolve('public/app-icon.png');
const bgColor = { r: 34, g: 46, b: 58, alpha: 1 }; // #222E3A - exact background tone of the icon

async function generateIcons() {
  console.log('Generating icons from:', inputSource);
  const metadata = await sharp(inputSource).metadata();
  console.log(`Source dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

  // 1. logo.png and logo.webp
  await sharp(inputSource)
    .png({ quality: 100 })
    .toFile(path.resolve('public/logo.png'));
  console.log('Generated public/logo.png');

  await sharp(inputSource)
    .webp({ quality: 95 })
    .toFile(path.resolve('public/logo.webp'));
  console.log('Generated public/logo.webp');

  // 2. android-chrome-192x192.png (full-bleed square PWA icon)
  await sharp(inputSource)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/android-chrome-192x192.png'));
  console.log('Generated public/android-chrome-192x192.png');

  // 2b. maskable-icon-192x192.png (with safe-zone padding on matching background for adaptive launchers)
  const inner192 = await sharp(inputSource)
    .resize(154, 154, { fit: 'contain' })
    .toBuffer();
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: bgColor
    }
  })
    .composite([{ input: inner192, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/maskable-icon-192x192.png'));
  console.log('Generated public/maskable-icon-192x192.png');

  // 3. android-chrome-512x512.png (full-bleed square PWA icon)
  await sharp(inputSource)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/android-chrome-512x512.png'));
  console.log('Generated public/android-chrome-512x512.png');

  // 3b. maskable-icon-512x512.png (with safe-zone padding on matching background for adaptive launchers)
  const inner512 = await sharp(inputSource)
    .resize(410, 410, { fit: 'contain' })
    .toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: bgColor
    }
  })
    .composite([{ input: inner512, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/maskable-icon-512x512.png'));
  console.log('Generated public/maskable-icon-512x512.png');

  // 4. apple-touch-icon.png (180x180 full-bleed square icon for iOS)
  await sharp(inputSource)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png');

  // 5. favicon.png (64x64)
  await sharp(inputSource)
    .resize(64, 64)
    .png()
    .toFile(path.resolve('public/favicon.png'));
  console.log('Generated public/favicon.png');

  // 6. favicon-32x32.png
  await sharp(inputSource)
    .resize(32, 32)
    .png()
    .toFile(path.resolve('public/favicon-32x32.png'));
  console.log('Generated public/favicon-32x32.png');

  // 7. favicon-48x48.png
  await sharp(inputSource)
    .resize(48, 48)
    .png()
    .toFile(path.resolve('public/favicon-48x48.png'));
  console.log('Generated public/favicon-48x48.png');

  // 8. favicon-16x16.png
  await sharp(inputSource)
    .resize(16, 16)
    .png()
    .toFile(path.resolve('public/favicon-16x16.png'));
  console.log('Generated public/favicon-16x16.png');

  // 9. favicon.ico (32x32 PNG as ico format fallback)
  await sharp(inputSource)
    .resize(32, 32)
    .png()
    .toFile(path.resolve('public/favicon.ico'));
  console.log('Generated public/favicon.ico');

  // 10. favicon.svg (SVG containing the exact logo PNG as embedded data URI)
  const favicon64Buffer = await sharp(inputSource)
    .resize(64, 64)
    .png()
    .toBuffer();
  const b64 = favicon64Buffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <image href="data:image/png;base64,${b64}" width="64" height="64" />
</svg>\n`;
  fs.writeFileSync(path.resolve('public/favicon.svg'), svgContent, 'utf-8');
  console.log('Generated public/favicon.svg');

  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
