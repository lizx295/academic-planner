# Academic Planner

Centro academico personal en espanol para materias, calendario, tareas,
evaluaciones, notas, asistencia y materiales. Se integra con Canvas LMS (Aula
Virtual ESPOL), guarda un respaldo privado en Supabase y se despliega como una
sola aplicacion Next.js en Vercel.

## Arquitectura

- **Web y API:** Next.js 16, React 19 y Route Handlers server-side.
- **Estado local:** Zustand con `localStorage`, disponible aun sin conexion.
- **Nube:** Supabase Auth anonimo + PostgreSQL con RLS. Cada usuario solo puede
  leer y modificar su propia fila en `planner_states`.
- **Canvas LMS:** el servidor usa `Authorization: Bearer`; el token nunca se
  expone al navegador ni se guarda en Supabase. Una clave independiente
  protege el endpoint de sincronizacion del despliegue publico.

El backend FastAPI de `backend/` se conserva como referencia historica, pero ya
no es necesario para el despliegue principal en Vercel.

## Desarrollo local

Requiere Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Comprobaciones disponibles:

```bash
npm run typecheck
npm run lint
npm run build
```

Sin variables de Supabase la aplicacion sigue funcionando solo con
`localStorage`. Sin `CANVAS_ACCESS_TOKEN`, la interfaz funciona normalmente y
la sincronizacion de Canvas muestra un aviso de configuracion.

## Configurar Supabase

1. Crea un proyecto en Supabase.
2. En **Authentication > Providers > Anonymous**, habilita usuarios anonimos.
3. Ejecuta en el SQL Editor el archivo
   `supabase/migrations/202609280001_planner_states.sql`.
4. Copia la URL y la clave anon/publishable a `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

La migracion activa RLS y crea politicas para `select`, `insert`, `update` y
`delete` basadas en `auth.uid()`. No hace falta exponer una service-role key.

## Configurar Canvas ESPOL

1. Revoca cualquier token que haya sido compartido por chat, URL, captura o
   historial, y genera uno nuevo en la configuracion de Canvas.
2. Guarda el token nuevo como `CANVAS_ACCESS_TOKEN` solo en `.env.local` y en
   las variables privadas de Vercel.
3. Genera otra clave larga y aleatoria para `CANVAS_SYNC_SECRET`. Esta clave no
   es el token de Canvas: solo autoriza el boton de sincronizacion.
4. Mantiene `CANVAS_BASE_URL=https://aulavirtual.espol.edu.ec`.
5. Abre **Configuracion > Canvas ESPOL y nube**, escribe la clave de
   sincronizacion y pulsa **Sincronizar ahora**.

La ruta `POST /api/canvas/sync` obtiene el perfil, los cursos activos y sus
actividades. Sigue el encabezado `Link` de Canvas para paginacion, trae las
entregas del estudiante y transforma las notas a la escala 0-100 usada por el
planificador. En la primera sincronizacion reemplaza los datos demo; en las
siguientes actualiza solo los elementos cuyo origen es Canvas y conserva lo
creado manualmente.

## Desplegar en Vercel

1. Importa el repositorio en Vercel (Framework Preset: **Next.js**).
2. Agrega las cinco variables de `.env.example` en **Project Settings >
   Environment Variables**. Usa el token nuevo, nunca uno expuesto.
3. Despliega. No se necesita Docker, un servidor Python ni una base PostgreSQL
   separada.

Para probar un build de produccion antes de subir cambios ejecuta `npm run
build`.

## Importacion y respaldo manual

Desde Configuracion tambien se pueden importar archivos ICS, CSV de tareas y
respaldos JSON, o exportar el estado completo. El respaldo local permanece
activo incluso cuando Supabase esta configurado.
