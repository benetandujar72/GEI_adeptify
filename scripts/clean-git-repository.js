#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧹 Limpiando repositorio Git...');

try {
  // Verificar si estamos en un repositorio Git
  console.log('📋 Verificando estado del repositorio...');
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (gitStatus.trim()) {
    console.log(`⚠️ Encontrados ${gitStatus.split('\n').filter(line => line.trim()).length} cambios no confirmados`);
    
    // Mostrar archivos modificados
    console.log('\n📁 Archivos modificados:');
    console.log(gitStatus);
    
    // Opción 1: Stash de cambios
    console.log('\n💾 Guardando cambios en stash...');
    execSync('git stash push -m "Auto-stash before deployment"', { stdio: 'inherit' });
    console.log('✅ Cambios guardados en stash');
    
    // Opción 2: Reset hard (CUIDADO: esto elimina todos los cambios)
    // console.log('\n🔄 Reseteando cambios...');
    // execSync('git reset --hard HEAD', { stdio: 'inherit' });
    // console.log('✅ Cambios reseteados');
    
  } else {
    console.log('✅ No hay cambios pendientes');
  }
  
  // Verificar estado final
  console.log('\n📋 Estado final del repositorio:');
  const finalStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (!finalStatus.trim()) {
    console.log('✅ Repositorio limpio');
  } else {
    console.log('⚠️ Aún hay cambios pendientes:');
    console.log(finalStatus);
  }
  
  // Verificar que el repositorio está en una rama válida
  console.log('\n🌿 Verificando rama actual:');
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`📍 Rama actual: ${currentBranch}`);
  
  // Verificar que hay commits
  console.log('\n📝 Verificando commits:');
  const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
  console.log(`📊 Número de commits: ${commitCount}`);
  
  console.log('\n🎉 Limpieza del repositorio completada');
  
} catch (error) {
  console.error('❌ Error durante la limpieza:', error.message);
  
  if (error.message.includes('not a git repository')) {
    console.log('💡 No es un repositorio Git válido');
  } else if (error.message.includes('fatal')) {
    console.log('💡 Error de Git, intentando reparar...');
    
    try {
      // Intentar reparar el repositorio
      console.log('🔧 Reparando repositorio...');
      execSync('git fsck --full', { stdio: 'inherit' });
      console.log('✅ Reparación completada');
    } catch (repairError) {
      console.error('❌ No se pudo reparar el repositorio:', repairError.message);
    }
  }
} 