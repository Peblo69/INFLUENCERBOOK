/**
 * Package Kiara Vision Extension for Distribution
 * Run: node package-extension.js
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const OUTPUT_FILE = 'kiara-vision-extension.zip';
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

console.log('📦 Packaging Kiara Vision Extension...\n');

// Create output stream
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for events
output.on('close', () => {
  console.log(`✅ Extension packaged successfully!`);
  console.log(`📦 File: ${OUTPUT_FILE}`);
  console.log(`📊 Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
  console.log(`\n🚀 Ready to distribute!\n`);
});

archive.on('error', (err) => {
  throw err;
});

// Pipe archive to output file
archive.pipe(output);

// Add files
FILES_TO_INCLUDE.forEach(file => {
  if (fs.existsSync(file)) {
    archive.file(file, { name: file });
    console.log(`✓ Added: ${file}`);
  } else {
    console.log(`⚠️  Missing: ${file}`);
  }
});

// Finalize the archive
archive.finalize();
