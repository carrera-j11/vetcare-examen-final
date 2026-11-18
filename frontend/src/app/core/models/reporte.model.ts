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
    ingresosMes: number;
    serviciosMes: number;
    ingresosHoy: number;
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
  vacunas: {
    porTipo: { tipoVacuna: string; total: number }[];
    detalle: { id: number; fechaAplicacion: string; tipoVacuna: string; mascota: string; especie: string; propietario: string; veterinario: string; lote: string | null; proximaDosis: string | null }[];
  };
  consultas: {
    detalle: { id: number; fecha: string; mascota: string; especie: string; propietario: string; veterinario: string; motivo: string; diagnostico: string; totalTratamientos: number }[];
  };
  ingresos: {
    resumen: { facturas: number; servicios: number; subtotal: number; iva: number; total: number };
    porCategoria: { categoria: 'CONSULTA' | 'VACUNA' | 'ESTETICA'; servicios: number; subtotal: number }[];
    porConcepto: { concepto: string; servicios: number; subtotal: number }[];
    porDia: { fecha: string; facturas: number; total: number }[];
    detalle: { id: number; numero: string; fecha: string; origen: string; propietario: string; mascota: string; conceptos: string; subtotal: number; iva: number; total: number; correoEstado: string | null }[];
  };
}

export type SeccionReporte = 'citas' | 'vacunas' | 'consultas' | 'ingresos';
