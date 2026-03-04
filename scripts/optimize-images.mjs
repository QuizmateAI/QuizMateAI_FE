/**
 * Script to optimize logo images
 * Converts PNG to WebP and creates optimized PNG fallbacks
 */
import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const assetsDir = './src/assets';

async function optimizeImage(inputPath, outputPath, format = 'webp') {
  const info = statSync(inputPath);
  const originalSize = (info.size / 1024).toFixed(1);

  let pipeline = sharp(inputPath);

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality: 80, effort: 6 });
  } else if (format === 'png') {
    pipeline = pipeline.png({ quality: 80, compressionLevel: 9, palette: true });
  }

  const result = await pipeline.toFile(outputPath);
  const newSize = (result.size / 1024).toFixed(1);
  const savings = (((info.size - result.size) / info.size) * 100).toFixed(1);

  console.log(`✅ ${inputPath}`);
  console.log(`   ${originalSize} KB → ${newSize} KB (${format.toUpperCase()}) — saved ${savings}%`);
}

async function main() {
  const files = readdirSync(assetsDir).filter(f => f.endsWith('.png'));

  for (const file of files) {
    const input = join(assetsDir, file);
    const baseName = file.replace('.png', '');

    // Create WebP version
    await optimizeImage(input, join(assetsDir, `${baseName}.webp`), 'webp');

    // Create optimized PNG fallback
    await optimizeImage(input, join(assetsDir, `${baseName}_optimized.png`), 'png');
  }

  console.log('\n🎉 Image optimization complete!');
  console.log('Update your imports to use .webp files for best performance.');
}

main().catch(console.error);
