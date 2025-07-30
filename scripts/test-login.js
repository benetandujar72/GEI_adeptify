#!/usr/bin/env node

// Script para probar el login con diferentes usuarios
import fetch from 'node-fetch';

console.log('🧪 PROBANDO LOGIN CON DIFERENTES USUARIOS');
console.log('=========================================');

const baseUrl = 'http://localhost:3000';

async function testLogin(email, password) {
  try {
    console.log(`\n🔐 Probando login con: ${email}`);
    
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login exitoso!');
      console.log(`   Usuario: ${data.user.displayName}`);
      console.log(`   Rol: ${data.user.role}`);
      console.log(`   Email: ${data.user.email}`);
      return true;
    } else {
      console.log('❌ Login fallido');
      console.log(`   Error: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return false;
  }
}

async function testUsers() {
  // Lista de usuarios para probar
  const testUsers = [
    { email: 'superadmin@gei.es', password: 'admin123' },
    { email: 'admin@gei.es', password: 'admin123' },
    { email: 'professor@gei.es', password: 'teacher123' },
    { email: 'alumne@gei.es', password: 'student123' },
    { email: 'admin@gei.adeptify.es', password: 'admin123' },
    { email: 'teacher@gei.adeptify.es', password: 'teacher123' },
    { email: 'student@gei.adeptify.es', password: 'student123' },
    { email: 'parent@gei.adeptify.es', password: 'parent123' }
  ];

  console.log('📋 Probando credenciales...\n');

  for (const user of testUsers) {
    const success = await testLogin(user.email, user.password);
    if (success) {
      console.log('\n🎉 ¡USUARIO FUNCIONAL ENCONTRADO!');
      console.log('==================================');
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Contraseña: ${user.password}`);
      console.log('\n💡 Usa estas credenciales para hacer login en la aplicación');
      return;
    }
  }

  console.log('\n❌ Ninguna de las credenciales funcionó');
  console.log('=======================================');
  console.log('💡 Necesitamos crear un usuario con credenciales conocidas');
  console.log('   Ejecuta: npm run create:admin');
}

// Ejecutar las pruebas
testUsers().catch(console.error); 