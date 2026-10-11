import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputSource = path.resolve('public/app-icon.png');

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

  // 2. android-chrome-192x192.png (with safe-zone padding so mobile never crops the logo)
  const inner192 = await sharp(inputSource)
    .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: inner192, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/android-chrome-192x192.png'));
  console.log('Generated public/android-chrome-192x192.png (with safe padding)');

  // 2b. maskable-icon-192x192.png (theme background #303943 and safe-zone padding for Android launcher)
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 48, g: 57, b: 67, alpha: 1 } // #303943
    }
  })
    .composite([{ input: inner192, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/maskable-icon-192x192.png'));
  console.log('Generated public/maskable-icon-192x192.png');

  // 3. android-chrome-512x512.png (with safe-zone padding so mobile never crops the logo)
  const inner512 = await sharp(inputSource)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: inner512, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/android-chrome-512x512.png'));
  console.log('Generated public/android-chrome-512x512.png (with safe padding)');

  // 3b. maskable-icon-512x512.png (theme background #303943 and safe-zone padding for Android launcher)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 48, g: 57, b: 67, alpha: 1 } // #303943
    }
  })
    .composite([{ input: inner512, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/maskable-icon-512x512.png'));
  console.log('Generated public/maskable-icon-512x512.png');

  // 4. apple-touch-icon.png (180x180 with safe-zone padding on theme background #303943)
  const inner180 = await sharp(inputSource)
    .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 48, g: 57, b: 67, alpha: 1 } // #303943
    }
  })
    .composite([{ input: inner180, gravity: 'center' }])
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png (with safe padding)');

  // 5. favicon.png (64x64)
  await sharp(inputSource)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/favicon.png'));
  console.log('Generated public/favicon.png');

  // 6. favicon-32x32.png
  await sharp(inputSource)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/favicon-32x32.png'));
  console.log('Generated public/favicon-32x32.png');

  // 7. favicon-48x48.png
  await sharp(inputSource)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/favicon-48x48.png'));
  console.log('Generated public/favicon-48x48.png');

  // 8. favicon-16x16.png
  await sharp(inputSource)
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/favicon-16x16.png'));
  console.log('Generated public/favicon-16x16.png');

  // 9. favicon.ico (32x32 PNG as ico format fallback)
  await sharp(inputSource)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.resolve('public/favicon.ico'));
  console.log('Generated public/favicon.ico');

  // 10. favicon.svg (SVG containing the exact logo PNG as embedded data URI)
  const favicon64Buffer = await sharp(inputSource)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
