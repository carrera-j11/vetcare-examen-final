# Guía de despliegue — VetCare

Arquitectura publicada (cada pieza se despliega por separado, como pide la guía §12.5):

```
Navegador ──▶ Frontend Angular (Vercel)  ──HTTPS──▶  API Express (Railway)  ──▶  MySQL (Railway)
```

| Pieza | Servicio recomendado | Alternativa gratuita |
|---|---|---|
| Base de datos MySQL | **Railway** (plugin MySQL) | Aiven for MySQL (plan Free) |
| Backend / API | **Railway** | Render (Web Service Free — se "duerme" tras 15 min sin uso) |
| Frontend | **Vercel** | Netlify |

> Railway da un crédito de prueba al registrarse; luego el plan Hobby cuesta unos 5 USD/mes.
> Si no quiere pagar, use la ruta alternativa (Aiven + Render + Vercel) del apartado 6.

El proyecto ya trae lo necesario: `frontend/vercel.json`, `frontend/netlify.toml`, el script
`npm run build:prod` (genera la URL de la API desde la variable `API_URL`), soporte SSL (`DB_SSL`) y
zona horaria de Ecuador para la BD (`DB_TIME_ZONE`) y para Node (`TZ`).

---

## Paso 0 · Subir el proyecto a GitHub
Vercel y Railway despliegan desde un repositorio.

1. Cree un repositorio **vacío** en <https://github.com/new> (por ejemplo `vetcare-examen-final`).
2. En la carpeta `Examen_final`:
   ```bash
   git init
   git add .
   git commit -m "VetCare: proyecto inicial"
   git branch -M main
   git remote add origin https://github.com/SU_USUARIO/vetcare-examen-final.git
   git push -u origin main
   ```
3. Verifique en GitHub que **no** se subieron archivos `.env` (están en `.gitignore`).

---

## Paso 1 · Base de datos MySQL en Railway
1. Entre a <https://railway.app> con su cuenta de GitHub → **New Project → Deploy MySQL** (o *Empty project* → **+ Create → Database → MySQL**).
2. Abra el servicio **MySQL → pestaña Variables**. Ahí están `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` (normalmente `railway`).
3. En **Settings → Networking → Public Networking** copie el host y puerto **públicos** (algo como `xxxx.proxy.rlwy.net:12345`). Se usan solo para cargar los datos desde su computadora.

### 1.1 Cargar las tablas y los datos
Desde su computadora, en la carpeta `backend`, ejecute el script apuntando a la base de Railway
(los valores se pasan solo para este comando; no modifique su `.env` local):

**PowerShell**
```powershell
$env:DB_HOST="xxxx.proxy.rlwy.net"; $env:DB_PORT="12345"; $env:DB_USER="root"; $env:DB_PASSWORD="(MYSQLPASSWORD)"; $env:DB_NAME="railway"; npm run db:init
```
**Git Bash**
```bash
DB_HOST=xxxx.proxy.rlwy.net DB_PORT=12345 DB_USER=root DB_PASSWORD='(MYSQLPASSWORD)' DB_NAME=railway npm run db:init
```
Debe ver `✔ 01_esquema.sql … ✔ 08_datos_vacunas.sql` y `Base de datos "railway" lista.`
Cierre la terminal después para que esas variables no queden en memoria.

> El script reemplaza automáticamente `vetcare_db` por el nombre indicado en `DB_NAME`.

---

## Paso 2 · API (Backend) en Railway
1. En el mismo proyecto: **+ Create → GitHub Repo →** elija su repositorio.
2. En el nuevo servicio → **Settings**:
   - **Root Directory:** `backend`
   - **Start Command:** `npm start` (Railway lo detecta solo)
   - **Healthcheck Path:** `/api/salud`
