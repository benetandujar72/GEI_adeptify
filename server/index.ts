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
import fs from 'fs';

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
const port = process.env.PORT || 3001;

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

// Middleware de cookies
// app.use(cookieParser()); // Eliminado

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
  // TEMPORAL: Usar MemoryStore para evitar problemas SSL con PostgreSQL
  // store: process.env.NODE_ENV === 'production' 
  //   ? new PostgresStore({
  //       conString: process.env.DATABASE_URL,
  //       createTableIfMissing: true,
  //       ttl: 24 * 60 * 60, // 24 horas en segundos
  //       tableName: 'sessions'
  //     })
  //   : undefined, // Usar MemoryStore solo en desarrollo
}));

// Configuración de Passport
app.use(passport.initialize());
app.use(passport.session());
setupPassport(passport);

// Endpoint temporal para manifest.json
app.get('/manifest.json', (req, res) => {
  logger.info('🔍 ===== PETICIÓN MANIFEST.JSON RECIBIDA (ENDPOINT TEMPORAL) =====');
  
  const manifestContent = {
    "name": "GEI Unified Platform",
    "short_name": "GEI Platform",
    "description": "Plataforma Unificada de Gestión Educativa Integral",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#3b82f6",
    "icons": [
      {
        "src": "/logo.svg",
        "sizes": "any",
        "type": "image/svg+xml",
        "purpose": "any maskable"
      }
    ]
  };
  
  logger.info('✅ Enviando manifest.json desde endpoint temporal');
  res.setHeader('Content-Type', 'application/json');
  res.json(manifestContent);
});

