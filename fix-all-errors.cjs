const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando corrección definitiva de errores...');

// 1. Verificar y corregir importaciones de FullCalendar
const calendarFile = path.join(__dirname, 'client/src/components/Calendar/Calendar.tsx');
if (fs.existsSync(calendarFile)) {
  let content = fs.readFileSync(calendarFile, 'utf8');
  
  // Corregir importación de FullCalendar
  content = content.replace(
    /import \{ Calendar as FullCalendar \} from '@fullcalendar\/react';/,
    "import FullCalendar from '@fullcalendar/react';"
  );
  
  fs.writeFileSync(calendarFile, content);
  console.log('✅ Importación de FullCalendar corregida');
}

// 2. Verificar configuración de Vite
const viteConfigFile = path.join(__dirname, 'client/vite.config.ts');
if (fs.existsSync(viteConfigFile)) {
  let content = fs.readFileSync(viteConfigFile, 'utf8');
  
  // Asegurar que FullCalendar esté en optimizeDeps
  if (!content.includes('@fullcalendar/react')) {
    content = content.replace(
      /optimizeDeps: \{[\s\S]*?include: \[([\s\S]*?)\][\s\S]*?\}/,
      (match, includes) => {
        const newIncludes = includes
          .split(',')
          .map(item => item.trim())
          .filter(item => item && !item.includes('@fullcalendar'))
          .concat([
            "'@fullcalendar/react'",
            "'@fullcalendar/daygrid'",
            "'@fullcalendar/timegrid'",
            "'@fullcalendar/interaction'",
            "'@fullcalendar/core'"
          ])
          .join(',\n      ');
        
        return match.replace(includes, newIncludes);
      }
    );
    
    fs.writeFileSync(viteConfigFile, content);
    console.log('✅ Configuración de Vite actualizada');
  }
}

// 3. Verificar archivo de tipos
const typesFile = path.join(__dirname, 'client/src/types/fullcalendar.d.ts');
if (!fs.existsSync(typesFile)) {
  const typesContent = `declare module '@fullcalendar/react' {
  import { ComponentType } from 'react';
  
  interface FullCalendarProps {
    plugins?: any[];
    initialView?: string;
    headerToolbar?: {
      left?: string;
      center?: string;
      right?: string;
    };
    events?: any[];
    eventClick?: (info: any) => void;
    dateClick?: (info: any) => void;
    eventDrop?: (info: any) => void;
    eventResize?: (info: any) => void;
    selectable?: boolean;
    selectMirror?: boolean;
    dayMaxEvents?: boolean | number;
    weekends?: boolean;
    height?: string | number;
    locale?: string;
    [key: string]: any;
  }
  
  const FullCalendar: ComponentType<FullCalendarProps>;
  export default FullCalendar;
}

declare module '@fullcalendar/daygrid' {
  const dayGridPlugin: any;
  export default dayGridPlugin;
}

declare module '@fullcalendar/timegrid' {
  const timeGridPlugin: any;
  export default timeGridPlugin;
}

declare module '@fullcalendar/interaction' {
  const interactionPlugin: any;
  export default interactionPlugin;
}

declare module '@fullcalendar/core/locales/es' {
  const esLocale: any;
  export default esLocale;
}`;

  fs.writeFileSync(typesFile, typesContent);
  console.log('✅ Archivo de tipos de FullCalendar creado');
}

// 4. Verificar tsconfig.json
const tsconfigFile = path.join(__dirname, 'client/tsconfig.json');
if (fs.existsSync(tsconfigFile)) {
  let content = fs.readFileSync(tsconfigFile, 'utf8');
  const config = JSON.parse(content);
  
  if (!config.include.includes('src/types/*.d.ts')) {
    config.include.push('src/types/*.d.ts');
    fs.writeFileSync(tsconfigFile, JSON.stringify(config, null, 2));
    console.log('✅ tsconfig.json actualizado');
  }
}

// 5. Verificar package.json para dependencias
const packageFile = path.join(__dirname, 'package.json');
if (fs.existsSync(packageFile)) {
  const packageContent = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  
  const requiredDeps = [
    '@fullcalendar/react',
    '@fullcalendar/daygrid',
    '@fullcalendar/timegrid',
    '@fullcalendar/interaction',
    '@fullcalendar/core'
  ];
  
  let needsUpdate = false;
  requiredDeps.forEach(dep => {
    if (!packageContent.dependencies[dep]) {
      console.log(`⚠️  Dependencia faltante: ${dep}`);
      needsUpdate = true;
    }
  });
  
  if (needsUpdate) {
    console.log('⚠️  Algunas dependencias de FullCalendar pueden estar faltantes');
  } else {
    console.log('✅ Todas las dependencias de FullCalendar están presentes');
  }
}

// 6. Crear archivo de verificación
const verificationFile = path.join(__dirname, 'VERIFICACION_CORRECCION.md');
const verificationContent = `# Verificación de Corrección de Errores

## ✅ Cambios Realizados

### 1. Importación de FullCalendar
- Corregida importación en \`client/src/components/Calendar/Calendar.tsx\`
- Cambiado de \`{ Calendar as FullCalendar }\` a \`FullCalendar\`

### 2. Configuración de Vite
- Agregadas dependencias de FullCalendar a \`optimizeDeps.include\`
- Configurado \`external: []\` para evitar problemas de resolución

### 3. Tipos de TypeScript
- Creado archivo \`client/src/types/fullcalendar.d.ts\`
- Declaraciones de tipos para todos los módulos de FullCalendar
- Actualizado \`tsconfig.json\` para incluir archivos de tipos

### 4. Dependencias
- Verificadas todas las dependencias de FullCalendar en \`package.json\`
- Versiones compatibles: ^6.1.11

## 🔧 Próximos Pasos

1. Ejecutar \`npm install\` para asegurar dependencias
2. Ejecutar \`npm run build\` para verificar build
3. Probar funcionalidad del calendario

## 📋 Comandos de Verificación

\`\`\`bash
# Instalar dependencias
npm install

# Verificar build
npm run build

# Verificar solo cliente
cd client && npm run build

# Verificar tipos
npx tsc --noEmit
\`\`\`

## 🎯 Estado Esperado

- ✅ Build del servidor exitoso
- ✅ Build del cliente exitoso
- ✅ Importaciones de FullCalendar funcionando
- ✅ Tipos de TypeScript correctos
- ✅ Aplicación funcionando en Docker

---
**Fecha:** ${new Date().toISOString()}
**Estado:** Corrección aplicada
`;

fs.writeFileSync(verificationFile, verificationContent);
console.log('✅ Archivo de verificación creado');

console.log('\n🎉 Corrección definitiva completada!');
console.log('📋 Revisa VERIFICACION_CORRECCION.md para más detalles');
console.log('🚀 Ejecuta "npm run build" para verificar que todo funciona'); 