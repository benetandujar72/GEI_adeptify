# Sistema d'Avaluació Automàtica - Adeptify.es

## Descripció
Sistema complet d'avaluació automàtica per a la plataforma educativa Adeptify.es utilitzant n8n auto-hospedat amb Docker.

## Característiques Principals
- Processament automàtic d'emails d'alumnes amb treballs adjunts
- Avaluació automàtica amb IA
- Generació i enviament de feedback personalitzat
- Integració amb la plataforma Adeptify.es
- Interfície en català

## Estructura del Projecte
```
n8n_bitacola/
├── docker-compose.yml          # Configuració Docker per n8n
├── workflows/                  # Workflows d'n8n
│   ├── email-processor.json    # Processament d'emails
│   ├── evaluation-engine.json  # Motor d'avaluació IA
│   └── feedback-sender.json    # Enviament de feedback
├── config/                     # Configuracions
│   ├── n8n.env                # Variables d'entorn
│   └── ai-config.json         # Configuració IA
├── scripts/                    # Scripts d'utilitat
│   ├── setup.sh               # Script d'instal·lació
│   └── backup.sh              # Script de backup
└── docs/                       # Documentació
    ├── api-docs.md            # Documentació API
    └── workflow-guide.md      # Guia dels workflows
```

## Instal·lació i Configuració

### Prerequisits
- Docker i Docker Compose
- Accés al domini n8n.adeptify.es
- Credencials d'API per a serveis d'IA (OpenAI, etc.)
- Certificats SSL per al domini

### Pasos d'Instal·lació

#### Opció 1: Instal·lació Automàtica (Recomanada)
```bash
# Windows
scripts\setup.bat

# Linux/macOS
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### Opció 2: Instal·lació Manual
1. Clona aquest repositori
2. Configura les variables d'entorn a `config/n8n.env`
3. Copia `config/n8n.env` a `.env` i edita les credencials
4. Executa `docker-compose up -d`
5. Accedeix a n8n.adeptify.es per configurar els workflows

### Configuració de Credencials

#### 1. Variables d'Entorn (.env)
```bash
# Configuració bàsica n8n
N8N_USER=admin
N8N_PASSWORD=adeptify2024
N8N_ENCRYPTION_KEY=your-super-secret-encryption-key

# APIs d'IA
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# SMTP per a emails
SMTP_HOST=smtp.adeptify.es
SMTP_USER=n8n@adeptify.es
SMTP_PASS=your-smtp-password
```

#### 2. Certificats SSL
Col·loca els certificats SSL a `nginx/ssl/`:
- `n8n.adeptify.es.crt`
- `n8n.adeptify.es.key`

## Workflows Principals

### 1. Processador d'Emails
- Monitoritza la bústia d'entrada
- Detecta emails d'alumnes amb adjunts
- Extrau i processa els treballs

### 2. Motor d'Avaluació IA
- Analitza els treballs amb IA
- Genera avaluacions automàtiques
- Crea feedback personalitzat

### 3. Enviador de Feedback
- Envia feedback als alumnes
- Registra les avaluacions
- Actualitza la base de dades

## Configuració de Producció
- Domini: n8n.adeptify.es
- Entorn: Producció
- Seguretat: HTTPS obligatori
- Backup: Automàtic diari

## Desenvolupament

### Entorn de Desenvolupament Local
```bash
# Iniciar entorn de desenvolupament
docker-compose -f docker-compose.dev.yml up -d

# Accedir a n8n de desenvolupament
# http://localhost:5678

