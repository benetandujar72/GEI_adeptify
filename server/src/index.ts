// LOG INMEDIATO - INICIO DEL ARCHIVO
console.log('🔥🔥🔥 INICIO DE server/index.ts - ARCHIVO CARGÁNDOSE 🔥🔥🔥');
console.log(`🔥 Timestamp: ${new Date().toISOString()}`);
console.log(`🔥 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔥 __filename: ${import.meta.url}`);
console.log(`🔥 process.cwd(): ${process.cwd()}`);
console.log(`🔥 __dirname: ${import.meta.url}`);

// Verificar archivos críticos antes de importar
import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando archivos críticos antes de importar...');
const criticalPaths = [
  'shared/schema.ts',
  'server/database/init.ts',
  'server/auth/passport.ts'
];

criticalPaths.forEach(filePath => {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`📂 ${filePath}: ${exists ? '✅ EXISTE' : '❌ NO EXISTE'} (${fullPath})`);
  } catch (error) {
    console.log(`❌ Error verificando ${filePath}:`, error);
  }
});

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
import { fileURLToPath } from 'url';
import { initializeDatabase, db, sql } from './database/init.js';
import { setupPassport } from './auth/passport.js';
import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './websocket/index.js';
import { NotificationService } from './websocket/notification-service.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './utils/logger.js';
import { auditAuth } from './middleware/audit.js';
import { cacheService } from './services/cache-service.js';
import { databaseOptimizer } from './services/database-optimizer.js';
import { aiChatbotService } from './services/ai-chatbot-service.js';
import { aiAnalyticsService } from './services/ai-analytics-service.js';
import { aiReportGeneratorService } from './services/ai-report-generator.js';
import { calendarService } from './services/calendar-service.js';

// Configuración de variables de entorno
config();
console.log('🔥🔥🔥 dotenv configurado 🔥🔥🔥');

// Configuración de rutas de archivos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔥🔥🔥 TODAS LAS IMPORTACIONES COMPLETADAS 🔥🔥🔥');
console.log(`🔥 logger disponible: ${typeof logger}`);
console.log(`🔥 initializeDatabase disponible: ${typeof initializeDatabase}`);

// Configuración de la aplicación
const app = express();
const server = createServer(app);
const port = process.env.PORT || 3001;

// Database connection is now imported from ./database/init.js

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
      connectSrc: process.env.NODE_ENV === 'production' 
        ? ["'self'", "ws:", "wss:", "https://gei.adeptify.es", "https://gei-adeptify.onrender.com"]
        : ["'self'", "ws:", "wss:", "http://localhost:3001", "http://localhost:3000"],
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

// Middleware de auditoría para autenticación
app.use(auditAuth());

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
    path.join(process.cwd(), 'client/dist'),  // Docker production path
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, '../../client/dist'),
    path.join(__dirname, '../dist/client'),
    path.join(__dirname, './client/dist'),
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
    
    // Middleware específico para archivos de assets con logging
    app.use('/assets', (req, res, next) => {
      logger.info(`🔍 ===== PETICIÓN ASSET RECIBIDA =====`);
      logger.info(`📂 Ruta solicitada: ${req.url}`);
      logger.info(`📂 staticPath: ${staticPath}`);
      logger.info(`📂 Ruta completa: ${path.join(staticPath, 'assets', req.url)}`);
      
      const assetPath = path.join(staticPath, 'assets', req.url);
      if (fs.existsSync(assetPath)) {
        logger.info(`✅ Asset encontrado: ${req.url}`);
        next();
      } else {
        logger.error(`❌ Asset no encontrado: ${req.url}`);
        logger.error(`📂 Buscado en: ${assetPath}`);
        
        // Listar archivos disponibles en assets para debug
        const assetsDir = path.join(staticPath, 'assets');
        if (fs.existsSync(assetsDir)) {
          try {
            const files = fs.readdirSync(assetsDir);
            logger.error(`📋 Archivos disponibles en assets: ${files.join(', ')}`);
          } catch (error) {
            logger.error('❌ Error listando archivos de assets:', error);
          }
        } else {
          logger.error(`❌ Directorio assets no existe: ${assetsDir}`);
        }
        
        next();
      }
    }, express.static(path.join(staticPath, 'assets')));
    
    // Middleware general para archivos estáticos
    app.use(express.static(staticPath));
    
    // Fallback para SPA - servir index.html para rutas no encontradas
    app.get('*', (req, res) => {
      // Solo servir index.html para rutas que no sean API
      if (!req.path.startsWith('/api/')) {
        logger.info(`🔄 ===== FALLBACK SPA =====`);
        logger.info(`📂 Ruta solicitada: ${req.path}`);
        logger.info(`📂 Sirviendo index.html`);
        
        const indexPath = path.join(staticPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          logger.error(`❌ index.html no encontrado en: ${indexPath}`);
          res.status(404).json({ 
            error: 'index.html not found',
            path: req.path,
            searchedPath: indexPath
          });
        }
      } else {
        res.status(404).json({ error: 'API endpoint not found', path: req.path });
      }
    });
    
    logger.info('✅ ===== MIDDLEWARE DE ARCHIVOS ESTÁTICOS CONFIGURADO =====');
    logger.info(`📂 Ruta configurada: ${staticPath}`);
    logger.info(`📂 Ruta de assets: ${path.join(staticPath, 'assets')}`);
    
    // Verificar que los archivos de assets existen
    const assetsPath = path.join(staticPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      try {
        const assetFiles = fs.readdirSync(assetsPath);
        logger.info(`📋 Archivos en assets: ${assetFiles.join(', ')}`);
      } catch (error) {
        logger.error('❌ Error leyendo directorio assets:', error);
      }
    } else {
      logger.error(`❌ Directorio assets no encontrado: ${assetsPath}`);
    }
  }
}

