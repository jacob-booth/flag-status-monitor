#!/usr/bin/env node
/**
 * PWA Icon Generator for Flag Status Monitor
 * Generates all required PWA icons using SVG
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple flag icon using SVG
function createFlagSVG(size) {
  const flagWidth = size * 0.8;
  const flagHeight = flagWidth * 0.53; // US flag ratio
  const x = (size - flagWidth) / 2;
  const y = (size - flagHeight) / 2;
  
  const stripeHeight = flagHeight / 13;
  const unionWidth = flagWidth * 0.4;
  const unionHeight = flagHeight * 0.54;
  
  let stripes = '';
  for (let i = 0; i < 13; i += 2) {
    const stripeY = y + (i * stripeHeight);
    stripes += `<rect x="${x}" y="${stripeY}" width="${flagWidth}" height="${stripeHeight}" fill="#B22234"/>`;
  }
  
  // Add stars (simplified)
  let stars = '';
  const starSize = Math.max(1, size / 64);
  for (let row = 0; row < 9; row++) {
    const starsInRow = row % 2 === 0 ? 6 : 5;
    const starY = y + (row * unionHeight / 9) + (unionHeight / 18);
    
    for (let star = 0; star < starsInRow; star++) {
      let starX = x + (star * unionWidth / starsInRow) + (unionWidth / (starsInRow * 2));
      if (row % 2 === 1) starX += unionWidth / (starsInRow * 2);
      
      stars += `<circle cx="${starX}" cy="${starY}" r="${starSize}" fill="white"/>`;
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- White background -->
  <rect x="${x}" y="${y}" width="${flagWidth}" height="${flagHeight}" fill="white"/>
  
  <!-- Red stripes -->
  ${stripes}
  
  <!-- Blue union -->
  <rect x="${x}" y="${y}" width="${unionWidth}" height="${unionHeight}" fill="#3C3B6E"/>
  
  <!-- Stars -->
  ${stars}
  
  <!-- Border -->
  <rect x="${x}" y="${y}" width="${flagWidth}" height="${flagHeight}" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
</svg>`;
}

async function main() {
  console.log('🇺🇸 Generating PWA icons for Flag Status Monitor...');
  
  // Create assets directory
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Icon sizes needed for PWA
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  // Generate SVG icons
  for (const size of sizes) {
    console.log(`  Creating ${size}x${size} icon...`);
    const svg = createFlagSVG(size);
    const filename = path.join(assetsDir, `icon-${size}x${size}.svg`);
    fs.writeFileSync(filename, svg);
    console.log(`  ✅ Saved ${filename}`);
  }
  
  // Create apple-touch-icon
  console.log('  Creating Apple Touch Icon (180x180)...');
  const appleSvg = createFlagSVG(180);
  fs.writeFileSync(path.join(assetsDir, 'apple-touch-icon.svg'), appleSvg);
  console.log('  ✅ Saved assets/apple-touch-icon.svg');
  
  // Create favicon
  console.log('  Creating favicon (32x32)...');
  const faviconSvg = createFlagSVG(32);
  fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), faviconSvg);
  console.log('  ✅ Saved assets/favicon.svg');
  
  console.log('\n🎉 All PWA icons generated successfully!');
  console.log('📱 Your app is now ready for installation on all devices!');
}

main().catch(console.error); 