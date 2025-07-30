#!/usr/bin/env node

/**
 * Script de validación de configuración Docker para producción
 * Verifica que todos los servicios estén configurados correctamente
 */

const fs = require('fs');
const path = require('path');

// Servicios que deben estar configurados
const requiredServices = [
  'user-service',
  'student-service',
  'analytics-service',
  'course-service',
  'resource-service',
  'communication-service',
  'gateway'
];

// Variables de entorno críticas para Docker
const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT',
  'SESSION_SECRET',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'REDIS_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

// Variables de entorno para microservicios
const microserviceEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'REDIS_URL',
  'LOG_LEVEL'
];

function validateDockerfile(servicePath, serviceName) {
  console.log(`🔍 Validando Dockerfile para ${serviceName}...`);
  
  const dockerfilePath = path.join(servicePath, 'Dockerfile');
  
  if (!fs.existsSync(dockerfilePath)) {
    console.error(`❌ Dockerfile no encontrado para ${serviceName}`);
    return false;
  }
  
  const content = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Verificar elementos críticos
  const checks = [
    { name: 'FROM node', pattern: /FROM node/, required: true },
    { name: 'WORKDIR', pattern: /WORKDIR/, required: true },
    { name: 'EXPOSE', pattern: /EXPOSE/, required: true },
    { name: 'HEALTHCHECK', pattern: /HEALTHCHECK/, required: true },
    { name: 'Usuario no-root', pattern: /adduser|USER/, required: true },
    { name: 'CMD', pattern: /CMD/, required: true }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.required && !check.pattern.test(content)) {
      console.error(`  ❌ ${check.name} no encontrado`);
      allPassed = false;
    } else if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name} encontrado`);
    }
  });
  
  return allPassed;
}

function validateDockerCompose() {
  console.log('\n🔍 Validando docker-compose.prod.yml...');
  
  const composePath = path.join(process.cwd(), 'docker-compose.prod.yml');
  
  if (!fs.existsSync(composePath)) {
    console.error('❌ docker-compose.prod.yml no encontrado');
    return false;
  }
  
  const content = fs.readFileSync(composePath, 'utf8');
  
  // Verificar elementos críticos
  const checks = [
    { name: 'Version', pattern: /version:\s*['"]3\.8['"]/, required: true },
    { name: 'PostgreSQL', pattern: /postgres:/, required: true },
    { name: 'Redis', pattern: /redis:/, required: true },
    { name: 'Networks', pattern: /networks:/, required: true },
    { name: 'Volumes', pattern: /volumes:/, required: true },
    { name: 'Health checks', pattern: /healthcheck:/, required: true },
    { name: 'Environment variables', pattern: /environment:/, required: true }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.required && !check.pattern.test(content)) {
      console.error(`  ❌ ${check.name} no encontrado`);
      allPassed = false;
    } else if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name} encontrado`);
    }
  });
  
  return allPassed;
}

