import { Router } from 'express';
import { z } from 'zod';
import { resourceService } from '../services/resource.service';
import { logger } from '../utils/logger';

const router = Router();

// ===== VALIDACIÓN DE ESQUEMAS =====

const createResourceSchema = z.object({
  name: z.string().min(1, 'Resource name is required').max(200),
  description: z.string().optional(),
  type: z.string().min(1, 'Resource type is required').max(50),
  category: z.string().min(1, 'Category is required').max(100),
  location: z.string().max(200).optional(),
  capacity: z.number().positive().optional(),
  status: z.enum(['available', 'in_use', 'maintenance', 'unavailable']).default('available'),
  isActive: z.boolean().default(true),
  metadata: z.object({
    features: z.array(z.string()).optional(),
    specifications: z.record(z.any()).optional(),
    images: z.array(z.string()).optional(),
    documents: z.array(z.string()).optional(),
  }).optional(),
});

const updateResourceSchema = createResourceSchema.partial();

const createReservationSchema = z.object({
  resourceId: z.number().positive('Resource ID must be positive'),
  userId: z.number().positive('User ID must be positive'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  startTime: z.string().datetime('Start time must be a valid date'),
  endTime: z.string().datetime('End time must be a valid date'),
  purpose: z.string().max(100).optional(),
  attendees: z.number().positive().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().positive(),
    endDate: z.string().datetime().optional(),
    daysOfWeek: z.array(z.number()).optional(),
  }).optional(),
});

const createEquipmentSchema = z.object({
  name: z.string().min(1, 'Equipment name is required').max(200),
  description: z.string().optional(),
  type: z.string().min(1, 'Equipment type is required').max(50),
  model: z.string().max(100).optional(),
  serialNumber: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  purchaseDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  status: z.enum(['available', 'in_use', 'maintenance', 'retired']).default('available'),
  location: z.string().max(200).optional(),
  assignedTo: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  metadata: z.object({
    specifications: z.record(z.any()).optional(),
    maintenanceHistory: z.array(z.object({
      date: z.string(),
      description: z.string(),
      cost: z.number(),
    })).optional(),
    images: z.array(z.string()).optional(),
  }).optional(),
});

const createMaterialSchema = z.object({
  name: z.string().min(1, 'Material name is required').max(200),
  description: z.string().optional(),
  type: z.string().min(1, 'Material type is required').max(50),
  category: z.string().min(1, 'Category is required').max(100),
  quantity: z.number().min(0).default(0),
  unit: z.string().max(20).optional(),
  minQuantity: z.number().min(0).default(0),
  location: z.string().max(200).optional(),
  supplier: z.string().max(200).optional(),
  cost: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  metadata: z.object({
    specifications: z.record(z.any()).optional(),
    images: z.array(z.string()).optional(),
    barcode: z.string().optional(),
  }).optional(),
});

const createMaintenanceSchema = z.object({
  resourceId: z.number().positive('Resource ID must be positive'),
  equipmentId: z.number().positive().optional(),
  type: z.enum(['preventive', 'corrective', 'emergency']),
  description: z.string().min(1, 'Description is required'),
  scheduledDate: z.string().datetime().optional(),
  completedDate: z.string().datetime().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  assignedTo: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  notes: z.string().optional(),
});

