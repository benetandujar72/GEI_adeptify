interface TransformationRule {
  path: string;
  method: string;
  transform: (response: any, req: any) => any;
  condition?: (response: any, req: any) => boolean;
}

interface ResponseMetadata {
  timestamp: string;
  requestId: string;
  service: string;
  version: string;
  processingTime: number;
}

export class ResponseTransformer {
  private transformationRules: TransformationRule[] = [];
  private defaultTransformations: Map<string, (response: any) => any> = new Map();

  constructor() {
    this.initializeDefaultTransformations();
    this.initializeTransformationRules();
  }

  private initializeDefaultTransformations(): void {
    // Transformación por defecto para todas las respuestas
    this.defaultTransformations.set('default', (response: any) => {
      if (typeof response === 'object' && response !== null) {
        return {
          success: true,
          data: response,
          timestamp: new Date().toISOString(),
          version: '1.0'
        };
      }
      return response;
    });

    // Transformación para errores
    this.defaultTransformations.set('error', (response: any) => {
      return {
        success: false,
        error: response.message || 'Error interno del servidor',
        code: response.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
    });

    // Transformación para listas
    this.defaultTransformations.set('list', (response: any) => {
      if (Array.isArray(response)) {
        return {
          success: true,
          data: response,
          pagination: {
            total: response.length,
            page: 1,
            limit: response.length,
            pages: 1
          },
          timestamp: new Date().toISOString(),
          version: '1.0'
        };
      }
      return response;
    });
  }

  private initializeTransformationRules(): void {
    // Transformación para respuestas de usuarios
    this.addTransformationRule('/api/users', 'GET', (response, req) => {
      if (Array.isArray(response)) {
        return {
          success: true,
          data: response.map(user => this.sanitizeUserData(user)),
          pagination: {
            total: response.length,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            pages: Math.ceil(response.length / (parseInt(req.query.limit) || 10))
          },
          timestamp: new Date().toISOString(),
          version: '1.0'
        };
      }
      return this.sanitizeUserData(response);
    });

    // Transformación para respuestas de estudiantes
    this.addTransformationRule('/api/students', 'GET', (response, req) => {
      if (Array.isArray(response)) {
        return {
          success: true,
          data: response.map(student => this.sanitizeStudentData(student)),
          pagination: {
            total: response.length,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            pages: Math.ceil(response.length / (parseInt(req.query.limit) || 10))
          },
          timestamp: new Date().toISOString(),
          version: '1.0'
        };
      }
      return this.sanitizeStudentData(response);
    });

    // Transformación para respuestas de cursos
    this.addTransformationRule('/api/courses', 'GET', (response, req) => {
      if (Array.isArray(response)) {
        return {
          success: true,
          data: response.map(course => this.sanitizeCourseData(course)),
          pagination: {
            total: response.length,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            pages: Math.ceil(response.length / (parseInt(req.query.limit) || 10))
          },
          timestamp: new Date().toISOString(),
          version: '1.0'
        };
      }
      return this.sanitizeCourseData(response);
    });

    // Transformación para respuestas de autenticación
    this.addTransformationRule('/api/auth/login', 'POST', (response, req) => {
      return {
        success: true,
        data: {
          user: this.sanitizeUserData(response.user),
          token: response.token,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn
        },
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
    });

    // Transformación para respuestas de LLM
    this.addTransformationRule('/api/llm/chat', 'POST', (response, req) => {
      return {
        success: true,
        data: {
          message: response.message,
          model: response.model,
          tokens: response.tokens,
          processingTime: response.processingTime
        },
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
    });

    // Transformación para respuestas de archivos
    this.addTransformationRule('/api/files', 'GET', (response, req) => {
      if (Array.isArray(response)) {
        return {
          success: true,
          data: response.map(file => this.sanitizeFileData(file)),
          pagination: {
            total: response.length,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            pages: Math.ceil(response.length / (parseInt(req.query.limit) || 10))
          },
          timestamp: new Date().toISOString(),
          version: '1.0'
        };
      }
      return this.sanitizeFileData(response);
    });
  }

  public transform(proxyRes: any, req: any): any {
    const path = req.path || req.url;
    const method = req.method;
    const statusCode = proxyRes.statusCode;

    // Si es un error, aplicar transformación de error
    if (statusCode >= 400) {
      return this.defaultTransformations.get('error')!(proxyRes);
    }

    // Buscar regla de transformación específica
    const rule = this.findTransformationRule(path, method);
    if (rule && (!rule.condition || rule.condition(proxyRes, req))) {
      return rule.transform(proxyRes, req);
    }

    // Aplicar transformación por defecto
    return this.defaultTransformations.get('default')!(proxyRes);
  }

  public addTransformationRule(path: string, method: string, transform: (response: any, req: any) => any, condition?: (response: any, req: any) => boolean): void {
    this.transformationRules.push({
      path,
      method,
      transform,
      condition
    });
  }

  private findTransformationRule(path: string, method: string): TransformationRule | undefined {
    return this.transformationRules.find(rule => 
      rule.path === path && rule.method === method
    );
  }

  private sanitizeUserData(user: any): any {
    if (!user) return user;

    const sanitized = { ...user };
    
    // Remover campos sensibles
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.salt;
    delete sanitized.resetToken;
    delete sanitized.resetTokenExpiry;

    // Asegurar campos requeridos
    if (!sanitized.id && sanitized._id) {
      sanitized.id = sanitized._id;
      delete sanitized._id;
    }

    return sanitized;
  }

  private sanitizeStudentData(student: any): any {
    if (!student) return student;

    const sanitized = { ...student };

    // Remover campos sensibles
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.salt;

    // Asegurar campos requeridos
    if (!sanitized.id && sanitized._id) {
      sanitized.id = sanitized._id;
      delete sanitized._id;
    }

    // Formatear campos específicos
    if (sanitized.birthDate) {
      sanitized.birthDate = new Date(sanitized.birthDate).toISOString().split('T')[0];
    }

    return sanitized;
  }

  private sanitizeCourseData(course: any): any {
    if (!course) return course;

    const sanitized = { ...course };

    // Asegurar campos requeridos
    if (!sanitized.id && sanitized._id) {
      sanitized.id = sanitized._id;
      delete sanitized._id;
    }

    // Formatear campos específicos
    if (sanitized.startDate) {
      sanitized.startDate = new Date(sanitized.startDate).toISOString().split('T')[0];
    }
    if (sanitized.endDate) {
      sanitized.endDate = new Date(sanitized.endDate).toISOString().split('T')[0];
    }

    return sanitized;
  }

  private sanitizeFileData(file: any): any {
    if (!file) return file;

    const sanitized = { ...file };

    // Asegurar campos requeridos
    if (!sanitized.id && sanitized._id) {
      sanitized.id = sanitized._id;
      delete sanitized._id;
    }

    // Formatear tamaño del archivo
    if (sanitized.size) {
      sanitized.sizeFormatted = this.formatFileSize(sanitized.size);
    }

    // Formatear fecha de creación
    if (sanitized.createdAt) {
      sanitized.createdAt = new Date(sanitized.createdAt).toISOString();
    }

    return sanitized;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public addMetadata(response: any, metadata: ResponseMetadata): any {
    if (typeof response === 'object' && response !== null) {
      return {
        ...response,
        metadata: {
          timestamp: metadata.timestamp,
          requestId: metadata.requestId,
          service: metadata.service,
          version: metadata.version,
          processingTime: metadata.processingTime
        }
      };
    }
    return response;
  }

  public standardizeError(error: any, req: any): any {
    const errorResponse = {
      success: false,
      error: {
        message: error.message || 'Error interno del servidor',
        code: error.code || 'INTERNAL_ERROR',
        details: error.details || null
      },
      timestamp: new Date().toISOString(),
      version: '1.0',
      requestId: req.requestId || null
    };

    // Agregar información adicional en desarrollo
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = error.stack;
      errorResponse.error.path = req.path;
      errorResponse.error.method = req.method;
    }

    return errorResponse;
  }

  public standardizeSuccess(data: any, req: any): any {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      version: '1.0',
      requestId: req.requestId || null
    };
  }

  public addPagination(data: any[], page: number = 1, limit: number = 10, total?: number): any {
    const totalCount = total || data.length;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  public getTransformationRules(): TransformationRule[] {
    return [...this.transformationRules];
  }

  public clearTransformationRules(): void {
    this.transformationRules = [];
  }

  public removeTransformationRule(path: string, method: string): boolean {
    const initialLength = this.transformationRules.length;
    this.transformationRules = this.transformationRules.filter(rule => 
      !(rule.path === path && rule.method === method)
    );
    return this.transformationRules.length !== initialLength;
  }
}