import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración de variables de entorno
config();

// Configuración de rutas de archivos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importaciones de servicios
import { initializeDatabase } from './database/init.js';
import { setupPassport } from './auth/passport.js';
import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './websocket/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './utils/logger.js';

// Configuración de la aplicación
const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

// Configuración de base de datos
const databaseUrl = process.env.DATABASE_URL || 'postgresql://gei_user:gei_password@localhost:5432/gei_unified';
const sql = postgres(databaseUrl);
export const db = drizzle(sql);

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Middleware de compresión
app.use(compression());

// Configuración de CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  },
  store: process.env.NODE_ENV === 'production' 
    ? undefined // Usar store de base de datos en producción
    : undefined, // Usar store en memoria en desarrollo
}));

// Configuración de Passport
app.use(passport.initialize());
app.use(passport.session());
setupPassport(passport);

// Servir archivos estáticos del cliente
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist/client')));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Configuración de rutas API
app.use('/api', setupRoutes());

// Configuración de WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Manejo de rutas del cliente (SPA)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/client/index.html'));
  });
}

// Middleware de manejo de errores
app.use(errorHandler);

// Función de inicialización
async function initializeApp() {
  try {
    logger.info('🚀 Iniciando GEI Unified Platform...');
    
    // Inicializar base de datos
    await initializeDatabase();
    logger.info('✅ Base de datos inicializada');
    
    // Iniciar servidor
    server.listen(port, () => {
      logger.info(`🌐 Servidor ejecutándose en puerto ${port}`);
      logger.info(`📊 Health check: http://localhost:${port}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`🎨 Cliente: http://localhost:3001`);
      }
    });
    
  } catch (error) {
    logger.error('❌ Error al inicializar la aplicación:', error);
    process.exit(1);
  }
}

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('🛑 Recibida señal SIGTERM, cerrando servidor...');
  server.close(() => {
    logger.info('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('🛑 Recibida señal SIGINT, cerrando servidor...');
  server.close(() => {
    logger.info('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Inicializar aplicación
initializeApp(); 