3. **Variables** (pestaña *Variables* → *Raw Editor*), pegue y complete:
   ```
   NODE_ENV=production
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   DB_SSL=false
   DB_TIME_ZONE=-05:00
   TZ=America/Guayaquil
   JWT_SECRET=(pegue aquí una clave larga aleatoria)
   JWT_EXPIRES_IN=8h
   CORS_ORIGENES=https://SU-FRONTEND.vercel.app
   FRONTEND_URL=https://SU-FRONTEND.vercel.app
   ```
   - `${{MySQL.…}}` toma los valores del servicio MySQL por la red privada (no copie la contraseña a mano).
   - Genere `JWT_SECRET` en su PC con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - No defina `PORT`: Railway la asigna sola.
   - `CORS_ORIGENES` y `FRONTEND_URL` se completan en el Paso 4 (cuando tenga la URL de Vercel).
4. **Settings → Networking → Generate Domain**. Obtendrá algo como `https://vetcare-api-production.up.railway.app`.
5. Pruebe en el navegador:
   - `https://…up.railway.app/api/salud` → `{"estado":"ok","baseDatos":"conectada"}`
   - `https://…up.railway.app/api/docs` → Swagger

---

## Paso 3 · Frontend en Vercel
1. Entre a <https://vercel.com> con GitHub → **Add New → Project →** importe el repositorio.
2. Configure:
   - **Root Directory:** `frontend`
   - Framework: Angular (el comando de build y la carpeta de salida ya los define `vercel.json`)
   - **Environment Variables:** `API_URL` = `https://…up.railway.app/api` (la URL del Paso 2 **terminada en `/api`**)
3. **Deploy**. Obtendrá una URL como `https://vetcare-examen.vercel.app`.

---

## Paso 4 · Conectar Frontend y Backend (CORS y QR)
1. Vuelva a Railway → servicio de la API → **Variables** y ponga la URL real de Vercel:
   ```
   CORS_ORIGENES=https://vetcare-examen.vercel.app
   FRONTEND_URL=https://vetcare-examen.vercel.app
   ```
   (sin `/` al final). Railway vuelve a desplegar solo.
2. Abra la URL de Vercel, inicie sesión con `admin@vetcare.ec` / `Vet12345*` y verifique:
   panel, calendario, nueva cita con sugerencias, PDF del historial (escanee el QR: debe abrir `/verificar/…` en Vercel).

---

## Paso 5 · Completar el informe
En `docs/INFORME-TECNICO.md`, sección 12, coloque:
- Repositorio: `https://github.com/SU_USUARIO/vetcare-examen-final`
- Frontend: `https://vetcare-examen.vercel.app`
- API / Swagger: `https://…up.railway.app/api/docs`

Cada `git push` a `main` vuelve a desplegar automáticamente Frontend y Backend.

---

## Paso 6 · Correos de alertas y facturas (remitente: alex.carrera2004@gmail.com)
Cuando el proceso automático crea una alerta (control próximo, vencido o cita de mañana), además de
mostrarla en el sistema envía un correo al propietario. Desde el calendario también se puede pulsar
**"✉ Recordar por correo"**. Si no se configura, todo funciona igual, pero sin correos.

> **Railway bloquea el SMTP** en sus planes gratuito/Hobby. En Railway use **Brevo** (API HTTP).
> El SMTP de Outlook / Microsoft 365 solo sirve para probar en su computadora, y únicamente si la
> universidad lo tiene habilitado.
>
> **Importante – correo institucional:** el dominio `ucacue.edu.ec` tiene DMARC `p=quarantine` y su SPF solo
> autoriza a Outlook. Un correo enviado por Brevo con remitente `@est.ucacue.edu.ec` es retenido o descartado
> por Gmail/Outlook (Brevo lo acepta, pero no llega). Use como remitente un correo **verificado en Brevo**
> (p. ej. su Gmail) y ponga el institucional en `MAIL_RESPONDER_A` para recibir las respuestas.

