# 🔒 Middlewares Avançats - User Service

## 📋 Resum

Aquest document descriu els middlewares avançats implementats al User Service per proporcionar seguretat, validació i control d'accés de nivell empresarial.

## 🛡️ Middlewares de Seguretat

### **SecurityMiddleware**

Proporciona protecció completa contra atacs comuns i millora la seguretat general de l'aplicació.

#### **Funcionalitats**:
- **Headers de Seguretat**: HSTS, XSS Protection, Content Type Sniffing, Frame Options
- **Content Security Policy (CSP)**: Protecció contra XSS i injecció de codi
- **Validació de Mètodes HTTP**: Control d'accés per mètode
- **Validació de Mida de Request**: Protecció contra atacs de denegació de servei
- **Detecció d'IPs Sospitoses**: Identificació de patrons maliciosos
- **Logging de Requests**: Auditoria completa de peticions

#### **Configuracions**:
```typescript
// Producció (Alta seguretat)
SecurityMiddleware.PRODUCTION_CONFIG

// Desenvolupament (Seguretat relaxada)
SecurityMiddleware.DEVELOPMENT_CONFIG
```

#### **Exemple d'ús**:
```typescript
const securityMiddleware = new SecurityMiddleware(SecurityMiddleware.PRODUCTION_CONFIG);

// Aplicar tots els middlewares de seguretat
securityMiddleware.complete().forEach(middleware => {
  app.use(middleware);
});
```

## 🚦 Rate Limiting Avançat

### **RateLimitMiddleware**

Control de velocitat de peticions amb Redis per prevenir abús i atacs.

#### **Funcionalitats**:
- **Rate Limiting per IP**: Control basat en adreça IP
- **Rate Limiting per Usuari**: Control basat en usuari autenticat
- **Configuracions Específiques**: Diferents límits per diferents endpoints
- **Headers de Rate Limit**: Informació sobre límits i temps d'espera
- **Logging Detallat**: Registre de violacions de rate limit

#### **Configuracions Predefinides**:
```typescript
// Autenticació (5 intents en 15 minuts)
RateLimitMiddleware.AUTH_RATE_LIMIT

// API General (100 peticions per minut)
RateLimitMiddleware.API_RATE_LIMIT

// Endpoints Sensibles (10 peticions per minut)
RateLimitMiddleware.STRICT_RATE_LIMIT
```

#### **Exemple d'ús**:
```typescript
const rateLimitMiddleware = new RateLimitMiddleware();

// Rate limiting per autenticació
app.use('/api/v1/auth', rateLimitMiddleware.createRateLimiter(
  RateLimitMiddleware.AUTH_RATE_LIMIT
));

// Rate limiting general
app.use('/api/v1', rateLimitMiddleware.createRateLimiter(
  RateLimitMiddleware.API_RATE_LIMIT
));
```

## 🌐 CORS Avançat

### **CorsMiddleware**

Control de Cross-Origin Resource Sharing amb configuració específica per entorn.

#### **Funcionalitats**:
- **Validació d'Orígens**: Control d'accés per domini
- **Headers Exposats**: Control de headers visibles al client
- **Preflight Requests**: Gestió de peticions OPTIONS
- **Logging de CORS**: Registre de peticions cross-origin
- **Configuracions per Entorn**: Diferents configuracions per dev/prod

#### **Configuracions Predefinides**:
```typescript
// Producció (gei.adeptify.es)
CorsMiddleware.PRODUCTION_CONFIG

// Desenvolupament (localhost)
CorsMiddleware.DEVELOPMENT_CONFIG

// Estricte (només gei.adeptify.es)
CorsMiddleware.STRICT_CONFIG
```

#### **Exemple d'ús**:
```typescript
const corsConfig = process.env.NODE_ENV === 'production' 
  ? CorsMiddleware.PRODUCTION_CONFIG 
  : CorsMiddleware.DEVELOPMENT_CONFIG;

const corsMiddleware = new CorsMiddleware(corsConfig);
app.use(corsMiddleware.middleware());
```

## ✅ Validació Avançada

### **ValidationMiddleware**

Sistema de validació complet amb Zod schemas i sanitització automàtica.

#### **Funcionalitats**:
- **Schemas Zod**: Validació tipada i robusta
- **Sanitització Automàtica**: Neteja de dades d'entrada
- **Validació per Tipus**: Body, Query, Params
- **Missatges d'Error Detallats**: Informació específica d'errors
- **Schemas Reutilitzables**: Components de validació comuns

#### **Schemas Disponibles**:
```typescript
// Schemas comuns
CommonSchemas.email
CommonSchemas.password
CommonSchemas.name
CommonSchemas.uuid
CommonSchemas.pagination

// Schemas d'usuari
UserSchemas.register
UserSchemas.login
UserSchemas.updateProfile
UserSchemas.changePassword

// Schemas d'administració
AdminSchemas.createUser
AdminSchemas.updateUser
AdminSchemas.listUsers
```

