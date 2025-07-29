import { db } from '../database';
import { resources, reservations, facilities, equipment, materials, maintenance, issueReports, resourceAudit } from '../schema';
import { eq, and, like, desc, asc, gte, lte, inArray, between } from 'drizzle-orm';
import { NewResource, Resource, NewReservation, Reservation, NewFacility, Facility, NewEquipment, Equipment, NewMaterial, Material, NewMaintenance, Maintenance, NewIssueReport, IssueReport, NewResourceAudit, ResourceAudit } from '../schema';
import { logger } from '../utils/logger';

export class ResourceService {
  // ===== GESTIÓN DE RECURSOS =====
  
  /**
   * Crear un nuevo recurso
   */
  async createResource(resourceData: NewResource): Promise<Resource> {
    try {
      const [newResource] = await db.insert(resources).values(resourceData).returning();
      logger.info(`Resource created: ${newResource.id} - ${newResource.name}`);
      return newResource;
    } catch (error) {
      logger.error('Error creating resource:', error);
      throw new Error('Failed to create resource');
    }
  }

  /**
   * Obtener recurso por ID
   */
  async getResourceById(id: number): Promise<Resource | null> {
    try {
      const [resource] = await db.select().from(resources).where(eq(resources.id, id));
      return resource || null;
    } catch (error) {
      logger.error('Error getting resource by ID:', error);
      throw new Error('Failed to get resource');
    }
  }

  /**
   * Obtener recurso por UUID
   */
  async getResourceByUuid(uuid: string): Promise<Resource | null> {
    try {
      const [resource] = await db.select().from(resources).where(eq(resources.uuid, uuid));
      return resource || null;
    } catch (error) {
      logger.error('Error getting resource by UUID:', error);
      throw new Error('Failed to get resource');
    }
  }

