#!/usr/bin/env node

/**
 * Script de diagnóstico específico para identificar por qué la aplicación
 * falla al iniciar en Render.com
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

class RenderFailureDiagnostic {
  constructor() {
    this.issues = [];
    this.suggestions = [];
  }

  checkMainServerFile() {
    logSection('VERIFICANDO ARCHIVO PRINCIPAL DEL SERVIDOR');
    
    const mainFile = path.join(process.cwd(), 'dist', 'index.js');
    
    if (!fs.existsSync(mainFile)) {
      logError('Archivo principal dist/index.js no encontrado');
      this.issues.push('Archivo principal del servidor faltante');
      return false;
    }

    const stats = fs.statSync(mainFile);
    logSuccess(`Archivo principal encontrado (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

    // Verificar que el archivo no esté corrupto
    try {
      const content = fs.readFileSync(mainFile, 'utf8');
      if (content.length < 1000) {
        logError('Archivo principal parece estar corrupto (muy pequeño)');
        this.issues.push('Archivo principal corrupto');
        return false;
      }

      // Verificar que contenga código JavaScript válido
      if (!content.includes('require') && !content.includes('import')) {
        logWarning('Archivo principal no parece contener código JavaScript válido');
        this.suggestions.push('Verificar que el build genere código JavaScript válido');
      }

      logSuccess('Archivo principal parece válido');
      return true;
    } catch (error) {
      logError(`Error al leer archivo principal: ${error.message}`);
      this.issues.push('Error al leer archivo principal');
      return false;
    }
  }

  checkStartScript() {
    logSection('VERIFICANDO SCRIPT DE INICIO');
    
    const startScript = path.join(process.cwd(), 'scripts', 'start-render.sh');
    
    if (!fs.existsSync(startScript)) {
      logError('Script start-render.sh no encontrado');
      this.issues.push('Script de inicio faltante');
      return false;
    }

    const content = fs.readFileSync(startScript, 'utf8');
    logSuccess('Script de inicio encontrado');

    // Verificar elementos críticos
    const checks = [
      { name: 'Shebang', pattern: /^#!/, required: true },
      { name: 'NODE_ENV', pattern: /NODE_ENV/, required: true },
      { name: 'PORT', pattern: /PORT/, required: true },
      { name: 'node dist/index.js', pattern: /node.*dist\/index\.js/, required: true },
      { name: 'Variables críticas', pattern: /DATABASE_URL|SESSION_SECRET|JWT_SECRET/, required: true }
    ];

    checks.forEach(check => {
      if (check.required && !check.pattern.test(content)) {
        logError(`${check.name} no encontrado en script de inicio`);
        this.issues.push(`${check.name} faltante en script de inicio`);
      } else {
        logSuccess(`${check.name} presente en script de inicio`);
      }
    });

    return true;
  }

  checkPackageJsonScripts() {
    logSection('VERIFICANDO SCRIPTS DE PACKAGE.JSON');
    
    const packagePath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      logError('package.json no encontrado');
      this.issues.push('package.json faltante');
      return false;
    }

    try {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const scripts = packageContent.scripts || {};

      const requiredScripts = ['build:server', 'build:client', 'start'];
      requiredScripts.forEach(script => {
        if (scripts[script]) {
          logSuccess(`Script ${script} configurado: ${scripts[script]}`);
        } else {
          logError(`Script ${script} NO CONFIGURADO`);
          this.issues.push(`Script ${script} faltante en package.json`);
        }
      });

      return true;
    } catch (error) {
      logError(`Error al leer package.json: ${error.message}`);
      this.issues.push('Error al leer package.json');
      return false;
    }
  }

  checkEnvironmentVariables() {
    logSection('VERIFICANDO VARIABLES DE ENTORNO');
    
    const envPath = path.join(process.cwd(), '.env');
    
    if (!fs.existsSync(envPath)) {
      logError('Archivo .env no encontrado');
      this.issues.push('Archivo .env faltante');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    logSuccess('Archivo .env encontrado');

    // Verificar variables críticas
    const criticalVars = [
      'DATABASE_URL',
      'NODE_ENV',
      'PORT',
      'SESSION_SECRET',
      'JWT_SECRET',
      'CORS_ORIGIN'
    ];

    criticalVars.forEach(varName => {
      if (envContent.includes(varName)) {
        logSuccess(`Variable ${varName} configurada`);
      } else {
        logError(`Variable ${varName} NO CONFIGURADA`);
        this.issues.push(`Variable ${varName} faltante`);
      }
    });

    return true;
  }

  checkDependencies() {
    logSection('VERIFICANDO DEPENDENCIAS CRÍTICAS');
    
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      logError('node_modules no encontrado');
      this.issues.push('Dependencias no instaladas');
      return false;
    }

    const criticalDeps = ['express', 'pg', 'drizzle-orm', 'cors'];
    criticalDeps.forEach(dep => {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        logSuccess(`Dependencia ${dep} instalada`);
      } else {
        logError(`Dependencia ${dep} NO INSTALADA`);
        this.issues.push(`Dependencia ${dep} faltante`);
      }
    });

    return true;
  }

  checkRenderConfig() {
    logSection('VERIFICANDO CONFIGURACIÓN DE RENDER');
    
    const renderPath = path.join(process.cwd(), 'render.yaml');
    
    if (!fs.existsSync(renderPath)) {
      logError('render.yaml no encontrado');
      this.issues.push('Configuración de Render faltante');
      return false;
    }

    const renderContent = fs.readFileSync(renderPath, 'utf8');
    logSuccess('render.yaml encontrado');

    // Verificar elementos críticos
    const checks = [
      { name: 'buildCommand', pattern: /buildCommand:/, required: true },
      { name: 'startCommand', pattern: /startCommand:/, required: true },
      { name: 'healthCheckPath', pattern: /healthCheckPath:/, required: true },
      { name: 'envVars', pattern: /envVars:/, required: true },
      { name: 'DATABASE_URL', pattern: /DATABASE_URL/, required: true }
    ];

    checks.forEach(check => {
      if (check.required && !check.pattern.test(renderContent)) {
        logError(`${check.name} no configurado en render.yaml`);
        this.issues.push(`${check.name} faltante en render.yaml`);
      } else {
        logSuccess(`${check.name} configurado en render.yaml`);
      }
    });

    return true;
  }

  checkPotentialIssues() {
    logSection('ANÁLISIS DE PROBLEMAS POTENCIALES');
    
    // Verificar si hay problemas comunes
    const packagePath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Verificar si hay scripts de postinstall que puedan fallar
      const scripts = packageContent.scripts || {};
      if (scripts.postinstall) {
        logWarning(`Script postinstall detectado: ${scripts.postinstall}`);
        this.suggestions.push('Verificar que el script postinstall no falle en Render');
      }

      // Verificar dependencias de desarrollo que puedan causar problemas
      const devDeps = packageContent.devDependencies || {};
      const problematicDevDeps = ['typescript', '@types/node', 'esbuild'];
      problematicDevDeps.forEach(dep => {
        if (devDeps[dep]) {
          logInfo(`Dependencia de desarrollo ${dep} presente`);
        }
      });
    }

    // Verificar si hay archivos que puedan causar problemas
    const problematicFiles = ['.env.local', '.env.development', '.env.test'];
    problematicFiles.forEach(file => {
      if (fs.existsSync(file)) {
        logWarning(`Archivo ${file} encontrado - puede causar conflictos`);
        this.suggestions.push(`Considerar remover ${file} para producción`);
      }
    });

    return true;
  }

  generateReport() {
    logSection('RESUMEN DE DIAGNÓSTICO');
    
    if (this.issues.length === 0) {
      logSuccess('✅ No se detectaron problemas críticos');
      logInfo('La aplicación debería funcionar correctamente en Render');
    } else {
      logError(`❌ Se detectaron ${this.issues.length} problemas:`);
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    if (this.suggestions.length > 0) {
      logInfo(`\n💡 ${this.suggestions.length} sugerencias de mejora:`);
      this.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    // Recomendaciones específicas para Render
    console.log(`\n${colors.bright}🚀 RECOMENDACIONES PARA RENDER:${colors.reset}`);
    console.log('1. Verificar que el build command genere correctamente dist/index.js');
    console.log('2. Asegurar que el start command ejecute: node dist/index.js');
    console.log('3. Verificar que todas las variables de entorno estén configuradas en Render');
    console.log('4. Monitorear los logs durante el primer despliegue');
    console.log('5. Verificar que el health check endpoint /health responda correctamente');

    // Comandos de verificación
    console.log(`\n${colors.bright}🔍 COMANDOS DE VERIFICACIÓN:${colors.reset}`);
    console.log('• node scripts/deployment-inventory-check.js');
    console.log('• node scripts/verify-render-deployment.js');
    console.log('• npm run build:server && npm run build:client');
    console.log('• node dist/index.js (para probar localmente)');
  }

  runDiagnostic() {
    log(`${colors.bright}${colors.magenta}🔍 DIAGNÓSTICO DE FALLO EN RENDER${colors.reset}`);
    log(`${colors.cyan}Analizando posibles causas del fallo al iniciar${colors.reset}\n`);
    
    this.checkMainServerFile();
    this.checkStartScript();
    this.checkPackageJsonScripts();
    this.checkEnvironmentVariables();
    this.checkDependencies();
    this.checkRenderConfig();
    this.checkPotentialIssues();
    
    this.generateReport();
  }
}

// Ejecutar diagnóstico
const diagnostic = new RenderFailureDiagnostic();
diagnostic.runDiagnostic(); 