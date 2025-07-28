import React, { createContext, useContext, useState, ReactNode } from 'react';

// Tipos para el contexto de competencias
interface CompetencyType {
  id: number;
  name: string;
  description: string;
}

interface Course {
  id: number;
  name: string;
  code: string;
}

interface Group {
  id: number;
  name: string;
  courseId: number;
}

interface Competency {
  id: number;
  name: string;
  description: string;
  competencyTypeId: number;
  courseId: number;
}

interface Criteria {
  id: number;
  competencyId: number;
  code: string;
  description: string;
}

interface CompetencyContextType {
  // Estados
  selectedCompetencyType: CompetencyType | null;
  selectedCourse: Course | null;
  selectedGroup: Group | null;
  selectedCompetency: Competency | null;
  selectedCriteria: Criteria[] | null;
  
  // Setters
  setSelectedCompetencyType: (competencyType: CompetencyType | null) => void;
  setSelectedCourse: (course: Course | null) => void;
  setSelectedGroup: (group: Group | null) => void;
  setSelectedCompetency: (competency: Competency | null) => void;
  setSelectedCriteria: (criteria: Criteria[] | null) => void;
  
  // Helpers
  clearSelection: () => void;
}

const CompetencyContext = createContext<CompetencyContextType | undefined>(undefined);

export const useCompetency = () => {
  const context = useContext(CompetencyContext);
  if (context === undefined) {
    throw new Error('useCompetency must be used within a CompetencyProvider');
  }
  return context;
};

interface CompetencyProviderProps {
  children: ReactNode;
}

export const CompetencyProvider: React.FC<CompetencyProviderProps> = ({ children }) => {
  const [selectedCompetencyType, setSelectedCompetencyType] = useState<CompetencyType | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [selectedCriteria, setSelectedCriteria] = useState<Criteria[] | null>(null);

  const clearSelection = () => {
    setSelectedCompetencyType(null);
    setSelectedCourse(null);
    setSelectedGroup(null);
    setSelectedCompetency(null);
    setSelectedCriteria(null);
  };

  const value: CompetencyContextType = {
    selectedCompetencyType,
    selectedCourse,
    selectedGroup,
    selectedCompetency,
    selectedCriteria,
    setSelectedCompetencyType,
    setSelectedCourse,
    setSelectedGroup,
    setSelectedCompetency,
    setSelectedCriteria,
    clearSelection,
  };

  return (
    <CompetencyContext.Provider value={value}>
      {children}
    </CompetencyContext.Provider>
  );
}; 