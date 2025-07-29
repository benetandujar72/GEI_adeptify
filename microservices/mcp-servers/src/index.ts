import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { serverManager } from '@/services/server-manager';
import mcpServersRoutes from '@/routes/mcp-servers';
import { sanitizeInput } from '@/middleware/validation';
import { logRequest } from '@/utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://gei.adeptify.es'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const mcpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: {
    success: false,
    error: 'Too many MCP requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Input sanitization
app.use(sanitizeInput);

// Request logging
app.use((req, res, next) => {
  logRequest('mcp-servers', req.method, req.url, Date.now());
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'MCP Servers',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// API routes
app.use('/api/mcp-servers', mcpLimiter, mcpServersRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Initialize services
const initializeServices = async (): Promise<void> => {
  try {
    console.log('Initializing MCP Servers service...');
    
    // Create default file system server for testing
    if (process.env.NODE_ENV === 'development') {
      const { FileSystemServer } = await import('@/services/file-system-server');
      const fileServer = new FileSystemServer({
        name: 'Default File System Server',
        description: 'Default file system server for development'
      });
      
      await serverManager.registerServer(fileServer);
      await fileServer.start();
      
      console.log('Default file system server started');
    }
    
    console.log('MCP Servers service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async (): Promise<void> => {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 MCP Servers service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API base: http://localhost:${PORT}/api/mcp-servers`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await serverManager.shutdown();
    console.log('✅ MCP Servers service shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();