### 6.1 En Railway (Brevo, gratis hasta 300 correos/día)
1. Cree una cuenta en <https://www.brevo.com> con `alex.carrera2004@gmail.com`.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: `alex.carrera2004@gmail.com` y confirme el correo de verificación que le llega.
3. **SMTP & API → API Keys → Generate a new API key**. Cópiela (empieza con `xkeysib-`).
4. Railway → servicio de la API → **Variables**, agregue:
   ```
   MAIL_PROVEEDOR=brevo
   MAIL_REMITENTE=alex.carrera2004@gmail.com
   MAIL_RESPONDER_A=javier.carrera2004@est.ucacue.edu.ec
   BREVO_API_KEY=(su clave de Brevo)
   ```
   Las facturas y alertas llegan al **correo real de cada propietario**. Los propietarios de prueba usan
   correos `@example.com`, a los que el sistema nunca envía. Opcional: `MAIL_COPIA_ADMIN=` para recibir
   una copia oculta, o `MAIL_REDIRIGIR_A=` (modo demostración) para que todo llegue a un solo buzón.
5. **Deploy**. En *Deploy Logs* debe aparecer `[correo] Alertas por correo activas (brevo)`.

### 6.2 En su computadora
**Opción recomendada:** use también Brevo (las mismas variables del 6.1 en `backend/.env`).

**Opción Gmail SMTP:**
1. Active la **verificación en dos pasos** en su cuenta de Google.
2. Entre a <https://myaccount.google.com/apppasswords>, cree una contraseña de aplicación ("VetCare") y copie las 16 letras.
3. En `backend/.env`:
   ```
   MAIL_PROVEEDOR=smtp
   SMTP_USER=alex.carrera2004@gmail.com
   SMTP_PASS=(las 16 letras, sin espacios)
   MAIL_REMITENTE=alex.carrera2004@gmail.com
   ```
   Nunca suba esta contraseña a GitHub (el `.env` ya está excluido).

### 6.3 Probar
* **Calendario → clic en un día con control pendiente → "✉ Recordar por correo"**, o
* **Notificaciones → "Ejecutar revisión ahora"** (solo crea correos de alertas nuevas). La columna
  *Correo al propietario* muestra Enviado / Error / Sin correo.

---

## 7 · Ruta alternativa gratuita (Aiven + Render + Vercel)
1. **Aiven** (<https://aiven.io>) → *Create service → MySQL → Free plan*. Copie host, puerto, usuario
   (`avnadmin`) y contraseña. Cargue los datos como en el Paso 1.1 agregando `DB_SSL=true` y `DB_NAME=defaultdb`.
2. **Render** (<https://render.com>) → *New → Web Service* → su repositorio:
   - Root Directory `backend` · Build `npm install` · Start `npm start` · Health Check Path `/api/salud`
   - Variables: las mismas del Paso 2, pero con los datos de Aiven escritos directamente y `DB_SSL=true`.
   - El plan gratuito se suspende tras 15 min sin uso; la primera petición tarda ~50 s en "despertar"
     (ábralo unos minutos antes de la sustentación). Mientras está suspendido, el proceso de alertas no corre.
3. **Vercel**: igual que el Paso 3.

---

## Problemas frecuentes
| Síntoma | Causa y solución |
|---|---|
| Al iniciar sesión: "No hay conexión con el servidor" | `API_URL` mal escrita (debe terminar en `/api`) o la API está caída. Revise `/api/salud`. Si cambia `API_URL`, haga *Redeploy* en Vercel. |
| Error de CORS en la consola del navegador | `CORS_ORIGENES` no coincide exactamente con la URL de Vercel (https, sin `/` final). |
| La API no arranca: "Falta la variable de entorno…" | Falta `JWT_SECRET` o alguna `DB_*` en Railway/Render. |
| `ER_ACCESS_DENIED` / `ECONNREFUSED` | Datos de BD incorrectos; en Aiven falta `DB_SSL=true`. |
| Las citas salen 5 horas corridas | Falta `TZ=America/Guayaquil` o `DB_TIME_ZONE=-05:00`. |
| Al recargar una página de Angular aparece 404 | Falta `vercel.json`/`netlify.toml` en la carpeta `frontend` (ya incluidos). |
| El QR abre `localhost` | `FRONTEND_URL` no se actualizó en el Paso 4. |
