# Academic Planner

Planificador académico todo en uno: materias, horarios, asistencia, tareas,
evaluaciones, calificaciones, materiales y workspace por materia. La UI está
en español y los datos se guardan localmente en el navegador.

- Web: Next.js 16, React 19, Tailwind CSS v4, zustand, date-fns, lucide-react.
- API (respaldo futuro): FastAPI + SQLAlchemy 2 + PostgreSQL.
- Integración Notion: v1 usa un campo de URL por materia (sin API real).

## Requisitos

- Node.js >= 20 (se probó con Node 20/22 y npm 11)
- Python >= 3.12 (opcional, solo para la API)
- Docker + Docker Compose (opcional, para el modo completo)

## Scripts

```bash
npm install          # instala dependencias
npm run dev          # servidor de desarrollo en http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # build de producción
npm start            # sirve el build de producción
```

## Estructura

```
src/
  app/           # páginas (materias, calendario, asistencia, tareas, ...)
  components/    # UI compartida (nav, diálogos, filas, tarjetas)
  hooks/         # useSemesterData (selectores del semestre activo)
  lib/           # store zustand, seed, selectores, importadores, navegación
  types/         # tipos del dominio
  styles/
backend/         # API FastAPI (salud, semestres, snapshots de respaldo)
```

## Datos y almacenamiento

Los datos se guardan en `localStorage` bajo la clave `academic-planner-store`
(store zustand con persist). Al abrir la app por primera vez se genera un
semestre demo con datos de ejemplo relativos a la fecha actual; puedes
borrarlos desde Configuración.

El idioma de la interfaz es español y los iconos son SVG (lucide-react).

## Configuración

- Tema claro / oscuro: conmutador en `src/app/settings/page.tsx`; aplica la
  clase `dark` en `<html>`.
- Rutas del menú: `src/lib/nav.ts` (sidebar en escritorio, bottom nav en móvil).

## Importación de datos

Desde Configuración -> Importar puedes cargar:

- Respaldos JSON de la propia app (estructura `data.json` exportable).
- Archivos ICS generados por Google Calendar/Notion (eventos recurrentes
  semanales con RRULE WKST=SU; se detectan los días de clase y se crean los
  horarios de las materias).
- CSV de tareas (`title,due_date,due_time,course,pdf|html`).

Los importadores viven en `src/lib/importers.ts`.

## API (v1) y Docker

La API expone hasta ahora: `GET /api/health`, CRUD base de semestres y
respaldos (`POST /api/data/snapshot`, `GET /api/data/snapshots/latest`).
La sincronización completa de materias/tareas/asistencia llega en una
versión futura.

Para levantar frontend + API + PostgreSQL:

```bash
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000 (docs en /docs)

Para correr la API localmente sin Docker:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
AP_DATABASE_URL=sqlite:///./api.db uvicorn app.main:app --reload
```

## Migraciones (Alembic)

En desarrollo las tablas se crean automáticamente al arrancar la API. En
producción usa Alembic:

```bash
cd backend
alembic revision --autogenerate -m "inicial"
alembic upgrade head
```