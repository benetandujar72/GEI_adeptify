# Instrucciones Manuales para Reiniciar la Aplicación

## Si Docker no funciona:

### 1. Verificar Docker Desktop
- Abre Docker Desktop
- Espera a que esté completamente iniciado
- Verifica que esté funcionando: `docker --version`

### 2. Reiniciar la aplicación
```powershell
# Detener contenedores
docker compose down

# Reconstruir la aplicación
docker compose build app

# Levantar servicios
docker compose up -d

# Verificar estado
docker compose ps
```

### 3. Verificar que funciona
```powershell
# Verificar API
Invoke-RestMethod http://localhost:3000/api/health

# Verificar frontend
Invoke-RestMethod http://localhost:3000/
```

## Credenciales de acceso:

### 👤 ADMINISTRADOR
- **Email:** admin@gei.edu
- **Contraseña:** admin123
- **Rol:** admin

### 👨‍🏫 PROFESOR
- **Email:** teacher@gei.edu
- **Contraseña:** teacher123
- **Rol:** teacher

### 👨‍🎓 ESTUDIANTE
- **Email:** student@gei.edu
- **Contraseña:** student123
- **Rol:** student

## Acceso a la aplicación:
1. Ve a: http://localhost:3000
2. Usa las credenciales del administrador
3. ¡Disfruta de la aplicación!

## Solución de problemas:

### Error SSL:
- ✅ **SOLUCIONADO:** SSL deshabilitado para desarrollo local

### Error 500 en login:
- ✅ **SOLUCIONADO:** Conectado a base de datos PostgreSQL

### Base de datos vacía:
- ✅ **SOLUCIONADO:** Usuarios creados automáticamente

### Frontend no carga:
- ✅ **SOLUCIONADO:** Volúmenes corregidos en docker-compose.yml
