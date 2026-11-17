/**
 * Reglas de disponibilidad de la agenda y algoritmo de asignación de horarios.
 *
 *  RN01 · Un veterinario no puede tener citas superpuestas.
 *  RN03 · No se permiten citas en horarios no laborables o bloqueados.
 *  RN07 · Una mascota no puede tener dos citas al mismo tiempo.
 *
 * INNOVACIÓN · sugerirHorarios(): algoritmo que propone los mejores espacios libres
 * para una especialidad, considerando horario laboral, bloqueos, citas existentes
 * y balanceando la carga de trabajo entre veterinarios.
 */
const repo = require('./disponibilidad.repository');
const HttpError = require('../../utils/HttpError');
const {
  aTextoFechaHora, aTextoFecha, deTexto, sumarMinutos, sumarDias, diaSemanaIso, minutosDelDia,
} = require('../../utils/fechas');

const PASO_MINUTOS = 15; // granularidad de la agenda
const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** ¿[inicio, fin) cabe completamente dentro de algún bloque del horario laboral? */
function dentroDeHorario(horarios, inicio, fin) {
  const ini = inicio.getHours() * 60 + inicio.getMinutes();
  const fn = fin.getHours() * 60 + fin.getMinutes() || 24 * 60;
  return horarios.some((h) => ini >= minutosDelDia(h.horaInicio) && fn <= minutosDelDia(h.horaFin));
}

/**
 * Valida que la franja sea asignable al veterinario. Lanza 422/409 con el detalle de la regla.
 * @param {object} p { veterinarioId, mascotaId, inicio: Date, fin: Date, excluirCitaId }
 */
async function validarFranja(p, ejecutor) {
  const { veterinarioId, mascotaId, inicio, fin, excluirCitaId = 0 } = p;

  if (inicio <= new Date()) {
    throw HttpError.regla('CITA_EN_PASADO', 'No se pueden agendar citas en una fecha u hora pasada');
  }
  if (aTextoFecha(inicio) !== aTextoFecha(sumarMinutos(fin, -1))) {
    throw HttpError.regla('RN03_FUERA_DE_HORARIO', 'La cita debe iniciar y terminar el mismo día');
  }

  // RN03 · horario laboral
  const horarios = await repo.horariosDelDia(veterinarioId, diaSemanaIso(inicio), ejecutor);
  if (!dentroDeHorario(horarios, inicio, fin)) {
    const jornada = horarios.length ? horarios.map((h) => `${h.horaInicio}-${h.horaFin}`).join(', ') : 'no labora';
    throw HttpError.regla('RN03_FUERA_DE_HORARIO',
      `El horario solicitado no es laborable para el veterinario (${DIAS[diaSemanaIso(inicio)]}: ${jornada})`,
      { horarios });
  }

  const desde = aTextoFechaHora(inicio);
  const hasta = aTextoFechaHora(fin);

  // RN03 · bloqueos de agenda
  const bloqueos = await repo.bloqueosEnRango(veterinarioId, desde, hasta, ejecutor);
  if (bloqueos.length) {
    throw HttpError.regla('RN03_HORARIO_BLOQUEADO', `El horario está bloqueado: ${bloqueos[0].motivo}`, { bloqueos });
  }

  // RN01 · citas superpuestas del veterinario
  const choques = await repo.citasVeterinarioEnRango(veterinarioId, desde, hasta, excluirCitaId, ejecutor);
  if (choques.length) {
    const c = choques[0];
    throw HttpError.conflict('RN01_CITA_SUPERPUESTA',
      `El veterinario ya tiene una cita de ${c.inicio.slice(11, 16)} a ${c.fin.slice(11, 16)} (${c.mascota})`, { citas: choques });
  }

  // RN07 · la mascota no puede estar en dos citas a la vez
  if (mascotaId) {
    const choquesMascota = await repo.citasMascotaEnRango(mascotaId, desde, hasta, excluirCitaId, ejecutor);
    if (choquesMascota.length) {
      throw HttpError.conflict('RN07_MASCOTA_OCUPADA',
        `La mascota ya tiene una cita en ese horario con ${choquesMascota[0].veterinario}`, { citas: choquesMascota });
    }
  }
}

