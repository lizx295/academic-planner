# Academic Planner

Centro academico personal en espanol para materias, calendario, tareas,
evaluaciones, notas, asistencia y materiales. Se integra con Canvas LMS (Aula
Virtual ESPOL), guarda un respaldo privado en Supabase y ofrece dos clientes:
la aplicacion web desplegable en Vercel y una aplicacion movil Expo/React Native.

## Arquitectura

- **Web y API:** Next.js 16, React 19 y Route Handlers server-side.
- **Movil:** Expo SDK 57, React Native 0.86 y Expo Router para Android, iOS y
  una vista web de desarrollo.
- **Nucleo compartido:** `packages/core` contiene tipos, colores y reglas de
  combinacion de datos. Web y movil consumen el mismo paquete para evitar que
  las reglas de negocio diverjan.
- **Estado local:** Zustand con `localStorage`, disponible aun sin conexion.
- **Nube:** Supabase Auth anonimo + PostgreSQL con RLS. Cada usuario solo puede
  leer y modificar su propia fila en `planner_states`.
- **Canvas LMS:** el servidor usa `Authorization: Bearer`; el token nunca se
  expone al navegador ni se guarda en Supabase. Una clave independiente
  protege el endpoint de sincronizacion del despliegue publico.

El backend FastAPI de `backend/` se conserva como referencia historica, pero ya
no es necesario para el despliegue principal en Vercel.

```text
academic-planner/
├── src/                 # aplicacion web Next.js y API segura
├── apps/mobile/         # aplicacion Expo / React Native
├── packages/core/       # dominio y tema compartidos
├── supabase/            # migraciones PostgreSQL y RLS
└── backend/             # referencia historica
```

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
npm run typecheck:mobile
```

Sin variables de Supabase la aplicacion sigue funcionando solo con
`localStorage`. El usuario puede sincronizar una vez con su token personal; el
guardado cifrado para futuras sincronizaciones requiere configurar Supabase.

## Configurar y sincronizar Supabase

La aplicación usa una sesión anónima de Supabase Auth y guarda el estado del
planificador en una fila de `public.planner_states`. La migración habilita RLS,
por lo que cada sesión solo puede acceder a la fila cuyo `user_id` coincide con
`auth.uid()`.

### 1. Crear el proyecto

1. Entra a [Supabase](https://supabase.com/dashboard) y selecciona **New
   project**.
2. Elige la organización, un nombre, una región cercana y una contraseña segura
   para PostgreSQL.
3. Espera a que el proyecto termine de aprovisionarse. La contraseña de la base
   no se utiliza en esta aplicación y no debe agregarse al repositorio.

### 2. Habilitar usuarios anónimos

1. Abre el proyecto y entra a **Authentication**.
2. Busca la configuración de proveedores o de inicio de sesión.
3. Activa **Allow anonymous sign-ins** y guarda los cambios.

Los usuarios anónimos reciben el rol PostgreSQL `authenticated`, que es el rol
usado por las políticas de la migración. No es lo mismo que la API key pública
`anon` o `publishable`.

### 3. Crear la tabla y las políticas RLS

Opción recomendada desde el dashboard:

1. Abre **SQL Editor > New query**.
2. Ejecuta, en orden, el contenido de
   `supabase/migrations/202609280001_planner_states.sql` y
   `supabase/migrations/202609290001_canvas_integrations.sql`.
3. Comprueba en **Table Editor** que existan `planner_states` y
   `canvas_integrations`.

Para verificar RLS y sus políticas desde SQL Editor puedes ejecutar:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'planner_states';

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'planner_states'
order by policyname;
```

El primer resultado debe mostrar `rowsecurity = true` y el segundo debe listar
las políticas de lectura, creación, actualización y eliminación.

Si ya utilizas Supabase CLI, la alternativa equivalente es enlazar el proyecto
y aplicar las migraciones del repositorio:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

### 4. Obtener las credenciales públicas

1. Abre el diálogo **Connect** del proyecto, o entra a **Settings > API Keys**.
2. Copia **Project URL**.
3. Copia la **Publishable key** (`sb_publishable_...`). Una clave `anon` heredada
   también funciona, pero para proyectos nuevos se recomienda la publicable.
4. No copies una `secret`, `service_role` ni una contraseña de PostgreSQL. Esas
   credenciales omiten RLS y nunca deben llegar al navegador.

