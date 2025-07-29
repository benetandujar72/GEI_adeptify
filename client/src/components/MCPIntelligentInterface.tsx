import React, { useState, useEffect, useCallback } from 'react';
import { MCPIntelligentApiService, MCPQueryRequest, MCPQueryResponse, MCPDashboard } from '../services/mcp-intelligent-api';

interface MCPIntelligentInterfaceProps {
  apiService: MCPIntelligentApiService;
  userRole?: string;
  instituteId?: string;
  onQueryComplete?: (response: MCPQueryResponse) => void;
  className?: string;
}

export const MCPIntelligentInterface: React.FC<MCPIntelligentInterfaceProps> = ({
  apiService,
  userRole,
  instituteId,
  onQueryComplete,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<MCPQueryResponse | null>(null);
  const [dashboard, setDashboard] = useState<MCPDashboard | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [queryHistory, setQueryHistory] = useState<Array<{
    query: string;
    timestamp: Date;
    success: boolean;
    executionTime: number;
  }>>([]);

  // Cargar dashboard y sugerencias al montar el componente
  useEffect(() => {
    loadDashboard();
    loadSuggestions();
  }, []);

  const loadDashboard = async () => {
    try {
      const dashboardData = await apiService.getMCPDashboard();
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const suggestionsData = await apiService.getIntelligentSuggestions({
        userRole,
        currentPage: window.location.pathname
      });
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);
    setResponse(null);

    try {
      const request: MCPQueryRequest = {
        query: query.trim(),
        context: {
          userRole,
          instituteId,
          urgency: 'medium',
          preferences: {
            includeVisualizations: true,
            generateReport: true
          }
        },
        options: {
          showReasoning: true,
          includeAlternatives: true
        }
      };

      const result = await apiService.processNaturalQuery(request);
      setResponse(result);
      
      // Agregar a historial
      setQueryHistory(prev => [{
        query: query.trim(),
        timestamp: new Date(),
        success: result.success,
        executionTime: result.executionTime
      }, ...prev.slice(0, 9)]); // Mantener solo los últimos 10

      onQueryComplete?.(result);
    } catch (error) {
      console.error('Query error:', error);
      setResponse({
        success: false,
        results: [],
        decisions: [],
        executionTime: 0,
        toolsUsed: [],
        confidence: 0
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionClick = async (suggestion: any) => {
    setQuery(suggestion.action);
    // Ejecutar automáticamente si es una acción rápida
    if (suggestion.estimatedTime < 2000) {
      const request: MCPQueryRequest = {
        query: suggestion.action,
        context: { userRole, instituteId },
        options: { autoExecute: true }
      };
      
      try {
        const result = await apiService.processNaturalQuery(request);
        setResponse(result);
        onQueryComplete?.(result);
      } catch (error) {
        console.error('Suggestion execution error:', error);
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    setQuery(action);
    const request: MCPQueryRequest = {
      query: action,
      context: { userRole, instituteId },
      options: { autoExecute: true, showReasoning: false }
    };

    try {
      const result = await apiService.processNaturalQuery(request);
      setResponse(result);
      onQueryComplete?.(result);
    } catch (error) {
      console.error('Quick action error:', error);
    }
  };

  return (
    <div className={`mcp-intelligent-interface ${className}`}>
      {/* Header con dashboard */}
      <div className="mcp-header">
        <div className="mcp-title">
          <h2>🤖 Asistente Inteligente MCP</h2>
          <p>Pregunta en lenguaje natural y obtén respuestas inteligentes</p>
        </div>
        
        {dashboard && (
          <div className="mcp-dashboard-stats">
            <div className="stat">
              <span className="stat-value">{dashboard.performance.successRate}%</span>
              <span className="stat-label">Éxito</span>
            </div>
            <div className="stat">
              <span className="stat-value">{Math.round(dashboard.performance.averageResponseTime)}ms</span>
              <span className="stat-label">Tiempo promedio</span>
            </div>
            <div className="stat">
              <span className="stat-value">{dashboard.availableCapabilities.length}</span>
              <span className="stat-label">Capacidades</span>
            </div>
          </div>
        )}
      </div>

      {/* Sugerencias inteligentes */}
      {suggestions.length > 0 && (
        <div className="mcp-suggestions">
          <h3>💡 Sugerencias Inteligentes</h3>
          <div className="suggestions-grid">
            {suggestions.slice(0, 6).map((suggestion, index) => (
              <div
                key={index}
                className={`suggestion-card suggestion-${suggestion.type}`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="suggestion-icon">
                  {suggestion.type === 'automation' && '⚡'}
                  {suggestion.type === 'optimization' && '🚀'}
                  {suggestion.type === 'insight' && '🔍'}
                  {suggestion.type === 'recommendation' && '💡'}
                </div>
                <div className="suggestion-content">
                  <h4>{suggestion.title}</h4>
                  <p>{suggestion.description}</p>
                  <div className="suggestion-meta">
                    <span className="time">{suggestion.estimatedTime}ms</span>
                    <span className="confidence">{Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="mcp-quick-actions">
        <h3>⚡ Acciones Rápidas</h3>
        <div className="quick-actions-grid">
          <button
            className="quick-action-btn"
            onClick={() => handleQuickAction('Analizar rendimiento académico general')}
          >
            📊 Análisis General
          </button>
          <button
            className="quick-action-btn"
            onClick={() => handleQuickAction('Optimizar recursos del instituto')}
          >
            🏢 Optimizar Recursos
          </button>
          <button
            className="quick-action-btn"
            onClick={() => handleQuickAction('Generar reporte de actividades')}
          >
            📋 Generar Reporte
          </button>
          <button
            className="quick-action-btn"
            onClick={() => handleQuickAction('Identificar estudiantes en riesgo')}
          >
            ⚠️ Detectar Riesgos
          </button>
        </div>
      </div>

      {/* Formulario de consulta */}
      <form onSubmit={handleQuerySubmit} className="mcp-query-form">
        <div className="query-input-container">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe lo que necesitas en lenguaje natural... Ej: 'Analiza el rendimiento de María García y genera un plan de mejora'"
            className="query-input"
            rows={3}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="query-submit-btn"
            disabled={isProcessing || !query.trim()}
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Procesando...
              </>
            ) : (
              <>
                🚀 Ejecutar
              </>
            )}
          </button>
        </div>

        {/* Opciones avanzadas */}
        <div className="advanced-options">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▼' : '▶'} Opciones Avanzadas
          </button>
          
          {showAdvanced && (
            <div className="advanced-panel">
              <div className="option-group">
                <label>
                  <input type="checkbox" defaultChecked />
                  Mostrar razonamiento
                </label>
                <label>
                  <input type="checkbox" defaultChecked />
                  Incluir alternativas
                </label>
                <label>
                  <input type="checkbox" />
                  Ejecutar automáticamente
                </label>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Resultados */}
      {response && (
        <div className="mcp-results">
          <div className="results-header">
            <h3>
              {response.success ? '✅ Resultados' : '❌ Error'}
            </h3>
            <div className="results-meta">
              <span>Tiempo: {response.executionTime}ms</span>
              <span>Confianza: {Math.round(response.confidence * 100)}%</span>
              <span>Herramientas: {response.toolsUsed.length}</span>
            </div>
          </div>

          {/* Decisiones tomadas */}
          {response.decisions.length > 0 && (
            <div className="decisions-section">
              <h4>🧠 Decisiones Tomadas</h4>
              <div className="decisions-list">
                {response.decisions.map((decision, index) => (
                  <div key={index} className="decision-item">
                    <div className="decision-action">{decision.action}</div>
                    <div className="decision-reasoning">{decision.reasoning}</div>
                    <div className="decision-confidence">
                      Confianza: {Math.round(decision.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultados principales */}
          <div className="results-content">
            {response.results.map((result, index) => (
              <div key={index} className="result-item">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            ))}
          </div>

          {/* Sugerencias */}
          {response.suggestions && response.suggestions.length > 0 && (
            <div className="response-suggestions">
              <h4>💡 Sugerencias</h4>
              <div className="suggestions-list">
                {response.suggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-item">
                    <span className="suggestion-type">{suggestion.type}</span>
                    <span className="suggestion-title">{suggestion.title}</span>
                    <span className="suggestion-description">{suggestion.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternativas */}
          {response.alternatives && response.alternatives.length > 0 && (
            <div className="alternatives-section">
              <h4>🔄 Alternativas</h4>
              <div className="alternatives-list">
                {response.alternatives.map((alternative, index) => (
                  <div key={index} className="alternative-item">
                    <div className="alternative-action">{alternative.action}</div>
                    <div className="alternative-reasoning">{alternative.reasoning}</div>
                    <div className="alternative-impact">Impacto: {alternative.estimatedImpact}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial de consultas */}
      {queryHistory.length > 0 && (
        <div className="mcp-history">
          <h3>📚 Historial Reciente</h3>
          <div className="history-list">
            {queryHistory.map((item, index) => (
              <div key={index} className="history-item">
                <div className="history-query">{item.query}</div>
                <div className="history-meta">
                  <span className={`status ${item.success ? 'success' : 'error'}`}>
                    {item.success ? '✅' : '❌'}
                  </span>
                  <span className="time">{item.executionTime}ms</span>
                  <span className="timestamp">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estilos CSS inline para el componente */}
      <style jsx>{`
        .mcp-intelligent-interface {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .mcp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .mcp-title h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
        }

        .mcp-title p {
          margin: 0;
          opacity: 0.9;
        }

        .mcp-dashboard-stats {
          display: flex;
          gap: 20px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.8;
        }

        .mcp-suggestions {
          margin-bottom: 30px;
        }

        .suggestions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .suggestion-card {
          display: flex;
          padding: 15px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid #e1e5e9;
        }

        .suggestion-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .suggestion-automation { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }
        .suggestion-optimization { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
        .suggestion-insight { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
        .suggestion-recommendation { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }

        .suggestion-icon {
          font-size: 24px;
          margin-right: 15px;
          display: flex;
          align-items: center;
        }

        .suggestion-content h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .suggestion-content p {
          margin: 0 0 10px 0;
          font-size: 14px;
          opacity: 0.8;
        }

        .suggestion-meta {
          display: flex;
          gap: 10px;
          font-size: 12px;
        }

        .mcp-quick-actions {
          margin-bottom: 30px;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .quick-action-btn {
          padding: 15px 20px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .mcp-query-form {
          margin-bottom: 30px;
        }

        .query-input-container {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }

        .query-input {
          flex: 1;
          padding: 15px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
          resize: vertical;
          font-family: inherit;
        }

        .query-input:focus {
          outline: none;
          border-color: #667eea;
        }

        .query-submit-btn {
          padding: 15px 30px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .query-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .query-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .advanced-options {
          margin-top: 15px;
        }

        .advanced-toggle {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          font-size: 14px;
          padding: 5px 0;
        }

        .advanced-panel {
          margin-top: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .option-group {
          display: flex;
          gap: 20px;
        }

        .option-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
        }

        .mcp-results {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .results-header h3 {
          margin: 0;
          font-size: 20px;
        }

        .results-meta {
          display: flex;
          gap: 15px;
          font-size: 14px;
          opacity: 0.8;
        }

        .decisions-section,
        .response-suggestions,
        .alternatives-section {
          margin-bottom: 20px;
        }

        .decisions-list,
        .suggestions-list,
        .alternatives-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .decision-item,
        .suggestion-item,
        .alternative-item {
          padding: 15px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }

        .decision-action,
        .suggestion-title,
        .alternative-action {
          font-weight: 600;
          margin-bottom: 5px;
        }

        .decision-reasoning,
        .suggestion-description,
        .alternative-reasoning {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 5px;
        }

        .decision-confidence,
        .suggestion-type,
        .alternative-impact {
          font-size: 12px;
          opacity: 0.6;
        }

        .results-content {
          margin-bottom: 20px;
        }

        .result-item {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .result-item pre {
          margin: 0;
          font-size: 12px;
          overflow-x: auto;
        }

        .mcp-history {
          margin-top: 30px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e1e5e9;
        }

        .history-query {
          flex: 1;
          font-size: 14px;
        }

        .history-meta {
          display: flex;
          gap: 15px;
          font-size: 12px;
          opacity: 0.8;
        }

        .status.success { color: #28a745; }
        .status.error { color: #dc3545; }

        h3, h4 {
          color: #333;
          margin-bottom: 15px;
        }

        h3 {
          font-size: 18px;
          font-weight: 600;
        }

        h4 {
          font-size: 16px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};