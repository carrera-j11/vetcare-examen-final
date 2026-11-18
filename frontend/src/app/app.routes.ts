import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/guards/auth.guard';
import { Shell } from './layout/shell/shell';

/**
 * Rutas de la aplicación. Cada apartado se carga bajo demanda (lazy loading)
 * y las rutas privadas están protegidas por sesión y, cuando corresponde, por rol.
 */
export const routes: Routes = [
  // ---------- Públicas ----------
  { path: 'login', canActivate: [invitadoGuard], title: 'Iniciar sesión · VetCare',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login) },
  { path: 'verificar/:codigo', title: 'Verificación de carnet · VetCare',
    loadComponent: () => import('./features/publico/verificar-carnet/verificar-carnet').then((m) => m.VerificarCarnet) },

  // ---------- Privadas ----------
  {
    path: '',
    component: Shell,
    canActivate: [autenticadoGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      { path: 'panel', title: 'Panel · VetCare', loadComponent: () => import('./features/panel/panel').then((m) => m.Panel) },
      { path: 'perfil', title: 'Mi cuenta · VetCare', loadComponent: () => import('./features/perfil/perfil').then((m) => m.Perfil) },
      { path: 'notificaciones', title: 'Notificaciones · VetCare', loadComponent: () => import('./features/notificaciones/notificaciones').then((m) => m.Notificaciones) },
      { path: 'calendario', title: 'Calendario de vacunación · VetCare', loadComponent: () => import('./features/calendario/calendario-vacunacion').then((m) => m.CalendarioVacunacion) },

      // Propietarios
      { path: 'propietarios', title: 'Propietarios · VetCare', loadComponent: () => import('./features/propietarios/propietarios-lista/propietarios-lista').then((m) => m.PropietariosLista) },
      { path: 'propietarios/nuevo', title: 'Nuevo propietario · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'RECEPCION'] },
        loadComponent: () => import('./features/propietarios/propietario-form/propietario-form').then((m) => m.PropietarioForm) },
      { path: 'propietarios/:id', title: 'Propietario · VetCare', loadComponent: () => import('./features/propietarios/propietario-detalle/propietario-detalle').then((m) => m.PropietarioDetalle) },
      { path: 'propietarios/:id/editar', title: 'Editar propietario · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'RECEPCION'] },
        loadComponent: () => import('./features/propietarios/propietario-form/propietario-form').then((m) => m.PropietarioForm) },

      // Mascotas e historial clínico
      { path: 'mascotas', title: 'Mascotas · VetCare', loadComponent: () => import('./features/mascotas/mascotas-lista/mascotas-lista').then((m) => m.MascotasLista) },
      { path: 'mascotas/nueva', title: 'Nueva mascota · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'RECEPCION'] },
        loadComponent: () => import('./features/mascotas/mascota-form/mascota-form').then((m) => m.MascotaForm) },
      { path: 'mascotas/:id/editar', title: 'Editar mascota · VetCare', loadComponent: () => import('./features/mascotas/mascota-form/mascota-form').then((m) => m.MascotaForm) },
      { path: 'mascotas/:id/historial', title: 'Historial clínico · VetCare', loadComponent: () => import('./features/mascotas/historial-clinico/historial-clinico').then((m) => m.HistorialClinico) },

      // Veterinarios, especialidades y agenda
      { path: 'veterinarios', title: 'Veterinarios · VetCare', loadComponent: () => import('./features/veterinarios/veterinarios-lista/veterinarios-lista').then((m) => m.VeterinariosLista) },
      { path: 'veterinarios/nuevo', title: 'Nuevo veterinario · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/veterinarios/veterinario-form/veterinario-form').then((m) => m.VeterinarioForm) },
      { path: 'veterinarios/:id/editar', title: 'Editar veterinario · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/veterinarios/veterinario-form/veterinario-form').then((m) => m.VeterinarioForm) },
      { path: 'especialidades', title: 'Especialidades · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/especialidades/especialidades').then((m) => m.Especialidades) },
      { path: 'bloqueos', title: 'Bloqueos de agenda · VetCare', loadComponent: () => import('./features/bloqueos/bloqueos').then((m) => m.Bloqueos) },

      // Citas
      { path: 'citas', title: 'Citas · VetCare', loadComponent: () => import('./features/citas/citas-lista/citas-lista').then((m) => m.CitasLista) },
      { path: 'citas/nueva', title: 'Nueva cita · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'RECEPCION'] },
        loadComponent: () => import('./features/citas/cita-form/cita-form').then((m) => m.CitaForm) },
      { path: 'citas/:id/reprogramar', title: 'Reprogramar cita · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'RECEPCION'] },
        loadComponent: () => import('./features/citas/cita-form/cita-form').then((m) => m.CitaForm) },

      // Consultas (historial clínico)
      { path: 'consultas', title: 'Consultas · VetCare', loadComponent: () => import('./features/consultas/consultas-lista/consultas-lista').then((m) => m.ConsultasLista) },
      { path: 'consultas/nueva', title: 'Registrar consulta · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'VETERINARIO'] },
        loadComponent: () => import('./features/consultas/consulta-form/consulta-form').then((m) => m.ConsultaForm) },
      { path: 'consultas/:id', title: 'Consulta · VetCare', loadComponent: () => import('./features/consultas/consulta-detalle/consulta-detalle').then((m) => m.ConsultaDetalle) },

      // Vacunas
      { path: 'vacunas', title: 'Vacunas · VetCare', loadComponent: () => import('./features/vacunas/vacunas-lista/vacunas-lista').then((m) => m.VacunasLista) },
      { path: 'vacunas/aplicar', title: 'Aplicar vacuna · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'VETERINARIO'] },
        loadComponent: () => import('./features/vacunas/vacuna-form/vacuna-form').then((m) => m.VacunaForm) },
      { path: 'tipos-vacuna', title: 'Tipos de vacuna · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/tipos-vacuna/tipos-vacuna').then((m) => m.TiposVacuna) },

      // Facturación (caja)
      { path: 'facturas', title: 'Facturación · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN', 'RECEPCION'] },
        loadComponent: () => import('./features/facturas/facturas').then((m) => m.Facturas) },

      // Administración
      { path: 'reportes', title: 'Reportes · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/reportes/reportes').then((m) => m.Reportes) },
      { path: 'usuarios', title: 'Usuarios · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios) },
      { path: 'auditoria', title: 'Auditoría · VetCare', canActivate: [rolGuard], data: { roles: ['ADMIN'] },
        loadComponent: () => import('./features/auditoria/auditoria').then((m) => m.Auditoria) },

      { path: 'acceso-denegado', title: 'Acceso denegado · VetCare', loadComponent: () => import('./features/errores/acceso-denegado/acceso-denegado').then((m) => m.AccesoDenegado) },
    ],
  },
  { path: '**', title: 'Página no encontrada · VetCare', loadComponent: () => import('./features/errores/no-encontrado/no-encontrado').then((m) => m.NoEncontrado) },
];
