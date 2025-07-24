import { Router } from 'express';
import { GoogleSheetsService } from '../services/google-sheets-service.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from '../utils/audit.js';

const router = Router();

// Configuración de Google Sheets
const googleSheetsConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: `${process.env.BASE_URL || 'http://localhost:3001'}/api/google-sheets/callback`
};

let googleSheetsService: GoogleSheetsService;

// Inicializar servicio
try {
  googleSheetsService = new GoogleSheetsService(googleSheetsConfig);
  logger.info('✅ Servicio de Google Sheets inicializado');
} catch (error) {
  logger.error('❌ Error inicializando Google Sheets:', error);
}

// Obtener URL de autorización
router.get('/auth', requireAuth, (req, res) => {
  try {
    const authUrl = googleSheetsService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    logger.error('Error generando URL de autorización:', error);
    res.status(500).json({ error: 'Error de configuración de Google Sheets' });
  }
});

// Callback de autorización
router.get('/callback', requireAuth, async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    const tokens = await googleSheetsService.getTokensFromCode(code);
    
    // Guardar tokens en la sesión del usuario
    (req.session as any).googleTokens = tokens;
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_auth',
      details: 'Autorización exitosa con Google Sheets'
    });

    res.json({ 
      success: true, 
      message: 'Autorización exitosa',
      tokens 
    });
  } catch (error) {
    logger.error('Error en callback de autorización:', error);
    res.status(500).json({ error: 'Error de autorización' });
  }
});

// Crear nueva hoja de cálculo
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Título requerido' });
    }

    const spreadsheetId = await googleSheetsService.createSpreadsheet(title, description);
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_create',
      details: `Hoja creada: ${title} (${spreadsheetId})`
    });

    res.json({ 
      success: true, 
      spreadsheetId,
      url: googleSheetsService.getSpreadsheetUrl(spreadsheetId)
    });
  } catch (error) {
    logger.error('Error creando hoja de cálculo:', error);
    res.status(500).json({ error: 'Error al crear hoja de cálculo' });
  }
});

// Exportar competencias
router.post('/export/competencies', requireAuth, async (req, res) => {
  try {
    const { spreadsheetId, options = {} } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'ID de hoja requerido' });
    }

    await googleSheetsService.exportCompetencies(
      spreadsheetId, 
      req.user!.instituteId, 
      options
    );
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_export_competencies',
      details: `Competencias exportadas a ${spreadsheetId}`
    });

    res.json({ 
      success: true, 
      message: 'Competencias exportadas exitosamente',
      url: googleSheetsService.getSpreadsheetUrl(spreadsheetId)
    });
  } catch (error) {
    logger.error('Error exportando competencias:', error);
    res.status(500).json({ error: 'Error al exportar competencias' });
  }
});

// Exportar evaluaciones
router.post('/export/evaluations', requireAuth, async (req, res) => {
  try {
    const { spreadsheetId, options = {} } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'ID de hoja requerido' });
    }

    await googleSheetsService.exportEvaluations(
      spreadsheetId, 
      req.user!.instituteId, 
      options
    );
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_export_evaluations',
      details: `Evaluaciones exportadas a ${spreadsheetId}`
    });

    res.json({ 
      success: true, 
      message: 'Evaluaciones exportadas exitosamente',
      url: googleSheetsService.getSpreadsheetUrl(spreadsheetId)
    });
  } catch (error) {
    logger.error('Error exportando evaluaciones:', error);
    res.status(500).json({ error: 'Error al exportar evaluaciones' });
  }
});

// Exportar asistencia
router.post('/export/attendance', requireAuth, async (req, res) => {
  try {
    const { spreadsheetId, options = {} } = req.body;
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'ID de hoja requerido' });
    }

    await googleSheetsService.exportAttendance(
      spreadsheetId, 
      req.user!.instituteId, 
      options
    );
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_export_attendance',
      details: `Asistencia exportada a ${spreadsheetId}`
    });

    res.json({ 
      success: true, 
      message: 'Asistencia exportada exitosamente',
      url: googleSheetsService.getSpreadsheetUrl(spreadsheetId)
    });
  } catch (error) {
    logger.error('Error exportando asistencia:', error);
    res.status(500).json({ error: 'Error al exportar asistencia' });
  }
});

// Exportar todo (competencies + evaluations + attendance)
router.post('/export/all', requireAuth, async (req, res) => {
  try {
    const { title = 'GEI Platform - Datos Completos', options = {} } = req.body;
    
    // Crear nueva hoja
    const spreadsheetId = await googleSheetsService.createSpreadsheet(title);
    
    // Exportar todos los datos
    await Promise.all([
      googleSheetsService.exportCompetencies(spreadsheetId, req.user!.instituteId, options),
      googleSheetsService.exportEvaluations(spreadsheetId, req.user!.instituteId, options),
      googleSheetsService.exportAttendance(spreadsheetId, req.user!.instituteId, options)
    ]);
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_export_all',
      details: `Exportación completa a ${spreadsheetId}`
    });

    res.json({ 
      success: true, 
      message: 'Datos exportados exitosamente',
      spreadsheetId,
      url: googleSheetsService.getSpreadsheetUrl(spreadsheetId)
    });
  } catch (error) {
    logger.error('Error exportando todos los datos:', error);
    res.status(500).json({ error: 'Error al exportar datos' });
  }
});

// Importar datos
router.post('/import', requireAuth, async (req, res) => {
  try {
    const { spreadsheetId, range, options } = req.body;
    
    if (!spreadsheetId || !range || !options) {
      return res.status(400).json({ 
        error: 'ID de hoja, rango y opciones requeridos' 
      });
    }

    const importedData = await googleSheetsService.importFromSheet(
      spreadsheetId, 
      range, 
      options
    );
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_import',
      details: `${importedData.length} filas importadas desde ${spreadsheetId}`
    });

    res.json({ 
      success: true, 
      message: 'Datos importados exitosamente',
      count: importedData.length,
      data: importedData
    });
  } catch (error) {
    logger.error('Error importando datos:', error);
    res.status(500).json({ error: 'Error al importar datos' });
  }
});

// Compartir hoja
router.post('/share', requireAuth, async (req, res) => {
  try {
    const { spreadsheetId, email, role = 'reader' } = req.body;
    
    if (!spreadsheetId || !email) {
      return res.status(400).json({ 
        error: 'ID de hoja y email requeridos' 
      });
    }

    await googleSheetsService.shareSpreadsheet(spreadsheetId, email, role);
    
    await createAuditLog({
      userId: req.user!.id,
      instituteId: req.user!.instituteId,
      action: 'google_sheets_share',
      details: `Hoja ${spreadsheetId} compartida con ${email} (${role})`
    });

    res.json({ 
      success: true, 
      message: 'Hoja compartida exitosamente'
    });
  } catch (error) {
    logger.error('Error compartiendo hoja:', error);
    res.status(500).json({ error: 'Error al compartir hoja' });
  }
});

// Obtener URL de hoja
router.get('/url/:spreadsheetId', requireAuth, (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const url = googleSheetsService.getSpreadsheetUrl(spreadsheetId);
    
    res.json({ url });
  } catch (error) {
    logger.error('Error obteniendo URL:', error);
    res.status(500).json({ error: 'Error al obtener URL' });
  }
});

export default router; 