#### **Exemple d'ús**:
```typescript
// Validació de registre
app.use('/register', validateSchema(UserSchemas.register));

// Validació de paginació
app.use('/users', validateSchema(CommonSchemas.pagination, 'query'));

// Validació d'ID
app.use('/users/:id', validateId('id'));
```

## 🔧 Integració Completa

### **Configuració del Servidor**

```typescript
// Inicialització de middlewares
const corsConfig = process.env.NODE_ENV === 'production' 
  ? CorsMiddleware.PRODUCTION_CONFIG 
  : CorsMiddleware.DEVELOPMENT_CONFIG;

const securityConfig = process.env.NODE_ENV === 'production'
  ? SecurityMiddleware.PRODUCTION_CONFIG
  : SecurityMiddleware.DEVELOPMENT_CONFIG;

const corsMiddleware = new CorsMiddleware(corsConfig);
const rateLimitMiddleware = new RateLimitMiddleware();
const securityMiddleware = new SecurityMiddleware(securityConfig);

// Aplicació de middlewares
securityMiddleware.complete().forEach(middleware => {
  app.use(middleware);
});

app.use(corsMiddleware.middleware());
app.use(sanitizeHeaders);
app.use(validateContentType(['application/json']));

// Rate limiting específic
app.use('/api/v1/auth', rateLimitMiddleware.createRateLimiter(
  RateLimitMiddleware.AUTH_RATE_LIMIT
));

app.use('/api/v1', rateLimitMiddleware.createRateLimiter(
  RateLimitMiddleware.API_RATE_LIMIT
));
```

## 🧪 Testing

### **Tests de Middlewares**

```bash
# Executar tests de middlewares
npm run test src/tests/middleware.test.ts

# Executar tests amb cobertura
npm run test:coverage
```

### **Tests Disponibles**:
- ✅ Rate Limit Middleware
- ✅ CORS Middleware  
- ✅ Security Middleware
- ✅ Validation Middleware
- ✅ Integration Tests

## 📊 Mètriques de Seguretat

### **Headers de Seguretat Actius**:
- `Strict-Transport-Security`: Força HTTPS
- `X-XSS-Protection`: Protecció XSS
- `X-Content-Type-Options`: Prevé MIME sniffing
- `X-Frame-Options`: Protecció clickjacking
- `Referrer-Policy`: Control de referrer
- `Content-Security-Policy`: Política de seguretat de contingut

### **Rate Limiting Actiu**:
- **Autenticació**: 5 intents en 15 minuts
- **API General**: 100 peticions per minut
- **Endpoints Sensibles**: 10 peticions per minut

### **Validació Activa**:
- **Email**: Format i longitud
- **Contrasenya**: Complexitat i seguretat
- **Noms**: Format i longitud
- **UUIDs**: Format vàlid
- **Paginació**: Límits i valors

## 🚀 Desplegament

### **Variables d'Entorn Necessàries**:
```bash
# Seguretat
NODE_ENV=production
CORS_ORIGIN=https://gei.adeptify.es

# Rate Limiting
REDIS_URL=redis://redis:6379

# Validació
JWT_SECRET=your-secret-key
```

### **Comandes de Desplegament**:
```bash
# Instal·lar dependències
npm install

# Build de producció
npm run build

# Verificar seguretat
npm run security:check

# Executar tests
npm run test

# Iniciar servidor
npm start
```

## 📈 Monitoratge

### **Logs de Seguretat**:
- Violacions de rate limit
- Peticions sospitoses
- Errors de validació
- Intents d'autenticació fallits
- Headers de seguretat aplicats

### **Mètriques Disponibles**:
- Requests per segon
- Errors de validació
- Violacions de rate limit
- Temps de resposta
- Ús de memòria

## 🔄 Actualitzacions

### **Versió Actual**: 1.0.0

### **Canvis Recents**:
- ✅ Implementació de middlewares avançats
- ✅ Integració completa de seguretat
- ✅ Sistema de validació amb Zod
- ✅ Rate limiting amb Redis
- ✅ CORS configurable per entorn
- ✅ Tests complets de middlewares

### **Pròximes Millores**:
- [ ] Integració amb WAF
- [ ] Machine Learning per detecció d'anomalies
- [ ] Dashboard de seguretat
- [ ] Alertes automàtiques
- [ ] Backup automàtic de configuracions

---

## 📞 Suport

Per a preguntes o problemes amb els middlewares:

1. **Documentació**: Aquest document
2. **Tests**: `src/tests/middleware.test.ts`
3. **Logs**: Verificar logs del servidor
4. **Configuració**: Revisar variables d'entorn

---

**Última actualització**: Gener 2025
**Versió**: 1.0.0
**Autor**: EduAI Platform Team