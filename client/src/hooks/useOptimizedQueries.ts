import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions, QueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

export interface OptimizedQueryConfig<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  cacheTime?: number;
  staleTime?: number;
  retry?: number;
  retryDelay?: number;
  prefetch?: boolean;
  prefetchDelay?: number;
  background?: boolean;
  optimistic?: boolean;
}

export interface OptimizedMutationConfig<TData, TVariables> extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  invalidateQueries?: string[];
  optimisticUpdate?: (oldData: any, variables: TVariables) => any;
  rollbackOnError?: boolean;
  showToast?: boolean;
  toastMessage?: string;
}

export interface QueryPerformance {
  queryTime: number;
  cacheHit: boolean;
  retryCount: number;
  errorCount: number;
}

// Configuración global de React Query
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
};

/**
 * Hook optimizado para consultas con caché inteligente
 */
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  config: OptimizedQueryConfig<T> = {}
) {
  const [performance, setPerformance] = useState<QueryPerformance>({
    queryTime: 0,
    cacheHit: false,
    retryCount: 0,
    errorCount: 0,
  });

  const {
    cacheTime = 10 * 60 * 1000,
    staleTime = 5 * 60 * 1000,
    retry = 3,
    retryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
    prefetch = false,
    prefetchDelay = 0,
    background = false,
    optimistic = false,
    ...queryConfig
  } = config;

  // Prefetch inteligente
  useEffect(() => {
    if (prefetch) {
      const timer = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime,
          cacheTime,
        });
      }, prefetchDelay);

      return () => clearTimeout(timer);
    }
  }, [prefetch, prefetchDelay, queryKey, queryFn, staleTime, cacheTime]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const startTime = performance.now();
      try {
        const result = await queryFn();
        const endTime = performance.now();
        
        setPerformance(prev => ({
          ...prev,
          queryTime: endTime - startTime,
          cacheHit: false,
        }));
        
        return result;
      } catch (error) {
        setPerformance(prev => ({
          ...prev,
          errorCount: prev.errorCount + 1,
        }));
        throw error;
      }
    },
    staleTime,
    cacheTime,
    retry,
    retryDelay,
    ...queryConfig,
  });

  // Actualizar métricas de rendimiento
  useEffect(() => {
    if (query.isSuccess) {
      setPerformance(prev => ({
        ...prev,
        cacheHit: query.dataUpdatedAt > query.dataUpdatedAt - 1000,
      }));
    }
  }, [query.isSuccess, query.dataUpdatedAt]);

  return {
    ...query,
    performance,
  };
}

/**
 * Hook optimizado para mutaciones con actualizaciones optimistas
 */
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  config: OptimizedMutationConfig<TData, TVariables> = {}
) {
  const queryClient = useQueryClient();
  const {
    invalidateQueries = [],
    optimisticUpdate,
    rollbackOnError = true,
    showToast = true,
    toastMessage = 'Operación completada',
    ...mutationConfig
  } = config;

  const mutation = useMutation({
    mutationFn,
    onMutate: async (variables) => {
      if (optimisticUpdate) {
        // Cancelar queries en curso
        await queryClient.cancelQueries({ queryKey: invalidateQueries });

        // Obtener datos anteriores
        const previousData = queryClient.getQueryData(invalidateQueries);

        // Aplicar actualización optimista
        queryClient.setQueryData(invalidateQueries, (old: any) =>
          optimisticUpdate(old, variables)
        );

        return { previousData };
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidar queries relacionadas
      if (invalidateQueries.length > 0) {
        queryClient.invalidateQueries({ queryKey: invalidateQueries });
      }

      // Mostrar toast de éxito
      if (showToast) {
        toast.success(toastMessage);
      }
    },
    onError: (error, variables, context) => {
      // Revertir actualización optimista en caso de error
      if (rollbackOnError && context?.previousData) {
        queryClient.setQueryData(invalidateQueries, context.previousData);
      }

      // Mostrar toast de error
      if (showToast) {
        toast.error(`Error: ${error.message}`);
      }
    },
    ...mutationConfig,
  });

  return mutation;
}

/**
 * Hook para lazy loading de componentes
 */
export function useLazyComponent<T>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ComponentType
) {
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);
        const module = await importFn();
        
        if (mounted) {
          setComponent(() => module.default);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [importFn]);

  return {
    Component,
    loading,
    error,
    FallbackComponent: fallback,
  };
}

/**
 * Hook para prefetching inteligente
 */
