import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

// Configurar variables de entorno para testing
config({ path: path.resolve(__dirname, '../.env.test') });

// Configuración global para tests
beforeAll(async () => {
  // Configurar base de datos de testing
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/gei_test';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  process.env.OPENAI_API_KEY = process.env.TEST_OPENAI_API_KEY || 'test-key';
  
  // Configurar logging para tests
  process.env.LOG_LEVEL = 'error';
});

afterAll(async () => {
  // Limpiar recursos después de todos los tests
});

beforeEach(async () => {
  // Setup antes de cada test
});

afterEach(async () => {
  // Cleanup después de cada test
});

// Configuración global de mocks
global.console = {
  ...console,
  // Silenciar logs durante tests
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}; 