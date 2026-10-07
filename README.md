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
- **Nube:** Supabase Auth por correo, contraseña o enlace mágico + PostgreSQL
  con RLS. Cada usuario solo puede leer y modificar sus propios datos.
- **Canvas LMS:** el servidor usa `Authorization: Bearer`; el token nunca se
  devuelve al navegador. Si el usuario decide recordarlo, se cifra con
  AES-256-GCM antes de guardarse en Supabase.

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

### API local para web, Expo Web y emuladores

La API Canvas vive en el mismo servidor Next.js. Al ejecutar `npm run dev`
queda disponible en `http://localhost:3000`; confirma su estado con:

```bash
curl http://localhost:3000/api/health
```

`GET /api/health` no expone secretos y responde si Supabase está configurado y
qué URL Canvas usa el servidor. Para consumir la API desde la app móvil crea
`apps/mobile/.env.local` con la dirección adecuada:

```dotenv
# Expo Web o simulador iOS
EXPO_PUBLIC_WEB_API_URL=http://localhost:3000
# Emulador Android (alternativa)
# EXPO_PUBLIC_WEB_API_URL=http://10.0.2.2:3000
# Teléfono físico (alternativa; usa la IP LAN de tu equipo)
# EXPO_PUBLIC_WEB_API_URL=http://192.168.1.20:3000
```

Expo Web usa CORS. En `.env.local` de Next puedes ampliar los orígenes locales
permitidos, separados por comas:

```dotenv
LOCAL_API_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

El token Canvas también puede usarse localmente sin base de datos: se envía al
Route Handler para esa sincronización y no se conserva. Solo una cuenta
Supabase autenticada puede activar el guardado cifrado del token.

## Configurar y sincronizar Supabase

La aplicación permite iniciar sesión con correo y contraseña, recibir un enlace
mágico o continuar en modo local sin nube. Las cuentas Supabase comparten el
mismo `user_id` en web y móvil y guardan el planificador en
`public.planner_states`. RLS garantiza que cada cuenta solo pueda acceder a sus
propios datos, preferencias, dispositivos y token Canvas cifrado.

### 1. Crear el proyecto

1. Entra a [Supabase](https://supabase.com/dashboard) y selecciona **New
   project**.
2. Elige la organización, un nombre, una región cercana y una contraseña segura
   para PostgreSQL.
3. Espera a que el proyecto termine de aprovisionarse. La contraseña de la base
   no se utiliza en esta aplicación y no debe agregarse al repositorio.

### 2. Configurar autenticación por correo

1. Abre el proyecto y entra a **Authentication**.
2. En **Providers > Email**, habilita correo y contraseña. Puedes mantener
   activada la confirmación de correo para producción.
3. En **URL Configuration**, define `http://localhost:3000` como Site URL para
   desarrollo y agrega como Redirect URLs:
   - `http://localhost:3000/**`
   - `https://TU-PROYECTO.vercel.app/**`
   - `academic-planner://**`
4. Los enlaces mágicos usan las mismas URL. No necesitas habilitar usuarios
   anónimos: el modo local de la aplicación funciona sin crear una identidad en
   Supabase.

### 3. Crear la tabla y las políticas RLS

Opción recomendada desde el dashboard:

1. Abre **SQL Editor > New query**.
2. Ejecuta, en orden, el contenido de
   `supabase/migrations/202609280001_planner_states.sql` y
   `supabase/migrations/202609290001_canvas_integrations.sql`,
   `supabase/migrations/202609290003_accounts_notifications.sql` y
   `supabase/migrations/202610070004_notification_content_categories.sql`.
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

3. Abre `http://localhost:3000`, crea una cuenta o inicia sesión. Para una
   prueba sin Supabase también puedes elegir **Usar solo en este dispositivo**.
4. Abre `/settings`; el estado debe cambiar de **Solo local** a
   **Sincronizado** cuando la sesión use Supabase.
5. Modifica un dato, espera aproximadamente un segundo y revisa:
   - **Authentication > Users**: debe existir el usuario con su correo.
   - **Table Editor > planner_states**: debe existir una fila con el mismo UUID
     en `user_id`, un objeto JSON en `state` y un `updated_at` reciente.
   - **Table Editor > profiles** y `notification_preferences`: debe existir una
     fila creada automáticamente para la cuenta.

Si el navegador se queda sin conexión, Zustand continúa guardando localmente.
Si la conexión se perdió después de iniciar la app, un cambio posterior vuelve a
intentar el respaldo. Si el estado queda en **Error**, recarga la página cuando
regrese la conexión.

El modo local no sube información y funciona aunque Supabase no esté
configurado. Para compartir el mismo estado entre web y móvil, inicia sesión con
el mismo correo en ambos clientes.

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

La ruta `POST /api/canvas/sync` obtiene el perfil, cursos activos, actividades,
entregas del estudiante, comentarios del docente, módulos, archivos, páginas,
foros, anuncios, eventos del Planner y conversaciones. Consulta cuestionarios
clásicos y New Quizzes cuando Canvas los expone y sigue el encabezado `Link`
para paginación. Los endpoints secundarios son tolerantes a permisos parciales:
si una materia oculta, por ejemplo, la pestaña Archivos, el resto de la
sincronización continúa. En la primera sincronización reemplaza los datos demo;
en las siguientes actualiza solo los elementos cuyo origen es Canvas y conserva
lo creado manualmente.

