declare module '@fullcalendar/react' {
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
} 