function validateMainDockerfile() {
  console.log('\n🔍 Validando Dockerfile principal...');
  
  const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
  
  if (!fs.existsSync(dockerfilePath)) {
    console.error('❌ Dockerfile principal no encontrado');
    return false;
  }
  
  const content = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Verificar elementos críticos
  const checks = [
    { name: 'Multi-stage build', pattern: /FROM.*AS.*base/, required: true },
    { name: 'Production stage', pattern: /FROM.*AS.*production/, required: true },
    { name: 'Non-root user', pattern: /adduser|USER/, required: true },
    { name: 'Health check', pattern: /HEALTHCHECK/, required: true },
    { name: 'Environment variables', pattern: /ENV NODE_ENV=production/, required: true },
    { name: 'Port exposure', pattern: /EXPOSE 3000/, required: true },
    { name: 'Build process', pattern: /npm run build/, required: true }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.required && !check.pattern.test(content)) {
      console.error(`  ❌ ${check.name} no encontrado`);
      allPassed = false;
    } else if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name} encontrado`);
    }
  });
  
  return allPassed;
}

function validateRenderConfig() {
  console.log('\n🔍 Validando configuración de Render...');
  
  const renderPath = path.join(process.cwd(), 'render.yaml');
  
  if (!fs.existsSync(renderPath)) {
    console.error('❌ render.yaml no encontrado');
    return false;
  }
  
  const content = fs.readFileSync(renderPath, 'utf8');
  
  // Verificar elementos críticos
  const checks = [
    { name: 'Service definition', pattern: /type:\s*web/, required: true },
    { name: 'Build command', pattern: /buildCommand:/, required: true },
    { name: 'Start command', pattern: /startCommand:/, required: true },
    { name: 'Environment variables', pattern: /envVars:/, required: true },
    { name: 'Health check', pattern: /healthCheckPath:/, required: true },
    { name: 'Database configuration', pattern: /databases:/, required: true }
  ];
  
  let allPassed = true;
  checks.forEach(check => {
    if (check.required && !check.pattern.test(content)) {
      console.error(`  ❌ ${check.name} no encontrado`);
      allPassed = false;
    } else if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.name} encontrado`);
    }
  });
  
  return allPassed;
}

function validateEnvironmentVariables() {
  console.log('\n🔍 Validando variables de entorno...');
  
  // Verificar production.env
  const productionEnvPath = path.join(process.cwd(), 'production.env');
  
  if (!fs.existsSync(productionEnvPath)) {
    console.error('❌ production.env no encontrado');
    return false;
  }
  
  const content = fs.readFileSync(productionEnvPath, 'utf8');
  
  let allPassed = true;
  requiredEnvVars.forEach(varName => {
    if (!content.includes(varName)) {
      console.error(`  ❌ Variable ${varName} no encontrada en production.env`);
      allPassed = false;
    } else {
      console.log(`  ✅ Variable ${varName} encontrada`);
    }
  });
  
  return allPassed;
}

function validateMicroservices() {
  console.log('\n🔍 Validando microservicios...');
  
  const microservicesPath = path.join(process.cwd(), 'microservices');
  
  if (!fs.existsSync(microservicesPath)) {
    console.error('❌ Directorio microservices no encontrado');
    return false;
  }
  
  let allPassed = true;
  requiredServices.forEach(serviceName => {
    const servicePath = path.join(microservicesPath, serviceName);
    
    if (!fs.existsSync(servicePath)) {
      console.error(`❌ Microservicio ${serviceName} no encontrado`);
      allPassed = false;
      return;
    }
    
    console.log(`\n📁 Validando ${serviceName}...`);
    
    // Verificar Dockerfile
    const dockerfileValid = validateDockerfile(servicePath, serviceName);
    if (!dockerfileValid) {
      allPassed = false;
    }
    
    // Verificar package.json
    const packagePath = path.join(servicePath, 'package.json');
    if (!fs.existsSync(packagePath)) {
      console.error(`  ❌ package.json no encontrado para ${serviceName}`);
      allPassed = false;
    } else {
      console.log(`  ✅ package.json encontrado`);
    }
    
    // Verificar scripts de build
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (!packageContent.scripts || !packageContent.scripts.build) {
        console.error(`  ❌ Script de build no encontrado para ${serviceName}`);
        allPassed = false;
      } else {
        console.log(`  ✅ Script de build encontrado`);
      }
    }
  });
  
  return allPassed;
}

