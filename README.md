# Revisor inteligente de solicitudes de cotización – OrigenTours

PoC del Grupo 11 (Hito 1). El revisor recibe solicitudes de cotización de OrigenTours. El backend ya valida la configuración, escribe logs y tiene pruebas; todavía no extrae solicitudes ni se conecta a la base de datos o a OpenAI. El frontend muestra la página inicial.

Los diagramas de la actividad de GenAI están en [docs/diagramas.md](docs/diagramas.md).

## Requisitos

- Node.js 20
- npm
- Docker, para la base PostgreSQL local

## Backend

Desde la raíz del repositorio, en PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm test
npm run lint
npm run dev
```

Completa `backend/.env` con tus valores. El archivo está en `.gitignore`. Si falta `OPENAI_API_KEY`, `DATABASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS` o `LLM_TEMPERATURE`, el proceso se detiene e indica la variable.

El servidor escucha en el puerto `3001`, salvo que `PORT` tenga otro valor. `GET /health` responde `{"status":"ok"}`.

```powershell
$env:PORT = 4000
npm run dev
```

`npm start` arranca el mismo servidor sin recarga automática.

## Base de datos local

Desde la raíz del repositorio:

```powershell
docker compose up -d
```

Levanta PostgreSQL 16. El usuario, la contraseña y la base de ejemplo son `origentours`. Esos datos solo sirven para el contenedor local; la aplicación todavía no se conecta. `DATABASE_URL` de `.env.example` apunta a ese contenedor.

## Frontend

En otra terminal, desde la raíz del repositorio:

```powershell
cd frontend
npm install
npm run dev
```

Vite muestra la dirección local (por defecto `http://localhost:5173`). La página inicial muestra el título del revisor.

## Estructura

- `backend/`: API en Node.js 20 y Express (ES Modules), con configuración, logs y pruebas.
- `frontend/`: aplicación React creada con Vite (JavaScript).
- `docker-compose.yml`: PostgreSQL 16 local.
- `docs/`: diagramas de la actividad.
