# Guia dels Workflows - Sistema d'Avaluació Automàtica

## Descripció General

Aquest document descriu els workflows principals del sistema d'avaluació automàtica d'Adeptify.es implementats amb n8n.

## Workflows Principals

### 1. Processador d'Emails (`email-processor.json`)

**Objectiu**: Monitoritzar la bústia d'entrada i processar emails d'alumnes amb treballs adjunts.

**Nodes principals**:
- **Trigger d'Email**: Monitoritza la bústia d'entrada cada minut
- **Filtrar Emails**: Filtra emails amb adjunts i d'alumnes d'Adeptify.es
- **Processar Email**: Extrau i valida la informació dels emails
- **Activar Avaluació**: Activa el workflow d'avaluació IA
- **Activar Notificació**: Activa el sistema de notificacions
- **Registrar Execució**: Registra l'execució a la base de dades

**Configuració necessària**:
- Credencials IMAP per a la bústia d'entrada
- Credencials API d'n8n per a activar altres workflows

**Filtres aplicats**:
- Emails amb adjunts (mínim 1)
- Emails de dominis @adeptify.es
- Extensions de fitxer vàlides: .pdf, .doc, .docx, .txt, .zip, .rar

### 2. Motor d'Avaluació IA (`evaluation-engine.json`)

**Objectiu**: Analitzar treballs d'alumnes amb IA i generar avaluacions automàtiques.

**Nodes principals**:
- **Webhook d'Avaluació**: Endpoint per rebre dades de treballs
- **Preparar Avaluació**: Valida i estructura les dades d'entrada
- **Extraure Contingut**: Processa els adjunts segons el tipus de fitxer
- **Avaluació IA**: Utilitza GPT-4 per a generar avaluacions
- **Estructurar Avaluació**: Organitza la resposta de l'IA
- **Activar Feedback**: Activa l'enviament de feedback
- **Desar Avaluació**: Guarda l'avaluació a la base de dades

**Criteris d'avaluació**:
1. Qualitat del contingut (0-10)
2. Estructura i organització (0-10)
3. Creativitat i originalitat (0-10)
4. Cumpliment dels objectius (0-10)
5. Presentació i format (0-10)

**Configuració necessària**:
- Credencials OpenAI API
- Credencials PostgreSQL
- Credencials API d'n8n

### 3. Enviador de Feedback (`feedback-sender.json`)

**Objectiu**: Enviar feedback personalitzat als alumnes amb les seves avaluacions.

**Nodes principals**:
- **Webhook de Feedback**: Endpoint per rebre avaluacions
- **Preparar Feedback**: Estructura les dades per a l'email
- **Generar Email**: Crea plantilles HTML i text per a l'email
- **Enviar Email**: Envia l'email via SMTP
- **Registrar Feedback**: Guarda el registre d'enviament
- **Crear Notificació**: Genera notificació per al professor
- **Desar Notificació**: Guarda la notificació a la base de dades

**Plantilla d'email**:
- Disseny HTML responsive
- Informació detallada de l'avaluació
- Suggeriments d'millorament
- Enllaços a recursos addicionals

**Configuració necessària**:
- Credencials SMTP
- Credencials PostgreSQL
- Configuració de plantilles d'email

## Configuració de Credencials

### 1. IMAP (Email Trigger)
```json
{
  "host": "imap.adeptify.es",
  "port": 993,
  "user": "n8n@adeptify.es",
  "password": "your-password",
  "tls": true
}
```

### 2. OpenAI API
```json
{
  "apiKey": "your-openai-api-key"
}
```

### 3. SMTP (Email Send)
```json
{
  "host": "smtp.adeptify.es",
  "port": 587,
  "user": "n8n@adeptify.es",
  "password": "your-smtp-password",
  "tls": true
}
```

### 4. PostgreSQL
```json
{
  "host": "postgres",
  "port": 5432,
  "database": "n8n",
  "user": "n8n",
  "password": "adeptify_postgres_2024"
}
```

### 5. n8n API
```json
{
  "baseUrl": "https://n8n.adeptify.es",
  "apiKey": "your-n8n-api-key"
}
```

## Flux de Dades

```
Email d'Alumne → Processador d'Emails → Motor d'Avaluació IA → Enviador de Feedback
                     ↓                        ↓                        ↓
              Registre d'Execució      Desar Avaluació        Registre de Feedback
                     ↓                        ↓                        ↓
              Base de Dades            Base de Dades            Base de Dades
```

## Monitoratge i Logs

### Logs d'Execució
- Tots els workflows registren les seves execucions
- Informació detallada de cada pas
- Errors i excepcions capturats

### Mètriques Disponibles
- Nombre d'emails processats per dia
- Temps mitjà de processament
- Taxa d'èxit d'avaluacions
- Nombre de feedbacks enviats

### Alertes
- Errors en el processament d'emails
- Fallades en l'avaluació IA
- Problemes d'enviament de feedback
- Problemes de connexió amb APIs externes

## Manteniment

### Tasques Diàries
- Revisar logs d'execució
- Verificar estat dels serveis
- Monitoritzar ús d'APIs externes

### Tasques Setmanals
- Revisar estadístiques d'ús
- Optimitzar workflows si cal
- Actualitzar plantilles d'email

### Tasques Mensuals
- Revisar i actualitzar criteris d'avaluació
- Analitzar feedback dels usuaris
- Optimitzar rendiment del sistema

## Troubleshooting

### Problemes Comuns

#### 1. Emails no es processen
- Verificar configuració IMAP
- Comprovar filtres d'email
- Revisar logs d'execució

#### 2. Errors en avaluació IA
- Verificar quota d'OpenAI API
- Comprovar format de dades d'entrada
- Revisar prompt d'avaluació

#### 3. Feedback no s'envia
- Verificar configuració SMTP
- Comprovar plantilles d'email
- Revisar logs d'enviament

### Comandaments Útils

```bash
# Veure logs dels workflows
docker-compose logs n8n

# Reiniciar serveis
docker-compose restart n8n

# Backup de la base de dades
./scripts/backup.sh

# Verificar estat dels serveis
docker-compose ps
```

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

Per a suport tècnic o preguntes sobre els workflows:
- Contacta amb l'equip de desenvolupament d'Adeptify.es
- Revisa la documentació d'n8n: https://docs.n8n.io/
- Consulta els logs d'execució per a diagnòstic
