import React from 'react';
import { Calendar } from '@/components/Calendar/Calendar';
import { PageHeader } from '@/components/PageHeader';

export default function CalendarPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Calendario Académico"
        description="Gestiona y visualiza todos los eventos académicos, reuniones y actividades del instituto"
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Calendario', href: '/calendar' }
        ]}
      />
      
      <Calendar />
    </div>
  );
} 