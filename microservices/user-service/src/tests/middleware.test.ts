import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { RateLimitMiddleware } from '../middleware/rate-limit.middleware.js';
import { CorsMiddleware } from '../middleware/cors.middleware.js';
import { SecurityMiddleware } from '../middleware/security.middleware.js';
import { validateSchema, UserSchemas } from '../middleware/validation.middleware.js';

// Crear app de test
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

describe('Rate Limit Middleware', () => {
  let app: express.Application;
  let rateLimitMiddleware: RateLimitMiddleware;

  beforeEach(() => {
    app = createTestApp();
    rateLimitMiddleware = new RateLimitMiddleware();
  });

  it('should allow requests within rate limit', async () => {
    const limiter = rateLimitMiddleware.createRateLimiter({
      windowMs: 1000,
      maxRequests: 5
    });

    app.use('/test', limiter);
    app.get('/test', (req, res) => res.json({ success: true }));

    // Hacer 5 requests (dentro del límite)
    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    }
  });

  it('should block requests exceeding rate limit', async () => {
    const limiter = rateLimitMiddleware.createRateLimiter({
      windowMs: 1000,
      maxRequests: 2
    });

    app.use('/test', limiter);
    app.get('/test', (req, res) => res.json({ success: true }));

    // Primeros 2 requests deberían pasar
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);

    // El tercer request debería ser bloqueado
    const response = await request(app).get('/test');
    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
  });
});

describe('CORS Middleware', () => {
  let app: express.Application;
  let corsMiddleware: CorsMiddleware;

  beforeEach(() => {
    app = createTestApp();
  });

  it('should allow requests from allowed origins', async () => {
    corsMiddleware = new CorsMiddleware({
      origin: ['https://gei.adeptify.es']
    });

    app.use(corsMiddleware.middleware());
    app.get('/test', (req, res) => res.json({ success: true }));

    const response = await request(app)
      .get('/test')
      .set('Origin', 'https://gei.adeptify.es');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://gei.adeptify.es');
  });

  it('should handle preflight requests', async () => {
    corsMiddleware = new CorsMiddleware({
      origin: ['https://gei.adeptify.es']
    });

    app.use(corsMiddleware.middleware());
    app.get('/test', (req, res) => res.json({ success: true }));

    const response = await request(app)
      .options('/test')
      .set('Origin', 'https://gei.adeptify.es')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://gei.adeptify.es');
  });
});

describe('Security Middleware', () => {
  let app: express.Application;
  let securityMiddleware: SecurityMiddleware;

  beforeEach(() => {
    app = createTestApp();
  });

  it('should add security headers', async () => {
    securityMiddleware = new SecurityMiddleware({
      enableHsts: true,
      enableXssProtection: true,
      enableContentTypeSniffing: true
    });

    app.use(securityMiddleware.securityHeaders());
    app.get('/test', (req, res) => res.json({ success: true }));

    const response = await request(app).get('/test');

    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should validate HTTP methods', async () => {
    securityMiddleware = new SecurityMiddleware({
      allowedMethods: ['GET', 'POST']
    });

    app.use(securityMiddleware.methodValidation());
    app.get('/test', (req, res) => res.json({ success: true }));

    // GET should work
    await request(app).get('/test').expect(200);

    // PUT should be blocked
    const response = await request(app).put('/test');
    expect(response.status).toBe(405);
    expect(response.body.success).toBe(false);
  });

  it('should validate request size', async () => {
    securityMiddleware = new SecurityMiddleware({
      maxRequestSize: 100 // 100 bytes
    });

    app.use(securityMiddleware.requestSizeValidation());
    app.post('/test', (req, res) => res.json({ success: true }));

    const largeData = 'x'.repeat(200);
    const response = await request(app)
      .post('/test')
      .set('Content-Length', '200')
      .send({ data: largeData });

    expect(response.status).toBe(413);
    expect(response.body.success).toBe(false);
  });
});

describe('Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  it('should validate user registration data', async () => {
    app.use('/register', validateSchema(UserSchemas.register));
    app.post('/register', (req, res) => res.json({ success: true }));

    // Valid data
    const validData = {
      email: 'test@example.com',
      password: 'Password123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student'
    };

    const validResponse = await request(app)
      .post('/register')
      .send(validData);

    expect(validResponse.status).toBe(200);

    // Invalid data
    const invalidData = {
      email: 'invalid-email',
      password: 'weak',
      firstName: '',
      lastName: 'Doe'
    };

    const invalidResponse = await request(app)
      .post('/register')
      .send(invalidData);

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.success).toBe(false);
    expect(invalidResponse.body.error.details).toBeDefined();
  });

  it('should sanitize input data', async () => {
    app.use('/test', validateSchema(UserSchemas.updateProfile));
    app.put('/test', (req, res) => res.json({ data: req.body }));

    const response = await request(app)
      .put('/test')
      .send({
        firstName: '  John  ',
        lastName: '  Doe  '
      });

    expect(response.status).toBe(200);
    expect(response.body.data.firstName).toBe('John');
    expect(response.body.data.lastName).toBe('Doe');
  });
});

describe('Content Type Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  it('should require Content-Type for POST requests', async () => {
    app.use(validateContentType(['application/json']));
    app.post('/test', (req, res) => res.json({ success: true }));

    const response = await request(app).post('/test');
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Content-Type header required');
  });

  it('should accept valid Content-Type', async () => {
    app.use(validateContentType(['application/json']));
    app.post('/test', (req, res) => res.json({ success: true }));

    const response = await request(app)
      .post('/test')
      .set('Content-Type', 'application/json')
      .send({});

    expect(response.status).toBe(200);
  });
});

describe('Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    
    // Aplicar todos los middlewares
    const securityMiddleware = new SecurityMiddleware(SecurityMiddleware.DEVELOPMENT_CONFIG);
    const corsMiddleware = new CorsMiddleware(CorsMiddleware.DEVELOPMENT_CONFIG);
    const rateLimitMiddleware = new RateLimitMiddleware();

    app.use(securityMiddleware.securityHeaders());
    app.use(corsMiddleware.middleware());
    app.use(rateLimitMiddleware.createRateLimiter({
      windowMs: 1000,
      maxRequests: 10
    }));
    app.use(express.json());
  });

  it('should handle complete request flow', async () => {
    app.post('/register', 
      validateSchema(UserSchemas.register),
      (req, res) => res.json({ success: true, user: req.body })
    );

    const response = await request(app)
      .post('/register')
      .set('Content-Type', 'application/json')
      .set('Origin', 'http://localhost:3000')
      .send({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['x-xss-protection']).toBe('1; mode=block');
  });
});