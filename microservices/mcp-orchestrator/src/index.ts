import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import dotenv from 'dotenv';

// Import middleware
import { logRequest } from './utils/logger';
import { metricsMiddleware, startMetricsCollection } from './middleware/metrics';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { sanitizeInput } from './middleware/validation';

// Import routes
import mcpRoutes from './routes/mcp';

// Import services
import { routingService } from './services/routing';
import { contextManager } from './services/context-manager';
import { agentCoordinator } from './services/agent-coordinator';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

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

// Request logging
app.use(logRequest);

// Metrics middleware
app.use(metricsMiddleware);

// Rate limiting
const limiter = rateLimit({
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
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many MCP requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'mcp-orchestrator',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/mcp', mcpLimiter, mcpRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const { getMetrics } = await import('./middleware/metrics');
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    console.log('Initializing MCP Orchestrator services...');
    
    // Start metrics collection
    startMetricsCollection();
    
    // Register default services (for testing)
    await routingService.registerService({
      name: 'user-service',
      url: 'http://localhost:3001',
      port: 3001,
      capabilities: ['user_management'],
      version: '1.0.0',
      healthCheckUrl: 'http://localhost:3001/api/health'
    });

    await routingService.registerService({
      name: 'ai-services',
      url: 'http://localhost:3008',
      port: 3008,
      capabilities: ['ai_services'],
      version: '1.0.0',
      healthCheckUrl: 'http://localhost:3008/api/health'
    });

    console.log('MCP Orchestrator services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    app.listen(PORT, () => {
      console.log(`🚀 MCP Orchestrator service running on port ${PORT}`);
      console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      console.log(`🔗 API endpoints at http://localhost:${PORT}/api/mcp`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new requests
    console.log('Stopping server...');
    
    // Cleanup services
    console.log('Cleaning up services...');
    await agentCoordinator.cleanup();
    contextManager.stopCleanupInterval();
    
    console.log('✅ Graceful shutdown completed');
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
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer(); 