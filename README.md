# Academic Planner · ESPOL

Planificador académico en forma de PWA: materias, horarios, asistencia, tareas,
evaluaciones, notas, calendario y materiales por materia. Sincroniza laptop y
teléfono casi en tiempo real y se conecta con el **Aula Virtual ESPOL** (Moodle)
usando las credenciales de cada estudiante.

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Zustand,
  date-fns, lucide-react, Tesseract.js.
- **Backend:** route handlers de Next.js (Node runtime), PostgreSQL con
  `postgres.js`, sesiones JWT httpOnly, contraseñas con bcrypt, credenciales de
  integraciones cifradas con AES-256-GCM.
- **PWA:** manifest, service worker, instalación en iOS/Android y Web Push
  (VAPID).
- **Diseño:** paleta pastel rosa/menta y superficies tipo “liquid glass”.

La app está pensada para ejecutarse en la nube (Vercel + PostgreSQL administrado),
así sigue disponible aunque tu computadora esté apagada.

---

## 1. Cuentas de prueba

Se crean automáticamente en el primer arranque:

| Rol | Correo | Contraseña | Notas |
| --- | --- | --- | --- |
| Administrador | `admin@espol.edu.ec` | `AdminEspol2026!` | Panel `/admin` |
| Estudiante demo | `demo@espol.edu.ec` | `Demo-2026` | Contraseña temporal: la app pide cambiarla al entrar |

Puedes cambiar estos valores con `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`DEMO_EMAIL`, `DEMO_PASSWORD` o desactivar la demo con `SEED_DEMO=false`.

> Solo se permiten correos del dominio configurado en
> `ALLOWED_EMAIL_DOMAINS` (por defecto `espol.edu.ec`). El administrador crea
> cuentas nuevas desde `/admin` y entrega una contraseña temporal. Esa
> contraseña deja de ser visible para el administrador en cuanto el estudiante
> crea la suya.

---

## 2. Desarrollo local

Necesitas Node.js 20+ y un PostgreSQL accesible.

```bash
npm install
cp .env.example .env.local   # ajusta DATABASE_URL y las claves
npm run dev                  # http://localhost:3000
```

Puedes usar un PostgreSQL local (Homebrew, Postgres.app) o directamente la base
de datos administrada que usarás en producción:

```bash
createdb academic_planner
# DATABASE_URL=postgres://usuario:clave@localhost:5432/academic_planner
```

El esquema de la base de datos se crea solo (`ensureSchema`) en el primer
request a una ruta de API. No hay migraciones manuales.

Scripts útiles:

```bash
npm run dev          # desarrollo en http://localhost:3000
npm run typecheck    # TypeScript sin emitir
npm run lint         # ESLint
npm run build        # build de producción
npm start            # sirve el build
npm run preview      # build + servidor de producción en un solo paso
node scripts/generate-icons.mjs  # regenera los íconos PWA
```

> Para el uso diario en tu computadora, corre la app en modo producción
> (`npm run preview` o `npm run build && npm start`). `npm run dev` recompila
> rutas bajo demanda y desactiva la precarga de enlaces, así que se siente más
> lento.

---

## 3. Variables de entorno

Copia `.env.example` a `.env.local` (o configúralas en Vercel). Las claves
obligatorias en producción:

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Cadena de PostgreSQL / Supabase / Neon |
| `AUTH_SECRET` | Firma de las sesiones JWT (`openssl rand -base64 48`) |
| `APP_ENCRYPTION_KEY` | Cifra credenciales del Aula Virtual y contraseñas temporales |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push (`npx web-push generate-vapid-keys`) |
| `ALLOWED_EMAIL_DOMAINS` | Dominios institucionales permitidos (coma-separados) |
| `CRON_SECRET` | Protege `/api/cron/reminders` |

Opcionales: `ADMIN_*`, `DEMO_*`, `SEED_DEMO`, `AULAVIRTUAL_BASE_URL`,
`OPENAI_API_KEY` (visión para escanear calendarios), `DATABASE_SSL`,
`DATABASE_POOL_MAX`, `NEXT_PUBLIC_APP_URL`.

Si faltan `VAPID_*`, el servidor genera claves efímeras para desarrollo (las
suscripciones caducan al reiniciar). En producción configúralas siempre.

---

## 4. Despliegue en la nube (Vercel + Supabase)

Con esto la app queda encendida 24/7 sin depender de tu computadora.

1. Crea un proyecto en [Supabase](https://supabase.com) (plan gratuito) o
   [Neon](https://neon.tech).
2. Copia la cadena de conexión **Connection pooling / Transaction** y úsala
   como `DATABASE_URL`. Con Supabase normalmente funciona
   `DATABASE_SSL=no-verify`.
3. Sube el repositorio a GitHub e impórtalo en [Vercel](https://vercel.com).
4. Define las variables de entorno del punto 3 en Vercel.
5. Despliega. `vercel.json` programa un cron diario de recordatorios
   (`/api/cron/reminders`) como respaldo. En el plan **Hobby** Vercel solo
   permite cron una vez al día; para recordatorios cada 15 minutos el repo
   incluye `.github/workflows/reminders.yml`. Actívalo en GitHub:
   *Settings → Secrets and variables → Actions* y crea:
   - `APP_URL` = `https://tu-app.vercel.app`
   - `CRON_SECRET` = el mismo valor configurado en Vercel
