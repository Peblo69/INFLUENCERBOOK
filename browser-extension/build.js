/**
 * Build Kiara Vision Extension
 * Generates icons and creates distribution ZIP
 *
 * Run: node build.js
 */

const fs = require('fs');
const { createCanvas } = require('canvas');
const archiver = require('archiver');
const path = require('path');

console.log('🎨 Building Kiara Vision Extension...\n');

// Create icons directory if it doesn't exist
if (!fs.existsSync('icons')) {
  fs.mkdirSync('icons');
}

// Function to draw Kiara icon
function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with rounded corners
  ctx.fillStyle = '#8B5CF6';
  ctx.beginPath();
  const radius = size * 0.22;
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  // White circle background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.375, 0, Math.PI * 2);
  ctx.fill();

  // Diamond shapes
  const center = size / 2;
  const diamondSize = size * 0.125;

  // Top diamond
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(center, size * 0.25);
  ctx.lineTo(center + diamondSize, center - diamondSize);
  ctx.lineTo(center, center);
  ctx.lineTo(center - diamondSize, center - diamondSize);
  ctx.closePath();
  ctx.fill();

  // Middle diamond
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.moveTo(center, center - diamondSize);
  ctx.lineTo(center + diamondSize, center + diamondSize);
  ctx.lineTo(center, center + diamondSize * 2);
  ctx.lineTo(center - diamondSize, center + diamondSize);
  ctx.closePath();
  ctx.fill();

  // Bottom diamond
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.moveTo(center, center + diamondSize);
  ctx.lineTo(center + diamondSize, center + diamondSize * 3);
  ctx.lineTo(center, size * 0.875);
  ctx.lineTo(center - diamondSize, center + diamondSize * 3);
  ctx.closePath();
  ctx.fill();

  return canvas;
}

// Generate icons
console.log('📸 Generating icons...');
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  const filename = `icons/icon${size}.png`;
  fs.writeFileSync(filename, buffer);
  console.log(`✓ Created ${filename}`);
});

console.log('\n📦 Packaging extension...');

// Create ZIP
const output = fs.createWriteStream('kiara-vision-extension.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

const FILES_TO_INCLUDE = [
  'manifest.json',
  'content.js',
  'content.css',
  'background.js',
  'popup.html',
  'popup.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

output.on('close', () => {
  const sizeKB = (archive.pointer() / 1024).toFixed(2);
  console.log(`\n✅ Extension built successfully!`);
  console.log(`📦 File: kiara-vision-extension.zip`);
  console.log(`📊 Size: ${sizeKB} KB`);

  // Copy to public folder for website download
  const publicPath = '../public/kiara-vision-extension.zip';
  fs.copyFileSync('kiara-vision-extension.zip', publicPath);
  console.log(`📋 Copied to: ${publicPath}`);

  console.log(`\n🚀 Ready to distribute!`);
  console.log(`\n📍 Users can download from: http://localhost:5177/install-extension.html\n`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

FILES_TO_INCLUDE.forEach(file => {
  if (fs.existsSync(file)) {
    archive.file(file, { name: file });
    console.log(`✓ Added: ${file}`);
  } else {
    console.warn(`⚠️  Missing: ${file}`);
  }
});

archive.finalize();
