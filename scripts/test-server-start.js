#!/usr/bin/env node

console.log('🚀 Testing minimal server startup...');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

// Test basic Express server
try {
  console.log('📦 Testing Express server creation...');
  const express = await import('express');
  const app = express.default();
  
  // Basic middleware
  app.use(express.json());
  
  // Basic route
  app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    });
  });
  
  const port = process.env.PORT || 3000;
  
  const server = app.listen(port, () => {
    console.log(`✅ Server started successfully on port ${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
    
    // Close server after 5 seconds
    setTimeout(() => {
      console.log('🛑 Closing test server...');
      server.close(() => {
        console.log('✅ Test server closed successfully');
        process.exit(0);
      });
    }, 5000);
  });
  
  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Failed to start test server:', error);
  process.exit(1);
} 