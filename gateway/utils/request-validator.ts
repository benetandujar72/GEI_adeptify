interface ValidationRule {
  field: string;
  type: 'required' | 'string' | 'number' | 'email' | 'url' | 'uuid' | 'array' | 'object' | 'boolean';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean;
  message?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class RequestValidator {
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private globalRules: ValidationRule[] = [];

  constructor() {
    this.initializeValidationRules();
  }

  private initializeValidationRules(): void {
    // Reglas globales para todos los requests
    this.globalRules = [
      {
        field: 'Content-Type',
        type: 'string',
        pattern: /^application\/(json|xml|form-data)/,
        message: 'Content-Type debe ser application/json, application/xml o application/form-data'
      }
    ];

    // Reglas específicas por endpoint
    this.setValidationRules('/api/users', [
      { field: 'email', type: 'email', required: true, message: 'Email es requerido y debe ser válido' },
      { field: 'password', type: 'string', minLength: 8, message: 'Password debe tener al menos 8 caracteres' },
      { field: 'name', type: 'string', minLength: 2, maxLength: 100, message: 'Nombre debe tener entre 2 y 100 caracteres' }
    ]);

    this.setValidationRules('/api/students', [
      { field: 'studentId', type: 'string', pattern: /^[A-Z0-9]{8,}$/, message: 'ID de estudiante debe ser alfanumérico y tener al menos 8 caracteres' },
      { field: 'grade', type: 'number', min: 1, max: 12, message: 'Grado debe estar entre 1 y 12' }
    ]);

    this.setValidationRules('/api/courses', [
      { field: 'courseCode', type: 'string', pattern: /^[A-Z]{3,4}[0-9]{3}$/, message: 'Código de curso debe seguir el formato ABC123' },
      { field: 'credits', type: 'number', min: 1, max: 6, message: 'Créditos deben estar entre 1 y 6' }
    ]);

    this.setValidationRules('/api/auth/login', [
      { field: 'email', type: 'email', required: true, message: 'Email es requerido' },
      { field: 'password', type: 'string', required: true, message: 'Password es requerido' }
    ]);

    this.setValidationRules('/api/auth/register', [
      { field: 'email', type: 'email', required: true, message: 'Email es requerido' },
      { field: 'password', type: 'string', minLength: 8, message: 'Password debe tener al menos 8 caracteres' },
      { field: 'confirmPassword', type: 'string', required: true, message: 'Confirmación de password es requerida' },
      {
        field: 'confirmPassword',
        type: 'custom',
        custom: (value, req) => value === req.body.password,
        message: 'Las contraseñas no coinciden'
      }
    ]);

    this.setValidationRules('/api/files/upload', [
      { field: 'file', type: 'object', required: true, message: 'Archivo es requerido' },
      { field: 'file.size', type: 'number', max: 10 * 1024 * 1024, message: 'Archivo no puede exceder 10MB' }
    ]);

    this.setValidationRules('/api/llm/chat', [
      { field: 'message', type: 'string', required: true, minLength: 1, maxLength: 1000, message: 'Mensaje es requerido y debe tener entre 1 y 1000 caracteres' },
      { field: 'model', type: 'string', enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro'], message: 'Modelo debe ser uno de los permitidos' }
    ]);
  }

  public setValidationRules(path: string, rules: ValidationRule[]): void {
    this.validationRules.set(path, rules);
  }

  public validate(req: any): ValidationResult {
    const errors: ValidationError[] = [];
    const path = req.path || req.url;
    const method = req.method;

    // Validar reglas globales
    errors.push(...this.validateGlobalRules(req));

    // Validar reglas específicas del endpoint
    const endpointRules = this.validationRules.get(path);
    if (endpointRules) {
      errors.push(...this.validateEndpointRules(req, endpointRules));
    }

    // Validar headers requeridos
    errors.push(...this.validateHeaders(req));

    // Validar límites de tamaño
    errors.push(...this.validateSizeLimits(req));

    // Validar rate limiting básico
    errors.push(...this.validateRateLimiting(req));

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateGlobalRules(req: any): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of this.globalRules) {
      const value = this.getFieldValue(req, rule.field);
      
      if (rule.type === 'required' && !value) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} es requerido`,
          value
        });
      } else if (value && !this.validateField(value, rule)) {
        errors.push({
          field: rule.field,
          message: rule.message || `Valor inválido para ${rule.field}`,
          value
        });
      }
    }

    return errors;
  }

  private validateEndpointRules(req: any, rules: ValidationRule[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = this.getFieldValue(req, rule.field);
      
      if (rule.type === 'required' && !value) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} es requerido`,
          value
        });
      } else if (value && !this.validateField(value, rule, req)) {
        errors.push({
          field: rule.field,
          message: rule.message || `Valor inválido para ${rule.field}`,
          value
        });
      }
    }

    return errors;
  }

  private validateHeaders(req: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validar headers de seguridad
    const requiredHeaders = ['User-Agent'];
    for (const header of requiredHeaders) {
      if (!req.headers[header.toLowerCase()]) {
        errors.push({
          field: `header.${header}`,
          message: `Header ${header} es requerido`,
          value: req.headers[header.toLowerCase()]
        });
      }
    }

    // Validar Content-Type para POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        errors.push({
          field: 'header.Content-Type',
          message: 'Content-Type debe ser application/json para requests POST/PUT/PATCH',
          value: contentType
        });
      }
    }

    return errors;
  }

  private validateSizeLimits(req: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validar tamaño del body
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBodySize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxBodySize) {
      errors.push({
        field: 'body.size',
        message: `Tamaño del body excede el límite de ${maxBodySize / 1024 / 1024}MB`,
        value: contentLength
      });
    }

    // Validar tamaño de URL
    const urlLength = req.url?.length || 0;
    const maxUrlLength = 2048;

    if (urlLength > maxUrlLength) {
      errors.push({
        field: 'url.length',
        message: `URL excede el límite de ${maxUrlLength} caracteres`,
        value: urlLength
      });
    }

    return errors;
  }

  private validateRateLimiting(req: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Esta validación se maneja principalmente en el middleware de rate limiting
    // Aquí solo validamos aspectos básicos
    const userAgent = req.headers['user-agent'];
    if (userAgent && userAgent.includes('bot') && !userAgent.includes('Googlebot')) {
      errors.push({
        field: 'User-Agent',
        message: 'Bots no autorizados no están permitidos',
        value: userAgent
      });
    }

    return errors;
  }

  private getFieldValue(req: any, field: string): any {
    const parts = field.split('.');
    let value = req;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private validateField(value: any, rule: ValidationRule, req?: any): boolean {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') return false;
        if (rule.minLength && value.length < rule.minLength) return false;
        if (rule.maxLength && value.length > rule.maxLength) return false;
        if (rule.pattern && !rule.pattern.test(value)) return false;
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) return false;
        if (rule.min !== undefined && value < rule.min) return false;
        if (rule.max !== undefined && value > rule.max) return false;
        break;

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailPattern.test(value)) return false;
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return false;
        }
        break;

      case 'uuid':
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (typeof value !== 'string' || !uuidPattern.test(value)) return false;
        break;

      case 'array':
        if (!Array.isArray(value)) return false;
        if (rule.min !== undefined && value.length < rule.min) return false;
        if (rule.max !== undefined && value.length > rule.max) return false;
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;

      case 'custom':
        if (rule.custom && !rule.custom(value, req)) return false;
        break;
    }

    if (rule.enum && !rule.enum.includes(value)) return false;

    return true;
  }

  public addCustomValidator(path: string, field: string, validator: (value: any, req: any) => boolean, message?: string): void {
    const rules = this.validationRules.get(path) || [];
    rules.push({
      field,
      type: 'custom',
      custom: validator,
      message: message || `Validación personalizada falló para ${field}`
    });
    this.validationRules.set(path, rules);
  }

  public getValidationRules(path: string): ValidationRule[] {
    return this.validationRules.get(path) || [];
  }

  public clearValidationRules(path: string): void {
    this.validationRules.delete(path);
  }

  public validateSchema(data: any, schema: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];

    for (const rule of schema) {
      const value = this.getFieldValue({ body: data }, rule.field);
      
      if (rule.type === 'required' && !value) {
        errors.push({
          field: rule.field,
          message: rule.message || `${rule.field} es requerido`,
          value
        });
      } else if (value && !this.validateField(value, rule)) {
        errors.push({
          field: rule.field,
          message: rule.message || `Valor inválido para ${rule.field}`,
          value
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}