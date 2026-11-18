# VetCare · Citas y servicios veterinarios

**Examen práctico Full Stack – Programación Web (5.º ciclo, paralelo 5A)**
**Caso 06:** Citas y servicios veterinarios · **Estudiante:** Javier Alexander Carrera Rodríguez
**Docente:** Ing. Luis Fernando Pinos Castillo · Universidad Católica de Cuenca

Aplicación web para registrar propietarios y mascotas, administrar veterinarios y especialidades,
gestionar citas y disponibilidad, registrar consultas/diagnósticos/tratamientos, administrar vacunas
y controles periódicos, y consultar el historial clínico.

| Capa | Tecnología |
|---|---|
| Backend / API REST | Node.js 20+ · Express 5 · Zod (DTO) · JWT · bcrypt · Swagger/OpenAPI |
| Base de datos | MySQL 8 (InnoDB, transacciones, triggers, restricciones) |
| Frontend | Angular 22 (componentes standalone, signals, rutas lazy, formularios reactivos) |
| Innovación | PDFKit + QRCode · node-cron · algoritmo propio de asignación de horarios |

---

## 1. Estructura del proyecto

```
Examen_final/
├── database/                         ← Script SQL reproducible (un archivo por apartado)
│   ├── 01_esquema.sql                  Tablas, relaciones, índices y CHECK
│   ├── 02_triggers.sql                 RN05: historial y auditoría no eliminables
│   ├── 03_datos_usuarios.sql           Datos · seguridad
│   ├── 04_datos_veterinarios.sql       Datos · veterinarios, especialidades, horarios, bloqueos
│   ├── 05_datos_propietarios_mascotas.sql
│   ├── 06_datos_citas.sql
│   ├── 07_datos_consultas.sql
│   └── 08_datos_vacunas.sql
├── backend/
│   ├── src/
│   │   ├── config/        env.js (variables de entorno) · db.js (pool + transacciones)
│   │   ├── middlewares/   autenticacion.js (JWT + roles) · validar.js (DTO) · errores.js
│   │   ├── modules/       Un módulo por apartado: *.routes · *.controller · *.service · *.repository · *.dto
│   │   │   ├── auth/ usuarios/ auditoria/
│   │   │   ├── propietarios/ mascotas/ historial/
│   │   │   ├── especialidades/ veterinarios/ bloqueos/ disponibilidad/
│   │   │   ├── citas/ consultas/ vacunas/ notificaciones/ reportes/ publico/
│   │   ├── jobs/          alertas.job.js (notificaciones automáticas)
│   │   ├── docs/          openapi.yaml (Swagger)
│   │   ├── utils/         HttpError, paginación/filtros, fechas, validadores
│   │   ├── routes.js · app.js · server.js
│   ├── scripts/init-db.js  Inicializa la BD con los scripts de /database
│   └── tests/              31 pruebas de integración (node:test + supertest)
├── frontend/src/app/
│   ├── core/              models/ (uno por dominio) · services/ (uno por apartado) · guards · interceptors · utils
│   ├── shared/components/ estado-vista · paginador · confirmar-dialogo · avisos · campo-error
│   ├── layout/shell/      Menú lateral por rol + campana de alertas
│   └── features/          Un componente por apartado, cada uno con su plantilla .html (y .css cuando aplica)
├── postman/VetCare.postman_collection.json
├── docs/INFORME-TECNICO.md
└── docker-compose.yml     MySQL de desarrollo (opcional)
```

## 2. Puesta en marcha

### 2.1 Base de datos
**Opción A – MySQL instalado:** ejecute los archivos de `database/` en orden (MySQL Workbench) o use el script:
```bash
cd backend
npm install
cp .env.example .env      # complete DB_PASSWORD y JWT_SECRET
npm run db:init
```
**Opción B – Docker:** copie `.env.example` (raíz) como `.env`, defina `DB_PASSWORD` y ejecute `docker compose up -d`
(MySQL queda en el puerto **3307**; ponga `DB_PORT=3307` en `backend/.env`).

> ⚠ `01_esquema.sql` elimina y vuelve a crear la base `vetcare_db`.

### 2.2 Backend
```bash
cd backend
npm run dev          # http://localhost:3100/api   ·   Swagger: http://localhost:3100/api/docs
npm test             # 31 pruebas de integración
```
Genere una clave JWT segura con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 2.3 Frontend
```bash
cd frontend
npm install
npm start            # http://localhost:4200
```

