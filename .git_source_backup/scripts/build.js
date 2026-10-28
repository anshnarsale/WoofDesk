const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Building Desktop Pet Dog ---');

// 1. Run tsc
console.log('Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compiled successfully.');
} catch (err) {
  console.error('TypeScript compilation failed!');
  process.exit(1);
}

// 2. Helper to copy file
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied ${path.relative(__dirname, src)} -> ${path.relative(__dirname, dest)}`);
}

// 3. Copy HTML and CSS for Pet
copyFile(
  path.join(__dirname, '../src/renderer/pet/index.html'),
  path.join(__dirname, '../dist/renderer/pet/index.html')
);
copyFile(
  path.join(__dirname, '../src/renderer/pet/pet.css'),
  path.join(__dirname, '../dist/renderer/pet/pet.css')
);

// 4. Copy HTML and CSS for Companion
copyFile(
  path.join(__dirname, '../src/renderer/companion/index.html'),
  path.join(__dirname, '../dist/renderer/companion/index.html')
);
copyFile(
  path.join(__dirname, '../src/renderer/companion/companion.css'),
  path.join(__dirname, '../dist/renderer/companion/companion.css')
);

// 5. Ensure icons exist
const iconScript = path.join(__dirname, '../src/tools/generateIcons.js');
if (fs.existsSync(iconScript)) {
  execSync(`node "${iconScript}"`, { stdio: 'inherit' });
}

console.log('Build complete! Ready to run.');

