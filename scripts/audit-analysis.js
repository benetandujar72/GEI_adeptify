#!/usr/bin/env node

/**
 * Script de Auditoría del Código Actual
 * Analiza la aplicación monolítica para mapear funcionalidades y dependencias
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CodeAuditor {
  constructor() {
    this.projectRoot = process.cwd();
    this.analysis = {
      serverRoutes: [],
      serverServices: [],
      clientComponents: [],
      clientPages: [],
      databaseSchemas: [],
      dependencies: [],
      apiEndpoints: [],
      fileStructure: {}
    };
  }

  async runAudit() {
    console.log('🔍 Iniciando auditoría del código actual...\n');
    
    try {
      await this.analyzeServerStructure();
      await this.analyzeClientStructure();
      await this.analyzeDatabaseSchemas();
      await this.analyzeDependencies();
      await this.analyzeAPIEndpoints();
      await this.generateReport();
      
      console.log('✅ Auditoría completada exitosamente');
    } catch (error) {
      console.error('❌ Error durante la auditoría:', error);
      process.exit(1);
    }
  }

  async analyzeServerStructure() {
    console.log('📁 Analizando estructura del servidor...');
    
    const serverPath = path.join(this.projectRoot, 'server');
    if (!fs.existsSync(serverPath)) {
      console.log('⚠️  Directorio server no encontrado');
      return;
    }

    // Analizar rutas
    const routesPath = path.join(serverPath, 'routes');
    if (fs.existsSync(routesPath)) {
      const routeFiles = fs.readdirSync(routesPath).filter(f => f.endsWith('.ts'));
      this.analysis.serverRoutes = routeFiles.map(file => ({
        file,
        path: path.join('routes', file),
        endpoints: this.extractEndpoints(path.join(routesPath, file))
      }));
    }

    // Analizar servicios
    const servicesPath = path.join(serverPath, 'services');
    if (fs.existsSync(servicesPath)) {
      const serviceFiles = fs.readdirSync(servicesPath).filter(f => f.endsWith('.ts'));
      this.analysis.serverServices = serviceFiles.map(file => ({
        file,
        path: path.join('services', file),
        functions: this.extractFunctions(path.join(servicesPath, file))
      }));
    }
  }

  async analyzeClientStructure() {
    console.log('📱 Analizando estructura del cliente...');
    
    const clientPath = path.join(this.projectRoot, 'client');
    if (!fs.existsSync(clientPath)) {
      console.log('⚠️  Directorio client no encontrado');
      return;
    }

    // Analizar componentes
    const componentsPath = path.join(clientPath, 'src', 'components');
    if (fs.existsSync(componentsPath)) {
      this.analysis.clientComponents = this.scanDirectory(componentsPath, '.tsx');
    }

    // Analizar páginas
    const pagesPath = path.join(clientPath, 'src', 'pages');
    if (fs.existsSync(pagesPath)) {
      this.analysis.clientPages = this.scanDirectory(pagesPath, '.tsx');
    }
  }

  async analyzeDatabaseSchemas() {
    console.log('🗄️  Analizando esquemas de base de datos...');
    
    const sharedPath = path.join(this.projectRoot, 'shared');
    if (fs.existsSync(sharedPath)) {
      const schemaFile = path.join(sharedPath, 'schema.ts');
      if (fs.existsSync(schemaFile)) {
        this.analysis.databaseSchemas = this.extractDatabaseSchemas(schemaFile);
      }
    }

    // También buscar en drizzle
    const drizzlePath = path.join(this.projectRoot, 'drizzle');
    if (fs.existsSync(drizzlePath)) {
      const sqlFiles = fs.readdirSync(drizzlePath).filter(f => f.endsWith('.sql'));
      this.analysis.databaseSchemas.push(...sqlFiles.map(file => ({
        type: 'migration',
        file,
        path: path.join('drizzle', file)
      })));
    }
  }

  async analyzeDependencies() {
    console.log('📦 Analizando dependencias...');
    
    const packagePath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      this.analysis.dependencies = {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        scripts: packageJson.scripts || {}
      };
    }
  }

  async analyzeAPIEndpoints() {
    console.log('🔗 Analizando endpoints de API...');
    
    // Extraer endpoints de las rutas del servidor
    this.analysis.serverRoutes.forEach(route => {
      if (route.endpoints) {
        this.analysis.apiEndpoints.push(...route.endpoints);
      }
    });
  }

  scanDirectory(dirPath, extension) {
    const items = [];
    
    if (!fs.existsSync(dirPath)) return items;
    
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        items.push({
          type: 'directory',
          name: file,
          path: path.relative(this.projectRoot, fullPath),
          children: this.scanDirectory(fullPath, extension)
        });
      } else if (file.endsWith(extension)) {
        items.push({
          type: 'file',
          name: file,
          path: path.relative(this.projectRoot, fullPath)
        });
      }
    });
    
    return items;
  }

  extractEndpoints(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const endpoints = [];
      
      // Buscar patrones de rutas Express
      const routePatterns = [
        /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
      ];
      
      routePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          endpoints.push({
            method: match[1].toUpperCase(),
            path: match[2],
            file: path.basename(filePath)
          });
        }
      });
      
      return endpoints;
    } catch (error) {
      console.warn(`⚠️  Error leyendo archivo ${filePath}:`, error.message);
      return [];
    }
  }

  extractFunctions(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const functions = [];
      
      // Buscar funciones exportadas
      const functionPattern = /export\s+(?:async\s+)?(?:function\s+)?(\w+)\s*[=\(]/g;
      let match;
      
      while ((match = functionPattern.exec(content)) !== null) {
        functions.push(match[1]);
      }
      
      return functions;
    } catch (error) {
      console.warn(`⚠️  Error leyendo archivo ${filePath}:`, error.message);
      return [];
    }
  }

  extractDatabaseSchemas(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const schemas = [];
      
      // Buscar definiciones de tablas
      const tablePattern = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = tablePattern.exec(content)) !== null) {
        schemas.push({
          name: match[1],
          tableName: match[2],
          type: 'drizzle'
        });
      }
      
      return schemas;
    } catch (error) {
      console.warn(`⚠️  Error leyendo archivo ${filePath}:`, error.message);
      return [];
    }
  }

  async generateReport() {
    console.log('📊 Generando reporte de auditoría...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRoutes: this.analysis.serverRoutes.length,
        totalServices: this.analysis.serverServices.length,
        totalComponents: this.analysis.clientComponents.length,
        totalPages: this.analysis.clientPages.length,
        totalSchemas: this.analysis.databaseSchemas.length,
        totalEndpoints: this.analysis.apiEndpoints.length
      },
      details: this.analysis
    };

    // Guardar reporte
    const reportPath = path.join(this.projectRoot, 'docs', 'audit-report.json');
    const docsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generar reporte en markdown
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(this.projectRoot, 'docs', 'audit-report.md');
    fs.writeFileSync(markdownPath, markdownReport);
    
    console.log(`📄 Reporte guardado en: ${reportPath}`);
    console.log(`📄 Reporte Markdown guardado en: ${markdownPath}`);
  }

  generateMarkdownReport(report) {
    return `# Reporte de Auditoría del Código Actual

## 📊 Resumen Ejecutivo

- **Total de Rutas del Servidor**: ${report.summary.totalRoutes}
- **Total de Servicios**: ${report.summary.totalServices}
- **Total de Componentes del Cliente**: ${report.summary.totalComponents}
- **Total de Páginas**: ${report.summary.totalPages}
- **Total de Esquemas de Base de Datos**: ${report.summary.totalSchemas}
- **Total de Endpoints API**: ${report.summary.totalEndpoints}

## 🔗 Endpoints API Identificados

${report.details.apiEndpoints.map(endpoint => 
  `- **${endpoint.method}** \`${endpoint.path}\` (${endpoint.file})`
).join('\n')}

## 🗄️ Esquemas de Base de Datos

${report.details.databaseSchemas.map(schema => 
  `- **${schema.name}**: ${schema.tableName || schema.file}`
).join('\n')}

## 📁 Estructura del Servidor

### Rutas
${report.details.serverRoutes.map(route => 
  `- \`${route.path}\` (${route.endpoints?.length || 0} endpoints)`
).join('\n')}

### Servicios
${report.details.serverServices.map(service => 
  `- \`${service.path}\` (${service.functions?.length || 0} funciones)`
).join('\n')}

## 📱 Estructura del Cliente

### Componentes
${this.formatFileList(report.details.clientComponents)}

### Páginas
${this.formatFileList(report.details.clientPages)}

## 📦 Dependencias Principales

### Dependencies
${Object.keys(report.details.dependencies.dependencies || {}).map(dep => 
  `- \`${dep}\`: \`${report.details.dependencies.dependencies[dep]}\``
).join('\n')}

### DevDependencies
${Object.keys(report.details.dependencies.devDependencies || {}).map(dep => 
  `- \`${dep}\`: \`${report.details.dependencies.devDependencies[dep]}\``
).join('\n')}

---
*Reporte generado el ${new Date().toLocaleString('es-ES')}*
`;
  }

  formatFileList(items) {
    if (!items || items.length === 0) return '- Ninguno encontrado';
    
    return items.map(item => {
      if (item.type === 'file') {
        return `- \`${item.path}\``;
      } else if (item.type === 'directory') {
        return `- 📁 \`${item.path}\` (${item.children?.length || 0} archivos)`;
      }
      return `- ${item.name}`;
    }).join('\n');
  }
}

// Ejecutar auditoría
if (require.main === module) {
  const auditor = new CodeAuditor();
  auditor.runAudit();
}

module.exports = CodeAuditor; 