/** Espacios libres de un veterinario en una fecha para una duración dada */
async function espaciosLibres(veterinarioId, fecha, duracionMin) {
  const dia = deTexto(`${fecha} 00:00`);
  const horarios = await repo.horariosDelDia(veterinarioId, diaSemanaIso(dia));
  if (!horarios.length) return [];
  const finDia = sumarDias(dia, 1);
  const [bloqueos, citas] = await Promise.all([
    repo.bloqueosEnRango(veterinarioId, aTextoFechaHora(dia), aTextoFechaHora(finDia)),
    repo.citasVeterinarioEnRango(veterinarioId, aTextoFechaHora(dia), aTextoFechaHora(finDia)),
  ]);
  const ocupados = [...bloqueos, ...citas].map((o) => [deTexto(o.inicio), deTexto(o.fin)]);
  const ahora = new Date();
  const libres = [];

  horarios.forEach((h) => {
    let cursor = deTexto(`${fecha} ${h.horaInicio}`);
    const limite = deTexto(`${fecha} ${h.horaFin}`);
    while (sumarMinutos(cursor, duracionMin) <= limite) {
      const fin = sumarMinutos(cursor, duracionMin);
      const choca = ocupados.some(([oi, of]) => oi < fin && of > cursor);
      if (!choca && cursor > ahora) libres.push({ inicio: aTextoFechaHora(cursor), fin: aTextoFechaHora(fin) });
      cursor = sumarMinutos(cursor, PASO_MINUTOS);
    }
  });
  return libres;
}

/**
 * Algoritmo de asignación: recorre los próximos días y devuelve las mejores opciones.
 * Criterio: 1) fecha/hora más próxima, 2) veterinario con menor carga ese día.
 * Se toma como máximo un espacio por veterinario por bloque de 2 horas para ofrecer variedad.
 */
async function sugerirHorarios({ especialidadId, duracionMin, veterinarioId, desde, cantidad = 8, diasBusqueda = 14 }) {
  const veterinarios = await repo.veterinariosPorEspecialidad(especialidadId, veterinarioId);
  if (!veterinarios.length) return { sugerencias: [], mensaje: 'No hay veterinarios activos para la especialidad seleccionada' };

  const inicioBusqueda = desde ? deTexto(`${desde} 00:00`) : deTexto(`${aTextoFecha(new Date())} 00:00`);
  const finBusqueda = sumarDias(inicioBusqueda, diasBusqueda);
  const cargas = await repo.cargaPorDia(veterinarios.map((v) => v.id), aTextoFechaHora(inicioBusqueda), aTextoFechaHora(finBusqueda));
  const carga = (vetId, fecha) => cargas.find((c) => c.veterinarioId === vetId && c.dia === fecha)?.total || 0;

  const sugerencias = [];
  for (let d = 0; d < diasBusqueda && sugerencias.length < cantidad; d += 1) {
    const fecha = aTextoFecha(sumarDias(inicioBusqueda, d));
    const delDia = [];
    for (const v of veterinarios) {
      const libres = await espaciosLibres(v.id, fecha, duracionMin);
      const vistos = new Set();
      libres.forEach((l) => {
        const franja = Math.floor(minutosDelDia(l.inicio.slice(11, 16)) / 120);
        if (vistos.has(franja)) return;
        vistos.add(franja);
        delDia.push({ ...l, veterinarioId: v.id, veterinario: v.nombre, cargaDelDia: carga(v.id, fecha) });
      });
    }
    delDia.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.cargaDelDia - b.cargaDelDia);
    sugerencias.push(...delDia.slice(0, cantidad - sugerencias.length));
  }
  if (sugerencias.length) sugerencias[0].recomendada = true;
  return { sugerencias, mensaje: sugerencias.length ? null : `Sin espacios libres en los próximos ${diasBusqueda} días` };
}

module.exports = { validarFranja, espaciosLibres, sugerirHorarios, dentroDeHorario, PASO_MINUTOS };
