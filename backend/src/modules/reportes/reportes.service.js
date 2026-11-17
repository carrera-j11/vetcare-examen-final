/**
 * Reportes e indicadores estadísticos (panel de control).
 */
const repo = require('./reportes.repository');
const { aTextoFecha, sumarDias } = require('../../utils/fechas');

/** Rango por defecto: últimos 30 días + próximos 15 */
function rangoPorDefecto(f) {
  const hoy = new Date();
  return {
    ...f,
    desde: f.desde || aTextoFecha(sumarDias(hoy, -30)),
    hasta: f.hasta || aTextoFecha(sumarDias(hoy, 15)),
  };
}

async function indicadores(filtros) {
  const f = rangoPorDefecto(filtros);
  const [totales, porEstado, porVeterinario, porEspecialidad, porDia, porEspecie, vacunas, cobertura] = await Promise.all([
    repo.totales(), repo.citasPorEstado(f), repo.citasPorVeterinario(f), repo.citasPorEspecialidad(f),
    repo.citasPorDia(f), repo.mascotasPorEspecie(), repo.vacunasPorTipo(f), repo.coberturaVacunacion(),
  ]);
  const atendidas = porEstado.find((e) => e.estado === 'ATENDIDA')?.total || 0;
  const noAsistio = porEstado.find((e) => e.estado === 'NO_ASISTIO')?.total || 0;
  return {
    rango: { desde: f.desde, hasta: f.hasta },
    totales: {
      ...totales,
      tasaAsistencia: atendidas + noAsistio ? Math.round((1000 * atendidas) / (atendidas + noAsistio)) / 10 : null,
      coberturaVacunacion: cobertura.mascotas ? Math.round((1000 * cobertura.alDia) / cobertura.mascotas) / 10 : null,
    },
    citasPorEstado: porEstado,
    citasPorVeterinario: porVeterinario,
    citasPorEspecialidad: porEspecialidad,
    citasPorDia: porDia,
    mascotasPorEspecie: porEspecie,
    vacunasPorTipo: vacunas,
    cobertura,
  };
}

const COLUMNAS_CSV = ['id', 'inicio', 'fin', 'estado', 'especialidad', 'veterinario', 'mascota', 'especie', 'propietario', 'telefono', 'motivo'];

function aCsv(filas) {
  const escapar = (v) => {
    const t = v == null ? '' : String(v);
    return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lineas = [COLUMNAS_CSV.join(';'), ...filas.map((f) => COLUMNAS_CSV.map((c) => escapar(f[c])).join(';'))];
  return `﻿${lineas.join('\r\n')}`; // BOM para que Excel respete las tildes
}

async function reporteCitas(filtros) {
  const f = rangoPorDefecto(filtros);
  const [detalle, porVeterinario, porEstado] = await Promise.all([
    repo.detalleCitas(f), repo.citasPorVeterinario(f), repo.citasPorEstado(f),
  ]);
  return { rango: { desde: f.desde, hasta: f.hasta }, resumen: { porEstado, porVeterinario }, detalle };
}

module.exports = { indicadores, reporteCitas, aCsv };