// Configuración de rutas
app.use('/api', setupRoutes());

// Health check endpoint para Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Health check endpoint para API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected',
      cache: 'connected',
      notifications: 'active'
    }
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'GEI Unified Platform API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    status: 'running'
  });
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

// Inicializar servicio de notificaciones
let notificationService: NotificationService;

// Función de inicialización
async function initializeApp() {
  try {
    logger.info('🚀 ===== INICIO DE initializeApp() =====');
    logger.info('🚀 Iniciando GEI Unified Platform...');
    logger.info('📋 Variables de entorno verificadas');
    logger.info(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`🔌 PORT: ${port}`);
    logger.info(`📁 Directorio actual: ${__dirname}`);
    logger.info(`📁 process.cwd(): ${process.cwd()}`);
    
    // Verificar archivos críticos
    logger.info('🔍 Verificando archivos críticos...');
    const distPath = path.join(__dirname, 'dist');
    const sharedPath = path.join(__dirname, '..', 'shared');
    const serverPath = path.join(__dirname, 'server');
    
    logger.info(`📂 Verificando distPath: ${distPath}`);
    logger.info(`📂 Verificando sharedPath: ${sharedPath}`);
    logger.info(`📂 Verificando serverPath: ${serverPath}`);
    
    if (fs.existsSync(distPath)) {
      logger.info('✅ Directorio dist existe');
      const distFiles = fs.readdirSync(distPath);
      logger.info(`📋 Archivos en dist: ${distFiles.join(', ')}`);
    } else {
      logger.error('❌ Directorio dist no existe');
    }
    
    if (fs.existsSync(sharedPath)) {
      logger.info('✅ Directorio shared existe');
      const sharedFiles = fs.readdirSync(sharedPath);
      logger.info(`📋 Archivos en shared: ${sharedFiles.join(', ')}`);
    } else {
      logger.error('❌ Directorio shared no existe');
    }
    
    if (fs.existsSync(serverPath)) {
      logger.info('✅ Directorio server existe');
      const serverFiles = fs.readdirSync(serverPath);
      logger.info(`📋 Archivos en server: ${serverFiles.join(', ')}`);
    } else {
      logger.error('❌ Directorio server no existe');
    }
    
    // Inicializar base de datos con timeout
    logger.info('🗄️ Inicializando base de datos...');
    logger.info('🔄 ANTES de await initializeDatabase()');
    try {
      const dbPromise = initializeDatabase();
      const dbTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database initialization timeout')), 30000)
      );
      await Promise.race([dbPromise, dbTimeout]);
      logger.info('🔄 DESPUÉS de await initializeDatabase()');
      logger.info('✅ Base de datos inicializada');
    } catch (dbError) {
      logger.error('❌ Error en inicialización de base de datos:', dbError);
      throw dbError;
    }
    
    // Inicializar servicio de notificaciones
    logger.info('🔔 Inicializando servicio de notificaciones...');
    logger.info('🔄 ANTES de new NotificationService()');
    notificationService = new NotificationService(server);
    logger.info('🔄 DESPUÉS de new NotificationService()');
    logger.info('✅ Servicio de notificaciones inicializado');
    
    // Hacer el servicio disponible globalmente
    (global as any).notificationService = notificationService;
    
    // Inicializar servicios de optimización con timeout
    logger.info('⚡ Inicializando servicio de caché...');
    logger.info('🔄 ANTES de await cacheService.connect()');
    const cachePromise = cacheService.connect();
    const cacheTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Cache service timeout')), 15000)
    );
    await Promise.race([cachePromise, cacheTimeout]);
    logger.info('🔄 DESPUÉS de await cacheService.connect()');
    logger.info('✅ Servicio de caché inicializado');
    
    logger.info('🔧 Inicializando optimizador de base de datos...');
    logger.info('🔄 ANTES de await databaseOptimizer.initialize()');
    const optimizerPromise = databaseOptimizer.initialize();
    const optimizerTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database optimizer timeout')), 15000)
    );
    await Promise.race([optimizerPromise, optimizerTimeout]);
    logger.info('🔄 DESPUÉS de await databaseOptimizer.initialize()');
    logger.info('✅ Optimizador de base de datos inicializado');
    
    // Inicializar servicios de IA con timeout
    logger.info('🤖 Inicializando servicio de chatbot IA...');
    logger.info('🔄 ANTES de await aiChatbotService.initialize()');
    const chatbotPromise = aiChatbotService.initialize();
    const chatbotTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI Chatbot timeout')), 15000)
    );
    await Promise.race([chatbotPromise, chatbotTimeout]);
    logger.info('🔄 DESPUÉS de await aiChatbotService.initialize()');
    logger.info('✅ Servicio de chatbot IA inicializado');
    
    logger.info('📊 Inicializando servicio de análisis predictivo IA...');
    logger.info('🔄 ANTES de await aiAnalyticsService.initialize()');
    const analyticsPromise = aiAnalyticsService.initialize();
    const analyticsTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI Analytics timeout')), 15000)
    );
    await Promise.race([analyticsPromise, analyticsTimeout]);
    logger.info('🔄 DESPUÉS de await aiAnalyticsService.initialize()');
    logger.info('✅ Servicio de análisis predictivo IA inicializado');
    
    logger.info('📄 Inicializando servicio de generación de reportes IA...');
    logger.info('🔄 ANTES de await aiReportGeneratorService.initialize()');
    const reportPromise = aiReportGeneratorService.initialize();
    const reportTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI Report Generator timeout')), 15000)
    );
    await Promise.race([reportPromise, reportTimeout]);
    logger.info('🔄 DESPUÉS de await aiReportGeneratorService.initialize()');
    logger.info('✅ Servicio de generación de reportes IA inicializado');
    
    // Configurar notification service en calendar service
    calendarService.setNotificationService(notificationService);
    
    // Inicializar servicio de calendario con timeout
    logger.info('📅 Inicializando servicio de calendario...');
    logger.info('🔄 ANTES de await calendarService.initialize()');
    const calendarPromise = calendarService.initialize();
    const calendarTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Calendar service timeout')), 15000)
    );
    await Promise.race([calendarPromise, calendarTimeout]);
    logger.info('🔄 DESPUÉS de await calendarService.initialize()');
    logger.info('✅ Servicio de calendario inicializado');
    
    // Hacer los servicios disponibles globalmente
    (global as any).cacheService = cacheService;
    (global as any).databaseOptimizer = databaseOptimizer;
    (global as any).aiChatbotService = aiChatbotService;
    (global as any).aiAnalyticsService = aiAnalyticsService;
    (global as any).aiReportGeneratorService = aiReportGeneratorService;
    (global as any).calendarService = calendarService;
    
    // Iniciar servidor
    logger.info(`🌐 Iniciando servidor en puerto ${port}...`);
    logger.info('🔄 ANTES de server.listen()');
    server.listen(port, '0.0.0.0', () => {
      logger.info('🔄 DESPUÉS de server.listen() - Callback ejecutado');
      logger.info(`✅ Servidor ejecutándose en puerto ${port}`);
      logger.info(`📊 Health check: http://localhost:${port}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`🎨 Cliente: http://localhost:3001`);
      }
      
      logger.info('🎉 ¡Aplicación inicializada completamente!');
    });
    logger.info('🔄 DESPUÉS de server.listen() - Función llamada');
    logger.info('🎯 ===== FIN DE initializeApp() - FUNCIÓN COMPLETADA =====');
    
  } catch (error) {
    logger.error('❌ Error al inicializar la aplicación:', error);
    logger.error('📋 Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    logger.error('🔍 Información adicional del error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    
    // Esperar antes de salir para que se vean los logs
    logger.info('🔄 Esperando 10 segundos antes de salir...');
    setTimeout(() => {
      logger.error('🔥🔥🔥 TERMINANDO PROCESO DUE TO INITIALIZATION ERROR 🔥🔥🔥');
      process.exit(1);
    }, 10000);
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
console.log('🔥🔥🔥 ANTES DE LLAMAR A initializeApp() 🔥🔥🔥');
console.log(`🔥 Timestamp: ${new Date().toISOString()}`);
console.log(`🔥 typeof initializeApp: ${typeof initializeApp}`);

// Handle initialization with proper error handling
initializeApp().catch((error) => {
  console.error('🔥🔥🔥 ERROR AL INICIALIZAR LA APLICACIÓN:', error);
  console.error('🔥 Stack:', error instanceof Error ? error.stack : 'No stack');
  console.error('🔥🔥🔥 TERMINANDO PROCESO DUE TO INITIALIZATION ERROR 🔥🔥🔥');
  process.exit(1);
});

console.log('🔥🔥🔥 initializeApp() LLAMADA EXITOSAMENTE 🔥🔥🔥'); 
