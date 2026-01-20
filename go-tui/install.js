#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PACKAGE_VERSION = require('./package.json').version;
const BINARY_NAME = 'jira-report';

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

function getBinaryPath() {
  const platform = getPlatform();
  const binDir = path.join(__dirname, 'bin');
  const ext = process.platform === 'win32' ? '.exe' : '';
  
  // Check if platform-specific binary exists
  const platformBinary = path.join(binDir, `${BINARY_NAME}-${platform}${ext}`);
  if (fs.existsSync(platformBinary)) {
    return platformBinary;
  }

  // Fallback to generic binary name
  const genericBinary = path.join(binDir, `${BINARY_NAME}${ext}`);
  if (fs.existsSync(genericBinary)) {
    return genericBinary;
  }

  return null;
}

function makeExecutable(filePath) {
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(filePath, 0o755);
    } catch (err) {
      console.error(`Failed to make binary executable: ${err.message}`);
    }
  }
}

function install() {
  console.log(`Installing jira-report-tui v${PACKAGE_VERSION}...`);
  
  const binaryPath = getBinaryPath();
  
  if (!binaryPath) {
    console.error(`No binary found for ${getPlatform()}`);
    console.error('Please check the bin/ directory or file an issue.');
    process.exit(1);
  }

  // Make binary executable
  makeExecutable(binaryPath);

  // Create symlink for cross-platform compatibility
  const binDir = path.join(__dirname, 'bin');
  const symlinkPath = path.join(binDir, BINARY_NAME);
  
  if (binaryPath !== symlinkPath) {
    try {
      if (fs.existsSync(symlinkPath)) {
        fs.unlinkSync(symlinkPath);
      }
      if (process.platform === 'win32') {
        fs.copyFileSync(binaryPath, symlinkPath);
      } else {
        fs.symlinkSync(path.basename(binaryPath), symlinkPath);
      }
    } catch (err) {
      // If symlink fails, just copy the file
      fs.copyFileSync(binaryPath, symlinkPath);
      makeExecutable(symlinkPath);
    }
  }

  console.log(`✅ jira-report-tui installed successfully!`);
  console.log(`Run 'jira-report tui' to start.`);
}

install();