// Endpoint temporal para logo.svg
app.get('/logo.svg', (req, res) => {
  logger.info('🔍 ===== PETICIÓN LOGO.SVG RECIBIDA (ENDPOINT TEMPORAL) =====');
  
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fondo circular -->
  <circle cx="50" cy="50" r="45" fill="url(#grad1)" stroke="#1e40af" stroke-width="2"/>
  
  <!-- Letra G estilizada -->
  <path d="M30 25 Q30 15 40 15 L60 15 Q70 15 70 25 L70 35 Q70 45 60 45 L45 45 L45 55 L60 55 Q70 55 70 65 L70 75 Q70 85 60 85 L40 85 Q30 85 30 75 L30 65 Q30 55 40 55 L55 55 L55 45 L40 45 Q30 45 30 35 Z" 
        fill="white" stroke="white" stroke-width="1"/>
  
  <!-- Elementos decorativos -->
  <circle cx="25" cy="25" r="3" fill="#fbbf24" opacity="0.8"/>
  <circle cx="75" cy="75" r="3" fill="#fbbf24" opacity="0.8"/>
  <circle cx="75" cy="25" r="2" fill="#fbbf24" opacity="0.6"/>
  <circle cx="25" cy="75" r="2" fill="#fbbf24" opacity="0.6"/>
</svg>`;
  
  logger.info('✅ Enviando logo.svg desde endpoint temporal');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(logoSvg);
});

// Servir archivos estáticos del cliente
if (process.env.NODE_ENV === 'production') {
  logger.info('📁 ===== INICIO CONFIGURACIÓN ARCHIVOS ESTÁTICOS =====');
  logger.info('🔄 REDEPLOY FORZADO - Verificando archivos manifest.json y logo.svg');
  logger.info(`📂 __dirname: ${__dirname}`);
  logger.info(`📂 process.cwd(): ${process.cwd()}`);
  
  // Intentar múltiples rutas posibles para los archivos estáticos
  const possiblePaths = [
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, '../../client/dist'),
    path.join(__dirname, '../dist/client'),
    path.join(__dirname, './client/dist'),
    path.join(process.cwd(), 'client/dist'),
    path.join(process.cwd(), 'dist/client'),
    path.join(process.cwd(), 'dist')
  ];
  
  logger.info('🔍 ===== PROBANDO RUTAS POSIBLES =====');
  let staticPath = null;
  for (const testPath of possiblePaths) {
    logger.info(`🔍 Probando ruta: ${testPath}`);
    const exists = fs.existsSync(testPath);
    logger.info(`   ${exists ? '✅ EXISTE' : '❌ NO EXISTE'}: ${testPath}`);
    
    if (exists) {
      staticPath = testPath;
      logger.info(`🎯 DIRECTORIO ENCONTRADO: ${staticPath}`);
      break;
    }
  }
  
  if (!staticPath) {
    logger.error('❌ ===== CRÍTICO: NO SE ENCONTRÓ NINGÚN DIRECTORIO =====');
    possiblePaths.forEach(p => logger.error(`   🔍 Buscado en: ${p}`));
    logger.error('❌ ===== FIN CONFIGURACIÓN ARCHIVOS ESTÁTICOS =====');
  } else {
    logger.info('📋 ===== LISTANDO CONTENIDO DEL DIRECTORIO =====');
    // Listar archivos en el directorio
    try {
      const files = fs.readdirSync(staticPath);
      logger.info(`📋 Total archivos encontrados: ${files.length}`);
      logger.info(`📂 Directorio: ${staticPath}`);
      
      // Buscar archivos específicos
      const manifestExists = files.includes('manifest.json');
      const logoExists = files.includes('logo.svg');
      const indexExists = files.includes('index.html');
      
      logger.info(`📄 manifest.json: ${manifestExists ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);
      logger.info(`📄 logo.svg: ${logoExists ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);
      logger.info(`📄 index.html: ${indexExists ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'}`);
      
      // Listar todos los archivos
      files.forEach((file, index) => {
        logger.info(`   ${index + 1}. ${file}`);
      });
      
    } catch (error) {
      logger.error('❌ Error leyendo directorio de archivos estáticos:', error);
    }
    
    // Endpoints específicos para archivos críticos (ANTES de express.static)
    app.get('/manifest.json', (req, res) => {
      logger.info('🔍 ===== PETICIÓN MANIFEST.JSON RECIBIDA =====');
      logger.info(`📂 staticPath: ${staticPath}`);
      const manifestPath = path.join(staticPath, 'manifest.json');
      logger.info(`📂 Ruta completa: ${manifestPath}`);
      
      const fileExists = fs.existsSync(manifestPath);
      logger.info(`📄 Archivo existe: ${fileExists ? '✅ SÍ' : '❌ NO'}`);
      
      if (fileExists) {
        logger.info('✅ manifest.json encontrado, enviando archivo');
        res.setHeader('Content-Type', 'application/json');
        res.sendFile(manifestPath);
      } else {
        logger.error('❌ ===== MANIFEST.JSON NO ENCONTRADO =====');
        logger.error(`📂 Buscado en: ${manifestPath}`);
        logger.error(`📂 staticPath: ${staticPath}`);
        logger.error(`📂 __dirname: ${__dirname}`);
        logger.error(`📂 process.cwd(): ${process.cwd()}`);
        
        // Intentar listar el directorio para debug
        try {
          const files = fs.readdirSync(staticPath);
          logger.error(`📋 Archivos en el directorio: ${files.join(', ')}`);
        } catch (listError) {
          logger.error('❌ Error listando directorio:', listError);
        }
        
        res.status(404).json({ 
          error: 'manifest.json not found',
          searchedPath: manifestPath,
          staticPath: staticPath,
          currentDir: __dirname,
          processCwd: process.cwd()
        });
      }
    });
    
    app.get('/logo.svg', (req, res) => {
      logger.info('🔍 ===== PETICIÓN LOGO.SVG RECIBIDA =====');
      const logoPath = path.join(staticPath, 'logo.svg');
      logger.info(`📂 Ruta completa: ${logoPath}`);
      
      const fileExists = fs.existsSync(logoPath);
      logger.info(`📄 Archivo existe: ${fileExists ? '✅ SÍ' : '❌ NO'}`);
      
      if (fileExists) {
        logger.info('✅ logo.svg encontrado, enviando archivo');
        res.setHeader('Content-Type', 'image/svg+xml');
        res.sendFile(logoPath);
      } else {
        logger.error('❌ ===== LOGO.SVG NO ENCONTRADO =====');
        logger.error(`📂 Buscado en: ${logoPath}`);
        res.status(404).json({ 
          error: 'logo.svg not found',
          searchedPath: logoPath,
          staticPath: staticPath
        });
      }
    });
    
    app.use(express.static(staticPath));
    logger.info('✅ ===== MIDDLEWARE DE ARCHIVOS ESTÁTICOS CONFIGURADO =====');
    logger.info(`📂 Ruta configurada: ${staticPath}`);
  }
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

// Endpoint de debug específico para manifest.json
app.get('/api/debug-manifest', (req, res) => {
  logger.info('🔍 ===== ENDPOINT DEBUG MANIFEST SOLICITADO =====');
  
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    currentDir: __dirname,
    processCwd: process.cwd(),
    possiblePaths: [
      path.join(__dirname, '../client/dist'),
      path.join(__dirname, '../../client/dist'),
      path.join(__dirname, '../dist/client'),
      path.join(__dirname, './client/dist'),
      path.join(process.cwd(), 'client/dist'),
      path.join(process.cwd(), 'dist/client'),
      path.join(process.cwd(), 'dist')
    ]
  };
  
  // Probar cada ruta
  debugInfo.pathTests = [];
  for (const testPath of debugInfo.possiblePaths) {
    const exists = fs.existsSync(testPath);
    debugInfo.pathTests.push({
      path: testPath,
      exists: exists,
      files: exists ? fs.readdirSync(testPath) : null,
      manifestExists: exists ? fs.existsSync(path.join(testPath, 'manifest.json')) : false,
      logoExists: exists ? fs.existsSync(path.join(testPath, 'logo.svg')) : false,
      indexExists: exists ? fs.existsSync(path.join(testPath, 'index.html')) : false
    });
  }
  
  logger.info('📊 Información de debug manifest:', debugInfo);
  res.json(debugInfo);
});

// Endpoint de diagnóstico detallado
app.get('/api/debug', (req, res) => {
  try {
    logger.info('🔍 Endpoint de diagnóstico solicitado');
    
    const staticPath = path.join(__dirname, '../client/dist');
    const indexPath = path.join(staticPath, 'index.html');
    
    const debugInfo: any = {
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
        debugInfo.readError = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    logger.info('📊 Información de diagnóstico:', debugInfo);
    res.json(debugInfo);
    
  } catch (error) {
    logger.error('❌ Error en endpoint de diagnóstico:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
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