Asigna los valores así:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_REEMPLAZAR
```

Aunque la segunda variable conserva el nombre `ANON_KEY` por compatibilidad,
acepta la clave publicable actual de Supabase.

Para el backend crea o copia además una **Secret key** (`sb_secret_...`) desde
**Settings > API Keys**. Se configura como `SUPABASE_SECRET_KEY` únicamente en
`.env.local` y Vercel; nunca debe usarse en una variable `NEXT_PUBLIC_*`, Expo
ni código cliente. La clave heredada `service_role` también es compatible, pero
para proyectos nuevos se recomienda una Secret key independiente.

### 5. Probar Supabase localmente

1. Crea `.env.local` desde la plantilla y completa las credenciales:

   ```bash
   cp .env.example .env.local
   ```

2. Inicia la aplicación:

   ```bash
   npm install
   npm run dev
   ```

3. Abre `http://localhost:3000/settings`.
4. En **Canvas ESPOL y nube**, el estado debe cambiar de **Solo local** a
   **Sincronizado**.
5. Modifica un dato, espera aproximadamente un segundo y revisa:
   - **Authentication > Users**: debe existir un usuario anónimo.
   - **Table Editor > planner_states**: debe existir una fila con el mismo UUID
     en `user_id`, un objeto JSON en `state` y un `updated_at` reciente.

Si el navegador se queda sin conexión, Zustand continúa guardando localmente.
Si la conexión se perdió después de iniciar la app, un cambio posterior vuelve a
intentar el respaldo. Si el estado queda en **Error**, recarga la página cuando
regrese la conexión.

> **Limitación actual:** una cuenta anónima permanece ligada a la sesión del
> navegador. Si se cierra la sesión, se borran sus datos o se abre la app en otro
> dispositivo, no existe todavía un correo o contraseña para recuperar ese mismo
> UUID. Para sincronización real entre dispositivos habría que añadir acceso por
> correo, OAuth o enlazar la identidad anónima a una cuenta permanente.

## Configurar Canvas ESPOL

1. Revoca cualquier token que haya sido compartido por chat, URL, captura o
   historial, y genera uno nuevo en la configuracion de Canvas.
2. Mantén `CANVAS_BASE_URL=https://aulavirtual.espol.edu.ec` en el servidor.
3. Abre **Configuracion > Canvas ESPOL y nube**, escribe el token personal de
   Canvas y pulsa **Sincronizar ahora**.
4. Si Supabase está conectado, deja marcada la opción de guardado cifrado. El
   token se valida primero y solo entonces se cifra con AES-256-GCM.

En desarrollo local debes crear `.env.local` (no basta con editar
`.env.example`) y reiniciar `npm run dev` después de cambiar cualquier variable.
Cada usuario introduce su propio token; no existe un token global compartido.
El token viaja por HTTPS al Route Handler, nunca se guarda en `localStorage` y
nunca vuelve a enviarse al navegador después de almacenarlo.

La ruta `POST /api/canvas/sync` obtiene el perfil, los cursos activos y sus
actividades. Sigue el encabezado `Link` de Canvas para paginacion, trae las
entregas del estudiante y transforma las notas a la escala 0-100 usada por el
planificador. En la primera sincronizacion reemplaza los datos demo; en las
siguientes actualiza solo los elementos cuyo origen es Canvas y conserva lo
creado manualmente.

Cuando Canvas publica componentes teórico y práctico por separado, el
normalizador los agrupa por periodo y código académico. La interfaz muestra una
sola materia con bloques independientes de **Teoría** y **Práctica**, pero
conserva los docentes, enlaces, tareas y calificaciones de ambos componentes.
Los datos guardados por versiones anteriores se migran automáticamente al
recargar la aplicación; una nueva sincronización con Canvas actualiza después
los metadatos de ambas secciones.

## Conectar Supabase con Vercel y desplegar

### 1. Preparar el repositorio

1. Confirma que `.env.local` no esté versionado. El patrón `.env*` de
   `.gitignore` protege estos archivos; solo `.env.example` debe aparecer en
   Git.
2. Valida el proyecto antes de publicarlo:

   ```bash
   npm run typecheck
   npm run build
   ```

3. Sube la rama que deseas desplegar a GitHub, GitLab o Bitbucket. Vercel no
   puede importar commits que solo existen en el equipo local.

### 2. Importar el proyecto en Vercel

