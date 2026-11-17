/**
 * INNOVACIÓN · Calendario de vacunación con alertas de próximos controles.
 */
const repo = require('./controles.repository');
const mascotasRepo = require('../mascotas/mascotas.repository');
const tiposRepo = require('./tipos.repository');
const auditoria = require('../auditoria/auditoria.service');
const { pool, transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');
const { hoy } = require('../../utils/fechas');
const env = require('../../config/env');


/** Clasifica un control para el semáforo del calendario */
function semaforo(c) {
  if (c.estado !== 'PENDIENTE') return c.estado.toLowerCase();
  if (c.diasRestantes < 0) return 'vencido';
  if (c.diasRestantes <= env.alertas.diasAnticipacion) return 'proximo';
  return 'programado';
}

const conSemaforo = (c) => ({ ...c, semaforo: semaforo(c) });

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(conSemaforo), meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function crear(datos, ctx) {
  const mascota = await mascotasRepo.buscarPorId(datos.mascotaId);
  if (!mascota || !mascota.activo) throw HttpError.regla('MASCOTA_INVALIDA', 'La mascota no existe o está desactivada');
  if (datos.fechaProgramada < hoy()) throw HttpError.regla('CONTROL_EN_PASADO', 'No se puede programar un control en una fecha pasada');
  if (datos.tipoVacunaId) {
    const tipo = await tiposRepo.buscarPorId(datos.tipoVacunaId);
    if (!tipo) throw HttpError.regla('RN04_TIPO_INVALIDO', 'El tipo de vacuna no existe');
    if (tipo.especie && tipo.especie !== mascota.especie) throw HttpError.regla('RN09_ESPECIE_INCOMPATIBLE', `La vacuna ${tipo.nombre} no corresponde a la especie de la mascota`);
  }
  return transaccion(async (conn) => {
    const idControl = await repo.insertar(conn, datos, ctx.usuario.id);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'control', entidadId: idControl, detalle: datos });
    return conSemaforo(await repo.buscarPorId(idControl, conn));
  });
}

async function cambiarEstado(idControl, estado, ctx) {
  const actual = await repo.buscarPorId(idControl);
  if (!actual) throw HttpError.notFound('Control');
  return transaccion(async (conn) => {
    const ok = await repo.cambiarEstado(conn, idControl, estado);
    if (!ok) throw HttpError.conflict('CONTROL_YA_CERRADO', `El control ya se encuentra ${actual.estado.toLowerCase()}`);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'control', entidadId: idControl, detalle: { estado } });
    return conSemaforo(await repo.buscarPorId(idControl, conn));
  });
}

async function reprogramar(idControl, { fechaProgramada }, ctx) {
  const actual = await repo.buscarPorId(idControl);
  if (!actual) throw HttpError.notFound('Control');
  if (fechaProgramada < hoy()) throw HttpError.regla('CONTROL_EN_PASADO', 'No se puede reprogramar a una fecha pasada');
  return transaccion(async (conn) => {
    const ok = await repo.reprogramar(conn, idControl, fechaProgramada);
    if (!ok) throw HttpError.conflict('CONTROL_YA_CERRADO', 'Solo se pueden reprogramar controles pendientes');
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'control', entidadId: idControl, detalle: { antes: actual.fechaProgramada, despues: fechaProgramada } });
    return conSemaforo(await repo.buscarPorId(idControl, conn));
  });
}

/**
 * Eventos del calendario: controles (vacunas/desparasitación/controles) y,
 * opcionalmente, citas programadas, en el rango solicitado.
 */
async function calendario({ desde, hasta, tipo, incluirCitas }, usuario) {
  const controles = await repo.enRango(desde, hasta, { tipo });
  const eventos = controles.map((c) => ({
    id: `control-${c.id}`, origen: 'CONTROL', referenciaId: c.id, fecha: c.fechaProgramada, hora: null,
    titulo: `${c.mascota}: ${c.descripcion}`, tipo: c.tipo, estado: c.estado, semaforo: semaforo(c),
    mascotaId: c.mascotaId, propietario: c.propietario, telefono: c.propietarioTelefono,
  }));
  if (incluirCitas) {
    const params = [`${desde} 00:00:00`, `${hasta} 23:59:59`];
    let filtroVet = '';
    if (usuario?.rol === 'VETERINARIO') {
      filtroVet = 'AND c.veterinario_id = ?';
      params.push(usuario.veterinarioId || -1);
    }
    const [citas] = await pool.execute(
      `SELECT c.id, DATE(c.inicio) AS fecha, TIME_FORMAT(c.inicio, '%H:%i') AS hora, c.estado, c.motivo,
              m.id AS mascotaId, m.nombre AS mascota, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario
         FROM citas c JOIN mascotas m ON m.id = c.mascota_id JOIN veterinarios v ON v.id = c.veterinario_id
        WHERE c.inicio BETWEEN ? AND ? AND c.estado IN ('PROGRAMADA','ATENDIDA') ${filtroVet}
        ORDER BY c.inicio`, params);
    citas.forEach((c) => eventos.push({
      id: `cita-${c.id}`, origen: 'CITA', referenciaId: c.id, fecha: c.fecha, hora: c.hora,
      titulo: `${c.hora} ${c.mascota} · ${c.veterinario}`, tipo: 'CITA', estado: c.estado, semaforo: 'cita', mascotaId: c.mascotaId,
    }));
  }
  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || ''));
  return { desde, hasta, eventos };
}

/** Alertas: controles vencidos y próximos (dentro de los días de anticipación configurados) */
async function alertas() {
  const filas = (await repo.proximosYVencidos(env.alertas.diasAnticipacion)).map(conSemaforo);
  return {
    diasAnticipacion: env.alertas.diasAnticipacion,
    vencidos: filas.filter((f) => f.semaforo === 'vencido'),
    proximos: filas.filter((f) => f.semaforo === 'proximo'),
  };
}

module.exports = { listar, crear, cambiarEstado, reprogramar, calendario, alertas, semaforo };
