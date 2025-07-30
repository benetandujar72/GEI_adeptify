import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompetency } from '@/context/CompetencyContext';
import { Competency, Criteria } from '@/lib/competencyTypes';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const CompetencySelector: React.FC = () => {
  const { 
    selectedCompetencyType,
    selectedCompetency,
    setSelectedCompetency,
    competencies,
    selectedCriteria,
    toggleCriteriaSelection,
    isCriteriaSelected
  } = useCompetency();

  // Dades d'exemple de criteris d'avaluació
  const mockCriteria: Criteria[] = [
    { id: 1, competencyId: 1, code: "C1.1", description: "Identificar les relacions entre esdeveniments històrics i el present" },
    { id: 11, competencyId: 1, code: "C1.2", description: "Valorar críticament els processos de construcció de la pròpia identitat" },
    { id: 21, competencyId: 1, code: "C1.3", description: "Construir relacions de convivència assertives i respectuoses" },
    { id: 2, competencyId: 2, code: "C2.1", description: "Analitzar diferents tipus de llenguatges i produccions" },
    { id: 12, competencyId: 2, code: "C2.2", description: "Crear diferents tipus de missatges amb diversos llenguatges" },
    { id: 22, competencyId: 2, code: "C2.3", description: "Resoldre situacions d'incertesa utilitzant recursos diversos" }
  ];

  // Dades reals de l'API de criteris per a la competència seleccionada
  const { 
    data: apiCriteria = [], 
    isLoading: isLoadingCriteria 
  } = useQuery<Criteria[]>({
    queryKey: [`/api/criteria/competency/${selectedCompetency?.id}`],
    enabled: !!selectedCompetency?.id
  });

  // Utilitzem les dades mock si no hi ha dades reals
  const availableCriteria = apiCriteria.length > 0 
    ? apiCriteria 
    : mockCriteria.filter(criteria => criteria.competencyId === selectedCompetency?.id);

  // Filtrem els criteris per la competència seleccionada
  const competencyCriteria = selectedCompetency ? availableCriteria : [];

  // Gestor de canvi de competència
  const handleCompetencyChange = (competency: Competency) => {
    setSelectedCompetency(competency);
  };

  // Renderitzar l'estat de càrrega
  if (isLoadingCriteria) {
    return (
      <section className="form-section bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="p-4 text-center">
          <span className="material-icons animate-spin mr-2">sync</span>
          Carregant criteris d'avaluació...
        </div>
      </section>
    );
  }

  return (
    <section className="form-section bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="form-header mb-4 border-b border-border pb-3">
        <h2 className="text-primary text-xl font-medium">Selecció de competències específiques i criteris</h2>
      </div>
      
      {/* Secció de selecció de competència específica */}
      <div className="competency-selection mb-6">
        <h3 className="font-medium mb-2">Competències específiques disponibles:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {competencies.length > 0 ? (
            competencies.map((competency) => (
              <Button
                key={competency.id}
                onClick={() => handleCompetencyChange(competency)}
                variant={selectedCompetency?.id === competency.id ? "default" : "outline"}
                className={`w-full justify-start text-left h-auto py-3 ${
                  selectedCompetency?.id === competency.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="w-full">
                  <div className="font-medium flex justify-between">
                    <span>{competency.code}</span>
                    {competency.abbreviation && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {competency.abbreviation}
                      </span>
                    )}
                  </div>
                  <div 
                    className="text-sm text-gray-600 truncate" 
                    title={competency.description}
                  >
                    {competency.description.length > 50
                      ? competency.description.substring(0, 50) + "..."
                      : competency.description}
                  </div>
                  {competency.subject && (
                    <div className="text-xs text-gray-500 mt-1 italic">{competency.subject}</div>
                  )}
                </div>
              </Button>
            ))
          ) : (
            <div className="col-span-full text-center p-4 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-gray-600">No s'han trobat competències per al tipus seleccionat.</p>
              <p className="text-sm text-gray-500 mt-2">Prova a seleccionar un altre tipus de competència transversal.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Secció de selecció de criteris */}
      {selectedCompetency && (
        <div className="criteria-selection">
          <h3 className="font-medium mb-2">Criteris d'avaluació disponibles:</h3>
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <div className="font-medium text-blue-800 mb-1">{selectedCompetency.code} - {selectedCompetency.description}</div>
            {selectedCompetency.subject && (
              <div className="text-sm text-blue-600">
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs mr-2">{selectedCompetency.abbreviation}</span>
                {selectedCompetency.subject}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {competencyCriteria.map((criteria) => (
              <div 
                key={criteria.id}
                className={`flex flex-col border rounded-md p-3 transition-all cursor-pointer ${
                  isCriteriaSelected(criteria.id) 
                    ? "border-blue-400 bg-blue-50" 
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
                onClick={() => toggleCriteriaSelection(criteria)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-1">
                    <Checkbox
                      id={`criteria-${criteria.id}`}
                      checked={isCriteriaSelected(criteria.id)}
                      onCheckedChange={() => toggleCriteriaSelection(criteria)}
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor={`criteria-${criteria.id}`} className="cursor-pointer">
                      <div className="font-medium text-blue-800 mb-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                          {criteria.code}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">{criteria.description}</div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {competencyCriteria.length === 0 && (
            <div className="text-center p-4 border border-border rounded bg-gray-50">
              No hi ha criteris disponibles per a aquesta competència
            </div>
          )}
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedCriteria.length === 0 ? (
                <span>No has seleccionat cap criteri d'avaluació</span>
              ) : (
                <span>Has seleccionat {selectedCriteria.length} criteri(s) d'avaluació</span>
              )}
            </div>
            <Button 
              disabled={selectedCriteria.length === 0}
              variant="default"
              className="bg-primary text-white"
              onClick={() => {
                if (selectedCriteria.length > 0) {
                  // No cal fer res més, ja que hem actualitzat el Dashboard perquè mostri la graella
                  // si hi ha criteris seleccionats
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              }}
            >
              Avaluar amb els criteris seleccionats ({selectedCriteria.length})
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default CompetencySelector;