6. Abre la URL en el teléfono y usa **Añadir a pantalla de inicio** (iOS) o
   **Instalar aplicación** (Android).

> El esquema se crea automáticamente en el primer arranque. Para producción usa
> claves largas y distintas a las de desarrollo.

También puedes desplegar desde la terminal con `npx vercel` (te pedirá iniciar
sesión) y cargar las variables con `npx vercel env add`.

---

## 5. Sincronización entre dispositivos

- **Código + QR:** en la laptop abre `/connect` → *Generar código y QR*.
  En el teléfono escanea el QR o entra a `/pair` y escribe el código de 6
  caracteres. El código dura 10 minutos y se usa una sola vez.
- **Sesiones:** cada dispositivo es una sesión revocable desde `/connect`.
- **Casi tiempo real:** los cambios se guardan al instante en el dispositivo y
  se suben a la nube con un debounce; los demás dispositivos consultan una
  versión ligera cada 15 segundos y solo descargan el documento si cambió. Ante
  ediciones simultáneas, el servidor fusiona por `id` con control de versión
  optimista.
- **Push:** activa las notificaciones en `/settings` → *Notificaciones*.

---

## 6. iOS Shortcuts (Centro de Control) y Android

### iPhone / iPad

1. Instala la PWA y activa las notificaciones (iOS 16.4+).
2. En `/shortcuts` crea un **token de API**.
3. En la app **Atajos**, crea un atajo “Captura rápida” con la acción
   *Obtener contenido de URL*:
   - `POST https://TU-APP.vercel.app/api/v1/capture`
   - Cabecera `Authorization: Bearer TU_TOKEN`
   - Cuerpo JSON, por ejemplo:
     ```json
     {
       "type": "task",
       "title": "Entregar informe",
       "body": "Subir al Aula Virtual",
       "course": "Redes",
       "dueDate": "2026-11-12",
       "dueTime": "23:59",
       "priority": "high"
     }
     ```
4. En iOS 18: mantén presionado el Centro de Control → *Añadir control* →
   *Atajos* → tu atajo. También puedes usar Siri o el botón de acción.
5. Para el resumen del día usa `GET /api/v1/today` con el mismo token.

Tipos de captura: `note`, `lesson`, `reminder`, `task`, `exam`, `project`.

### Android (sin Shortcuts)

Usa **MacroDroid** (más simple) o **Tasker**:

1. Crea una macro con disparador *botón de volumen*, *widget* u *hora*.
2. Acción *Solicitud HTTP* → `POST /api/v1/capture` con cabecera
   `Authorization: Bearer TU_TOKEN` y cuerpo JSON.
3. Añade un widget de MacroDroid en la pantalla de inicio para capturar en un
   toque.
4. Para consultar el día: `GET /api/v1/today`.

La PWA instalada desde Chrome también recibe Web Push en Android.

---

## 7. Aula Virtual ESPOL

1. En `/integrations` escribe tu usuario y contraseña del
   <https://aulavirtual.espol.edu.ec/>.
2. Se usan los servicios web oficiales de Moodle (`/login/token.php` con
   `service=moodle_mobile_app` + REST).
3. *Sincronizar ahora* importa cursos, tareas/actividades, evaluaciones y
   anuncios como tareas, evaluaciones y notificaciones.
4. Las credenciales se guardan cifradas y puedes desconectar cuando quieras.
   Si la universidad deshabilita los servicios web, la app muestra el error
   exacto que devuelve Moodle.

---

## 8. Escanear un calendario

En `/scan` sube o toma una foto de tu horario, calendario de evaluaciones o
syllabus:

- Si `OPENAI_API_KEY` está configurada, se usa visión por IA.
- Si no, el OCR corre en el navegador con Tesseract.js (sin enviar la imagen a
  ningún servidor).
- Revisa lo detectado y pulsa *Agregar a mi calendario*: crea materias,
  bloques de horario y eventos.

También puedes marcar feriados, suspensiones y períodos de exámenes desde
`/calendar` → *Días especiales*. Esos días no generan clases en el calendario.

---

## 9. Asistencia y faltas

- La app genera sesiones a partir de tus horarios y te pide confirmar
  asistencia.
- En `/attendance` puedes responder a las clases pendientes, corregir el
  historial y usar **Registrar falta** para marcar una ausencia o justificación
  en una fecha y bloque concretos.
- Las materias por debajo del 85 % de asistencia se resaltan.

---

## 10. Estructura del proyecto

```
src/
  app/            # páginas y route handlers /api
  components/     # UI, calendario, asistencia, sync, PWA
  hooks/          # useSemesterData, useTheme
  lib/            # store helpers, seed, calendario, attendance, nav
  server/         # db, auth, crypto, snapshot, push, Moodle
  types/          # tipos del dominio
public/
  sw.js           # service worker (caché + push)
  icons/          # íconos PWA
scripts/
  generate-icons.mjs
```

Datos del planificador: documento JSON por usuario en `snapshots.data` con
control de versión. Tablas relacionales para usuarios, sesiones, dispositivos,
integraciones, tokens de API y suscripciones push (ver `src/server/schema.ts`).

---

## 11. Comandos de mantenimiento

```bash
# claves VAPID
npx web-push generate-vapid-keys

# comprobar salud de la app
curl http://localhost:3000/api/health

# desplegar a Vercel
npx vercel
```
