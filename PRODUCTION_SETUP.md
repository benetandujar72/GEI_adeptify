# 🌐 Configuración de Producción - GEI Unified Platform

## 📋 Resumen del Problema

La aplicación **no se muestra** en `gei.adeptify.es` debido a problemas de configuración de **CORS** (Cross-Origin Resource Sharing).

## 🔧 Solución: Configurar CORS_ORIGIN

### **¿Qué es CORS_ORIGIN?**

- **CORS** = Cross-Origin Resource Sharing
- Permite que el frontend (React) se comunique con el backend (Express)
- Sin CORS configurado, el navegador bloquea las peticiones
- Causa errores: `"Access to fetch has been blocked by CORS policy"`

### **Valor Correcto para CORS_ORIGIN**

Para tu aplicación en `gei.adeptify.es`, el valor debe ser:

```
CORS_ORIGIN=https://gei.adeptify.es
```

## 🚀 Instrucciones para Configurar en Render

### **Paso 1: Acceder a Render Dashboard**
1. Ir a: https://dashboard.render.com
2. Iniciar sesión con tu cuenta

### **Paso 2: Seleccionar el Servicio**
1. Buscar y seleccionar: `gei-unified-platform`
2. Hacer clic en el servicio

### **Paso 3: Configurar Variables de Entorno**
1. Ir a: **Settings** > **Environment**
2. Hacer clic en **"Add Environment Variable"**

### **Paso 4: Añadir Variables Requeridas**

#### **🔴 Variables REQUERIDAS:**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Entorno de producción |
| `CORS_ORIGIN` | `https://gei.adeptify.es` | **DOMINIO PERMITIDO PARA CORS** |
| `DATABASE_URL` | `tu-url-de-postgresql` | URL de conexión a PostgreSQL |
| `SESSION_SECRET` | `tu-clave-secreta` | Clave secreta para sesiones |

#### **🟡 Variables OPCIONALES:**

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `PORT` | `3000` | Puerto de la aplicación |
| `LOG_LEVEL` | `info` | Nivel de logging |

### **Paso 5: Guardar y Esperar Redeploy**
1. Hacer clic en **"Save Changes"**
2. Render hará **redeploy automático**
3. Esperar 2-3 minutos

## ✅ Verificación

### **1. Verificar Estado del Servicio**
- En Render Dashboard, el servicio debe estar **"Live"**
- Sin errores en los logs

### **2. Probar Health Checks**
```bash
# Health check básico
curl https://gei.adeptify.es/health

# Health check de API
curl https://gei.adeptify.es/api/health

# Health check de base de datos
curl https://gei.adeptify.es/api/health/db
```

### **3. Probar CORS**
```bash
# Probar CORS desde el navegador
# Abrir DevTools (F12) > Console
fetch("/api/health")

# Probar CORS desde curl
curl -H "Origin: https://gei.adeptify.es" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS https://gei.adeptify.es/api/health
```

## 🔧 Solución de Problemas

### **❌ Error: "Access to fetch has been blocked by CORS policy"**
**Solución:**
1. Verificar que `CORS_ORIGIN=https://gei.adeptify.es` está configurado
2. Asegurar que el dominio coincide exactamente
3. Verificar que incluye `https://`
4. Hacer redeploy

### **❌ Error: "No 'Access-Control-Allow-Origin' header"**
**Solución:**
1. Verificar que la variable está en Render
2. Hacer redeploy de la aplicación
3. Verificar logs de Render

### **❌ Error: "Credentials flag is 'true'"**
**Solución:**
1. **NO usar** `CORS_ORIGIN=*` con `credentials: true`
2. Usar dominio específico: `https://gei.adeptify.es`
3. Verificar configuración de cookies

## 📊 Estado Actual

### **✅ Lo que SÍ funciona:**
- ✅ Health checks responden correctamente
- ✅ Base de datos conectada
- ✅ API funcionando
- ✅ SSL configurado
- ✅ Dominio personalizado funcionando

### **❌ Lo que NO funciona:**
- ❌ Frontend no se muestra (problema de CORS)
- ❌ Navegador bloquea peticiones del frontend al backend

## 🎯 Resultado Esperado

Después de configurar `CORS_ORIGIN=https://gei.adeptify.es`:

1. ✅ La aplicación se mostrará en `gei.adeptify.es`
2. ✅ El frontend podrá comunicarse con el backend
3. ✅ No habrá errores CORS en la consola del navegador
4. ✅ Las sesiones funcionarán correctamente
5. ✅ La aplicación estará completamente funcional

## 📞 Soporte

Si después de seguir estas instrucciones la aplicación sigue sin funcionar:

1. **Verificar logs de Render** en el Dashboard
2. **Probar en navegador privado/incógnito**
3. **Limpiar caché del navegador** (Ctrl+Shift+R)
4. **Probar en diferentes navegadores**
5. **Verificar que el redeploy se completó**

---

**⚠️ IMPORTANTE:** La aplicación está funcionando correctamente en el servidor. El problema es específicamente de configuración de CORS que impide que el frontend se comunique con el backend. 