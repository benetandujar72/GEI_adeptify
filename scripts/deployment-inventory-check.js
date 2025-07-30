#!/usr/bin/env node

/**
 * Script de inventario completo para verificar todos los recursos necesarios
 * para el despliegue en Render.com
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

class DeploymentInventory {
  constructor() {
    this.results = {
      critical: { passed: 0, failed: 0, total: 0 },
      important: { passed: 0, failed: 0, total: 0 },
      optional: { passed: 0, failed: 0, total: 0 }
    };
    this.issues = [];
  }

  checkFile(filePath, description, category = 'important') {
    this.results[category].total++;
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      logSuccess(`${description} - ${filePath} (${(stats.size / 1024).toFixed(1)}KB)`);
      this.results[category].passed++;
      return true;
    } else {
      logError(`${description} - ${filePath} NO ENCONTRADO`);
      this.results[category].failed++;
      this.issues.push(`Archivo faltante: ${filePath}`);
      return false;
    }
  }

  checkDirectory(dirPath, description, category = 'important') {
    this.results[category].total++;
    
    if (fs.existsSync(dirPath)) {
      const stats = fs.statSync(dirPath);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(dirPath);
        logSuccess(`${description} - ${dirPath} (${files.length} archivos)`);
        this.results[category].passed++;
        return true;
      } else {
        logError(`${description} - ${dirPath} NO ES UN DIRECTORIO`);
        this.results[category].failed++;
        this.issues.push(`No es directorio: ${dirPath}`);
        return false;
      }
    } else {
      logError(`${description} - ${dirPath} NO ENCONTRADO`);
      this.results[category].failed++;
      this.issues.push(`Directorio faltante: ${dirPath}`);
      return false;
    }
  }

  checkPackageJson() {
    logSection('VERIFICANDO PACKAGE.JSON');
    
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!this.checkFile(packagePath, 'package.json', 'critical')) {
      return false;
    }

    try {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Verificar scripts críticos
      const requiredScripts = ['build:server', 'build:client', 'start'];
      const scripts = packageContent.scripts || {};
      
      requiredScripts.forEach(script => {
        this.results.critical.total++;
        if (scripts[script]) {
          logSuccess(`Script ${script} configurado`);
          this.results.critical.passed++;
        } else {
          logError(`Script ${script} NO CONFIGURADO`);
          this.results.critical.failed++;
          this.issues.push(`Script faltante: ${script}`);
        }
      });

      // Verificar dependencias
      const deps = packageContent.dependencies || {};
      const devDeps = packageContent.devDependencies || {};
      const totalDeps = Object.keys(deps).length + Object.keys(devDeps).length;
      
      logInfo(`Dependencias totales: ${totalDeps}`);
      
      return true;
    } catch (error) {
      logError(`Error al leer package.json: ${error.message}`);
      this.results.critical.failed++;
      return false;
    }
  }

  checkBuildFiles() {
    logSection('VERIFICANDO ARCHIVOS DE BUILD');
    
    // Verificar directorio dist
    const distPath = path.join(process.cwd(), 'dist');
    const distExists = this.checkDirectory(distPath, 'Directorio dist', 'critical');
    
    if (distExists) {
      // Verificar archivo principal del servidor
      const mainServerFile = path.join(distPath, 'index.js');
      this.checkFile(mainServerFile, 'Archivo principal del servidor (dist/index.js)', 'critical');
      
      // Verificar archivos del cliente
      const clientDistPath = path.join(process.cwd(), 'client', 'dist');
      this.checkDirectory(clientDistPath, 'Directorio client/dist', 'important');
      
      if (fs.existsSync(clientDistPath)) {
        const indexHtml = path.join(clientDistPath, 'index.html');
        this.checkFile(indexHtml, 'index.html del cliente', 'important');
      }
    }
  }

  checkConfigurationFiles() {
    logSection('VERIFICANDO ARCHIVOS DE CONFIGURACIÓN');
    
    // Archivos críticos para Render
    this.checkFile('render.yaml', 'Configuración de Render', 'critical');
    this.checkFile('scripts/start-render.sh', 'Script de inicio para Render', 'critical');
    
    // Archivos de configuración importantes
    this.checkFile('drizzle.config.ts', 'Configuración de Drizzle', 'important');
    this.checkFile('.env', 'Archivo de variables de entorno', 'important');
    this.checkFile('env.example', 'Ejemplo de variables de entorno', 'optional');
  }

  checkEnvironmentVariables() {
    logSection('VERIFICANDO VARIABLES DE ENTORNO');
    
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      logError('Archivo .env no encontrado');
      this.results.critical.failed++;
      this.issues.push('Archivo .env faltante');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'DATABASE_URL',
      'NODE_ENV',
      'PORT',
      'SESSION_SECRET',
      'JWT_SECRET',
      'CORS_ORIGIN',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GEMINI_API_KEY'
    ];

    requiredVars.forEach(varName => {
      this.results.critical.total++;
      if (envContent.includes(varName)) {
        logSuccess(`Variable ${varName} configurada`);
        this.results.critical.passed++;
      } else {
        logError(`Variable ${varName} NO CONFIGURADA`);
        this.results.critical.failed++;
        this.issues.push(`Variable faltante: ${varName}`);
      }
    });
  }

  checkRenderConfig() {
    logSection('VERIFICANDO CONFIGURACIÓN DE RENDER');
    
    const renderPath = path.join(process.cwd(), 'render.yaml');
    if (!fs.existsSync(renderPath)) {
      logError('render.yaml no encontrado');
      return;
    }

    const renderContent = fs.readFileSync(renderPath, 'utf8');
    
    // Verificar elementos críticos en render.yaml
    const requiredElements = [
      { name: 'buildCommand', pattern: /buildCommand:/ },
      { name: 'startCommand', pattern: /startCommand:/ },
      { name: 'healthCheckPath', pattern: /healthCheckPath:/ },
      { name: 'envVars', pattern: /envVars:/ },
      { name: 'DATABASE_URL', pattern: /DATABASE_URL/ },
      { name: 'SESSION_SECRET', pattern: /SESSION_SECRET/ },
      { name: 'JWT_SECRET', pattern: /JWT_SECRET/ }
    ];

    requiredElements.forEach(element => {
      this.results.critical.total++;
      if (element.pattern.test(renderContent)) {
        logSuccess(`${element.name} configurado en render.yaml`);
        this.results.critical.passed++;
      } else {
        logError(`${element.name} NO CONFIGURADO en render.yaml`);
        this.results.critical.failed++;
        this.issues.push(`Elemento faltante en render.yaml: ${element.name}`);
      }
    });
  }

  checkStartScript() {
    logSection('VERIFICANDO SCRIPT DE INICIO');
    
    const startScriptPath = path.join(process.cwd(), 'scripts', 'start-render.sh');
    if (!this.checkFile(startScriptPath, 'Script de inicio', 'critical')) {
      return;
    }

    const scriptContent = fs.readFileSync(startScriptPath, 'utf8');
    
    // Verificar elementos críticos en el script
    const requiredElements = [
      { name: 'shebang', pattern: /^#!/ },
      { name: 'NODE_ENV', pattern: /NODE_ENV/ },
      { name: 'PORT', pattern: /PORT/ },
      { name: 'node dist/index.js', pattern: /node.*dist\/index\.js/ }
    ];

    requiredElements.forEach(element => {
      this.results.important.total++;
      if (element.pattern.test(scriptContent)) {
        logSuccess(`${element.name} presente en start-render.sh`);
        this.results.important.passed++;
      } else {
        logError(`${element.name} NO PRESENTE en start-render.sh`);
        this.results.important.failed++;
        this.issues.push(`Elemento faltante en start-render.sh: ${element.name}`);
      }
    });
  }

  checkDatabaseSchema() {
    logSection('VERIFICANDO ESQUEMA DE BASE DE DATOS');
    
    const schemaPath = path.join(process.cwd(), 'shared', 'schema.ts');
    this.checkFile(schemaPath, 'Esquema de base de datos', 'important');
    
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      
      // Verificar tablas críticas
      const requiredTables = ['users', 'sessions', 'competencies'];
      requiredTables.forEach(table => {
        this.results.important.total++;
        if (schemaContent.includes(table)) {
          logSuccess(`Tabla ${table} definida en esquema`);
          this.results.important.passed++;
        } else {
          logWarning(`Tabla ${table} NO DEFINIDA en esquema`);
          this.results.important.failed++;
        }
      });
    }
  }

  checkNodeModules() {
    logSection('VERIFICANDO DEPENDENCIAS');
    
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    if (!this.checkDirectory(nodeModulesPath, 'node_modules', 'critical')) {
      return;
    }

    // Verificar dependencias críticas
    const criticalDeps = ['express', 'pg', 'drizzle-orm', 'cors'];
    criticalDeps.forEach(dep => {
      const depPath = path.join(nodeModulesPath, dep);
      this.results.critical.total++;
      if (fs.existsSync(depPath)) {
        logSuccess(`Dependencia ${dep} instalada`);
        this.results.critical.passed++;
      } else {
        logError(`Dependencia ${dep} NO INSTALADA`);
        this.results.critical.failed++;
        this.issues.push(`Dependencia faltante: ${dep}`);
      }
    });
  }

  checkPermissions() {
    logSection('VERIFICANDO PERMISOS');
    
    const startScriptPath = path.join(process.cwd(), 'scripts', 'start-render.sh');
    if (fs.existsSync(startScriptPath)) {
      const stats = fs.statSync(startScriptPath);
      const isExecutable = (stats.mode & 0o111) !== 0;
      
      this.results.important.total++;
      if (isExecutable) {
        logSuccess('Script start-render.sh es ejecutable');
        this.results.important.passed++;
      } else {
        logWarning('Script start-render.sh NO ES EJECUTABLE');
        this.results.important.failed++;
        this.issues.push('Script start-render.sh no es ejecutable');
      }
    }
  }

  generateReport() {
    logSection('RESUMEN DEL INVENTARIO');
    
    const totalCritical = this.results.critical.total;
    const passedCritical = this.results.critical.passed;
    const failedCritical = this.results.critical.failed;
    
    const totalImportant = this.results.important.total;
    const passedImportant = this.results.important.passed;
    const failedImportant = this.results.important.failed;
    
    console.log(`\n${colors.bright}📊 ESTADÍSTICAS:${colors.reset}`);
    console.log(`🔴 Críticos: ${passedCritical}/${totalCritical} pasaron (${failedCritical} fallaron)`);
    console.log(`🟡 Importantes: ${passedImportant}/${totalImportant} pasaron (${failedImportant} fallaron)`);
    
    if (failedCritical > 0) {
      logError(`\n🚨 ${failedCritical} problemas CRÍTICOS detectados`);
      logError('La aplicación NO puede desplegarse hasta resolver estos problemas');
    } else if (failedImportant > 0) {
      logWarning(`\n⚠️  ${failedImportant} problemas IMPORTANTES detectados`);
      logWarning('La aplicación puede desplegarse pero puede tener problemas');
    } else {
      logSuccess('\n✅ Todos los elementos críticos e importantes están correctos');
      logSuccess('La aplicación está lista para despliegue');
    }
    
    if (this.issues.length > 0) {
      console.log(`\n${colors.bright}📋 PROBLEMAS DETECTADOS:${colors.reset}`);
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    // Recomendaciones
    console.log(`\n${colors.bright}💡 RECOMENDACIONES:${colors.reset}`);
    if (failedCritical > 0) {
      console.log('1. Resolver todos los problemas críticos antes del despliegue');
      console.log('2. Verificar que todos los archivos de configuración existan');
      console.log('3. Asegurar que las variables de entorno estén configuradas');
    } else {
      console.log('1. Proceder con el despliegue en Render.com');
      console.log('2. Monitorear los logs durante el primer despliegue');
      console.log('3. Verificar que el health check funcione correctamente');
    }
  }

  runFullInventory() {
    log(`${colors.bright}${colors.magenta}🔍 INVENTARIO COMPLETO DE DESPLIEGUE${colors.reset}`);
    log(`${colors.cyan}Verificando todos los recursos necesarios para Render.com${colors.reset}\n`);
    
    this.checkPackageJson();
    this.checkBuildFiles();
    this.checkConfigurationFiles();
    this.checkEnvironmentVariables();
    this.checkRenderConfig();
    this.checkStartScript();
    this.checkDatabaseSchema();
    this.checkNodeModules();
    this.checkPermissions();
    
    this.generateReport();
  }
}

// Ejecutar inventario
const inventory = new DeploymentInventory();
inventory.runFullInventory(); 