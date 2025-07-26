#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting production server...');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔧 PORT: ${process.env.PORT}`);
console.log(`📁 Current directory: ${process.cwd()}`);

// Check if dist folder exists and has the built server
const distPath = path.join(process.cwd(), 'dist');
const serverPath = path.join(distPath, 'index.js');

if (!fs.existsSync(serverPath)) {
  console.log('⚠️ Built server not found, attempting to build...');
  try {
    console.log('🔨 Building server...');
    execSync('npm run build:server', { stdio: 'inherit' });
    console.log('✅ Server built successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.log('🔄 Trying alternative build method...');
    
    try {
      // Try building with tsx directly
      execSync('npx tsx server/index.ts', { stdio: 'inherit' });
    } catch (altError) {
      console.error('❌ Alternative build also failed:', altError.message);
      process.exit(1);
    }
  }
}

// Verify the built server exists
if (!fs.existsSync(serverPath)) {
  console.error('❌ Built server still not found after build attempt');
  console.log('📁 Available files in dist:', fs.readdirSync(distPath));
  process.exit(1);
}

console.log('✅ Built server found, starting...');

// Start the server
try {
  console.log('🎯 Starting server from:', serverPath);
  
  // Import and run the server
  const { default: serverModule } = await import(serverPath);
  
  // If the module exports a function, call it
  if (typeof serverModule === 'function') {
    serverModule();
  }
  
  console.log('✅ Server started successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  
  // Try alternative startup method
  console.log('🔄 Trying alternative startup method...');
  try {
    execSync(`node ${serverPath}`, { stdio: 'inherit' });
  } catch (altError) {
    console.error('❌ Alternative startup also failed:', altError.message);
    process.exit(1);
  }
} 