interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  totalRequests: number;
  threshold: number;
  timeout: number;
}

export class CircuitBreaker {
  private states: Map<string, CircuitBreakerState> = new Map();
  private readonly defaultThreshold = 5;
  private readonly defaultTimeout = 60000; // 60 segundos

  constructor() {
    // Inicializar circuit breakers para todos los servicios
    this.initializeService('users');
    this.initializeService('students');
    this.initializeService('courses');
    this.initializeService('resources');
    this.initializeService('communications');
    this.initializeService('analytics');
    this.initializeService('auth');
    this.initializeService('notifications');
    this.initializeService('files');
    this.initializeService('search');
    this.initializeService('llm');
    this.initializeService('ai');
    this.initializeService('mcp');
    this.initializeService('mcpServers');
  }

  private initializeService(serviceName: string): void {
    this.states.set(serviceName, {
      status: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      totalRequests: 0,
      threshold: this.defaultThreshold,
      timeout: this.defaultTimeout
    });
  }

  public isAvailable(serviceName: string): boolean {
    const state = this.states.get(serviceName);
    if (!state) {
      this.initializeService(serviceName);
      return true;
    }

    switch (state.status) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        // Verificar si ha pasado suficiente tiempo para intentar HALF_OPEN
        if (Date.now() - state.lastFailureTime >= state.timeout) {
          state.status = 'HALF_OPEN';
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return true;
    }
  }

  public recordResult(serviceName: string, success: boolean): void {
    const state = this.states.get(serviceName);
    if (!state) {
      this.initializeService(serviceName);
      return;
    }

    state.totalRequests++;

    if (success) {
      this.onSuccess(serviceName, state);
    } else {
      this.onFailure(serviceName, state);
    }
  }

  private onSuccess(serviceName: string, state: CircuitBreakerState): void {
    state.failureCount = 0;
    state.successCount++;
    state.lastFailureTime = 0;

    if (state.status === 'HALF_OPEN') {
      // Si tenemos suficientes éxitos en HALF_OPEN, cerrar el circuit breaker
      if (state.successCount >= Math.ceil(state.threshold / 2)) {
        state.status = 'CLOSED';
        state.successCount = 0;
        console.log(`Circuit breaker for ${serviceName} is now CLOSED`);
      }
    }
  }

  private onFailure(serviceName: string, state: CircuitBreakerState): void {
    state.failureCount++;
    state.lastFailureTime = Date.now();
    state.successCount = 0;

    if (state.status === 'CLOSED' && state.failureCount >= state.threshold) {
      state.status = 'OPEN';
      console.log(`Circuit breaker for ${serviceName} is now OPEN`);
    } else if (state.status === 'HALF_OPEN') {
      state.status = 'OPEN';
      console.log(`Circuit breaker for ${serviceName} is now OPEN (from HALF_OPEN)`);
    }
  }

  public reset(serviceName: string): void {
    const state = this.states.get(serviceName);
    if (state) {
      state.status = 'CLOSED';
      state.failureCount = 0;
      state.lastFailureTime = 0;
      state.successCount = 0;
      console.log(`Circuit breaker for ${serviceName} has been reset`);
    }
  }

  public getStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    for (const [serviceName, state] of this.states.entries()) {
      status[serviceName] = { ...state };
    }
    return status;
  }

  public getServiceStatus(serviceName: string): CircuitBreakerState | null {
    return this.states.get(serviceName) || null;
  }

  public setThreshold(serviceName: string, threshold: number): void {
    const state = this.states.get(serviceName);
    if (state) {
      state.threshold = threshold;
    }
  }

  public setTimeout(serviceName: string, timeout: number): void {
    const state = this.states.get(serviceName);
    if (state) {
      state.timeout = timeout;
    }
  }

  public getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [serviceName, state] of this.states.entries()) {
      const failureRate = state.totalRequests > 0 
        ? (state.failureCount / state.totalRequests) * 100 
        : 0;
      
      metrics[serviceName] = {
        status: state.status,
        failureRate: `${failureRate.toFixed(2)}%`,
        totalRequests: state.totalRequests,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime > 0 
          ? new Date(state.lastFailureTime).toISOString() 
          : null
      };
    }
    
    return metrics;
  }
}