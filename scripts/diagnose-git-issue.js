#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Diagnosticando problema de Git...');

// Función para ejecutar comandos de forma segura
function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Ejecutando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000 // 10 segundos timeout
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
    
    child.on('timeout', () => {
      child.kill();
      reject(new Error('Command timed out'));
    });
  });
}

async function diagnoseGit() {
  try {
    // Verificar si estamos en un repositorio Git
    console.log('\n📋 Verificando si es un repositorio Git...');
    try {
      await runCommand('git', ['rev-parse', '--git-dir']);
      console.log('✅ Es un repositorio Git válido');
    } catch (error) {
      console.log('❌ No es un repositorio Git válido');
      return;
    }
    
    // Verificar estado
    console.log('\n📋 Verificando estado del repositorio...');
    try {
      const status = await runCommand('git', ['status', '--porcelain']);
      if (status) {
        const lines = status.split('\n').filter(line => line.trim());
        console.log(`⚠️ Encontrados ${lines.length} cambios no confirmados`);
        console.log('📁 Archivos modificados:');
        console.log(status);
      } else {
        console.log('✅ No hay cambios pendientes');
      }
    } catch (error) {
      console.log('❌ Error al verificar estado:', error.message);
    }
    
    // Verificar rama actual
    console.log('\n🌿 Verificando rama actual...');
    try {
      const branch = await runCommand('git', ['branch', '--show-current']);
      console.log(`📍 Rama actual: ${branch}`);
    } catch (error) {
      console.log('❌ Error al verificar rama:', error.message);
    }
    
    // Verificar commits
    console.log('\n📝 Verificando commits...');
    try {
      const commitCount = await runCommand('git', ['rev-list', '--count', 'HEAD']);
      console.log(`📊 Número de commits: ${commitCount}`);
    } catch (error) {
      console.log('❌ Error al verificar commits:', error.message);
    }
    
    // Verificar tamaño del repositorio
    console.log('\n📊 Verificando tamaño del repositorio...');
    try {
      const gitDir = await runCommand('git', ['rev-parse', '--git-dir']);
      const gitPath = path.resolve(gitDir);
      
      if (fs.existsSync(gitPath)) {
        const stats = fs.statSync(gitPath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📁 Tamaño del directorio .git: ${sizeInMB} MB`);
      }
    } catch (error) {
      console.log('❌ Error al verificar tamaño:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

// Ejecutar diagnóstico
diagnoseGit().then(() => {
  console.log('\n🎉 Diagnóstico completado');
}).catch((error) => {
  console.error('❌ Error en diagnóstico:', error.message);
}); 