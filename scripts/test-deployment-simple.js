#!/usr/bin/env node

console.log('🚀 Testing deployment environment...');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔧 PORT: ${process.env.PORT}`);
console.log(`🗄️ DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`🔑 SESSION_SECRET: ${process.env.SESSION_SECRET ? 'SET' : 'NOT SET'}`);

// Test basic imports
try {
  console.log('📦 Testing basic imports...');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const postgres = await import('postgres');
  const express = await import('express');
  console.log('✅ Basic imports successful');
} catch (error) {
  console.error('❌ Import error:', error.message);
  process.exit(1);
}

// Test database connection
try {
  console.log('🗄️ Testing database connection...');
  const postgres = (await import('postgres')).default;
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://gei_user:gei_password@localhost:5432/gei_unified';
  
  const sql = postgres(databaseUrl, {
    max: 1,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });
  
  await sql`SELECT 1`;
  console.log('✅ Database connection successful');
  await sql.end();
} catch (error) {
  console.error('❌ Database connection error:', error.message);
  // Don't exit here, just log the error
}

// Test file system access
try {
  console.log('📁 Testing file system access...');
  const fs = await import('fs');
  const path = await import('path');
  
  // Check if dist folder exists
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ dist folder exists');
  } else {
    console.log('⚠️ dist folder does not exist');
  }
  
  // Check if server files exist
  const serverPath = path.join(process.cwd(), 'server');
  if (fs.existsSync(serverPath)) {
    console.log('✅ server folder exists');
  } else {
    console.log('⚠️ server folder does not exist');
  }
} catch (error) {
  console.error('❌ File system error:', error.message);
}

console.log('✅ Deployment test completed');
console.log('🎯 Ready to start server...'); 