El dashboard usa `GET /api/v1/planner/items` como fuente principal de su
**Tablero** y completa la información con los endpoints de anuncios, páginas,
foros, archivos y módulos. La vista se puede filtrar por hoy, siete o treinta
días y evita duplicar una misma actividad aunque Canvas la devuelva también
como tarea o evaluación. La aplicación móvil reutiliza el mismo contrato y
muestra una lista vertical para evitar superposiciones.

Todo contenido Canvas se presenta en modo **solo lectura**. Academic Planner no
ofrece acciones para cambiar notas, instrucciones, fechas, entregas o materiales
del docente. Los enlaces “Abrir en Aula Virtual” llevan al flujo oficial de
Canvas cuando el estudiante necesita responder o entregar una actividad.

La sincronización consulta también los grupos de tareas de cada curso. Cuando
Canvas usa ponderaciones por categoría, combina `group_weight`, los puntos
posibles del grupo y los puntos de cada actividad para obtener su peso efectivo.
En cursos sin categorías ponderadas, el peso se calcula sobre el total de puntos
posibles. La pestaña **Calificaciones** muestra además las categorías originales
configuradas por el docente. Si una categoría usa reglas dinámicas para descartar
la nota más alta o más baja, se muestra el peso base anterior a ese descarte.

Cuando Canvas publica componentes teórico y práctico por separado, el
normalizador los agrupa por periodo y código académico. La interfaz muestra una
sola materia con bloques independientes de **Teoría** y **Práctica**, pero
conserva los docentes, enlaces, tareas y calificaciones de ambos componentes.
Si Canvas asigna identificadores de periodo diferentes a ambos paralelos, se
consolidan usando el nombre académico normalizado del semestre.
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

Antes del primer despliegue, agrega estas variables en la sección
**Environment Variables** de la pantalla de importación. Si el proyecto ya fue
creado, están en **Project > Settings > Environment Variables**.

| Variable | Valor | Exposición |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase | Pública, incluida en el build |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key de Supabase | Pública; RLS limita el acceso |
| `NEXT_PUBLIC_APP_URL` | URL final, por ejemplo `https://app.example.com` | Pública; enlaces y redirecciones |
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
   - apareció la cuenta en **Authentication > Users**;
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
| El enlace mágico vuelve al dominio equivocado | Revisa **Authentication > URL Configuration** y agrega la URL exacta de Vercel. |
| Error de tabla o permisos | Ejecuta las cuatro migraciones en orden y confirma que RLS esté activo. |
| HTTP 401 al sincronizar | Canvas rechazó el token personal o la sesión Supabase expiró. Genera otro token e inténtalo de nuevo. |
| No guarda el token | Ejecuta la segunda migración y configura `SUPABASE_SECRET_KEY` y `CANVAS_TOKEN_ENCRYPTION_KEY`. |
| Token guardado no se puede descifrar | Restaura la clave de cifrado original o elimina la integración y registra un token nuevo. |
| Canvas no devuelve materias | Confirma que existan cursos activos para la cuenta y que el token pertenezca al estudiante correcto. |
| Funciona localmente pero no en producción | Comprueba que las variables estén asignadas al entorno **Production**, no solo a Development o Preview. |

Referencias oficiales: [autenticación por contraseña de
Supabase](https://supabase.com/docs/guides/auth/passwords), [claves de API
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

> **Identidad entre dispositivos:** inicia sesión con la misma cuenta Supabase
> en web y móvil para reutilizar el mismo `user_id`, estado académico y token
> Canvas cifrado. El modo local mantiene una identidad independiente por
> dispositivo y nunca sube los datos.

### Notificaciones

La web incluye un centro de notificaciones, bandeja de anuncios/mensajes Canvas,
preferencias por categoría, horas de silencio y avisos del navegador mediante
Service Worker. Las categorías incluyen anuncios, mensajes, foros, contenido
publicado, notas, entregas y clases. El botón **Probar notificación** permite
comprobar el permiso y la integración con el sistema operativo.

El móvil usa `expo-notifications`, programa recordatorios locales de entregas
con 24 y 2 horas de anticipación y muestra avisos del sistema al detectar
anuncios, mensajes, actividad de foros, páginas, archivos o módulos nuevos.
También incluye una prueba manual desde **Más > Comunicación**. Los
identificadores ya notificados se guardan localmente para evitar repetir avisos.

La migración `202609290003_accounts_notifications.sql` deja preparadas las
tablas `notification_devices`, `notification_events` y
`notification_deliveries` para añadir envío remoto desde un proceso servidor
sin cambiar el modelo de datos. Para probar los avisos móviles se necesita una
compilación de desarrollo o EAS; Expo Go puede limitar notificaciones remotas
según la versión del SDK. Las notificaciones locales sí usan los permisos del
dispositivo.

En web, el permiso solo puede solicitarse desde un origen seguro (`https`) o
`localhost`. Si el usuario lo bloquea, debe rehabilitarlo desde los permisos del
sitio del navegador.

### Recuperación de errores

Next.js incluye límites de error globales y por ruta, además de una página 404.
Expo incluye su propio `ErrorBoundary`. Ambas interfaces ofrecen reintentar sin
borrar el estado local. Los errores de Canvas devuelven mensajes explícitos para
token inválido, configuración incompleta o indisponibilidad del servicio.

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
