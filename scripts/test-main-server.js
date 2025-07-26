#!/usr/bin/env node

console.log('🚀 Testing main server import and basic functionality...');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

// Test importing the main server file
try {
  console.log('📦 Testing main server import...');
  
  // Import the server file but don't execute the initialization
  const serverModule = await import('../server/index.ts');
  console.log('✅ Main server module imported successfully');
  
  // Check what's exported
  console.log('📋 Available exports:', Object.keys(serverModule));
  
  // Test basic Express setup
  console.log('🔧 Testing basic Express setup...');
  const express = await import('express');
  const app = express.default();
  
  // Basic middleware
  app.use(express.json());
  
  // Health check route
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: 'Main server module loaded successfully'
    });
  });
  
  const port = process.env.PORT || 3000;
  
  const server = app.listen(port, () => {
    console.log(`✅ Test server started on port ${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/health`);
    
    // Close after 3 seconds
    setTimeout(() => {
      console.log('🛑 Closing test server...');
      server.close(() => {
        console.log('✅ Test completed successfully');
        process.exit(0);
      });
    }, 3000);
  });
  
} catch (error) {
  console.error('❌ Failed to import or test main server:', error);
  console.error('📋 Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n')
  });
  process.exit(1);
} 