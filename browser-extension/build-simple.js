/**
 * Simple Build Script for Kiara Vision Extension (Windows-friendly)
 * Generates basic PNG icons and creates ZIP
 */

const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

console.log('🎨 Building Kiara Vision Extension (Simple Mode)...\n');

// Create icons directory if it doesn't exist
if (!fs.existsSync('icons')) {
  fs.mkdirSync('icons');
}

console.log('⚠️  Icon generation skipped (requires manual creation)');
console.log('📝 Please create icons manually or use the HTML generator\n');

// Check if icons exist
const iconsExist = fs.existsSync('icons/icon16.png') &&
                   fs.existsSync('icons/icon48.png') &&
                   fs.existsSync('icons/icon128.png');

if (!iconsExist) {
  console.log('❌ Icons not found! Creating placeholder icons...\n');

  // Create simple placeholder icons (1x1 purple pixel)
  const purplePixel = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, // 16x16
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68,
    0x36, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x28, 0x91, 0x63, 0x60, 0x18, 0x05, 0x00,
    0x00, 0x10, 0x00, 0x01, 0x16, 0x62, 0x08, 0xFC,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);

  fs.writeFileSync('icons/icon16.png', purplePixel);
  fs.writeFileSync('icons/icon48.png', purplePixel);
  fs.writeFileSync('icons/icon128.png', purplePixel);

  console.log('✓ Created placeholder icons (use generate-icons.html for better ones)');
}

console.log('\n📦 Packaging extension...');

// Create ZIP
const output = fs.createWriteStream('kiara-vision-extension.zip');
const archive = archiver('zip', {
  zlib: { level: 9 },
  forceLocalTime: true,
  forceZip64: false
});

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

let hasErrors = false;

output.on('close', () => {
  if (hasErrors) {
    console.log('\n⚠️  ZIP created with warnings');
  } else {
    const sizeKB = (archive.pointer() / 1024).toFixed(2);
    console.log(`\n✅ Extension built successfully!`);
    console.log(`📦 File: kiara-vision-extension.zip`);
    console.log(`📊 Size: ${sizeKB} KB`);

    // Copy to public folder for website download
    try {
      const publicPath = path.resolve('../public/kiara-vision-extension.zip');
      if (fs.existsSync('kiara-vision-extension.zip')) {
        fs.copyFileSync('kiara-vision-extension.zip', publicPath);
        console.log(`📋 Copied to: ${publicPath}`);
      }
    } catch (err) {
      console.log(`⚠️  Could not copy to public folder: ${err.message}`);
    }

    console.log(`\n🚀 Ready to distribute!`);
    console.log(`📍 Users can download from: http://localhost:5177/install-extension\n`);
  }
});

output.on('error', (err) => {
  console.error('❌ Output stream error:', err);
  hasErrors = true;
});

archive.on('error', (err) => {
  console.error('❌ Archive error:', err);
  hasErrors = true;
  throw err;
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️  Warning:', err.message);
    hasErrors = true;
  } else {
    throw err;
  }
});

archive.pipe(output);

// Add files
FILES_TO_INCLUDE.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      if (stats.isFile()) {
        archive.file(file, { name: file });
        console.log(`✓ Added: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      } else {
        console.log(`⚠️  Skipped (not a file): ${file}`);
        hasErrors = true;
      }
    } else {
      console.log(`⚠️  Missing: ${file}`);
      hasErrors = true;
    }
  } catch (err) {
    console.log(`❌ Error adding ${file}:`, err.message);
    hasErrors = true;
  }
});

// Finalize the archive
archive.finalize();