1. Entra a [Vercel](https://vercel.com/new) y pulsa **Add New > Project**.
2. Conecta el proveedor Git y selecciona este repositorio.
3. En la pantalla de importación verifica:
   - **Framework Preset:** Next.js.
   - **Root Directory:** la raíz de `academic-planner`, donde están
     `package.json` y `next.config.ts`.
   - **Build Command:** `next build` o el valor automático.
   - **Install Command:** `npm install` o el valor automático.
4. No configures Docker ni el directorio `backend/`: la aplicación desplegada
   usa los Route Handlers de Next.js.

### 3. Configurar las variables de entorno

Antes del primer despliegue, agrega estas cinco variables en la sección
**Environment Variables** de la pantalla de importación. Si el proyecto ya fue
creado, están en **Project > Settings > Environment Variables**.

| Variable | Valor | Exposición |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase | Pública, incluida en el build |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key de Supabase | Pública; RLS limita el acceso |
| `SUPABASE_SECRET_KEY` | Clave secreta `sb_secret_...` del proyecto | Privada, solo servidor |
| `CANVAS_BASE_URL` | `https://aulavirtual.espol.edu.ec` | Privada del servidor |
| `CANVAS_TOKEN_ENCRYPTION_KEY` | Clave aleatoria base64 de 32 bytes | Privada, solo servidor |

Genera `CANVAS_TOKEN_ENCRYPTION_KEY` una sola vez con:

```bash
openssl rand -base64 32
```

Recomendaciones al guardar las variables:

- Selecciona **Production**, **Preview** y **Development** si quieres que la
  rama principal, los previews y `vercel dev` tengan la misma integración.
- Marca `SUPABASE_SECRET_KEY` y `CANVAS_TOKEN_ENCRYPTION_KEY` como
  sensibles cuando la interfaz de Vercel ofrezca esa opción.
- Nunca agregues el prefijo `NEXT_PUBLIC_` a estas dos variables privadas.
- Conserva la clave de cifrado: cambiarla sin migrar los datos impedirá descifrar
  los tokens ya guardados.
- Las variables públicas de Supabase se incorporan durante el build. Si las
  cambias, debes crear un despliegue nuevo; un deployment anterior no se
  actualiza automáticamente.

### 4. Desplegar y verificar

1. Pulsa **Deploy** y espera a que terminen la instalación, el typecheck y el
   build de Next.js.
2. Abre la URL generada y visita `/settings`.
3. Verifica que **Respaldo Supabase** muestre **Sincronizado**. Si muestra **Solo
   local**, comprueba las dos variables `NEXT_PUBLIC_SUPABASE_*` y vuelve a
   desplegar.
4. Escribe un token personal válido de Canvas y pulsa **Sincronizar ahora**.
5. La interfaz debe informar cuántas materias, tareas y notas fueron
   actualizadas.
6. Regresa al dashboard de Supabase y comprueba que:
   - apareció un usuario en **Authentication > Users**;
   - `planner_states.updated_at` cambió;
   - existe una fila por usuario en `canvas_integrations`, sin token en texto plano;
   - el JSON `state` contiene cursos cuyo `source` es `canvas`.

Después de modificar una variable en Vercel, abre **Deployments**, selecciona el
último despliegue y usa **Redeploy**, o empuja un nuevo commit. Las variables
nuevas solo se aplican a despliegues creados después del cambio.

### 5. Probar las variables de Vercel localmente (opcional)

Con Vercel CLI puedes enlazar el directorio y descargar únicamente las variables
del entorno Development:

```bash
npx vercel link
npx vercel env pull .env.local
npm run dev
```

`.env.local` permanece ignorado por Git. Repite `vercel env pull .env.local` si
actualizas valores en el dashboard.

### Problemas frecuentes

| Síntoma | Revisión recomendada |
| --- | --- |
| **Solo local** en Configuración | Faltan las variables públicas de Supabase en el build; agrégalas y redespliega. |
| `Anonymous sign-ins are disabled` | Habilita **Allow anonymous sign-ins** en Supabase Auth. |
| Error de tabla o permisos | Ejecuta la migración y confirma que RLS y las cuatro políticas estén activas. |
| HTTP 401 al sincronizar | Canvas rechazó el token personal o la sesión Supabase expiró. Genera otro token e inténtalo de nuevo. |
| No guarda el token | Ejecuta la segunda migración y configura `SUPABASE_SECRET_KEY` y `CANVAS_TOKEN_ENCRYPTION_KEY`. |
| Token guardado no se puede descifrar | Restaura la clave de cifrado original o elimina la integración y registra un token nuevo. |
| Canvas no devuelve materias | Confirma que existan cursos activos para la cuenta y que el token pertenezca al estudiante correcto. |
| Funciona localmente pero no en producción | Comprueba que las variables estén asignadas al entorno **Production**, no solo a Development o Preview. |

Referencias oficiales: [usuarios anónimos de
Supabase](https://supabase.com/docs/guides/auth/auth-anonymous), [claves de API
de Supabase](https://supabase.com/docs/guides/getting-started/api-keys),
[variables de entorno de Vercel](https://vercel.com/docs/environment-variables)
y [despliegues Git en Vercel](https://vercel.com/docs/git).

## Importacion y respaldo manual

Desde Configuracion tambien se pueden importar archivos ICS, CSV de tareas y
respaldos JSON, o exportar el estado completo. El respaldo local permanece
activo incluso cuando Supabase esta configurado.

## Aplicacion movil con React Native

La app de `apps/mobile` conserva el lenguaje visual actual: las mismas paletas
clara y oscura, tarjetas redondeadas, acento violeta, estados de tareas y cinco
secciones principales. No reemplaza la web ni cambia el despliegue de Vercel;
es un segundo cliente del mismo sistema.

### Preparar el entorno movil

1. Instala todas las dependencias desde la raiz del repositorio. Los workspaces
   de npm enlazan automaticamente `apps/mobile` con `packages/core`:

   ```bash
   npm install
   ```

2. Crea el archivo local de la app movil:

   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```

3. Completa las variables publicas:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_REEMPLAZAR
   EXPO_PUBLIC_WEB_API_URL=https://TU-PROYECTO.vercel.app
   ```

   Las dos primeras deben apuntar al mismo proyecto Supabase que usa la web.
   La tercera apunta al despliegue Vercel que contiene `/api/canvas/sync`. En un
   telefono fisico no uses `localhost`: usa la URL de Vercel o una URL HTTPS
   accesible desde el dispositivo.

4. Inicia Expo:

   ```bash
   npm run mobile
   ```

   Escanea el QR con Expo Go o usa los accesos directos:

   ```bash
   npm run mobile:android
   npm run mobile:ios
   npm run mobile:web
   ```

5. Antes de crear una compilacion valida ambos clientes:

   ```bash
   npm run typecheck
   npm run typecheck:mobile
   npm run build
   npm run export --workspace @academic-planner/mobile -- --platform web
   ```

### Relacion entre movil, Vercel, Canvas y Supabase

```text
Web Next.js ───────────────┐
                          ├── Supabase Auth + planner_states
App Expo / React Native ──┘
          │
          └── API en Vercel ── Canvas LMS
                    │
                    └── canvas_integrations (token cifrado AES-256-GCM)
```

En **Mas > Aula Virtual ESPOL**, cada usuario introduce su token personal. La
app lo envia por HTTPS al Route Handler de Vercel, recibe datos normalizados y
los combina mediante las mismas reglas que usa la web. Si existe una sesión de
Supabase, Vercel cifra el token y permite reutilizarlo; nunca se guarda en
AsyncStorage ni se incluye en el bundle.

Las variables con prefijo `EXPO_PUBLIC_` se incorporan al bundle y, por tanto,
no son secretos. Solo deben contener la URL y la clave publicable de Supabase,
ademas de la URL publica de Vercel. La clave de cifrado y `SUPABASE_SECRET_KEY`
permanecen exclusivamente en Vercel.

> **Identidad entre dispositivos:** web y movil usan actualmente sesiones
> anonimas independientes. Aunque apunten a la misma base, cada instalacion
> obtiene su propio `user_id` y su propia fila. Para que una misma persona vea
> exactamente el mismo estado en ambos clientes, el siguiente paso es habilitar
> acceso recuperable por correo u OAuth en Supabase y usar esa misma cuenta en
> web y movil. La estructura compartida ya esta preparada para ese cambio.

### Compilar Android e iOS con EAS

Desde `apps/mobile`, autentica y configura el proyecto una sola vez:

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build:configure
```

Configura las tres variables `EXPO_PUBLIC_*` en los entornos de EAS y crea las
compilaciones con:

```bash
npx eas-cli build --platform android
npx eas-cli build --platform ios
```

La compilacion iOS requiere una cuenta Apple Developer para distribuirse; la
de Android puede generar primero una version interna para pruebas. Consulta la
[guia oficial de monorepos de Expo](https://docs.expo.dev/guides/monorepos/) y
la [documentacion de EAS Build](https://docs.expo.dev/build/introduction/) para
registrar los identificadores y credenciales definitivos.