# Accedir a MailHog (servidor d'emails de prova)
# http://localhost:8025
```

### Estructura de Directoris
```
n8n_bitacola/
├── .vscode/                    # Configuració VS Code
├── config/                     # Configuracions
│   ├── n8n.env                # Variables d'entorn
│   └── ai-config.json         # Configuració IA
├── workflows/                  # Workflows d'n8n
│   ├── email-processor.json    # Processament d'emails
│   ├── evaluation-engine.json  # Motor d'avaluació IA
│   └── feedback-sender.json    # Enviament de feedback
├── scripts/                    # Scripts d'utilitat
│   ├── setup.sh               # Script d'instal·lació (Linux/macOS)
│   ├── setup.bat              # Script d'instal·lació (Windows)
│   ├── backup.sh              # Script de backup (Linux/macOS)
│   ├── backup.bat             # Script de backup (Windows)
│   └── init-db.sql            # Inicialització de la base de dades
├── nginx/                      # Configuració nginx
│   ├── nginx.conf             # Configuració principal
│   ├── ssl/                   # Certificats SSL
│   └── sites-enabled/         # Configuracions de llocs
├── traefik/                    # Configuració Traefik
│   ├── traefik.yml            # Configuració principal
│   └── letsencrypt/           # Certificats Let's Encrypt
├── docs/                       # Documentació
│   ├── api-docs.md            # Documentació API
│   └── workflow-guide.md      # Guia dels workflows
├── docker-compose.yml          # Producció
├── docker-compose.dev.yml      # Desenvolupament
└── README.md                   # Aquest fitxer
```

### Comandaments Útils

#### Gestió de Serveis
```bash
# Iniciar serveis
docker-compose up -d

# Aturar serveis
docker-compose down

# Veure logs
docker-compose logs -f n8n

# Reiniciar serveis
docker-compose restart n8n
```

#### Backups
```bash
# Windows
scripts\backup.bat

# Linux/macOS
./scripts/backup.sh
```

#### Base de Dades
```bash
# Accedir a PostgreSQL
docker-compose exec postgres psql -U n8n -d n8n

# Backup manual
docker-compose exec postgres pg_dump -U n8n -d n8n > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U n8n -d n8n < backup.sql
```

## Manteniment

### Tasques Diàries
- Revisar logs d'execució: `docker-compose logs n8n`
- Verificar estat dels serveis: `docker-compose ps`
- Monitoritzar ús d'APIs externes

### Tasques Setmanals
- Revisar estadístiques d'ús
- Optimitzar workflows si cal
- Actualitzar plantilles d'email

### Tasques Mensuals
- Revisar i actualitzar criteris d'avaluació
- Analitzar feedback dels usuaris
- Optimitzar rendiment del sistema
- Fer backup complet del sistema

### Backups Automàtics
- Backups diaris de la base de dades
- Backups setmanals dels workflows
- Retenció de 7 dies per defecte

## Monitoratge i Logs

### Logs Disponibles
- **n8n**: `docker-compose logs n8n`
- **PostgreSQL**: `docker-compose logs postgres`
- **nginx**: `docker-compose logs nginx`
- **Redis**: `docker-compose logs redis`

### Mètriques
- Nombre d'emails processats per dia
- Temps mitjà de processament
- Taxa d'èxit d'avaluacions
- Nombre de feedbacks enviats

### Alertes
- Errors en el processament d'emails
- Fallades en l'avaluació IA
- Problemes d'enviament de feedback
- Problemes de connexió amb APIs externes

## Seguretat

### Mesures Implementades
- Autenticació obligatòria per a n8n
- HTTPS obligatori per a totes les connexions
- Rate limiting per a APIs
- Validació d'entrada en tots els nodes
- Logs d'auditoria per a totes les accions

### Recomanacions
- Canviar contrasenyes regularment
- Revisar logs d'accés periòdicament
- Mantenir actualitzats tots els serveis
- Fer backups regulars de la base de dades

## Suport

Per a suport tècnic, contacta amb l'equip de desenvolupament d'Adeptify.es

### Recursos Addicionals
- [Documentació d'n8n](https://docs.n8n.io/)
- [Guia dels Workflows](docs/workflow-guide.md)
- [Documentació API](docs/api-docs.md)
