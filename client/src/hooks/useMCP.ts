import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mcpClient, MCPResponse } from '../services/mcp-client';

export interface UseMCPOptions {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
}

export function useMCP(options: UseMCPOptions = {}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Query para obtener servidores
  const {
    data: servers,
    isLoading: serversLoading,
    error: serversError,
    refetch: refetchServers,
  } = useQuery({
    queryKey: ['mcp', 'servers'],
    queryFn: () => mcpClient.getServers(),
    enabled: options.enabled !== false,
    retry: options.retry ?? 3,
    retryDelay: options.retryDelay ?? 1000,
  });

  // Query para obtener métricas
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['mcp', 'metrics'],
    queryFn: () => mcpClient.getMetrics(),
    enabled: options.enabled !== false,
    retry: options.retry ?? 3,
    retryDelay: options.retryDelay ?? 1000,
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  // Query para obtener capacidades
  const {
    data: capabilities,
    isLoading: capabilitiesLoading,
    error: capabilitiesError,
    refetch: refetchCapabilities,
  } = useQuery({
    queryKey: ['mcp', 'capabilities'],
    queryFn: () => mcpClient.getCapabilities(),
    enabled: options.enabled !== false,
    retry: options.retry ?? 3,
    retryDelay: options.retryDelay ?? 1000,
  });

  // Query para health check
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['mcp', 'health'],
    queryFn: () => mcpClient.healthCheck(),
    enabled: options.enabled !== false,
    retry: options.retry ?? 3,
    retryDelay: options.retryDelay ?? 1000,
    refetchInterval: 60000, // Refetch cada minuto
  });

  // Mutation para ejecutar capacidades
  const executeMutation = useMutation({
    mutationFn: async ({ capability, parameters }: { capability: string; parameters?: Record<string, any> }) => {
      return mcpClient.execute(capability, parameters);
    },
    onSuccess: (data: MCPResponse) => {
      // Invalidar queries relacionadas si es necesario
      if (data.contextUpdates) {
        queryClient.invalidateQueries({ queryKey: ['mcp', 'metrics'] });
      }
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Función para ejecutar una capacidad
  const execute = useCallback(
    async (capability: string, parameters?: Record<string, any>) => {
      try {
        setError(null);
        const result = await executeMutation.mutateAsync({ capability, parameters });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        throw error;
      }
    },
    [executeMutation]
  );

  // Función para configurar sesión
  const setSession = useCallback((sessionId: string, userId: string) => {
    mcpClient.setSession(sessionId, userId);
  }, []);

  // Función para limpiar sesión
  const clearSession = useCallback(() => {
    mcpClient.clearSession();
  }, []);

  // Función para refetch todos los datos
  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchServers(),
      refetchMetrics(),
      refetchCapabilities(),
      refetchHealth(),
    ]);
  }, [refetchServers, refetchMetrics, refetchCapabilities, refetchHealth]);

  return {
    // Data
    servers,
    metrics,
    capabilities,
    health,
    
    // Loading states
    serversLoading,
    metricsLoading,
    capabilitiesLoading,
    healthLoading,
    executing: executeMutation.isPending,
    
    // Error states
    serversError,
    metricsError,
    capabilitiesError,
    healthError,
    error,
    
    // Actions
    execute,
    setSession,
    clearSession,
    refetchAll,
    refetchServers,
    refetchMetrics,
    refetchCapabilities,
    refetchHealth,
    
    // Mutation state
    isExecuting: executeMutation.isPending,
    executeError: executeMutation.error,
  };
}

// Hook específico para ejecutar capacidades
export function useMCPExecute() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const executeMutation = useMutation({
    mutationFn: async ({ capability, parameters }: { capability: string; parameters?: Record<string, any> }) => {
      return mcpClient.execute(capability, parameters);
    },
    onSuccess: (data: MCPResponse) => {
      if (data.contextUpdates) {
        queryClient.invalidateQueries({ queryKey: ['mcp', 'metrics'] });
      }
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const execute = useCallback(
    async (capability: string, parameters?: Record<string, any>) => {
      try {
        setError(null);
        const result = await executeMutation.mutateAsync({ capability, parameters });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        throw error;
      }
    },
    [executeMutation]
  );

  return {
    execute,
    isExecuting: executeMutation.isPending,
    error,
    resetError: () => setError(null),
  };
} 