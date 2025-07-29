import { MicroservicesApiService } from './microservices-api';

export interface MCPQueryRequest {
  query: string;
  context?: {
    userId?: string;
    userRole?: string;
    instituteId?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    preferences?: Record<string, any>;
  };
  options?: {
    autoExecute?: boolean;
    showReasoning?: boolean;
    includeAlternatives?: boolean;
    maxExecutionTime?: number;
  };
}

export interface MCPQueryResponse {
  success: boolean;
  results: any[];
  decisions: Array<{
    action: string;
    reasoning: string;
    confidence: number;
  }>;
  executionTime: number;
  toolsUsed: string[];
  confidence: number;
  alternatives?: Array<{
    action: string;
    reasoning: string;
    estimatedImpact: string;
  }>;
  suggestions?: Array<{
    type: 'optimization' | 'automation' | 'insight';
    title: string;
    description: string;
    action?: string;
  }>;
}

export interface MCPCapability {
  name: string;
  description: string;
  domain: string;
  examples: string[];
  estimatedTime: number;
}

export interface MCPDashboard {
  availableCapabilities: MCPCapability[];
  recentQueries: Array<{
    query: string;
    timestamp: Date;
    success: boolean;
    executionTime: number;
  }>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    actionable: boolean;
  }>;
  performance: {
    averageResponseTime: number;
    successRate: number;
    mostUsedCapabilities: string[];
  };
}

export class MCPIntelligentApiService {
  private baseApi: MicroservicesApiService;
  private orchestratorUrl: string;

  constructor(baseApi: MicroservicesApiService) {
    this.baseApi = baseApi;
    this.orchestratorUrl = `${baseApi['gatewayURL']}/mcp-orchestrator`;
  }

