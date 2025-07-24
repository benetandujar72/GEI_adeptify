import { db } from '../index.js';
import { 
  competencies, 
  criteria, 
  evaluations, 
  users, 
  institutes,
  academicYears 
} from '@/shared/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

export interface CompetencyData {
  id?: string;
  instituteId: string;
  academicYearId: string;
  code: string;
  abbreviation?: string;
  subject?: string;
  description: string;
  type: 'CT_CC' | 'CT_CD' | 'CT_CE' | 'CT_CPSAA' | 'CCL' | 'CP' | 'STEM' | 'CCEC';
}

export interface CriteriaData {
  id?: string;
  competencyId: string;
  code: string;
  description: string;
}

export interface EvaluationData {
  teacherId: string;
  groupName: string;
  competencyType: string;
  competencyCode: string;
  competencyDescription: string;
  studentCount: number;
  evaluationData: {
    students: Array<{
      id: number;
      name: string;
      group_name: string;
      email: string;
      gender: string;
    }>;
    criteria: Array<{
      id: number;
      competencyId: number;
      code: string;
      description: string;
    }>;
    grades: Array<{
      studentId: number;
      criteriaId: number;
      grade: 'NA' | 'AS' | 'AN' | 'AE';
    }>;
  };
  googleSheetId?: string;
}

export class CompetencyService {
  
  /**
   * Obtener todas las competencias de un instituto
   */
  async getCompetencies(instituteId: string, academicYearId?: string): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(competencies)
        .where(eq(competencies.instituteId, instituteId))
        .orderBy(asc(competencies.code));

      if (academicYearId) {
        query = query.where(
          and(
            eq(competencies.instituteId, instituteId),
            eq(competencies.academicYearId, academicYearId)
          )
        );
      }

