#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function getPlatform() {
  const type = process.platform;
  const arch = process.arch;

  if (type === 'win32') {
    return arch === 'x64' ? 'windows-amd64' : 'windows-arm64';
  }
  if (type === 'darwin') {
    return arch === 'x64' ? 'darwin-amd64' : 'darwin-arm64';
  }
  if (type === 'linux') {
    return arch === 'x64' ? 'linux-amd64' : 'linux-arm64';
  }

  console.error(`Unsupported platform: ${type} ${arch}`);
  process.exit(1);
}

const platform = getPlatform();
const binDir = path.join(__dirname, 'bin');
const ext = process.platform === 'win32' ? '.exe' : '';
const binaryPath = path.join(binDir, `jira-report-${platform}${ext}`);

if (!fs.existsSync(binaryPath)) {
  console.error(`Binary not found for ${platform}: ${binaryPath}`);
  console.error('Please report this issue at: https://github.com/voxuanthuan/daily-report/issues');
  process.exit(1);
}

// Execute the binary
const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code);
});
