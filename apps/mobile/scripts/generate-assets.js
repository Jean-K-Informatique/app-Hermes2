/**
 * Generate placeholder assets for HermesChat.
 * Run: node scripts/generate-assets.js
 *
 * Requires: npm install sharp (dev dependency)
 * Or simply create colored PNGs with any image editor.
 */

const fs = require('fs');
const path = require('path');

// Simple 1x1 pixel PNG generator (no dependencies needed)
// Creates minimal valid PNG files as placeholders
function createPng(width, height, r, g, b) {
  // For real assets, use sharp or canvas. This creates a minimal valid PNG.
  // Placeholder: create an empty file with a note
  return Buffer.alloc(0);
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Create placeholder text files that indicate assets need to be replaced
const assets = [
  { name: 'icon.png', desc: '1024x1024, fond #6366F1, lettre "H" blanche' },
  { name: 'splash.png', desc: '1284x2778, fond #0F172A, logo centré' },
  { name: 'adaptive-icon.png', desc: '1024x1024, fond #6366F1, lettre "H" blanche' },
  { name: 'favicon.png', desc: '48x48, fond #6366F1, lettre "H"' },
  { name: 'notification-icon.png', desc: '96x96, blanc sur transparent' },
];

for (const asset of assets) {
  const filePath = path.join(assetsDir, asset.name);
  if (!fs.existsSync(filePath)) {
    console.log(`Note: ${asset.name} needs to be created (${asset.desc})`);
    console.log(`  Place the file at: ${filePath}`);
  }
}

console.log('\nTo generate real assets, install sharp and update this script,');
console.log('or use any image editor to create the assets described above.');