  /**
   * Procesa consultas en lenguaje natural con inteligencia MCP
   */
  async processNaturalQuery(request: MCPQueryRequest): Promise<MCPQueryResponse> {
    try {
      const response = await fetch(`${this.orchestratorUrl}/process-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`MCP Query failed: ${response.statusText}`);
      }

      const result = await response.json();
      return this.enhanceResponse(result, request);
    } catch (error) {
      console.error('MCP Query error:', error);
      throw error;
    }
  }

  /**
   * Consultas predefinidas para casos de uso comunes
   */
  async analyzeStudentPerformance(studentId: string, options?: {
    includePredictions?: boolean;
    generateRecommendations?: boolean;
    compareWithPeers?: boolean;
  }): Promise<MCPQueryResponse> {
    const query = `Analiza completamente el rendimiento académico del estudiante ${studentId}${
      options?.includePredictions ? ' incluyendo predicciones futuras' : ''
    }${
      options?.generateRecommendations ? ' y genera recomendaciones personalizadas' : ''
    }${
      options?.compareWithPeers ? ' comparando con el rendimiento de sus compañeros' : ''
    }`;

    return this.processNaturalQuery({
      query,
      context: {
        urgency: 'medium',
        preferences: {
          includeVisualizations: true,
          generateReport: true
        }
      }
    });
  }

  async optimizeResourceAllocation(instituteId: string, options?: {
    includeCostAnalysis?: boolean;
    generateImplementationPlan?: boolean;
    considerFutureGrowth?: boolean;
  }): Promise<MCPQueryResponse> {
    const query = `Optimiza la asignación de recursos y espacios para el instituto ${instituteId}${
      options?.includeCostAnalysis ? ' incluyendo análisis de costos' : ''
    }${
      options?.generateImplementationPlan ? ' y genera un plan de implementación detallado' : ''
    }${
      options?.considerFutureGrowth ? ' considerando el crecimiento futuro' : ''
    }`;

    return this.processNaturalQuery({
      query,
      context: {
        urgency: 'low',
        preferences: {
          includeAlternatives: true,
          generateTimeline: true
        }
      }
    });
  }

  async sendIntelligentCommunication(
    message: string,
    recipients: string[],
    options?: {
      personalizePerRecipient?: boolean;
      optimizeTiming?: boolean;
      includeFollowUp?: boolean;
      trackEngagement?: boolean;
    }
  ): Promise<MCPQueryResponse> {
    const query = `Envía una comunicación inteligente con el mensaje "${message}" a ${recipients.length} destinatarios${
      options?.personalizePerRecipient ? ' personalizando el contenido para cada uno' : ''
    }${
      options?.optimizeTiming ? ' optimizando el momento de envío' : ''
    }${
      options?.includeFollowUp ? ' incluyendo seguimiento automático' : ''
    }${
      options?.trackEngagement ? ' y rastreando el engagement' : ''
    }`;

    return this.processNaturalQuery({
      query,
      context: {
        urgency: 'medium',
        preferences: {
          multiChannel: true,
          trackMetrics: true
        }
      }
    });
  }

  async generateEducationalContent(
    topic: string,
    targetAudience: string,
    options?: {
      includeAdaptations?: boolean;
      generateAssessment?: boolean;
      includeMultimedia?: boolean;
      alignWithCurriculum?: boolean;
    }
  ): Promise<MCPQueryResponse> {
    const query = `Genera contenido educativo sobre "${topic}" para ${targetAudience}${
      options?.includeAdaptations ? ' incluyendo adaptaciones para diferentes necesidades' : ''
    }${
      options?.generateAssessment ? ' y genera evaluaciones asociadas' : ''
    }${
      options?.includeMultimedia ? ' incluyendo elementos multimedia' : ''
    }${
      options?.alignWithCurriculum ? ' alineado con el currículum oficial' : ''
    }`;

    return this.processNaturalQuery({
      query,
      context: {
        urgency: 'low',
        preferences: {
          includeStandards: true,
          generateVariants: true
        }
      }
    });
  }

  async predictStudentRisk(
    studentId: string,
    options?: {
      includeInterventionPlan?: boolean;
      monitorTrends?: boolean;
      involveStakeholders?: boolean;
    }
  ): Promise<MCPQueryResponse> {
    const query = `Predice el riesgo académico del estudiante ${studentId}${
      options?.includeInterventionPlan ? ' y genera un plan de intervención' : ''
    }${
      options?.monitorTrends ? ' monitoreando tendencias' : ''
    }${
      options?.involveStakeholders ? ' involucrando a todos los stakeholders' : ''
    }`;

    return this.processNaturalQuery({
      query,
      context: {
        urgency: 'high',
        preferences: {
          realTimeMonitoring: true,
          generateAlerts: true
        }
      }
    });
  }

  /**
   * Obtiene el dashboard MCP con capacidades y insights
   */
  async getMCPDashboard(): Promise<MCPDashboard> {
    try {
      const response = await fetch(`${this.orchestratorUrl}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get MCP dashboard: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('MCP Dashboard error:', error);
      throw error;
    }
  }

  /**
   * Obtiene capacidades disponibles por dominio
   */
  async getCapabilitiesByDomain(domain: string): Promise<MCPCapability[]> {
    try {
      const response = await fetch(`${this.orchestratorUrl}/capabilities/${domain}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get capabilities: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get capabilities error:', error);
      throw error;
    }
  }

  /**
   * Obtiene sugerencias inteligentes basadas en el contexto del usuario
   */
  async getIntelligentSuggestions(context?: {
    userRole?: string;
    recentActions?: string[];
    currentPage?: string;
  }): Promise<Array<{
    type: 'automation' | 'optimization' | 'insight' | 'recommendation';
    title: string;
    description: string;
    action: string;
    estimatedTime: number;
    confidence: number;
  }>> {
    try {
      const response = await fetch(`${this.orchestratorUrl}/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ context })
      });

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get suggestions error:', error);
      return [];
    }
  }

  /**
   * Ejecuta acciones automáticas basadas en patrones detectados
   */
  async executeAutomatedActions(patterns: string[]): Promise<MCPQueryResponse> {
    const query = `Ejecuta acciones automáticas para los siguientes patrones detectados: ${patterns.join(', ')}`;

    return this.processNaturalQuery({
      query,
      context: {
        urgency: 'low',
        preferences: {
          autoExecute: true,
          silentMode: true
        }
      },
      options: {
        autoExecute: true,
        showReasoning: false
      }
    });
  }

  /**
   * Mejora la respuesta con información adicional y sugerencias
   */
  private enhanceResponse(response: MCPQueryResponse, request: MCPQueryRequest): MCPQueryResponse {
    // Agregar sugerencias basadas en el resultado
    if (response.success && response.results.length > 0) {
      response.suggestions = this.generateSuggestions(response, request);
    }

    // Agregar alternativas si se solicitan
    if (request.options?.includeAlternatives) {
      response.alternatives = this.generateAlternatives(response, request);
    }

    return response;
  }

  /**
   * Genera sugerencias inteligentes basadas en los resultados
   */
  private generateSuggestions(response: MCPQueryResponse, request: MCPQueryRequest): Array<{
    type: 'optimization' | 'automation' | 'insight';
    title: string;
    description: string;
    action?: string;
  }> {
    const suggestions = [];

    // Sugerencia de optimización si el tiempo de ejecución es alto
    if (response.executionTime > 5000) {
      suggestions.push({
        type: 'optimization',
        title: 'Optimizar consulta',
        description: 'Esta consulta tardó más de 5 segundos. Considera simplificar o dividir en consultas más pequeñas.',
        action: 'optimize_query'
      });
    }

    // Sugerencia de automatización si es una consulta frecuente
    if (this.isFrequentQuery(request.query)) {
      suggestions.push({
        type: 'automation',
        title: 'Automatizar consulta',
        description: 'Esta consulta se realiza frecuentemente. Considera programarla para ejecutarse automáticamente.',
        action: 'schedule_automation'
      });
    }

    // Sugerencia de insight basada en los resultados
    if (response.results.length > 0) {
      suggestions.push({
        type: 'insight',
        title: 'Análisis adicional recomendado',
        description: 'Basado en estos resultados, considera realizar un análisis más profundo.',
        action: 'deep_analysis'
      });
    }

    return suggestions;
  }

  /**
   * Genera alternativas para la consulta
   */
  private generateAlternatives(response: MCPQueryResponse, request: MCPQueryRequest): Array<{
    action: string;
    reasoning: string;
    estimatedImpact: string;
  }> {
    const alternatives = [];

    // Alternativa más rápida
    alternatives.push({
      action: 'Consulta simplificada',
      reasoning: 'Una versión más simple de la consulta que podría ejecutarse más rápido',
      estimatedImpact: 'medium'
    });

    // Alternativa más detallada
    alternatives.push({
      action: 'Análisis completo',
      reasoning: 'Un análisis más exhaustivo que incluye más dimensiones',
      estimatedImpact: 'high'
    });

    return alternatives;
  }

  /**
   * Verifica si una consulta es frecuente
   */
  private isFrequentQuery(query: string): boolean {
    // Implementar lógica para detectar consultas frecuentes
    const frequentPatterns = [
      /analizar.*rendimiento/i,
      /optimizar.*recursos/i,
      /generar.*reporte/i
    ];

    return frequentPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Obtiene el token de autenticación
   */
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
}