### 2.4 Cuentas de demostración (contraseña `Vet12345*`)
| Rol | Correo |
|---|---|
| Administrador | admin@vetcare.ec |
| Recepción (operativo) | recepcion@vetcare.ec |
| Veterinaria (operativo) | mvazquez@vetcare.ec · también cortiz@vetcare.ec, lpena@vetcare.ec |

## 3. Reglas de negocio implementadas (Backend)

| Código | Regla | Dónde |
|---|---|---|
| RN01 | Un veterinario no puede tener citas superpuestas | `disponibilidad.service.validarFranja` + `SELECT … FOR UPDATE` |
| RN02 | La mascota debe estar asociada a un propietario registrado y activo | `mascotas.service.validarPropietario` + FK NOT NULL |
| RN03 | No se permiten citas en horarios no laborables o bloqueados | `horarios_laborales` + `bloqueos_agenda` |
| RN04 | Una vacuna aplicada registra fecha, tipo y responsable | DTO + `NOT NULL` + `vacunas.service` |
| RN05 | El historial clínico no se elimina por una operación ordinaria | Sin DELETE + respuesta 422 + **triggers** en BD |
| RN06 | No se agendan citas en el pasado | `validarFranja` |
| RN07 | Una mascota no puede tener dos citas al mismo tiempo | `validarFranja` |
| RN08 | El veterinario debe atender la especialidad de la cita | `citas.service.validarParticipantes` |
| RN09 | La vacuna debe corresponder a la especie de la mascota | `vacunas.service.aplicar` |
| RN10 | No se registra dos veces la misma vacuna el mismo día | Validación + índice único |
| RN11 | Cada atención (consulta, vacuna, peluquería) se factura una sola vez | `facturas.service.generar` + índice único (origen, referencia) |
| RN12 | Las facturas no se eliminan; solo el administrador las anula con motivo | Trigger `trg_facturas_no_delete` + `PATCH /facturas/:id/anular` |
| RN13 | El lote de la vacuna es automático y consecutivo por tipo y año (PRE-AA-NNNN) | `tipos.repository.siguienteLote` con `FOR UPDATE` |
| RN14 | Las citas de peluquería se completan (no llevan consulta) y no pueden completarse antes de su fecha | `citas.service.completarServicio` |
| RN15 | No se entrega un medicamento de la farmacia sin stock suficiente (se descuenta en la misma transacción) | `medicamentos.service.dispensar` con `FOR UPDATE` |

Además: una cita solo se atiende una vez (índice único `consultas.cita_id`), no se desactiva un
propietario/veterinario con citas futuras, no se bloquea una agenda con citas programadas y el sistema
nunca se queda sin un administrador activo.

## 4. Innovación (3+ funcionalidades)
1. **Calendario de vacunación con alertas de próximos controles** (propuesta del caso): vista mensual con semáforo, panel del día, reprogramación y alertas.
2. **Notificaciones automáticas**: proceso `node-cron` (cada hora) que genera alertas de controles próximos/vencidos y citas del día siguiente, idempotente (índice único).
3. **Algoritmo de asignación de horarios**: sugiere los mejores espacios libres combinando horario laboral, bloqueos y citas, y balancea la carga entre veterinarios.
4. **Historial clínico en PDF con código QR**: el QR lleva a una página pública que verifica el carnet de vacunación.
5. **Panel de indicadores y reportes con filtros avanzados** (citas, vacunas, consultas e **ingresos**) exportables a CSV/Excel.
6. **Facturación automática**: cada atención genera su factura con IVA, se envía en PDF al correo del propietario y se puede descargar, imprimir, reenviar o anular.
7. **Servicio de peluquería y baño** con precios por servicio y lote de vacunas automático.
8. **Farmacia de la clínica**: medicamentos con precio y stock que se eligen en la receta; la **receta** y el **certificado de la vacuna aplicada** se descargan/imprimen en PDF junto con su factura (datos de ejemplo de un proyecto ficticio).

## 5. Seguridad
JWT con expiración · contraseñas con bcrypt · 3 roles verificados en el Backend · autorización a nivel
de datos (el veterinario solo ve su agenda) · Helmet · CORS restringido · límite de intentos de login ·
consultas parametrizadas y ordenamiento con lista blanca · errores sin información sensible ·
variables de entorno (`.env` fuera del repositorio) · auditoría inmutable.

Ver el detalle completo en [docs/INFORME-TECNICO.md](docs/INFORME-TECNICO.md).

## 6. Despliegue
Frontend en Vercel/Netlify, API y MySQL en Railway (o Aiven + Render gratis). Paso a paso en
[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).
