const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Resolviendo errores de build...\n');

// 1. Verificar que el archivo main.tsx existe
function checkMainFile() {
  console.log('📄 Verificando archivo main.tsx...');
  
  const mainPath = 'client/src/main.tsx';
  if (!fs.existsSync(mainPath)) {
    console.log('❌ Archivo main.tsx no encontrado. Creando...');
    
    const mainContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
    
    fs.writeFileSync(mainPath, mainContent);
    console.log('✅ main.tsx creado');
  } else {
    console.log('✅ main.tsx existe');
  }
}

// 2. Verificar archivo index.css
function checkIndexCSS() {
  console.log('📄 Verificando archivo index.css...');
  
  const cssPath = 'client/src/index.css';
  if (!fs.existsSync(cssPath)) {
    console.log('❌ Archivo index.css no encontrado. Creando...');
    
    const cssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
  margin: 0 auto;
  text-align: center;
}
`;
    
    fs.writeFileSync(cssPath, cssContent);
    console.log('✅ index.css creado');
  } else {
    console.log('✅ index.css existe');
  }
}

// 3. Verificar archivo index.html
function checkIndexHTML() {
  console.log('📄 Verificando archivo index.html...');
  
  const htmlPath = 'client/index.html';
  if (!fs.existsSync(htmlPath)) {
    console.log('❌ Archivo index.html no encontrado. Creando...');
    
    const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GEI Unified Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    
    fs.writeFileSync(htmlPath, htmlContent);
    console.log('✅ index.html creado');
  } else {
    console.log('✅ index.html existe');
  }
}

// 4. Verificar configuración de Tailwind
function checkTailwindConfig() {
  console.log('📄 Verificando configuración de Tailwind...');
  
  const tailwindPath = 'tailwind.config.js';
  if (!fs.existsSync(tailwindPath)) {
    console.log('❌ tailwind.config.js no encontrado. Creando...');
    
    const tailwindContent = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
    
    fs.writeFileSync(tailwindPath, tailwindContent);
    console.log('✅ tailwind.config.js creado');
  } else {
    console.log('✅ tailwind.config.js existe');
  }
}

// 5. Verificar configuración de PostCSS
function checkPostCSSConfig() {
  console.log('📄 Verificando configuración de PostCSS...');
  
  const postcssPath = 'postcss.config.js';
  if (!fs.existsSync(postcssPath)) {
    console.log('❌ postcss.config.js no encontrado. Creando...');
    
    const postcssContent = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
    
    fs.writeFileSync(postcssPath, postcssContent);
    console.log('✅ postcss.config.js creado');
  } else {
    console.log('✅ postcss.config.js existe');
  }
}

// 6. Verificar que todos los componentes UI existen
function checkUIComponents() {
  console.log('📄 Verificando componentes UI...');
  
  const uiComponents = [
    'client/src/components/ui/button.tsx',
    'client/src/components/ui/card.tsx',
    'client/src/components/ui/input.tsx',
    'client/src/components/ui/textarea.tsx',
    'client/src/components/ui/badge.tsx',
    'client/src/components/ui/dialog.tsx',
    'client/src/components/ui/table.tsx',
    'client/src/components/ui/alert.tsx',
    'client/src/components/ui/label.tsx',
    'client/src/components/ui/select.tsx',
    'client/src/components/ui/sheet.tsx',
    'client/src/components/ui/switch.tsx'
  ];
  
  uiComponents.forEach(component => {
    if (!fs.existsSync(component)) {
      console.log(`❌ Componente faltante: ${component}`);
    } else {
      console.log(`✅ ${component}`);
    }
  });
}

// 7. Limpiar y reinstalar dependencias
function cleanAndReinstall() {
  console.log('\n🔄 Limpiando y reinstalando dependencias...');
  
  try {
    // Eliminar node_modules si existe
    if (fs.existsSync('node_modules')) {
      console.log('🗑️  Eliminando node_modules...');
      execSync('rmdir /s /q node_modules', { stdio: 'inherit' });
    }
    
    // Eliminar package-lock.json si existe
    if (fs.existsSync('package-lock.json')) {
      console.log('🗑️  Eliminando package-lock.json...');
      fs.unlinkSync('package-lock.json');
    }
    
    // Instalar dependencias
    console.log('📦 Instalando dependencias...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('✅ Dependencias reinstaladas correctamente');
  } catch (error) {
    console.log('❌ Error reinstalando dependencias:', error.message);
  }
}

// 8. Probar el build
function testBuild() {
  console.log('\n🏗️  Probando build del cliente...');
  
  try {
    execSync('npm run build:client', { stdio: 'inherit' });
    console.log('✅ Build del cliente exitoso');
  } catch (error) {
    console.log('❌ Error en build del cliente:', error.message);
  }
}

// Función principal
function main() {
  console.log('🚀 GEI Unified Platform - Resolución de Errores de Build\n');
  
  checkMainFile();
  checkIndexCSS();
  checkIndexHTML();
  checkTailwindConfig();
  checkPostCSSConfig();
  checkUIComponents();
  
  console.log('\n📊 Resumen de verificación completado.');
  console.log('🔄 Iniciando limpieza y reinstalación...');
  
  cleanAndReinstall();
  testBuild();
  
  console.log('\n✨ Proceso completado.');
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

module.exports = {
  checkMainFile,
  checkIndexCSS,
  checkIndexHTML,
  checkTailwindConfig,
  checkPostCSSConfig,
  checkUIComponents,
  cleanAndReinstall,
  testBuild
}; 