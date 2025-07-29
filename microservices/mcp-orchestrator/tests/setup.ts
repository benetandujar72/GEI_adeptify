import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Cargar variables de entorno para testing
dotenv.config({ path: '.env.test' });

// Configurar variables de entorno por defecto para testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3008';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ELASTICSEARCH_URL = 'http://localhost:9200';
process.env.LOG_LEVEL = 'error';
process.env.SERVICE_NAME = 'mcp-orchestrator-test';

// Mock de servicios externos
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    ping: vi.fn().mockResolvedValue('PONG'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setEx: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(true),
    ttl: vi.fn().mockResolvedValue(-1),
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue([]),
    flushDb: vi.fn().mockResolvedValue('OK'),
    info: vi.fn().mockResolvedValue('redis_version:6.0.0'),
    memoryUsage: vi.fn().mockResolvedValue({}),
    on: vi.fn(),
    duplicate: vi.fn(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    }))
  }))
}));

vi.mock('winston', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn()
  })),
  format: {
    timestamp: vi.fn(() => ({})),
    errors: vi.fn(() => ({})),
    metadata: vi.fn(() => ({})),
    printf: vi.fn(() => ({})),
    combine: vi.fn(() => ({})),
    colorize: vi.fn(() => ({}))
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn()
  }
}));

vi.mock('winston-elasticsearch', () => ({
  ElasticsearchTransport: vi.fn()
}));

vi.mock('prom-client', () => ({
  register: {
    metrics: vi.fn().mockResolvedValue(''),
    clear: vi.fn()
  },
  Counter: vi.fn(() => ({
    inc: vi.fn(),
    set: vi.fn()
  })),
  Histogram: vi.fn(() => ({
    observe: vi.fn(),
    startTimer: vi.fn(() => ({ end: vi.fn() }))
  })),
  Gauge: vi.fn(() => ({
    set: vi.fn(),
    inc: vi.fn(),
    dec: vi.fn()
  })),
  collectDefaultMetrics: vi.fn()
}));

vi.mock('socket.io', () => ({
  Server: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn((callback) => callback && callback())
  }))
}));

// Configuración global para tests
beforeAll(async () => {
  // Configuración global antes de todos los tests
  console.log('🚀 Configurando tests del MCP Orchestrator...');
});

afterAll(async () => {
  // Limpieza global después de todos los tests
  console.log('✅ Tests del MCP Orchestrator completados');
});

beforeEach(async () => {
  // Configuración antes de cada test
  vi.clearAllMocks();
});

afterEach(async () => {
  // Limpieza después de cada test
  vi.clearAllTimers();
});

// Configurar timeouts globales
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 10000,
  teardownTimeout: 10000
});

// Exportar configuración para uso en tests
export const testConfig = {
  port: process.env.PORT || '3008',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  logLevel: process.env.LOG_LEVEL || 'error',
  serviceName: process.env.SERVICE_NAME || 'mcp-orchestrator-test'
};