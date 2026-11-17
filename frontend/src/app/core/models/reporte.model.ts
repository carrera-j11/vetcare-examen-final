export interface ConteoEtiqueta {
  total: number;
  [clave: string]: string | number;
}

export interface FilaVeterinario {
  veterinarioId: number;
  veterinario: string;
  total: number;
  atendidas: number;
  programadas: number;
  canceladas: number;
  noAsistio: number;
  tasaAsistencia: number | null;
  horasAgendadas: number;
}

export interface Indicadores {
  rango: { desde: string; hasta: string };
  totales: {
    mascotasActivas: number;
    propietariosActivos: number;
    veterinariosActivos: number;
    citasHoy: number;
    citasProximos7Dias: number;
    consultasMes: number;
    vacunasMes: number;
    controlesVencidos: number;
    controlesProximos: number;
    tasaAsistencia: number | null;
    coberturaVacunacion: number | null;
  };
  citasPorEstado: { estado: string; total: number }[];
  citasPorVeterinario: FilaVeterinario[];
  citasPorEspecialidad: { especialidad: string; total: number }[];
  citasPorDia: { fecha: string; total: number; atendidas: number }[];
  mascotasPorEspecie: { especie: string; total: number }[];
  vacunasPorTipo: { tipoVacuna: string; total: number }[];
  cobertura: { mascotas: number; alDia: number; conAlgunaVacuna: number };
}

export interface ReporteCitas {
  rango: { desde: string; hasta: string };
  resumen: { porEstado: { estado: string; total: number }[]; porVeterinario: FilaVeterinario[] };
  detalle: {
    id: number; inicio: string; fin: string; estado: string; motivo: string; mascota: string; especie: string;
    propietario: string; telefono: string; veterinario: string; especialidad: string;
  }[];
}
