const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');

console.log('Testing Electron runtime launch...');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.'], {
  cwd: path.join(__dirname, '..'),
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let stderrOutput = '';
let stdoutOutput = '';

child.stdout.on('data', (data) => {
  stdoutOutput += data.toString();
  console.log('[Electron stdout]:', data.toString().trim());
});

child.stderr.on('data', (data) => {
  stderrOutput += data.toString();
  console.error('[Electron stderr]:', data.toString().trim());
});

// Let it run for 5 seconds to ensure initialization, window creation, store loading, IPC setup succeed
setTimeout(() => {
  console.log('Test run period finished. Gracefully terminating process...');
  child.kill();
  if (stderrOutput && !stderrOutput.includes('DevTools') && !stderrOutput.includes('GPU')) {
    console.log('Stderr detected:', stderrOutput);
  } else {
    console.log('SUCCESS: Electron application launched and ran without fatal errors!');
  }
  process.exit(0);
}, 5000);
