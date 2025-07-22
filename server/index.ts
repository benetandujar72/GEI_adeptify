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

// Configuración de conexión con SSL para Render
const sql = postgres(databaseUrl, {
  max: 5, // Máximo 5 conexiones en el pool
  idle_timeout: 20, // Cerrar conexiones inactivas después de 20 segundos
  connect_timeout: 10, // Timeout de conexión de 10 segundos
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Para Render.com
  } : false,
  connection: {
    application_name: 'gei-unified-platform'
  }
});
export const db = drizzle(sql);

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'sha256-adZL5tq2getU14Zvm3HPDk7Uivy3/+4vhfw8OLrqKhY='"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:", "https://gei.adeptify.es", "https://gei-adeptify.onrender.com"],
    },
  },
}));

// Middleware de compresión
app.use(compression());

// Configuración de CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || 'https://gei.adeptify.es'
    : ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));

// Middleware de logging para todas las peticiones
app.use((req, res, next) => {
  const startTime = Date.now();
  
  logger.info(`🌐 ${req.method} ${req.path} - Iniciando petición`);
  logger.info(`📋 User-Agent: ${req.headers['user-agent']}`);
  logger.info(`🌍 IP: ${req.ip || req.connection.remoteAddress}`);
  
  // Log de respuesta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`✅ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de sesiones
import connectPg from 'connect-pg-simple';

const PostgresStore = connectPg(session);

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
    ? new PostgresStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: 24 * 60 * 60, // 24 horas en segundos
        tableName: 'sessions'
      })
    : undefined, // Usar MemoryStore solo en desarrollo
}));

// Configuración de Passport
app.use(passport.initialize());
app.use(passport.session());
setupPassport(passport);

// Servir archivos estáticos del cliente
if (process.env.NODE_ENV === 'production') {
  logger.info('📁 Configurando archivos estáticos para producción...');
  logger.info(`📂 Ruta de archivos estáticos: ${path.join(__dirname, '../client/dist')}`);
  
  // Verificar si el directorio existe
  const staticPath = path.join(__dirname, '../client/dist');
  const fs = await import('fs');
  if (fs.existsSync(staticPath)) {
    logger.info('✅ Directorio de archivos estáticos encontrado');
    
    // Listar archivos en el directorio
    try {
      const files = fs.readdirSync(staticPath);
      logger.info(`📋 Archivos encontrados en dist: ${files.length} archivos`);
      files.slice(0, 10).forEach(file => {
        logger.info(`   📄 ${file}`);
      });
      if (files.length > 10) {
        logger.info(`   ... y ${files.length - 10} archivos más`);
      }
    } catch (error) {
      logger.error('❌ Error leyendo directorio de archivos estáticos:', error);
    }
  } else {
    logger.error('❌ Directorio de archivos estáticos NO encontrado');
    logger.error(`🔍 Buscando en: ${staticPath}`);
  }
  
  app.use(express.static(path.join(__dirname, '../client/dist')));
  logger.info('✅ Middleware de archivos estáticos configurado');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    port: process.env.PORT || 3000,
    uptime: process.uptime(),
  });
});

// Simple health check for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'GEI Unified Platform'
  });
});

// Database health check endpoint
app.get('/api/health/db', async (req, res) => {
  try {
    // Test database connection
    const result = await sql`SELECT 1 as test, current_timestamp as timestamp`;
    
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      test_result: result[0],
      connection_info: {
        host: process.env.DB_HOST || 'unknown',
        database: process.env.DB_NAME || 'unknown',
        pool_size: 5,
        max_connections: 10 // Render limit
      }
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de diagnóstico detallado
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    logger.info('🔍 Endpoint de diagnóstico solicitado');
    
    const staticPath = path.join(__dirname, '../client/dist');
    const indexPath = path.join(staticPath, 'index.html');
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      staticPath: staticPath,
      indexPath: indexPath,
      staticPathExists: fs.existsSync(staticPath),
      indexHtmlExists: fs.existsSync(indexPath),
      currentDir: __dirname,
      processCwd: process.cwd(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        CORS_ORIGIN: process.env.CORS_ORIGIN
      }
    };
    
    // Listar archivos si el directorio existe
    if (fs.existsSync(staticPath)) {
      try {
        const files = fs.readdirSync(staticPath);
        debugInfo.files = files;
        debugInfo.fileCount = files.length;
      } catch (error) {
        debugInfo.readError = error.message;
      }
    }
    
    logger.info('📊 Información de diagnóstico:', debugInfo);
    res.json(debugInfo);
    
  } catch (error) {
    logger.error('❌ Error en endpoint de diagnóstico:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Configuración de rutas API
app.use('/api', setupRoutes());

// Configuración de WebSocket
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Manejo de rutas del cliente (SPA) - SOLO para rutas que no sean API ni archivos estáticos
if (process.env.NODE_ENV === 'production') {
  logger.info('🌐 Configurando rutas SPA para producción...');
  
  app.get('*', (req, res, next) => {
    logger.info(`�� Petición recibida: ${req.method} ${req.path}`);
    logger.info(`📋 Headers: ${JSON.stringify(req.headers, null, 2)}`);
    
    // No interceptar rutas de API
    if (req.path.startsWith('/api/')) {
      logger.info(`✅ Ruta API detectada, pasando al siguiente middleware: ${req.path}`);
      return next();
    }
    
    // No interceptar archivos estáticos
    if (req.path.includes('.') && !req.path.includes('..')) {
      logger.info(`✅ Archivo estático detectado, pasando al siguiente middleware: ${req.path}`);
      return next();
    }
    
    // Para todas las demás rutas, servir index.html (SPA)
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    logger.info(`🌐 Sirviendo index.html para ruta SPA: ${req.path}`);
    logger.info(`📂 Ruta del archivo: ${indexPath}`);
    
    // Verificar si el archivo existe
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
      logger.info('✅ index.html encontrado, enviando archivo');
      res.sendFile(indexPath);
    } else {
      logger.error('❌ index.html NO encontrado');
      logger.error(`🔍 Buscando en: ${indexPath}`);
      res.status(404).send('index.html no encontrado');
    }
  });
  
  logger.info('✅ Rutas SPA configuradas');
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
process.on('SIGTERM', async () => {
  logger.info('🛑 Recibida señal SIGTERM, cerrando servidor...');
  
  // Cerrar servidor HTTP
  server.close(async () => {
    logger.info('✅ Servidor HTTP cerrado correctamente');
    
    // Cerrar conexiones de base de datos
    try {
      await sql.end();
      logger.info('✅ Conexiones de base de datos cerradas correctamente');
    } catch (error) {
      logger.error('❌ Error al cerrar conexiones de base de datos:', error);
    }
    
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('🛑 Recibida señal SIGINT, cerrando servidor...');
  
  // Cerrar servidor HTTP
  server.close(async () => {
    logger.info('✅ Servidor HTTP cerrado correctamente');
    
    // Cerrar conexiones de base de datos
    try {
      await sql.end();
      logger.info('✅ Conexiones de base de datos cerradas correctamente');
    } catch (error) {
      logger.error('❌ Error al cerrar conexiones de base de datos:', error);
    }
    
    process.exit(0);
  });
});

// Inicializar aplicación
initializeApp(); 