const createIssueReportSchema = z.object({
  resourceId: z.number().positive().optional(),
  equipmentId: z.number().positive().optional(),
  reportedBy: z.number().positive('Reporter ID must be positive'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  assignedTo: z.number().positive().optional(),
  reportedDate: z.string().datetime().optional(),
  resolvedDate: z.string().datetime().optional(),
  resolution: z.string().optional(),
});

// ===== RUTAS DE RECURSOS =====

// GET /resources - Listar recursos
router.get('/', async (req, res) => {
  try {
    const { type, category, status, isActive, search, limit, offset } = req.query;
    
    const filters = {
      type: type as string,
      category: category as string,
      status: status as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await resourceService.getResources(filters);
    
    res.json({
      success: true,
      data: result.resources,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  } catch (error) {
    logger.error('Error getting resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resources',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /resources/:id - Obtener recurso por ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resource ID'
      });
    }

    const resource = await resourceService.getResourceById(id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    logger.error('Error getting resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /resources - Crear nuevo recurso
router.post('/', async (req, res) => {
  try {
    const validatedData = createResourceSchema.parse(req.body);
    const resource = await resourceService.createResource(validatedData);
    
    res.status(201).json({
      success: true,
      data: resource,
      message: 'Resource created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create resource',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /resources/:id - Actualizar recurso
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resource ID'
      });
    }

    const validatedData = updateResourceSchema.parse(req.body);
    const resource = await resourceService.updateResource(id, validatedData);
    
    res.json({
      success: true,
      data: resource,
      message: 'Resource updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error updating resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update resource',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /resources/:id - Eliminar recurso
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resource ID'
      });
    }

    await resourceService.deleteResource(id);
    
    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting resource:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete resource',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== RUTAS DE RESERVAS =====

// GET /resources/:id/reservations - Obtener reservas de un recurso
router.get('/:id/reservations', async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resource ID'
      });
    }

    const { startDate, endDate, status } = req.query;
    
    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      status: status as string,
    };

    const reservations = await resourceService.getResourceReservations(resourceId, filters);
    
    res.json({
      success: true,
      data: reservations
    });
  } catch (error) {
    logger.error('Error getting resource reservations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource reservations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /resources/:id/reservations - Crear reserva para un recurso
router.post('/:id/reservations', async (req, res) => {
  try {
    const resourceId = parseInt(req.params.id);
    if (isNaN(resourceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resource ID'
      });
    }

    const validatedData = createReservationSchema.parse({
      ...req.body,
      resourceId
    });

    const reservation = await resourceService.createReservation(validatedData);
    
    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Reservation created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reservation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== RUTAS DE EQUIPOS =====

// GET /equipment - Listar equipos
router.get('/equipment', async (req, res) => {
  try {
    const { type, status, assignedTo, isActive, search, limit, offset } = req.query;
    
    const filters = {
      type: type as string,
      status: status as string,
      assignedTo: assignedTo ? parseInt(assignedTo as string) : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    const result = await resourceService.getEquipment(filters);
    
    res.json({
      success: true,
      data: result.equipment,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  } catch (error) {
    logger.error('Error getting equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get equipment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /equipment - Crear nuevo equipo
router.post('/equipment', async (req, res) => {
  try {
    const validatedData = createEquipmentSchema.parse(req.body);
    const equipment = await resourceService.createEquipment(validatedData);
    
    res.status(201).json({
      success: true,
      data: equipment,
      message: 'Equipment created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create equipment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== RUTAS DE MATERIALES =====

// GET /materials - Listar materiales
router.get('/materials', async (req, res) => {
  try {
    const { type, category, search, limit, offset } = req.query;
    
    const filters = {
      type: type as string,
      category: category as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    };

    // Implementar getMaterials en el servicio
    const materials = await resourceService.getLowStockMaterials();
    
    res.json({
      success: true,
      data: materials,
      total: materials.length,
    });
  } catch (error) {
    logger.error('Error getting materials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get materials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /materials - Crear nuevo material
router.post('/materials', async (req, res) => {
  try {
    const validatedData = createMaterialSchema.parse(req.body);
    const material = await resourceService.createMaterial(validatedData);
    
    res.status(201).json({
      success: true,
      data: material,
      message: 'Material created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create material',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== RUTAS DE MANTENIMIENTO =====

// GET /maintenance - Obtener mantenimientos pendientes
router.get('/maintenance', async (req, res) => {
  try {
    const maintenance = await resourceService.getPendingMaintenance();
    
    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    logger.error('Error getting maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /maintenance - Crear nuevo mantenimiento
router.post('/maintenance', async (req, res) => {
  try {
    const validatedData = createMaintenanceSchema.parse(req.body);
    const maintenance = await resourceService.createMaintenance(validatedData);
    
    res.status(201).json({
      success: true,
      data: maintenance,
      message: 'Maintenance created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create maintenance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== RUTAS DE REPORTES DE PROBLEMAS =====

// GET /issues - Obtener reportes de problemas abiertos
router.get('/issues', async (req, res) => {
  try {
    const issues = await resourceService.getOpenIssues();
    
    res.json({
      success: true,
      data: issues
    });
  } catch (error) {
    logger.error('Error getting issues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get issues',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /issues - Crear nuevo reporte de problema
router.post('/issues', async (req, res) => {
  try {
    const validatedData = createIssueReportSchema.parse(req.body);
    const issue = await resourceService.createIssueReport(validatedData);
    
    res.status(201).json({
      success: true,
      data: issue,
      message: 'Issue report created successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    logger.error('Error creating issue report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create issue report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== RUTAS DE ESTADÍSTICAS =====

// GET /stats - Obtener estadísticas de recursos
router.get('/stats', async (req, res) => {
  try {
    const stats = await resourceService.getResourceStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting resource stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get resource stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;