#!/usr/bin/env node
// ==========================================================
// run.js — the ONE script: sets up ResumeAI if it hasn't been set up
// yet, then starts both servers. This is what run.bat / run.sh call.
//
// First time on a machine: does the full install + .env creation,
// then starts. Every time after that: skips straight to starting,
// since setup.js's own checks make it a no-op once everything exists.
//
// Run it with: node run.js   (or double-click run.bat on Windows,
// or ./run.sh on Mac/Linux)
//
// Press Ctrl+C once to stop both servers.
// ==========================================================

const path = require('path');
const fs = require('fs');
const { spawnSync, spawn } = require('child_process');

const ROOT = __dirname;

function needsSetup() {
  return (
    !fs.existsSync(path.join(ROOT, 'backend', '.env')) ||
    !fs.existsSync(path.join(ROOT, 'backend', 'node_modules')) ||
    !fs.existsSync(path.join(ROOT, 'frontend', 'node_modules'))
  );
}

if (needsSetup()) {
  console.log('First run on this machine — running setup first...\n');
  const setup = spawnSync(process.execPath, [path.join(ROOT, 'setup.js')], { stdio: 'inherit' });
  if (setup.status !== 0) {
    console.error('\n❌ Setup failed — see the output above. Fix that, then run this again.');
    process.exit(setup.status || 1);
  }
  console.log('');
}

// start.js owns the actual boot + colour-coded output + full-process-
// tree shutdown logic — reused as-is rather than duplicated here.
const start = spawn(process.execPath, [path.join(ROOT, 'start.js')], { stdio: 'inherit' });

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => start.kill(sig));
});

start.on('exit', (code) => process.exit(code === null ? 0 : code));
