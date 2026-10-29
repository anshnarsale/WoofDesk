const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

console.log('--- Building Desktop Pet Dog ---');

// 1. Run tsc for Node.js main and preload processes
console.log('Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compiled successfully.');
} catch (err) {
  console.error('TypeScript compilation failed!');
  process.exit(1);
}

// 2. Bundle browser renderer scripts with esbuild (resolving imports into self-contained browser bundles)
console.log('Bundling renderer scripts with esbuild...');
try {
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '../src/renderer/pet/petMain.ts')],
    outfile: path.join(__dirname, '../dist/renderer/pet/petMain.js'),
    bundle: true,
    platform: 'browser',
    target: 'es2022',
  });

  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '../src/renderer/companion/companionMain.ts')],
    outfile: path.join(__dirname, '../dist/renderer/companion/companionMain.js'),
    bundle: true,
    platform: 'browser',
    target: 'es2022',
  });
  console.log('Renderer scripts bundled successfully.');
} catch (err) {
  console.error('esbuild bundling failed:', err);
  process.exit(1);
}

// 3. Helper to copy file
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied ${path.relative(__dirname, src)} -> ${path.relative(__dirname, dest)}`);
}

// 4. Copy HTML and CSS for Pet
copyFile(
  path.join(__dirname, '../src/renderer/pet/index.html'),
  path.join(__dirname, '../dist/renderer/pet/index.html')
);
copyFile(
  path.join(__dirname, '../src/renderer/pet/pet.css'),
  path.join(__dirname, '../dist/renderer/pet/pet.css')
);

// 5. Copy HTML and CSS for Companion
copyFile(
  path.join(__dirname, '../src/renderer/companion/index.html'),
  path.join(__dirname, '../dist/renderer/companion/index.html')
);
copyFile(
  path.join(__dirname, '../src/renderer/companion/companion.css'),
  path.join(__dirname, '../dist/renderer/companion/companion.css')
);

// 6. Ensure icons exist
const iconScript = path.join(__dirname, '../src/tools/generateIcons.js');
if (fs.existsSync(iconScript)) {
  execSync(`node "${iconScript}"`, { stdio: 'inherit' });
}

console.log('Build complete! Ready to run.');
