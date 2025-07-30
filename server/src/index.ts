import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupRoutes } from '../routes/index';

// NO usar dotenv - las variables vienen del sistema
// dotenv.config(); // COMENTADO - usar variables del sistema

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware de compresión
app.use(compression());

// Middleware de CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'https://gei.adeptify.es'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ruta de health check mejorada
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT_CONFIGURED',
    google: process.env.GOOGLE_CLIENT_ID ? 'CONFIGURED' : 'NOT_CONFIGURED',
    session: process.env.SESSION_SECRET ? 'CONFIGURED' : 'NOT_CONFIGURED',
    jwt: process.env.JWT_SECRET ? 'CONFIGURED' : 'NOT_CONFIGURED'
  });
});

// Ruta de información del sistema
app.get('/api/system/info', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    port: process.env.PORT || 3000,
    database: {
      configured: !!process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'NOT_SET'
    },
    auth: {
      sessionConfigured: !!process.env.SESSION_SECRET,
      jwtConfigured: !!process.env.JWT_SECRET,
      googleConfigured: !!process.env.GOOGLE_CLIENT_ID
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'https://gei.adeptify.es'
    }
  });
});

// Configurar rutas de la API
app.use('/api', setupRoutes());

// Middleware de manejo de errores mejorado
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error del servidor:', err);
  
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
    timestamp: new Date().toISOString()
  });
});

// Ruta para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor con mejor logging
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Base de datos: ${process.env.DATABASE_URL ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
  console.log(`🔐 Autenticación: ${process.env.SESSION_SECRET ? 'CONFIGURADA' : 'NO CONFIGURADA'}`);
  console.log(`🔑 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'CONFIGURADO' : 'NO CONFIGURADO'}`);
});

// Manejo de señales para cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});
