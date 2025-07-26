const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigiendo importación de FullCalendar...');

// Corregir importación en Calendar.tsx
const calendarFile = path.join(__dirname, 'client/src/components/Calendar/Calendar.tsx');
if (fs.existsSync(calendarFile)) {
  let content = fs.readFileSync(calendarFile, 'utf8');
  
  // Corregir importación de FullCalendar
  if (content.includes('import { Calendar as FullCalendar }')) {
    content = content.replace(
      /import \{ Calendar as FullCalendar \} from '@fullcalendar\/react';/,
      "import FullCalendar from '@fullcalendar/react';"
    );
    
    fs.writeFileSync(calendarFile, content);
    console.log('✅ Importación de FullCalendar corregida en Calendar.tsx');
  } else {
    console.log('✅ Importación de FullCalendar ya está correcta');
  }
}

// Crear archivo de tipos si no existe
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

console.log('🎉 Corrección completada!');
console.log('🚀 Ahora puedes ejecutar "npm run build"'); 