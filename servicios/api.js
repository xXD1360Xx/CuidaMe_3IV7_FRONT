// api.js - Servicio de API para CuidaMe
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 URL base - CAMBIA ESTA URL POR LA DE TU BACKEND
const obtenerURLBase = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return 'https://tu-backend-cuidame.com/api';
};

const URL_BASE_API = obtenerURLBase();
console.log('🔗 [API CuidaMe] URL base:', URL_BASE_API);

// Función auxiliar para obtener token
const obtenerToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    return null;
  }
};

// Función auxiliar para obtener headers
const obtenerHeaders = async (contenidoJSON = true) => {
  try {
    const token = await obtenerToken();
    const headers = contenidoJSON 
      ? {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      : {};
    
    if (token && token.trim() !== '') {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  } catch (error) {
    console.error('❌ Error obteniendo headers:', error);
    return contenidoJSON 
      ? { 'Content-Type': 'application/json' }
      : {};
  }
};

// Servicio de API para CuidaMe
export const servicioAPI = {
  // ========== 🔐 AUTENTICACIÓN ==========
  
  iniciarSesion: async (identificador, contrasena) => {
    const url = `${URL_BASE_API}/auth/login`;
    console.log('🔍 [API] iniciarSesion →', url);
    
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ identificador, contrasena }),
      });
      
      console.log('📡 [API] iniciarSesion Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] iniciarSesion Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  iniciarSesionConCodigoFamiliar: async (email, contrasena, codigo) => {
    const url = `${URL_BASE_API}/auth/login-con-codigo-familiar`;
    console.log('🔍 [API] iniciarSesionConCodigoFamiliar →', url);
    
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, contrasena, codigo }),
      });
      
      console.log('📡 [API] iniciarSesionConCodigoFamiliar Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] iniciarSesionConCodigoFamiliar Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  iniciarSesionConCodigoPersonalizado: async (codigo) => {
    const url = `${URL_BASE_API}/auth/login-con-codigo-personalizado`;
    console.log('🔍 [API] iniciarSesionConCodigoPersonalizado →', url);
    
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ codigo }),
      });
      
      console.log('📡 [API] iniciarSesionConCodigoPersonalizado Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] iniciarSesionConCodigoPersonalizado Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  registrarUsuario: async (datosUsuario, endpoint = '/registro') => {
    const url = `${URL_BASE_API}${endpoint}`;
    console.log('🔍 [API] registrarUsuario →', url);
    
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(datosUsuario),
      });
      
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] registrarUsuario Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión de red'
      };
    }
  },

  verificarToken: async () => {
    console.log('🔍 [API] verificarToken →', `${URL_BASE_API}/auth/verificar`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/auth/verificar`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] verificarToken Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] verificarToken Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  cerrarSesion: async () => {
    console.log('🔍 [API] cerrarSesion →', `${URL_BASE_API}/auth/logout`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/auth/logout`, {
        method: 'POST',
        headers,
      });
      
      console.log('📡 [API] cerrarSesion Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] cerrarSesion Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  enviarCorreoVerificacion: async (datos) => {
    console.log('🔍 [API] enviarCorreoVerificacion →', `${URL_BASE_API}/auth/enviar-codigo`);
    
    try {
      const respuesta = await fetch(`${URL_BASE_API}/auth/enviar-codigo`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(datos),
      });
      
      console.log('📡 [API] enviarCorreoVerificacion Status:', respuesta.status);
      const datosRespuesta = await respuesta.json();
      return datosRespuesta;
    } catch (error) {
      console.error('❌ [API] enviarCorreoVerificacion Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  recuperarContrasena: async (datos) => {
    console.log('🔍 [API] recuperarContrasena →', `${URL_BASE_API}/auth/recuperar-contrasena`);
    
    try {
      const respuesta = await fetch(`${URL_BASE_API}/auth/recuperar-contrasena`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(datos),
      });
      
      console.log('📡 [API] recuperarContrasena Status:', respuesta.status);
      const datosRespuesta = await respuesta.json();
      return datosRespuesta;
    } catch (error) {
      console.error('❌ [API] recuperarContrasena Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  cambiarContrasena: async (datos) => {
    console.log('🔍 [API] cambiarContrasena →', `${URL_BASE_API}/auth/cambiar-contrasena`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/auth/cambiar-contrasena`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datos),
      });
      
      console.log('📡 [API] cambiarContrasena Status:', respuesta.status);
      const datosRespuesta = await respuesta.json();
      return datosRespuesta;
    } catch (error) {
      console.error('❌ [API] cambiarContrasena Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  // ========== 👤 USUARIOS Y PERFILES ==========

  obtenerMiPerfil: async () => {
    console.log('🔍 [API] obtenerMiPerfil →', `${URL_BASE_API}/usuario/perfil`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/perfil`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerMiPerfil Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerMiPerfil Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        usuario: null
      };
    }
  },

  actualizarUsuario: async (usuarioId, datosUsuario) => {
    console.log('🔍 [API] actualizarUsuario →', `${URL_BASE_API}/usuario/${usuarioId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/${usuarioId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(datosUsuario),
      });
      
      console.log('📡 [API] actualizarUsuario Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarUsuario Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  obtenerTelefonosUsuario: async (usuarioId) => {
    console.log('🔍 [API] obtenerTelefonosUsuario →', `${URL_BASE_API}/usuario/${usuarioId}/telefonos`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/${usuarioId}/telefonos`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerTelefonosUsuario Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerTelefonosUsuario Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        telefonos: []
      };
    }
  },

  agregarTelefono: async (datosTelefono) => {
    console.log('🔍 [API] agregarTelefono →', `${URL_BASE_API}/usuario/telefonos`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/telefonos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datosTelefono),
      });
      
      console.log('📡 [API] agregarTelefono Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] agregarTelefono Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  eliminarTelefono: async (telefonoId) => {
    console.log('🔍 [API] eliminarTelefono →', `${URL_BASE_API}/usuario/telefonos/${telefonoId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/telefonos/${telefonoId}`, {
        method: 'DELETE',
        headers,
      });
      
      console.log('📡 [API] eliminarTelefono Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] eliminarTelefono Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  marcarTelefonoPrincipal: async (telefonoId) => {
    console.log('🔍 [API] marcarTelefonoPrincipal →', `${URL_BASE_API}/usuario/telefonos/${telefonoId}/principal`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/telefonos/${telefonoId}/principal`, {
        method: 'PUT',
        headers,
      });
      
      console.log('📡 [API] marcarTelefonoPrincipal Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] marcarTelefonoPrincipal Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  obtenerPreferenciasUsuario: async (usuarioId) => {
    console.log('🔍 [API] obtenerPreferenciasUsuario →', `${URL_BASE_API}/usuario/${usuarioId}/preferencias`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/${usuarioId}/preferencias`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerPreferenciasUsuario Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerPreferenciasUsuario Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        preferencias: null
      };
    }
  },

  actualizarPreferencias: async (preferencias) => {
    console.log('🔍 [API] actualizarPreferencias →', `${URL_BASE_API}/usuario/preferencias`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/preferencias`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(preferencias),
      });
      
      console.log('📡 [API] actualizarPreferencias Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarPreferencias Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión al servidor'
      };
    }
  },

  verificarOtrosAdministradores: async () => {
    console.log('🔍 [API] verificarOtrosAdministradores →', `${URL_BASE_API}/usuario/verificar-otros-admins`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/verificar-otros-admins`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] verificarOtrosAdministradores Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] verificarOtrosAdministradores Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  renunciarAdministrador: async () => {
    console.log('🔍 [API] renunciarAdministrador →', `${URL_BASE_API}/usuario/renunciar-admin`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/renunciar-admin`, {
        method: 'POST',
        headers,
      });
      
      console.log('📡 [API] renunciarAdministrador Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] renunciarAdministrador Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  solicitarEliminacionCuenta: async () => {
    console.log('🔍 [API] solicitarEliminacionCuenta →', `${URL_BASE_API}/usuario/solicitar-eliminacion`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/solicitar-eliminacion`, {
        method: 'POST',
        headers,
      });
      
      console.log('📡 [API] solicitarEliminacionCuenta Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] solicitarEliminacionCuenta Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // ========== 👴 ADULTOS MAYORES ==========

  obtenerAdultoMayorPrincipal: async (usuarioId) => {
    console.log('🔍 [API] obtenerAdultoMayorPrincipal →', `${URL_BASE_API}/adultos-mayores/principal/${usuarioId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/adultos-mayores/principal/${usuarioId}`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerAdultoMayorPrincipal Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerAdultoMayorPrincipal Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        adultoMayor: null
      };
    }
  },

  // ========== 💊 MEDICINAS ==========

  obtenerMedicinasPorFecha: async (fecha) => {
    console.log('🔍 [API] obtenerMedicinasPorFecha →', `${URL_BASE_API}/medicinas/fecha/${fecha}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/medicinas/fecha/${fecha}`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerMedicinasPorFecha Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerMedicinasPorFecha Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        medicinas: []
      };
    }
  },

  obtenerTodasMedicinas: async () => {
    console.log('🔍 [API] obtenerTodasMedicinas →', `${URL_BASE_API}/medicinas`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/medicinas`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerTodasMedicinas Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerTodasMedicinas Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        medicinas: []
      };
    }
  },

  obtenerMedicinasFrecuentes: async () => {
    console.log('🔍 [API] obtenerMedicinasFrecuentes →', `${URL_BASE_API}/medicinas/frecuentes`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/medicinas/frecuentes`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerMedicinasFrecuentes Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerMedicinasFrecuentes Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        medicinas: []
      };
    }
  },

  crearMedicina: async (datosMedicina) => {
    console.log('🔍 [API] crearMedicina →', `${URL_BASE_API}/medicinas`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/medicinas`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datosMedicina),
      });
      
      console.log('📡 [API] crearMedicina Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] crearMedicina Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  actualizarMedicina: async (medicinaId, datosMedicina) => {
    console.log('🔍 [API] actualizarMedicina →', `${URL_BASE_API}/medicinas/${medicinaId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/medicinas/${medicinaId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(datosMedicina),
      });
      
      console.log('📡 [API] actualizarMedicina Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarMedicina Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  eliminarMedicina: async (medicinaId) => {
    console.log('🔍 [API] eliminarMedicina →', `${URL_BASE_API}/medicinas/${medicinaId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/medicinas/${medicinaId}`, {
        method: 'DELETE',
        headers,
      });
      
      console.log('📡 [API] eliminarMedicina Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] eliminarMedicina Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  marcarMedicinaTomada: async (medicinaId, fecha, horarioId) => {
    console.log('🔍 [API] marcarMedicinaTomada →', `${URL_BASE_API}/medicinas/${medicinaId}/tomada`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/medicinas/${medicinaId}/tomada`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fecha, horarioId }),
      });
      
      console.log('📡 [API] marcarMedicinaTomada Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] marcarMedicinaTomada Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // ========== 📅 EVENTOS Y CALENDARIO ==========

  obtenerEventosPorRango: async (fechaInicio, fechaFin) => {
    console.log('🔍 [API] obtenerEventosPorRango →', `${URL_BASE_API}/eventos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/eventos?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerEventosPorRango Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerEventosPorRango Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        eventos: []
      };
    }
  },

  crearEvento: async (datosEvento) => {
    console.log('🔍 [API] crearEvento →', `${URL_BASE_API}/eventos`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/eventos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datosEvento),
      });
      
      console.log('📡 [API] crearEvento Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] crearEvento Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  actualizarEvento: async (eventoId, datosEvento) => {
    console.log('🔍 [API] actualizarEvento →', `${URL_BASE_API}/eventos/${eventoId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/eventos/${eventoId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(datosEvento),
      });
      
      console.log('📡 [API] actualizarEvento Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarEvento Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  eliminarEvento: async (eventoId) => {
    console.log('🔍 [API] eliminarEvento →', `${URL_BASE_API}/eventos/${eventoId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/eventos/${eventoId}`, {
        method: 'DELETE',
        headers,
      });
      
      console.log('📡 [API] eliminarEvento Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] eliminarEvento Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // ========== 👨‍👩‍👧‍👦 FAMILIA Y GRUPOS ==========

  obtenerFamiliares: async () => {
    console.log('🔍 [API] obtenerFamiliares →', `${URL_BASE_API}/familiares`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familiares`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerFamiliares Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerFamiliares Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        familiares: []
      };
    }
  },

  obtenerCodigoFamiliar: async () => {
    console.log('🔍 [API] obtenerCodigoFamiliar →', `${URL_BASE_API}/familia/codigo`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familia/codigo`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerCodigoFamiliar Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerCodigoFamiliar Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  regenerarCodigoFamiliar: async () => {
    console.log('🔍 [API] regenerarCodigoFamiliar →', `${URL_BASE_API}/familia/codigo/regenerar`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familia/codigo/regenerar`, {
        method: 'POST',
        headers,
      });
      
      console.log('📡 [API] regenerarCodigoFamiliar Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] regenerarCodigoFamiliar Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  obtenerCodigosPersonalizados: async () => {
    console.log('🔍 [API] obtenerCodigosPersonalizados →', `${URL_BASE_API}/familia/codigos-personalizados`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familia/codigos-personalizados`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerCodigosPersonalizados Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerCodigosPersonalizados Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        codigos: []
      };
    }
  },

  crearFamiliar: async (datosFamiliar) => {
    console.log('🔍 [API] crearFamiliar →', `${URL_BASE_API}/familiares`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familiares`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datosFamiliar),
      });
      
      console.log('📡 [API] crearFamiliar Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] crearFamiliar Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  actualizarFamiliar: async (familiarId, datosFamiliar) => {
    console.log('🔍 [API] actualizarFamiliar →', `${URL_BASE_API}/familiares/${familiarId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familiares/${familiarId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(datosFamiliar),
      });
      
      console.log('📡 [API] actualizarFamiliar Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarFamiliar Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  eliminarFamiliar: async (familiarId) => {
    console.log('🔍 [API] eliminarFamiliar →', `${URL_BASE_API}/familiares/${familiarId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familiares/${familiarId}`, {
        method: 'DELETE',
        headers,
      });
      
      console.log('📡 [API] eliminarFamiliar Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] eliminarFamiliar Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  crearCodigoPersonalizado: async (datosCodigo) => {
    console.log('🔍 [API] crearCodigoPersonalizado →', `${URL_BASE_API}/familia/codigos-personalizados`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familia/codigos-personalizados`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datosCodigo),
      });
      
      console.log('📡 [API] crearCodigoPersonalizado Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] crearCodigoPersonalizado Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  eliminarCodigoPersonalizado: async (codigoId) => {
    console.log('🔍 [API] eliminarCodigoPersonalizado →', `${URL_BASE_API}/familia/codigos-personalizados/${codigoId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/familia/codigos-personalizados/${codigoId}`, {
        method: 'DELETE',
        headers,
      });
      
      console.log('📡 [API] eliminarCodigoPersonalizado Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] eliminarCodigoPersonalizado Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // ========== 💰 GASTOS ==========

  obtenerGastosFuturos: async () => {
    console.log('🔍 [API] obtenerGastosFuturos →', `${URL_BASE_API}/gastos/futuros`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/futuros`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerGastosFuturos Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerGastosFuturos Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        gastos: []
      };
    }
  },

  obtenerGastosMesActual: async () => {
    console.log('🔍 [API] obtenerGastosMesActual →', `${URL_BASE_API}/gastos/mes-actual`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/mes-actual`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerGastosMesActual Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerGastosMesActual Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        gastos: []
      };
    }
  },

  obtenerAportesMesActual: async () => {
    console.log('🔍 [API] obtenerAportesMesActual →', `${URL_BASE_API}/gastos/aportes/mes-actual`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/aportes/mes-actual`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerAportesMesActual Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerAportesMesActual Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        aportes: []
      };
    }
  },

  crearGasto: async (datosGasto) => {
    console.log('🔍 [API] crearGasto →', `${URL_BASE_API}/gastos`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datosGasto),
      });
      
      console.log('📡 [API] crearGasto Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] crearGasto Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  actualizarGasto: async (gastoId, datosGasto) => {
    console.log('🔍 [API] actualizarGasto →', `${URL_BASE_API}/gastos/${gastoId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/${gastoId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(datosGasto),
      });
      
      console.log('📡 [API] actualizarGasto Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarGasto Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  eliminarGasto: async (gastoId) => {
    console.log('🔍 [API] eliminarGasto →', `${URL_BASE_API}/gastos/${gastoId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/${gastoId}`, {
        method: 'DELETE',
        headers,
      });
      
      console.log('📡 [API] eliminarGasto Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] eliminarGasto Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  marcarGastoPagado: async (gastoId) => {
    console.log('🔍 [API] marcarGastoPagado →', `${URL_BASE_API}/gastos/${gastoId}/pagado`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/${gastoId}/pagado`, {
        method: 'PUT',
        headers,
      });
      
      console.log('📡 [API] marcarGastoPagado Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] marcarGastoPagado Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  guardarDistribucionPorcentajes: async (porcentajes) => {
    console.log('🔍 [API] guardarDistribucionPorcentajes →', `${URL_BASE_API}/gastos/distribucion`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/distribucion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ porcentajes }),
      });
      
      console.log('📡 [API] guardarDistribucionPorcentajes Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] guardarDistribucionPorcentajes Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  obtenerDistribucionPorcentajes: async () => {
    console.log('🔍 [API] obtenerDistribucionPorcentajes →', `${URL_BASE_API}/gastos/distribucion`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/gastos/distribucion`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerDistribucionPorcentajes Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerDistribucionPorcentajes Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        distribucion: {}
      };
    }
  },

  // ========== 📋 RUTINAS Y ACTIVIDADES ==========

  obtenerConfiguracionHorario: async () => {
    console.log('🔍 [API] obtenerConfiguracionHorario →', `${URL_BASE_API}/horario/configuracion`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/horario/configuracion`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerConfiguracionHorario Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerConfiguracionHorario Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        configuracion: null
      };
    }
  },

  obtenerActividadesFijas: async () => {
    console.log('🔍 [API] obtenerActividadesFijas →', `${URL_BASE_API}/horario/actividades-fijas`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/horario/actividades-fijas`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerActividadesFijas Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerActividadesFijas Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        actividades: []
      };
    }
  },

  guardarConfiguracionHorario: async (configuracion) => {
    console.log('🔍 [API] guardarConfiguracionHorario →', `${URL_BASE_API}/horario/configuracion`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/horario/configuracion`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(configuracion),
      });
      
      console.log('📡 [API] guardarConfiguracionHorario Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] guardarConfiguracionHorario Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  crearActividad: async (datosActividad) => {
    console.log('🔍 [API] crearActividad →', `${URL_BASE_API}/horario/actividades`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/horario/actividades`, {
        method: 'POST',
        headers,
        body: JSON.stringify(datosActividad),
      });
      
      console.log('📡 [API] crearActividad Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] crearActividad Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  actualizarActividad: async (actividadId, datosActividad) => {
    console.log('🔍 [API] actualizarActividad →', `${URL_BASE_API}/horario/actividades/${actividadId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/horario/actividades/${actividadId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(datosActividad),
      });
      
      console.log('📡 [API] actualizarActividad Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarActividad Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  eliminarActividad: async (actividadId) => {
    console.log('🔍 [API] eliminarActividad →', `${URL_BASE_API}/horario/actividades/${actividadId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/horario/actividades/${actividadId}`, {
        method: 'DELETE',
        headers,
      });
      
      console.log('📡 [API] eliminarActividad Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] eliminarActividad Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // ========== 🩺 INFORMACIÓN MÉDICA ==========

  obtenerInformacionAnciano: async (adultoMayorId) => {
    console.log('🔍 [API] obtenerInformacionAnciano →', `${URL_BASE_API}/info-anciano/${adultoMayorId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/info-anciano/${adultoMayorId}`, {
        method: 'GET',
        headers,
      });
      
      console.log('📡 [API] obtenerInformacionAnciano Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] obtenerInformacionAnciano Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión',
        info: null
      };
    }
  },

  actualizarInformacionAnciano: async (adultoMayorId, datosInfo) => {
    console.log('🔍 [API] actualizarInformacionAnciano →', `${URL_BASE_API}/info-anciano/${adultoMayorId}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/info-anciano/${adultoMayorId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(datosInfo),
      });
      
      console.log('📡 [API] actualizarInformacionAnciano Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] actualizarInformacionAnciano Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // ========== 📊 REPORTES Y ESTADÍSTICAS ==========

  generarReporte: async (tipoReporte, parametros) => {
    console.log('🔍 [API] generarReporte →', `${URL_BASE_API}/reportes/${tipoReporte}`);
    
    try {
      const headers = await obtenerHeaders();
      const respuesta = await fetch(`${URL_BASE_API}/reportes/${tipoReporte}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(parametros),
      });
      
      console.log('📡 [API] generarReporte Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] generarReporte Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // ========== 🔧 UTILIDADES ==========

  probarConexion: async () => {
    console.log('🔍 [API] probarConexion →', `${URL_BASE_API}/test`);
    
    try {
      const respuesta = await fetch(`${URL_BASE_API}/test`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });
      
      console.log('📡 [API] probarConexion Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] probarConexion Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },

  // Función auxiliar para obtener ID de usuario actual
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

  // Función para subir imagen de perfil
  subirImagenPerfil: async (formData) => {
    console.log('🔍 [API] subirImagenPerfil →', `${URL_BASE_API}/usuario/upload-profile-image`);
    
    try {
      const token = await obtenerToken();
      const respuesta = await fetch(`${URL_BASE_API}/usuario/upload-profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      console.log('📡 [API] subirImagenPerfil Status:', respuesta.status);
      const datos = await respuesta.json();
      return datos;
    } catch (error) {
      console.error('❌ [API] subirImagenPerfil Error:', error.message);
      return { 
        exito: false, 
        error: 'Error de conexión'
      };
    }
  },
};