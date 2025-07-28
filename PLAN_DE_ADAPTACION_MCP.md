# Plan de Adaptación a Arquitectura Unificada (MCP)

## 1. Análisis del Estado Actual (As-Is)

El proyecto actual se encuentra en un estado de **monolito modular**. Aunque el código está separado en directorios `client` y `server`, ambos componentes están fuertemente acoplados:

- **Stack Tecnológico:**
  - **Frontend:** React, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query.
  - **Backend:** Node.js, Express, TypeScript (`tsx`).
  - **Base de Datos:** PostgreSQL con Drizzle ORM.
  - **Despliegue:** Configuración para Docker y Render, pero orientada a un único servicio.
- **Estructura:**
  - Un único `package.json` gestiona todas las dependencias (cliente y servidor).
  - Los scripts (`dev`, `build`, `start`) lanzan el cliente y el servidor de forma conjunta (`concurrently`).
  - La lógica de negocio del backend reside en un único directorio `server/`, mezclando dominios (autenticación, rutas, servicios, etc.).
- **Puntos Fuertes:**
  - Uso de tecnologías modernas y alineadas con la especificación (React, TS, Tailwind).
  - Base de componentes UI sólida con Radix.
  - ORM moderno (Drizzle) que facilita la migración de esquemas.
- **Debilidades (en relación a la arquitectura de destino):**
  - **Falta de Aislamiento:** Un error en un módulo del backend puede detener todo el sistema.
  - **Escalabilidad Limitada:** No se puede escalar un dominio específico (ej. `students`) de forma independiente.
  - **Acoplamiento:** El cliente realiza llamadas directamente a un único API de backend.
  - **Inexistencia de Capa MCP:** No hay infraestructura para la orquestación de contextos ni capacidades de IA distribuidas.

## 2. Análisis de la Arquitectura de Destino (To-Be)

La `arquitectura_unificada.md` describe un sistema distribuido basado en **Microservicios**, una capa de orquestación **MCP (Multi-Context Platform)** y servicios de **IA**.

- **Principios Clave:**
  - **Separación de Dominios:** Cada microservicio gestiona un dominio de negocio específico (usuarios, cursos, etc.) con su propia lógica y, potencialmente, su propia base de datos.
  - **API Gateway:** Un único punto de entrada que enruta las peticiones del cliente al microservicio correspondiente. Actúa como un proxy inverso.
  - **Orquestación MCP:** Una capa intermedia que gestiona el contexto de las interacciones complejas y distribuye tareas entre diferentes servidores de capacidades (humanos o IA).
  - **Comunicación Asíncrona:** Los servicios se comunican entre sí a través de eventos o llamadas directas ligeras.
  - **Persistencia Políglota:** Uso de la base de datos más adecuada para cada tarea (PostgreSQL para datos relacionales, Redis para caché/sesiones, Vector DB para embeddings de IA).

## 3. Identificación de Gaps y Plan de Acción

La transición requiere una refactorización profunda para pasar del monolito a una red de servicios distribuidos.

### Plan de Trabajo Detallado

Este plan se ejecutará en fases para minimizar riesgos y permitir validaciones incrementales.

---

### **Fase 1: Fundación y Andamiaje (Scaffolding)**

*   **Objetivo:** Crear la estructura básica del proyecto sin alterar la funcionalidad existente.
*   **Tareas:**
    1.  **Crear Estructura de Directorios (Realizado):**
        - `gateway/`: Contendrá el código del API Gateway.
        - `microservices/`: Contendrá los nuevos microservicios.
        - `mcp/`: Contendrá los servicios de la capa MCP.
    2.  **Configurar Monorepo (Workspaces):**
        - Modificar el `package.json` raíz para definir `workspaces` (npm, pnpm o yarn). Esto permitirá gestionar las dependencias de cada servicio de forma independiente.
        - Crear un `package.json` inicial para cada nueva carpeta (`gateway`, etc.).
    3.  **Implementar un API Gateway Básico:**
        - Crear un nuevo servicio en `gateway/` con Express o una librería más ligera (como `fast-gateway`).
        - Inicialmente, este gateway solo redirigirá todo el tráfico (`/api/*`) al monolito `server/` actual para no romper el cliente.

---

### **Fase 2: Extracción del Primer Microservicio (`user-service`)**