function validateSecurity() {
  console.log('\n🔍 Validando configuración de seguridad...');
  
  let allPassed = true;
  
  // Verificar .dockerignore
  const dockerignorePath = path.join(process.cwd(), '.dockerignore');
  if (!fs.existsSync(dockerignorePath)) {
    console.error('❌ .dockerignore no encontrado');
    allPassed = false;
  } else {
    const content = fs.readFileSync(dockerignorePath, 'utf8');
    if (!content.includes('.env') || !content.includes('node_modules')) {
      console.error('❌ .dockerignore no excluye archivos sensibles');
      allPassed = false;
    } else {
      console.log('✅ .dockerignore configurado correctamente');
    }
  }
  
  // Verificar que no hay claves reales en archivos de configuración
  const configFiles = ['production.env', 'render.yaml'];
  configFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const realKeyPatterns = [
        /sk-[a-zA-Z0-9]{48}/,
        /AIza[a-zA-Z0-9_-]{35}/,
        /ghp_[a-zA-Z0-9]{36}/
      ];
      
      realKeyPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          console.error(`❌ Se encontraron claves reales en ${file}`);
          allPassed = false;
        }
      });
    }
  });
  
  if (allPassed) {
    console.log('✅ Configuración de seguridad válida');
  }
  
  return allPassed;
}

function generateDockerProductionReport() {
  console.log('\n📋 Generando reporte de configuración Docker para producción...');
  
  const report = {
    timestamp: new Date().toISOString(),
    mainDockerfile: validateMainDockerfile(),
    dockerCompose: validateDockerCompose(),
    renderConfig: validateRenderConfig(),
    environmentVariables: validateEnvironmentVariables(),
    microservices: validateMicroservices(),
    security: validateSecurity()
  };
  
  const reportPath = path.join(process.cwd(), 'docker-production-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Reporte guardado en: ${reportPath}`);
  
  return report;
}

function showRecommendations() {
  console.log('\n💡 Recomendaciones para producción:');
  console.log('1. ✅ Usar multi-stage builds para optimizar el tamaño de imagen');
  console.log('2. ✅ Implementar usuarios no-root en todos los contenedores');
  console.log('3. ✅ Configurar health checks para todos los servicios');
  console.log('4. ✅ Usar variables de entorno para configuración');
  console.log('5. ✅ Implementar logging centralizado');
  console.log('6. ✅ Configurar backups automáticos de base de datos');
  console.log('7. ✅ Implementar monitoreo y alertas');
  console.log('8. ✅ Usar secrets management para claves sensibles');
  console.log('9. ✅ Configurar rate limiting y seguridad');
  console.log('10. ✅ Implementar CI/CD para despliegues automáticos');
}

function main() {
  console.log('🚀 Validando configuración Docker para producción...\n');
  
  const report = generateDockerProductionReport();
  
  console.log('\n📊 Resumen de validación:');
  console.log(`✅ Dockerfile principal: ${report.mainDockerfile ? 'VÁLIDO' : '❌ PROBLEMAS'}`);
  console.log(`✅ Docker Compose: ${report.dockerCompose ? 'VÁLIDO' : '❌ PROBLEMAS'}`);
  console.log(`✅ Configuración Render: ${report.renderConfig ? 'VÁLIDO' : '❌ PROBLEMAS'}`);
  console.log(`✅ Variables de entorno: ${report.environmentVariables ? 'VÁLIDO' : '❌ PROBLEMAS'}`);
  console.log(`✅ Microservicios: ${report.microservices ? 'VÁLIDO' : '❌ PROBLEMAS'}`);
  console.log(`✅ Seguridad: ${report.security ? 'VÁLIDO' : '❌ PROBLEMAS'}`);
  
  const allValid = Object.values(report).every(value => value === true);
  
  if (allValid) {
    console.log('\n🎉 ¡Toda la configuración Docker está lista para producción!');
  } else {
    console.log('\n⚠️  Se encontraron problemas en la configuración Docker');
    console.log('💡 Revisa los errores anteriores y corrige los problemas');
  }
  
  showRecommendations();
}

if (require.main === module) {
  main();
}

module.exports = {
  validateDockerfile,
  validateDockerCompose,
  validateMainDockerfile,
  validateRenderConfig,
  validateEnvironmentVariables,
  validateMicroservices,
  validateSecurity,
  generateDockerProductionReport
}; 