export function useIntelligentPrefetch() {
  const queryClient = useQueryClient();

  const prefetchQuery = useCallback(
    async <T>(
      queryKey: string[],
      queryFn: () => Promise<T>,
      options: { priority?: 'high' | 'low'; delay?: number } = {}
    ) => {
      const { priority = 'low', delay = 0 } = options;

      if (priority === 'high') {
        // Prefetch inmediato para alta prioridad
        await queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime: 5 * 60 * 1000,
        });
      } else {
        // Prefetch con delay para baja prioridad
        setTimeout(async () => {
          await queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: 5 * 60 * 1000,
          });
        }, delay);
      }
    },
    [queryClient]
  );

  const prefetchMultiple = useCallback(
    async <T>(
      queries: Array<{
        queryKey: string[];
        queryFn: () => Promise<T>;
        priority?: 'high' | 'low';
      }>
    ) => {
      const highPriorityQueries = queries.filter(q => q.priority === 'high');
      const lowPriorityQueries = queries.filter(q => q.priority !== 'high');

      // Ejecutar queries de alta prioridad inmediatamente
      await Promise.all(
        highPriorityQueries.map(q =>
          queryClient.prefetchQuery({
            queryKey: q.queryKey,
            queryFn: q.queryFn,
            staleTime: 5 * 60 * 1000,
          })
        )
      );

      // Ejecutar queries de baja prioridad con delay
      setTimeout(async () => {
        await Promise.all(
          lowPriorityQueries.map(q =>
            queryClient.prefetchQuery({
              queryKey: q.queryKey,
              queryFn: q.queryFn,
              staleTime: 5 * 60 * 1000,
            })
          )
        );
      }, 1000);
    },
    [queryClient]
  );

  return {
    prefetchQuery,
    prefetchMultiple,
  };
}

/**
 * Hook para gestión de caché inteligente
 */
export function useCacheManager() {
  const queryClient = useQueryClient();

  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      queryClient.removeQueries({ queryKey: [pattern] });
    } else {
      queryClient.clear();
    }
  }, [queryClient]);

  const getCacheStats = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    const mutations = queryClient.getMutationCache().getAll();

    return {
      totalQueries: queries.length,
      totalMutations: mutations.length,
      activeQueries: queries.filter(q => q.isActive()).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      fetchingQueries: queries.filter(q => q.isFetching()).length,
    };
  }, [queryClient]);

  const optimizeCache = useCallback(() => {
    const queries = queryClient.getQueryCache().getAll();
    
    // Eliminar queries muy antiguas
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    queries.forEach(query => {
      if (query.state.dataUpdatedAt < oneHourAgo && !query.isActive()) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  }, [queryClient]);

  return {
    clearCache,
    getCacheStats,
    optimizeCache,
  };
}

/**
 * Hook para monitoreo de rendimiento de queries
 */
export function useQueryPerformance() {
  const [metrics, setMetrics] = useState<{
    totalQueries: number;
    averageQueryTime: number;
    cacheHitRate: number;
    errorRate: number;
    slowQueries: number;
  }>({
    totalQueries: 0,
    averageQueryTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
    slowQueries: 0,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const updateMetrics = () => {
      const queries = queryClient.getQueryCache().getAll();
      const totalQueries = queries.length;
      
      if (totalQueries === 0) return;

      const queryTimes: number[] = [];
      let cacheHits = 0;
      let errors = 0;
      let slowQueries = 0;

      queries.forEach(query => {
        if (query.state.dataUpdatedAt) {
          const queryTime = query.state.dataUpdatedAt - query.state.fetchMeta?.startTime || 0;
          queryTimes.push(queryTime);
          
          if (queryTime > 1000) slowQueries++;
          if (query.state.error) errors++;
          if (query.state.dataUpdatedAt > query.state.dataUpdatedAt - 1000) cacheHits++;
        }
      });

      setMetrics({
        totalQueries,
        averageQueryTime: queryTimes.length > 0 ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length : 0,
        cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
        errorRate: totalQueries > 0 ? (errors / totalQueries) * 100 : 0,
        slowQueries,
      });
    };

    // Actualizar métricas cada 5 segundos
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Actualización inicial

    return () => clearInterval(interval);
  }, [queryClient]);

  return metrics;
}

/**
 * Hook para gestión de errores de red
 */
export function useNetworkErrorHandler() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryQueue, setRetryQueue] = useState<Array<() => void>>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Reintentar queries en cola cuando se recupere la conexión
      retryQueue.forEach(retry => retry());
      setRetryQueue([]);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryQueue]);

  const addToRetryQueue = useCallback((retryFn: () => void) => {
    setRetryQueue(prev => [...prev, retryFn]);
  }, []);

  return {
    isOnline,
    addToRetryQueue,
  };
}

// Exportar queryClient para uso global
export const queryClient = new QueryClient(queryClientConfig); 