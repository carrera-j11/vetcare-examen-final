/**
 * Utilitarios de fecha/hora. Las fechas se manejan como texto local
 * 'YYYY-MM-DD HH:mm:ss' (zona horaria de la clínica) para que coincidan
 * exactamente con lo que se guarda en MySQL.
 */
const pad = (n) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD HH:mm:ss' (hora local) */
function aTextoFechaHora(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** Date → 'YYYY-MM-DD' */
function aTextoFecha(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD HH:mm[:ss]' o 'YYYY-MM-DDTHH:mm' → Date local */
function deTexto(texto) {
  const [f, h = '00:00'] = String(texto).replace('T', ' ').split(' ');
  const [y, m, d] = f.split('-').map(Number);
  const [hh, mm] = h.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

function sumarMinutos(d, minutos) {
  return new Date(d.getTime() + minutos * 60000);
}

function sumarDias(d, dias) {
  const r = new Date(d);
  r.setDate(r.getDate() + dias);
  return r;
}

/** Día ISO: 1 = lunes … 7 = domingo */
function diaSemanaIso(d) {
  return d.getDay() === 0 ? 7 : d.getDay();
}

/** 'HH:mm[:ss]' → minutos desde medianoche */
function minutosDelDia(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
}

function hoy() {
  return aTextoFecha(new Date());
}

module.exports = { aTextoFechaHora, aTextoFecha, deTexto, sumarMinutos, sumarDias, diaSemanaIso, minutosDelDia, hoy, pad };