*   **Objetivo:** Extraer un dominio completo (usuarios y autenticación) a su propio microservicio para validar el proceso.
*   **Tareas:**
    1.  **Crear el Servicio:**
        - Crear el directorio `microservices/user-service`.
        - Añadir su `package.json`, configuración de TypeScript y dependencias (`express`, `drizzle-orm`, `bcryptjs`, `jsonwebtoken`, etc.).
    2.  **Mover Código:**
        - Migrar todas las rutas de autenticación y gestión de usuarios de `server/routes` a `user-service/routes`.
        - Mover los esquemas de Drizzle relacionados con usuarios (`users`, `roles`, `sessions`) a `user-service/database`.
        - Mover la lógica de negocio (servicios) correspondiente.
    3.  **Configurar el Gateway:**
        - Actualizar el `gateway/` para que las rutas `/api/auth/*` y `/api/users/*` apunten al nuevo `user-service`.
    4.  **Ajustar el Cliente:**
        - Asegurarse de que el cliente sigue funcionando correctamente a través del gateway. No deberían ser necesarios grandes cambios si el gateway enmascara la nueva ruta.
    5.  **Refactorizar el Monolito:**
        - Eliminar el código de usuarios del `server/` original. Ahora, si el monolito necesita datos de usuario, deberá llamar al `user-service` a través del gateway.

---

### **Fase 3: Migración Incremental del Resto de Servicios**

*   **Objetivo:** Repetir el proceso de extracción para los demás dominios de negocio.
*   **Tareas:**
    1.  **Crear `student-service`:** Mover toda la lógica de estudiantes.
    2.  **Crear `course-service`:** Mover la gestión de cursos, notas y currículo.
    3.  **Crear `communication-service`:** Mover la lógica de notificaciones y mensajería.
    4.  **Crear `analytics-service`:** Extraer la generación de informes y analíticas.
    5.  **Actualizar el Gateway:** Añadir las reglas de enrutamiento para cada nuevo servicio.

---

### **Fase 4: Implementación de la Capa MCP y Servicios de IA**

*   **Objetivo:** Construir la nueva capa de orquestación inteligente.
*   **Tareas:**
    1.  **Crear `mcp-orchestrator`:**
        - Implementar el servicio principal en `mcp/orchestrator/`.
        - Seguir la lógica del documento de arquitectura: registro de servidores, gestión de contexto (usando Redis, que ya es una dependencia), enrutamiento de peticiones.
    2.  **Crear `mcp-academic-server`:**
        - Implementar el primer servidor de capacidades en `mcp/academic-server/`.
        - Este servidor expondrá capacidades como `get_student_grades` o `analyze_student_performance`.
        - Se comunicará con los microservicios (`student-service`, `course-service`) para obtener los datos necesarios.
    3.  **Crear `ai-services`:**
        - Crear `microservices/llm-gateway` para gestionar las llamadas a los modelos de lenguaje (OpenAI, Anthropic, Google) y unificar la gestión de costes y el failover.
        - Crear `microservices/content-generation` que use el `llm-gateway` para crear contenido educativo.

---

### **Fase 5: Refinamiento del Frontend y Base de Datos**

*   **Objetivo:** Alinear completamente el cliente y la persistencia con la nueva arquitectura.
*   **Tareas:**
    1.  **Adoptar Zustand:**
        - Crear el directorio `client/src/store`.
        - Migrar la gestión de estado global (ej. estado de autenticación) de React Context a Zustand para un manejo más eficiente y centralizado.
    2.  **Reorganizar Componentes:**
        - Crear `client/src/components/ui` y mover allí todos los componentes base de `shadcn/ui` (o Radix).
    3.  **Separación de Bases de Datos:**
        - Aunque físicamente puedan seguir en el mismo servidor PostgreSQL, cada microservicio deberá tener su propio **esquema** o **base de datos lógica**.
        - Actualizar las configuraciones de Drizzle en cada servicio para que apunten a su esquema aislado.
    4.  **Integrar Redis:**
        - Implementar el uso de Redis (dependencia ya existente) en el `user-service` para el almacenamiento de sesiones y en el `gateway` o servicios individuales para el cacheo de respuestas.

---

### **Fase 6: Despliegue y Orquestación Final**

*   **Objetivo:** Preparar el sistema distribuido para producción.
*   **Tareas:**
    1.  **Dockerizar cada Servicio:**
        - Cada microservicio, el gateway y los servicios MCP tendrán su propio `Dockerfile`.
    2.  **Actualizar Docker Compose:**
        - Crear un `docker-compose.yml` que defina y orqueste todos los servicios, sus redes y volúmenes.
    3.  **Introducir Traefik (Opcional Avanzado):**
        - Reemplazar el gateway de Express por Traefik para obtener auto-descubrimiento de servicios, balanceo de carga nativo y gestión de certificados SSL automática.
    4.  **Actualizar `render.yaml`:**
        - Modificar la configuración de Render para desplegar múltiples servicios, definiendo las variables de entorno y los comandos de build/start para cada uno.

Este plan transforma el proyecto de un monolito a una arquitectura de microservicios robusta, escalable e inteligente, alineada con la visión del documento `arquitectura_unificada.md`.