      const result = await query;
      logger.info(`✅ Obtenidas ${result.length} competencias para instituto ${instituteId}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obteniendo competencias:', error);
      throw error;
    }
  }

  /**
   * Crear una nueva competencia
   */
  async createCompetency(data: CompetencyData): Promise<any> {
    try {
      const [competency] = await db
        .insert(competencies)
        .values(data)
        .returning();

      logger.info(`✅ Competencia creada: ${competency.code} - ${competency.description}`);
      return competency;
    } catch (error) {
      logger.error('❌ Error creando competencia:', error);
      throw error;
    }
  }

  /**
   * Actualizar una competencia existente
   */
  async updateCompetency(id: string, data: Partial<CompetencyData>): Promise<any> {
    try {
      const [competency] = await db
        .update(competencies)
        .set(data)
        .where(eq(competencies.id, id))
        .returning();

      logger.info(`✅ Competencia actualizada: ${competency.code}`);
      return competency;
    } catch (error) {
      logger.error('❌ Error actualizando competencia:', error);
      throw error;
    }
  }

  /**
   * Eliminar una competencia
   */
  async deleteCompetency(id: string): Promise<void> {
    try {
      await db.delete(competencies).where(eq(competencies.id, id));
      logger.info(`✅ Competencia eliminada: ${id}`);
    } catch (error) {
      logger.error('❌ Error eliminando competencia:', error);
      throw error;
    }
  }

  /**
   * Obtener criterios de una competencia
   */
  async getCriteria(competencyId: string): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(criteria)
        .where(eq(criteria.competencyId, competencyId))
        .orderBy(asc(criteria.code));

      logger.info(`✅ Obtenidos ${result.length} criterios para competencia ${competencyId}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obteniendo criterios:', error);
      throw error;
    }
  }

  /**
   * Crear un nuevo criterio
   */
  async createCriteria(data: CriteriaData): Promise<any> {
    try {
      const [criterion] = await db
        .insert(criteria)
        .values(data)
        .returning();

      logger.info(`✅ Criterio creado: ${criterion.code} - ${criterion.description}`);
      return criterion;
    } catch (error) {
      logger.error('❌ Error creando criterio:', error);
      throw error;
    }
  }

  /**
   * Actualizar un criterio existente
   */
  async updateCriteria(id: string, data: Partial<CriteriaData>): Promise<any> {
    try {
      const [criterion] = await db
        .update(criteria)
        .set(data)
        .where(eq(criteria.id, id))
        .returning();

      logger.info(`✅ Criterio actualizado: ${criterion.code}`);
      return criterion;
    } catch (error) {
      logger.error('❌ Error actualizando criterio:', error);
      throw error;
    }
  }

  /**
   * Eliminar un criterio
   */
  async deleteCriteria(id: string): Promise<void> {
    try {
      await db.delete(criteria).where(eq(criteria.id, id));
      logger.info(`✅ Criterio eliminado: ${id}`);
    } catch (error) {
      logger.error('❌ Error eliminando criterio:', error);
      throw error;
    }
  }

  /**
   * Guardar una evaluación
   */
  async saveEvaluation(data: EvaluationData): Promise<any> {
    try {
      const [evaluation] = await db
        .insert(evaluations)
        .values({
          teacherId: data.teacherId,
          groupName: data.groupName,
          competencyType: data.competencyType,
          competencyCode: data.competencyCode,
          competencyDescription: data.competencyDescription,
          studentCount: data.studentCount,
          evaluationData: data.evaluationData,
          googleSheetId: data.googleSheetId
        })
        .returning();

      logger.info(`✅ Evaluación guardada: ${evaluation.id} - ${data.groupName}`);
      return evaluation;
    } catch (error) {
      logger.error('❌ Error guardando evaluación:', error);
      throw error;
    }
  }

  /**
   * Obtener evaluaciones de un profesor
   */
  async getEvaluations(teacherId: string, filters?: {
    groupName?: string;
    competencyType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(evaluations)
        .where(eq(evaluations.teacherId, teacherId))
        .orderBy(desc(evaluations.createdAt));

      if (filters?.groupName) {
        query = query.where(eq(evaluations.groupName, filters.groupName));
      }

      if (filters?.competencyType) {
        query = query.where(eq(evaluations.competencyType, filters.competencyType));
      }

      if (filters?.startDate) {
        query = query.where(evaluations.createdAt >= filters.startDate);
      }

      if (filters?.endDate) {
        query = query.where(evaluations.createdAt <= filters.endDate);
      }

      const result = await query;
      logger.info(`✅ Obtenidas ${result.length} evaluaciones para profesor ${teacherId}`);
      return result;
    } catch (error) {
      logger.error('❌ Error obteniendo evaluaciones:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de evaluaciones
   */
  async getEvaluationStats(teacherId: string, period?: {
    startDate: Date;
    endDate: Date;
  }): Promise<any> {
    try {
      let query = db
        .select({
          totalEvaluations: evaluations.id,
          totalStudents: evaluations.studentCount,
          competencyTypes: evaluations.competencyType,
          groups: evaluations.groupName
        })
        .from(evaluations)
        .where(eq(evaluations.teacherId, teacherId));

      if (period) {
        query = query.where(
          and(
            evaluations.createdAt >= period.startDate,
            evaluations.createdAt <= period.endDate
          )
        );
      }

      const result = await query;
      
      // Procesar estadísticas
      const stats = {
        totalEvaluations: result.length,
        totalStudents: result.reduce((sum, evaluation) => sum + evaluation.totalStudents, 0),
        competencyTypes: [...new Set(result.map(evaluation => evaluation.competencyTypes))],
        groups: [...new Set(result.map(evaluation => evaluation.groups))],
        averageStudentsPerEvaluation: result.length > 0 
          ? result.reduce((sum, evaluation) => sum + evaluation.totalStudents, 0) / result.length 
          : 0
      };

      logger.info(`✅ Estadísticas obtenidas para profesor ${teacherId}`);
      return stats;
    } catch (error) {
      logger.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Inicializar competencias por defecto para un instituto
   */
  async initializeDefaultCompetencies(instituteId: string, academicYearId: string): Promise<void> {
    try {
      const defaultCompetencies = [
        {
          code: 'CT_CC',
          abbreviation: 'CC',
          description: 'Competència ciutadana',
          type: 'CT_CC' as const
        },
        {
          code: 'CT_CD',
          abbreviation: 'CD',
          description: 'Competència digital',
          type: 'CT_CD' as const
        },
        {
          code: 'CT_CE',
          abbreviation: 'CE',
          description: 'Competència emprenedora',
          type: 'CT_CE' as const
        },
        {
          code: 'CT_CPSAA',
          abbreviation: 'CPSAA',
          description: 'Competència personal, social i d\'aprendre a aprendre',
          type: 'CT_CPSAA' as const
        },
        {
          code: 'CCL',
          abbreviation: 'CCL',
          description: 'Competència en comunicació lingüística',
          type: 'CCL' as const
        },
        {
          code: 'CP',
          abbreviation: 'CP',
          description: 'Competència plurilingüe',
          type: 'CP' as const
        },
        {
          code: 'STEM',
          abbreviation: 'STEM',
          description: 'Competència matemàtica i en ciència, tecnologia i enginyeria',
          type: 'STEM' as const
        },
        {
          code: 'CCEC',
          abbreviation: 'CCEC',
          description: 'Competència en consciència i expressió culturals',
          type: 'CCEC' as const
        }
      ];

      for (const comp of defaultCompetencies) {
        await this.createCompetency({
          ...comp,
          instituteId,
          academicYearId
        });
      }

      logger.info(`✅ Competencias por defecto inicializadas para instituto ${instituteId}`);
    } catch (error) {
      logger.error('❌ Error inicializando competencias por defecto:', error);
      throw error;
    }
  }
}

export const competencyService = new CompetencyService(); 