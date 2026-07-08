// generate-profile.js
// Usage: place your source image at bio/input.jpg and run:
//   npm install sharp
//   node scripts/generate-profile.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const src = path.join(__dirname, '..', 'bio', 'input.jpg');
const outDir = path.join(__dirname, '..', 'bio');

if (!fs.existsSync(src)) {
  console.error('Source image not found:', src);
  process.exit(1);
}

async function make() {
  try {
    await sharp(src).resize(400, 400, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(path.join(outDir, 'profile-400.jpg'));
    await sharp(src).resize(800, 800, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(path.join(outDir, 'profile-800.jpg'));
    await sharp(src).resize(1200, 1200, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(path.join(outDir, 'profile-1200.jpg'));
    // main profile.jpg at ~1000px
    await sharp(src).resize(1000, 1000, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(path.join(outDir, 'profile.jpg'));
    console.log('Generated profile images in', outDir);
  } catch (err) {
    console.error('Error generating images:', err);
    process.exit(1);
  }
}

make();