  /**
   * Listar recursos con filtros
   */
  async getResources(filters: {
    type?: string;
    category?: string;
    status?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ resources: Resource[]; total: number }> {
    try {
      const { type, category, status, isActive, search, limit = 50, offset = 0 } = filters;
      
      let whereConditions = [];
      
      if (type) whereConditions.push(eq(resources.type, type));
      if (category) whereConditions.push(eq(resources.category, category));
      if (status) whereConditions.push(eq(resources.status, status));
      if (isActive !== undefined) whereConditions.push(eq(resources.isActive, isActive));
      
      if (search) {
        whereConditions.push(
          like(resources.name, `%${search}%`)
        );
        whereConditions.push(
          like(resources.description, `%${search}%`)
        );
        whereConditions.push(
          like(resources.location, `%${search}%`)
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const resourcesList = await db
        .select()
        .from(resources)
        .where(whereClause)
        .orderBy(asc(resources.name))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(resources)
        .where(whereClause);

      return {
        resources: resourcesList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting resources:', error);
      throw new Error('Failed to get resources');
    }
  }

  /**
   * Actualizar recurso
   */
  async updateResource(id: number, updateData: Partial<NewResource>): Promise<Resource> {
    try {
      const [updatedResource] = await db
        .update(resources)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(resources.id, id))
        .returning();
      
      logger.info(`Resource updated: ${id}`);
      return updatedResource;
    } catch (error) {
      logger.error('Error updating resource:', error);
      throw new Error('Failed to update resource');
    }
  }

  /**
   * Eliminar recurso
   */
  async deleteResource(id: number): Promise<void> {
    try {
      await db.delete(resources).where(eq(resources.id, id));
      logger.info(`Resource deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting resource:', error);
      throw new Error('Failed to delete resource');
    }
  }

  // ===== GESTIÓN DE RESERVAS =====
  
  /**
   * Crear una nueva reserva
   */
  async createReservation(reservationData: NewReservation): Promise<Reservation> {
    try {
      // Verificar disponibilidad del recurso
      const conflicts = await this.checkReservationConflicts(
        reservationData.resourceId,
        reservationData.startTime,
        reservationData.endTime
      );
      
      if (conflicts.length > 0) {
        throw new Error('Resource is not available for the selected time period');
      }

      const [newReservation] = await db.insert(reservations).values(reservationData).returning();
      logger.info(`Reservation created: ${newReservation.id} for resource ${reservationData.resourceId}`);
      return newReservation;
    } catch (error) {
      logger.error('Error creating reservation:', error);
      throw error;
    }
  }

  /**
   * Verificar conflictos de reservas
   */
  async checkReservationConflicts(
    resourceId: number,
    startTime: Date,
    endTime: Date
  ): Promise<Reservation[]> {
    try {
      return await db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.resourceId, resourceId),
            eq(reservations.status, 'confirmed'),
            between(reservations.startTime, startTime, endTime)
          )
        );
    } catch (error) {
      logger.error('Error checking reservation conflicts:', error);
      throw new Error('Failed to check reservation conflicts');
    }
  }

  /**
   * Obtener reservas de un recurso
   */
  async getResourceReservations(
    resourceId: number,
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    } = {}
  ): Promise<Reservation[]> {
    try {
      const { startDate, endDate, status } = filters;
      
      let whereConditions = [eq(reservations.resourceId, resourceId)];
      
      if (startDate) whereConditions.push(gte(reservations.startTime, startDate));
      if (endDate) whereConditions.push(lte(reservations.endTime, endDate));
      if (status) whereConditions.push(eq(reservations.status, status));

      return await db
        .select()
        .from(reservations)
        .where(and(...whereConditions))
        .orderBy(asc(reservations.startTime));
    } catch (error) {
      logger.error('Error getting resource reservations:', error);
      throw new Error('Failed to get resource reservations');
    }
  }

  /**
   * Obtener reservas de un usuario
   */
  async getUserReservations(
    userId: number,
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
    } = {}
  ): Promise<Reservation[]> {
    try {
      const { startDate, endDate, status } = filters;
      
      let whereConditions = [eq(reservations.userId, userId)];
      
      if (startDate) whereConditions.push(gte(reservations.startTime, startDate));
      if (endDate) whereConditions.push(lte(reservations.endTime, endDate));
      if (status) whereConditions.push(eq(reservations.status, status));

      return await db
        .select()
        .from(reservations)
        .where(and(...whereConditions))
        .orderBy(desc(reservations.startTime));
    } catch (error) {
      logger.error('Error getting user reservations:', error);
      throw new Error('Failed to get user reservations');
    }
  }

  /**
   * Actualizar estado de reserva
   */
  async updateReservationStatus(id: number, status: string): Promise<Reservation> {
    try {
      const [updatedReservation] = await db
        .update(reservations)
        .set({ status, updatedAt: new Date() })
        .where(eq(reservations.id, id))
        .returning();
      
      logger.info(`Reservation status updated: ${id} -> ${status}`);
      return updatedReservation;
    } catch (error) {
      logger.error('Error updating reservation status:', error);
      throw new Error('Failed to update reservation status');
    }
  }

  // ===== GESTIÓN DE EQUIPOS =====
  
  /**
   * Crear un nuevo equipo
   */
  async createEquipment(equipmentData: NewEquipment): Promise<Equipment> {
    try {
      const [newEquipment] = await db.insert(equipment).values(equipmentData).returning();
      logger.info(`Equipment created: ${newEquipment.id} - ${newEquipment.name}`);
      return newEquipment;
    } catch (error) {
      logger.error('Error creating equipment:', error);
      throw new Error('Failed to create equipment');
    }
  }

  /**
   * Obtener equipos con filtros
   */
  async getEquipment(filters: {
    type?: string;
    status?: string;
    assignedTo?: number;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ equipment: Equipment[]; total: number }> {
    try {
      const { type, status, assignedTo, isActive, search, limit = 50, offset = 0 } = filters;
      
      let whereConditions = [];
      
      if (type) whereConditions.push(eq(equipment.type, type));
      if (status) whereConditions.push(eq(equipment.status, status));
      if (assignedTo) whereConditions.push(eq(equipment.assignedTo, assignedTo));
      if (isActive !== undefined) whereConditions.push(eq(equipment.isActive, isActive));
      
      if (search) {
        whereConditions.push(
          like(equipment.name, `%${search}%`)
        );
        whereConditions.push(
          like(equipment.model, `%${search}%`)
        );
        whereConditions.push(
          like(equipment.serialNumber, `%${search}%`)
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const equipmentList = await db
        .select()
        .from(equipment)
        .where(whereClause)
        .orderBy(asc(equipment.name))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(equipment)
        .where(whereClause);

      return {
        equipment: equipmentList,
        total: Number(count)
      };
    } catch (error) {
      logger.error('Error getting equipment:', error);
      throw new Error('Failed to get equipment');
    }
  }

  // ===== GESTIÓN DE MATERIALES =====
  
  /**
   * Crear un nuevo material
   */
  async createMaterial(materialData: NewMaterial): Promise<Material> {
    try {
      const [newMaterial] = await db.insert(materials).values(materialData).returning();
      logger.info(`Material created: ${newMaterial.id} - ${newMaterial.name}`);
      return newMaterial;
    } catch (error) {
      logger.error('Error creating material:', error);
      throw new Error('Failed to create material');
    }
  }

  /**
   * Actualizar cantidad de material
   */
  async updateMaterialQuantity(id: number, quantity: number): Promise<Material> {
    try {
      const [updatedMaterial] = await db
        .update(materials)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(materials.id, id))
        .returning();
      
      logger.info(`Material quantity updated: ${id} -> ${quantity}`);
      return updatedMaterial;
    } catch (error) {
      logger.error('Error updating material quantity:', error);
      throw new Error('Failed to update material quantity');
    }
  }

  /**
   * Obtener materiales con stock bajo
   */
  async getLowStockMaterials(): Promise<Material[]> {
    try {
      return await db
        .select()
        .from(materials)
        .where(
          and(
            eq(materials.isActive, true),
            lte(materials.quantity, materials.minQuantity)
          )
        )
        .orderBy(asc(materials.quantity));
    } catch (error) {
      logger.error('Error getting low stock materials:', error);
      throw new Error('Failed to get low stock materials');
    }
  }

  // ===== GESTIÓN DE MANTENIMIENTO =====
  
  /**
   * Crear un nuevo registro de mantenimiento
   */
  async createMaintenance(maintenanceData: NewMaintenance): Promise<Maintenance> {
    try {
      const [newMaintenance] = await db.insert(maintenance).values(maintenanceData).returning();
      logger.info(`Maintenance created: ${newMaintenance.id}`);
      return newMaintenance;
    } catch (error) {
      logger.error('Error creating maintenance:', error);
      throw new Error('Failed to create maintenance');
    }
  }

  /**
   * Obtener mantenimientos pendientes
   */
  async getPendingMaintenance(): Promise<Maintenance[]> {
    try {
      return await db
        .select()
        .from(maintenance)
        .where(
          inArray(maintenance.status, ['scheduled', 'in_progress'])
        )
        .orderBy(asc(maintenance.scheduledDate));
    } catch (error) {
      logger.error('Error getting pending maintenance:', error);
      throw new Error('Failed to get pending maintenance');
    }
  }

  // ===== GESTIÓN DE REPORTES DE PROBLEMAS =====
  
  /**
   * Crear un nuevo reporte de problema
   */
  async createIssueReport(issueData: NewIssueReport): Promise<IssueReport> {
    try {
      const [newIssue] = await db.insert(issueReports).values(issueData).returning();
      logger.info(`Issue report created: ${newIssue.id} - ${newIssue.title}`);
      return newIssue;
    } catch (error) {
      logger.error('Error creating issue report:', error);
      throw new Error('Failed to create issue report');
    }
  }

  /**
   * Obtener reportes de problemas abiertos
   */
  async getOpenIssues(): Promise<IssueReport[]> {
    try {
      return await db
        .select()
        .from(issueReports)
        .where(
          inArray(issueReports.status, ['open', 'in_progress'])
        )
        .orderBy(desc(issueReports.severity), asc(issueReports.reportedDate));
    } catch (error) {
      logger.error('Error getting open issues:', error);
      throw new Error('Failed to get open issues');
    }
  }

  // ===== AUDITORÍA =====
  
  /**
   * Registrar acción de auditoría
   */
  async logAudit(auditData: NewResourceAudit): Promise<ResourceAudit> {
    try {
      const [newAudit] = await db.insert(resourceAudit).values(auditData).returning();
      return newAudit;
    } catch (error) {
      logger.error('Error logging audit:', error);
      throw new Error('Failed to log audit');
    }
  }

  /**
   * Obtener historial de auditoría de un recurso
   */
  async getResourceAuditHistory(resourceId: number): Promise<ResourceAudit[]> {
    try {
      return await db
        .select()
        .from(resourceAudit)
        .where(eq(resourceAudit.resourceId, resourceId))
        .orderBy(desc(resourceAudit.timestamp));
    } catch (error) {
      logger.error('Error getting resource audit history:', error);
      throw new Error('Failed to get resource audit history');
    }
  }

  // ===== ESTADÍSTICAS =====
  
  /**
   * Obtener estadísticas de recursos
   */
  async getResourceStats(): Promise<{
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    unavailable: number;
    utilizationRate: number;
  }> {
    try {
      const allResources = await db.select().from(resources).where(eq(resources.isActive, true));
      
      const total = allResources.length;
      const available = allResources.filter(r => r.status === 'available').length;
      const inUse = allResources.filter(r => r.status === 'in_use').length;
      const maintenance = allResources.filter(r => r.status === 'maintenance').length;
      const unavailable = allResources.filter(r => r.status === 'unavailable').length;
      
      const utilizationRate = total > 0 ? ((inUse + maintenance) / total) * 100 : 0;
      
      return {
        total,
        available,
        inUse,
        maintenance,
        unavailable,
        utilizationRate: Math.round(utilizationRate * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting resource stats:', error);
      throw new Error('Failed to get resource stats');
    }
  }
}

export const resourceService = new ResourceService();