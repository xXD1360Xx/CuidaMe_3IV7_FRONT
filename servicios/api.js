// servicios/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ========== CONFIGURACIÓN ==========
const URL_BASE_API = 'https://p01--cuidame--hlm7fxqrj6wz.code.run/api';

console.log(`🔗 [API] URL base: ${URL_BASE_API}`);

// ========== FUNCIONES AUXILIARES ==========
const obtenerToken = async () => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    return null;
  }
};

const obtenerHeaders = async (contenidoJSON = true) => {
  const token = await obtenerToken();
  console.log('🔑 Token en headers:', token ? '✅ Presente' : '❌ No encontrado');

  const headers = {
    Accept: 'application/json',
  };
  if (contenidoJSON) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const peticion = async (endpoint, metodo = 'POST', datos = null) => {
  const url = `${URL_BASE_API}${endpoint}`;
  const headers = await obtenerHeaders(true);

  const opciones = {
    method: metodo,
    headers,
  };

  if (datos && (metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH' || metodo === 'DELETE')) {
    opciones.body = JSON.stringify(datos);
  }

  try {
    const respuesta = await fetch(url, opciones);
    const texto = await respuesta.text();
    try {
      const json = JSON.parse(texto);
      return json;
    } catch (e) {
      console.warn('⚠️ Respuesta no JSON:', texto);
      return { exito: false, error: 'Respuesta inválida del servidor', codigo: 'RESPUESTA_INVALIDA' };
    }
  } catch (error) {
    console.error(`❌ Error en petición ${metodo} ${endpoint}:`, error.message);
    return { exito: false, error: 'Error de conexión con el servidor', codigo: 'ERROR_CONEXION' };
  }
};

// ========== SERVICIO DE API ==========
export const servicioAPI = {
  // ========== 🔐 AUTENTICACIÓN ==========
  iniciarSesion: (identificador, contrasena) =>
    peticion('/auth/login', 'POST', { identificador, contrasena }),

  iniciarSesionConCodigoFamiliar: (email, contrasena, codigo) =>
    peticion('/auth/login-codigo-familiar', 'POST', { email, contrasena, codigo_familiar: codigo }),

  iniciarSesionConCodigoPersonalizado: (codigo) =>
    peticion('/auth/login-codigo-personalizado', 'POST', { codigo_personalizado: codigo }),

  completarPerfilConCodigo: (usuarioId, datosPerfil) =>
    peticion('/auth/completar-perfil', 'POST', { usuario_id: usuarioId, ...datosPerfil }),

  registrarUsuario: (datos) =>
    peticion('/auth/registro', 'POST', datos),

  // Recuperación de contraseña
  solicitarRecuperacion: (email) =>
    peticion('/auth/recuperar-contrasena/solicitar', 'POST', { email }),

  verificarCodigoRecuperacion: (usuarioId, codigo) =>
    peticion('/auth/recuperar-contrasena/verificar', 'POST', { usuario_id: usuarioId, codigo }),

  restablecerContrasena: (usuarioId, codigoId, nuevaContrasena) =>
    peticion('/auth/recuperar-contrasena/restablecer', 'POST', {
      usuario_id: usuarioId,
      codigo_id: codigoId,
      nueva_contrasena: nuevaContrasena,
    }),

  cambiarContrasena: (usuarioId, actual, nueva) =>
    peticion('/auth/cambiar-contrasena', 'POST', {
      usuario_id: usuarioId,
      contrasena_actual: actual,
      nueva_contrasena: nueva,
    }),

  verificarToken: async (token) => {
    const tokenFinal = token || await obtenerToken();
    return peticion('/auth/verificar', 'POST', { token: tokenFinal || null });
  },

  cerrarSesion: (usuarioId) =>
    peticion('/auth/cerrar-sesion', 'POST', { usuario_id: usuarioId }),

  verificarDisponibilidad: (email, username) =>
    peticion('/auth/verificar-disponibilidad', 'GET', { email, username }),

  // ========== 👤 USUARIOS Y PERFILES ==========
  obtenerMiPerfil: (usuarioId) =>
    peticion('/preferencias/informacion-usuario', 'POST', { usuario_id: usuarioId }),

  actualizarUsuario: (usuarioId, datos) =>
    peticion('/preferencias/actualizar-usuario', 'PUT', { usuario_id: usuarioId, datos }),

  obtenerTelefonosUsuario: (usuarioId) =>
    peticion('/preferencias/telefonos', 'POST', { usuario_id: usuarioId }),

  agregarTelefono: (usuarioId, numero, tipo, principal) =>
    peticion('/preferencias/telefonos/agregar', 'POST', { usuario_id: usuarioId, numero, tipo, principal }),

  eliminarTelefono: (usuarioId, telefonoId) =>
    peticion(`/preferencias/telefonos/eliminar/${telefonoId}`, 'DELETE', { usuario_id: usuarioId }),

  marcarTelefonoPrincipal: (usuarioId, telefonoId) =>
    peticion(`/preferencias/telefonos/marcar-principal/${telefonoId}`, 'POST', { usuario_id: usuarioId }),

  obtenerPreferenciasUsuario: (usuarioId) =>
    peticion('/preferencias/preferencias', 'POST', { usuario_id: usuarioId }),

  actualizarPreferencias: (usuarioId, preferencias) =>
    peticion('/preferencias/actualizar-preferencias', 'PUT', { usuario_id: usuarioId, preferencias }),

  verificarOtrosAdministradores: (usuarioId) =>
    peticion('/preferencias/verificar-administradores', 'POST', { usuario_id: usuarioId }),

  renunciarAdministrador: (usuarioId) =>
    peticion('/preferencias/renunciar-administrador', 'POST', { usuario_id: usuarioId }),

  solicitarEliminacionCuenta: (usuarioId, razon) =>
    peticion('/preferencias/solicitar-eliminacion-cuenta', 'POST', { usuario_id: usuarioId, razon }),

  actualizarFotoPerfil: (usuarioId, fotoBase64, tipo) =>
    peticion('/preferencias/actualizar-foto-perfil', 'POST', {
      usuario_id: usuarioId,
      foto_base64: fotoBase64,
      tipo,
    }),

  // ========== 👴 ADULTOS MAYORES ==========
  obtenerAdultoMayorPrincipal: (usuarioId) =>
    peticion('/info-adulto/principal', 'POST', { usuario_id: usuarioId }),

  actualizarAdultoMayor: (usuarioId, adultoId, datos) =>
    peticion('/info-adulto/actualizar', 'POST', { usuario_id: usuarioId, adulto_id: adultoId, datos }),

  obtenerEstadisticasSalud: (usuarioId, adultoId) =>
    peticion('/info-adulto/estadisticas', 'POST', { usuario_id: usuarioId, adulto_id: adultoId }),

  generarReporteSalud: (usuarioId, adultoId, tipo) =>
    peticion('/info-adulto/generar-reporte', 'POST', { usuario_id: usuarioId, adulto_id: adultoId, tipo }),

  // Enfermedades
  obtenerEnfermedades: (adultoId) =>
    peticion('/info-adulto/enfermedades', 'POST', { adulto_id: adultoId }),

  agregarEnfermedad: (usuarioId, adultoId, enfermedad) =>
    peticion('/info-adulto/enfermedades/agregar', 'POST', { usuario_id: usuarioId, adulto_id: adultoId, enfermedad }),

  actualizarEnfermedad: (usuarioId, enfermedadId, datos) =>
    peticion('/info-adulto/enfermedades/actualizar', 'POST', { usuario_id: usuarioId, enfermedad_id: enfermedadId, datos }),

  eliminarEnfermedad: (usuarioId, enfermedadId) =>
    peticion('/info-adulto/enfermedades/eliminar', 'POST', { usuario_id: usuarioId, enfermedad_id: enfermedadId }),

  // Alergias
  obtenerAlergias: (adultoId) =>
    peticion('/info-adulto/alergias', 'POST', { adulto_id: adultoId }),

  agregarAlergia: (usuarioId, adultoId, alergia) =>
    peticion('/info-adulto/alergias/agregar', 'POST', { usuario_id: usuarioId, adulto_id: adultoId, alergia }),

  // Artículos
  obtenerArticulos: (adultoId) =>
    peticion('/info-adulto/articulos', 'POST', { adulto_id: adultoId }),

  agregarArticulo: (usuarioId, adultoId, articulo) =>
    peticion('/info-adulto/articulos/agregar', 'POST', { usuario_id: usuarioId, adulto_id: adultoId, articulo }),

  // Hobbies
  obtenerHobbies: (adultoId) =>
    peticion('/info-adulto/hobbies', 'POST', { adulto_id: adultoId }),

  agregarHobby: (usuarioId, adultoId, hobby) =>
    peticion('/info-adulto/hobbies/agregar', 'POST', { usuario_id: usuarioId, adulto_id: adultoId, hobby }),

  // ========== 💊 MEDICINAS ==========
  obtenerTodasMedicinas: (usuarioId) =>
    peticion('/medicinas/todas', 'POST', { usuario_id: usuarioId }),

  obtenerMedicinasHoy: (usuarioId) =>
    peticion('/medicinas/hoy', 'POST', { usuario_id: usuarioId }),

  obtenerMedicinasFrecuentes: (usuarioId, limite = 5) =>
    peticion('/medicinas/frecuentes', 'POST', { usuario_id: usuarioId, limite }),

  crearMedicina: (usuarioId, medicina) =>
    peticion('/medicinas/crear', 'POST', { usuario_id: usuarioId, medicina }),

  actualizarMedicina: (usuarioId, medicinaId, medicina) =>
    peticion('/medicinas/actualizar', 'POST', { usuario_id: usuarioId, medicina_id: medicinaId, medicina }),

  eliminarMedicina: (usuarioId, medicinaId) =>
    peticion('/medicinas/eliminar', 'POST', { usuario_id: usuarioId, medicina_id: medicinaId }),

  marcarMedicinaTomada: (usuarioId, medicinaId, fechaToma, horario, observaciones) =>
    peticion('/medicinas/marcar-tomada', 'POST', {
      usuario_id: usuarioId,
      medicina_id: medicinaId,
      fecha_toma: fechaToma,
      horario,
      observaciones,
    }),

  eliminarTomaMedicina: (usuarioId, medicinaId, horario) =>
    peticion('/medicinas/eliminar-toma', 'DELETE', {
      usuario_id: usuarioId,
      medicina_id: medicinaId,
      horario,
    }),

  obtenerRegistrosMedicina: (usuarioId, fechaInicio, fechaFin) =>
    peticion('/medicinas/registros', 'POST', { usuario_id: usuarioId, fecha_inicio: fechaInicio, fecha_fin: fechaFin }),

  obtenerMedicinasPorFrecuencia: (usuarioId, frecuencia) =>
    peticion('/medicinas/por-frecuencia', 'POST', { usuario_id: usuarioId, frecuencia }),

  obtenerEstadisticasMedicinas: (usuarioId) =>
    peticion('/medicinas/estadisticas', 'POST', { usuario_id: usuarioId }),

  actualizarStockMedicina: (usuarioId, medicinaId, nuevoStock) =>
    peticion('/medicinas/actualizar-stock', 'POST', { usuario_id: usuarioId, medicina_id: medicinaId, nuevo_stock: nuevoStock }),

  obtenerMedicinasStockBajo: (usuarioId) =>
    peticion('/medicinas/stock-bajo', 'POST', { usuario_id: usuarioId }),

  buscarMedicinas: (usuarioId, busqueda) =>
    peticion('/medicinas/buscar', 'POST', { usuario_id: usuarioId, busqueda }),

  obtenerMedicamentosPredefinidos: () =>
    peticion('/medicinas/predefinidos', 'GET'),

  // ========== 📅 CALENDARIO ==========
  obtenerConfiguracionCalendario: (usuarioId) =>
    peticion('/calendario/configuracion', 'POST', { usuario_id: usuarioId }),

  guardarConfiguracionCalendario: (usuarioId, configuracion) =>
    peticion('/calendario/guardar-configuracion', 'POST', { usuario_id: usuarioId, configuracion }),

  obtenerEventos: (usuarioId) =>
    peticion('/calendario/eventos', 'POST', { usuario_id: usuarioId }),

  obtenerEventosPorRango: (usuarioId, fechaInicio, fechaFin) =>
    peticion('/calendario/eventos-rango', 'POST', { usuario_id: usuarioId, fecha_inicio: fechaInicio, fecha_fin: fechaFin }),

  obtenerEventosPorFecha: (usuarioId, fecha) =>
    peticion('/calendario/eventos-fecha', 'POST', { usuario_id: usuarioId, fecha }),

  obtenerEventosProximos: (usuarioId, limite = 10) =>
    peticion('/calendario/eventos-proximos', 'POST', { usuario_id: usuarioId, limite }),

  crearEvento: (usuarioId, evento) =>
    peticion('/calendario/crear-evento', 'POST', { usuario_id: usuarioId, evento }),

  actualizarEvento: (usuarioId, eventoId, evento) =>
    peticion(`/calendario/actualizar-evento/${eventoId}`, 'PUT', { usuario_id: usuarioId, evento }),

  eliminarEvento: (usuarioId, eventoId) =>
    peticion(`/calendario/eliminar-evento/${eventoId}`, 'DELETE', { usuario_id: usuarioId }),

  obtenerEventosPorTipo: (usuarioId, tipo) =>
    peticion('/calendario/eventos-tipo', 'POST', { usuario_id: usuarioId, tipo }),

  obtenerEventosHoy: (usuarioId) =>
    peticion('/calendario/eventos-hoy', 'POST', { usuario_id: usuarioId }),

  obtenerEstadisticasEventos: (usuarioId, fechaInicio, fechaFin) =>
    peticion('/calendario/estadisticas', 'POST', { usuario_id: usuarioId, fecha_inicio: fechaInicio, fecha_fin: fechaFin }),

  buscarEventos: (usuarioId, busqueda) =>
    peticion('/calendario/buscar-eventos', 'POST', { usuario_id: usuarioId, busqueda }),

  obtenerTiposEventosPredefinidos: () =>
    peticion('/calendario/tipos-eventos', 'GET'),

  obtenerCumpleanosFamiliares: (usuarioId) =>
    peticion('/calendario/cumpleanos', 'POST', { usuario_id: usuarioId }),

  // ========== 👨‍👩‍👧‍👦 FAMILIA ==========
  obtenerGrupoFamiliar: (usuarioId) =>
    peticion('/familia/grupo-familiar', 'POST', { usuario_id: usuarioId }),

  obtenerCodigoFamiliar: (usuarioId) =>
    peticion('/familia/codigo-familiar', 'POST', { usuario_id: usuarioId }),

  regenerarCodigoFamiliar: (usuarioId) =>
    peticion('/familia/regenerar-codigo', 'POST', { usuario_id: usuarioId }),

  obtenerFamiliares: (usuarioId) =>
    peticion('/familia/familiares', 'POST', { usuario_id: usuarioId }),

  crearFamiliar: (usuarioId, datosFamiliar) =>
    peticion('/familia/agregar-familiar', 'POST', { usuario_id: usuarioId, datos_familiar: datosFamiliar }),

  actualizarFamiliar: (usuarioId, familiarId, datos) =>
    peticion(`/familia/actualizar-familiar/${familiarId}`, 'PUT', { usuario_id: usuarioId, datos_familiar: datos }),

  eliminarFamiliar: (usuarioId, familiarId) =>
    peticion(`/familia/eliminar-familiar/${familiarId}`, 'DELETE', { usuario_id: usuarioId }),

  obtenerCodigosPersonalizados: (usuarioId) =>
    peticion('/familia/codigos-personalizados', 'POST', { usuario_id: usuarioId }),

  crearCodigoPersonalizado: (usuarioId, datosCodigo) =>
    peticion('/familia/crear-codigo-personalizado', 'POST', { usuario_id: usuarioId, datos_codigo: datosCodigo }),

  eliminarCodigoPersonalizado: (usuarioId, codigoId) =>
    peticion(`/familia/eliminar-codigo-personalizado/${codigoId}`, 'DELETE', { usuario_id: usuarioId }),

  actualizarAdultoMayorGrupo: (usuarioId, datosAdultoMayor) =>
    peticion('/familia/actualizar-adulto-mayor', 'POST', { usuario_id: usuarioId, datos_adulto_mayor: datosAdultoMayor }),

  obtenerAdultoMayorGrupo: (usuarioId) =>
    peticion('/familia/adulto-mayor', 'POST', { usuario_id: usuarioId }),

  // ========== 💰 GASTOS ==========
  crearGasto: (usuarioId, datosGasto) =>
    peticion('/gastos/crear', 'POST', { usuario_id: usuarioId, datos_gasto: datosGasto }),

  obtenerGastosFuturos: (usuarioId) =>
    peticion('/gastos/futuros', 'POST', { usuario_id: usuarioId }),

  obtenerGastosMesActual: (usuarioId) =>
    peticion('/gastos/mes-actual', 'POST', { usuario_id: usuarioId }),

  obtenerGastosPasados: (usuarioId, limite = 50) =>
    peticion('/gastos/historial', 'POST', { usuario_id: usuarioId, limite }),

  obtenerGastoPorId: (usuarioId, gastoId) =>
    peticion('/gastos/detalle', 'POST', { usuario_id: usuarioId, gasto_id: gastoId }),

  actualizarGasto: (usuarioId, gastoId, datos) =>
    peticion(`/gastos/actualizar/${gastoId}`, 'PUT', { usuario_id: usuarioId, datos_actualizacion: datos }),

  eliminarGasto: (usuarioId, gastoId) =>
    peticion(`/gastos/eliminar/${gastoId}`, 'DELETE', { usuario_id: usuarioId }),

  marcarGastoPagado: (usuarioId, gastoId) =>
    peticion(`/gastos/marcar-pagado/${gastoId}`, 'POST', { usuario_id: usuarioId }),

  obtenerDistribucionPorcentajes: (usuarioId) =>
    peticion('/gastos/distribucion', 'POST', { usuario_id: usuarioId }),

  guardarDistribucionPorcentajes: (usuarioId, porcentajes) =>
    peticion('/gastos/guardar-distribucion', 'POST', { usuario_id: usuarioId, porcentajes }),

  obtenerAportesMesActual: (usuarioId) =>
    peticion('/gastos/aportes-mes', 'POST', { usuario_id: usuarioId }),

  registrarAporteGasto: (usuarioId, gastoId, monto, notas) =>
    peticion(`/gastos/registrar-aporte/${gastoId}`, 'POST', { usuario_id: usuarioId, monto, notas }),

  verificarEsAdministrador: (usuarioId) =>
    peticion('/gastos/verificar-admin', 'POST', { usuario_id: usuarioId }),

  obtenerEstadisticasResumen: (usuarioId) =>
    peticion('/gastos/estadisticas', 'POST', { usuario_id: usuarioId }),

  generarReporteGastos: (usuarioId, tipoReporte, filtros) =>
    peticion('/gastos/generar-reporte', 'POST', { usuario_id: usuarioId, tipo_reporte: tipoReporte, filtros }),

  // ========== 📋 HORARIO - ACTIVIDADES BASE ==========
  obtenerActividadesBase: (usuarioId) =>
    peticion('/horario/actividades-base', 'POST', { usuario_id: usuarioId }),

  crearActividadBase: (usuarioId, datos) =>
    peticion('/horario/actividades-base/crear', 'POST', { usuario_id: usuarioId, ...datos }),

  actualizarActividadBase: (actividadBaseId, datos) =>
    peticion(`/horario/actividades-base/${actividadBaseId}`, 'PUT', datos),

  eliminarActividadBase: (actividadBaseId) =>
    peticion(`/horario/actividades-base/${actividadBaseId}`, 'DELETE'),

  // ========== 📋 HORARIO - OCURRENCIAS ==========
  obtenerOcurrenciasPorRango: (usuarioId, fechaInicio, fechaFin) =>
    peticion('/horario/ocurrencias/rango', 'POST', {
      usuario_id: usuarioId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    }),

  crearOcurrencia: (usuarioId, datos) =>
    peticion('/horario/ocurrencias/crear', 'POST', { usuario_id: usuarioId, ...datos }),

  actualizarOcurrencia: (ocurrenciaId, datos) =>
    peticion(`/horario/ocurrencias/${ocurrenciaId}`, 'PUT', datos),

  eliminarOcurrencia: (ocurrenciaId) =>
    peticion(`/horario/ocurrencias/${ocurrenciaId}`, 'DELETE'),

  // ========== 📋 HORARIO - OTRAS ==========
  obtenerConfiguracionHorario: (usuarioId) =>
    peticion('/horario/configuracion', 'POST', { usuario_id: usuarioId }),

  guardarConfiguracionHorario: (usuarioId, configuracion) =>
    peticion('/horario/guardar-configuracion', 'POST', { usuario_id: usuarioId, configuracion }),

  obtenerActividadesFijas: (usuarioId) =>
    peticion('/horario/actividades-fijas', 'POST', { usuario_id: usuarioId }),

  crearActividad: (usuarioId, actividad) =>
    peticion('/horario/crear-actividad', 'POST', { usuario_id: usuarioId, actividad }),

  actualizarActividad: (usuarioId, actividadId, actividad) =>
    peticion(`/horario/actualizar-actividad/${actividadId}`, 'PUT', { usuario_id: usuarioId, actividad }),

  eliminarActividad: (usuarioId, actividadId) =>
    peticion(`/horario/eliminar-actividad/${actividadId}`, 'DELETE', { usuario_id: usuarioId }),

  obtenerActividadesPorFecha: (usuarioId, fecha) =>
    peticion('/horario/actividades-fecha', 'POST', { usuario_id: usuarioId, fecha }),

  obtenerActividadesHoy: (usuarioId) =>
    peticion('/horario/actividades-hoy', 'POST', { usuario_id: usuarioId }),

  obtenerActividadesPorTipo: (usuarioId, tipo) =>
    peticion('/horario/actividades-tipo', 'POST', { usuario_id: usuarioId, tipo }),

  obtenerActividadesSemana: (usuarioId, fechaInicio) =>
    peticion('/horario/actividades-semana', 'POST', { usuario_id: usuarioId, fecha_inicio: fechaInicio }),

  registrarActividadRealizada: (usuarioId, actividadId, fecha, completada, observaciones) =>
    peticion('/horario/registrar-actividad', 'POST', {
      usuario_id: usuarioId,
      actividad_id: actividadId,
      fecha,
      completada,
      observaciones,
    }),

  obtenerResumenDiario: (usuarioId, fecha) =>
    peticion('/horario/resumen-diario', 'POST', { usuario_id: usuarioId, fecha }),

  buscarConflictosHorario: (usuarioId, dias, horaInicio, horaFin, actividadId) =>
    peticion('/horario/buscar-conflictos', 'POST', {
      usuario_id: usuarioId,
      dias,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      actividad_id: actividadId,
    }),

  obtenerActividadesPredefinidas: () =>
    peticion('/horario/actividades-predeifinidas', 'GET'),

  // ========== 🩺 INFORMACIÓN COMPLETA DEL ADULTO (opcional) ==========
  obtenerInfoCompletaAnciano: (usuarioId) =>
    peticion('/info-adulto/completa', 'POST', { usuario_id: usuarioId }),

  // ========== 📧 ENVÍO DE CORREOS (genérico) ==========
  enviarCorreoVerificacion: (datos) => {
    console.warn('⚠️ enviarCorreoVerificacion no está implementado. Usa solicitarRecuperacion o completarPerfilConCodigo.');
    return Promise.resolve({ exito: false, error: 'Función no disponible' });
  },

  // ========== 🔧 UTILIDADES ==========
  probarConexion: () => peticion('/test', 'GET'),

  obtenerUsuarioActualId: async () => {
    try {
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        return usuario.id || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error en obtenerUsuarioActualId:', error);
      return null;
    }
  },

  subirImagenPerfil: (usuarioId, formData) => {
    // Para subir archivos (si se necesita)
    return peticion('/preferencias/subir-foto-perfil', 'POST', formData);
  },
};

export default servicioAPI;