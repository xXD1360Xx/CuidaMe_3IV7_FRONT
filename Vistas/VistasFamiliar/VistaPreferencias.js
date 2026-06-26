import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// Colores de CuidaMe
const COLORES = {
  AZUL_CIELO: '#87CEEB',
  AZUL_CIELO_OSCURO: '#5D8AA8',
  BLANCO: '#FFFFFF',
  AMARILLO_PLATANO: '#FFE135',
  AMARILLO_OSCURO: '#FFD700',
  GRIS_CLARO: '#F5F5F5',
  GRIS_MEDIO: '#E0E0E0',
  GRIS_OSCURO: '#757575',
  TEXTO_OSCURO: '#333333',
  ERROR: '#FF5252',
  EXITO: '#4CAF50',
  VERDE_CLARO: '#81C784',
  ROJO_CLARO: '#EF5350',
  MORADO: '#BA68C8',
  TURQUESA: '#4DB6AC',
  NARANJA: '#FF9800',
  ROSA: '#F06292',
  INDIGO: '#7986CB',
  CELESTE: '#4FC3F7'
};

export default function VistaPreferencias({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [telefonos, setTelefonos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalTelefonoVisible, setModalTelefonoVisible] = useState(false);
  const [modalContrasenaVisible, setModalContrasenaVisible] = useState(false);
  const [modalRenunciarVisible, setModalRenunciarVisible] = useState(false);
  const [esAdministrador, setEsAdministrador] = useState(false);
  const [hayOtroAdmin, setHayOtroAdmin] = useState(false);

  // Estados para formularios
  const [nuevoTelefono, setNuevoTelefono] = useState({
    numero: '',
    tipo: 'personal',
    principal: false
  });

  const [contrasenaData, setContrasenaData] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });

  // Estados para preferencias
  const [preferencias, setPreferencias] = useState({
    notificaciones: true,
    sonidoNotificaciones: true,
    vibracion: true,
    modoOscuro: false,
    tamanoLetra: 'normal',
    idioma: 'es',
    privacidad: {
      perfilPublico: false,
      mostrarTelefono: true,
      mostrarEmail: true
    },
    seguridad: {
      autenticacionDosPasos: false,
      sesionesActivas: true
    }
  });

  // Tipos de teléfono
  const TIPOS_TELEFONO = [
    { id: 'personal', nombre: 'Personal', icono: 'person-outline' },
    { id: 'trabajo', nombre: 'Trabajo', icono: 'briefcase-outline' },
    { id: 'casa', nombre: 'Casa', icono: 'home-outline' },
    { id: 'emergencia', nombre: 'Emergencia', icono: 'alert-circle-outline' }
  ];

  // Tamaños de letra
  const TAMANOS_LETRA = [
    { id: 'pequeno', nombre: 'Pequeño', valor: 12 },
    { id: 'normal', nombre: 'Normal', valor: 14 },
    { id: 'grande', nombre: 'Grande', valor: 16 },
    { id: 'extra_grande', nombre: 'Extra Grande', valor: 18 }
  ];

  // Idiomas disponibles
  const IDIOMAS = [
    { id: 'es', nombre: 'Español', icono: 'flag-outline' },
    { id: 'en', nombre: 'English', icono: 'flag-outline' }
  ];

  // Cargar datos del usuario
  const cargarDatosUsuario = useCallback(async () => {
    try {
      setCargando(true);

      // Obtener usuario actual
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuarioInfo = JSON.parse(usuarioData);
        setUsuario(usuarioInfo);
        setEsAdministrador(usuarioInfo.rol === 'familiar_administrador');

        // Cargar teléfonos del usuario
        const telefonosResponse = await servicioAPI.obtenerTelefonosUsuario(usuarioInfo.id);
        if (telefonosResponse.exito) {
          setTelefonos(telefonosResponse.telefonos || []);
        }

        // Cargar preferencias del usuario
        const preferenciasResponse = await servicioAPI.obtenerPreferenciasUsuario(usuarioInfo.id);
        if (preferenciasResponse.exito) {
          setPreferencias(preferenciasResponse.preferencias || preferencias);
        }

        // Verificar si hay otro administrador
        if (usuarioInfo.rol === 'familiar_administrador') {
          const adminsResponse = await servicioAPI.verificarOtrosAdministradores();
          if (adminsResponse.exito) {
            setHayOtroAdmin(adminsResponse.hayOtroAdmin || false);
          }
        }
      }

    } catch (error) {
      console.error('Error cargando preferencias:', error);
      Alert.alert('Error', 'No se pudieron cargar las preferencias');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatosUsuario();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatosUsuario();
  }, [cargando]);

  // Actualizar información del usuario
  const actualizarInformacionUsuario = async () => {
    try {
      if (!usuario) return;

      const datosActualizar = {
        email: usuario.email,
        // Otros datos que puedan actualizarse
      };

      const response = await servicioAPI.actualizarUsuario(usuario.id, datosActualizar);

      if (response.exito) {
        Alert.alert('Éxito', 'Información actualizada correctamente');
        // Actualizar AsyncStorage
        await AsyncStorage.setItem('usuarioInfo', JSON.stringify(usuario));
      } else {
        Alert.alert('Error', response.error || 'Error actualizando información');
      }

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      Alert.alert('Error', 'No se pudo actualizar la información');
    }
  };

  // Agregar teléfono
  const agregarTelefono = async () => {
    try {
      if (!nuevoTelefono.numero.trim()) {
        Alert.alert('Error', 'Debes ingresar un número de teléfono');
        return;
      }

      const response = await servicioAPI.agregarTelefono({
        ...nuevoTelefono,
        usuarioId: usuario.id
      });

      if (response.exito) {
        Alert.alert('Éxito', 'Teléfono agregado correctamente');
        setModalTelefonoVisible(false);
        setNuevoTelefono({ numero: '', tipo: 'personal', principal: false });
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'Error agregando teléfono');
      }

    } catch (error) {
      console.error('Error agregando teléfono:', error);
      Alert.alert('Error', 'No se pudo agregar el teléfono');
    }
  };

  // Eliminar teléfono
  const eliminarTelefono = (telefonoId) => {
    Alert.alert(
      'Eliminar Teléfono',
      '¿Estás seguro de eliminar este número de teléfono?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarTelefono(telefonoId);
              if (response.exito) {
                Alert.alert('Éxito', 'Teléfono eliminado');
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el teléfono');
            }
          }
        }
      ]
    );
  };

  // Marcar como principal
  const marcarComoPrincipal = async (telefonoId) => {
    try {
      const response = await servicioAPI.marcarTelefonoPrincipal(telefonoId);
      if (response.exito) {
        Alert.alert('Éxito', 'Teléfono marcado como principal');
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el teléfono');
    }
  };

  // Cambiar contraseña
  const cambiarContrasena = async () => {
    try {
      if (!contrasenaData.actual.trim()) {
        Alert.alert('Error', 'Debes ingresar tu contraseña actual');
        return;
      }

      if (!contrasenaData.nueva.trim()) {
        Alert.alert('Error', 'Debes ingresar una nueva contraseña');
        return;
      }

      if (contrasenaData.nueva.length < 6) {
        Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }

      if (contrasenaData.nueva !== contrasenaData.confirmar) {
        Alert.alert('Error', 'Las contraseñas no coinciden');
        return;
      }

      const response = await servicioAPI.cambiarContrasena({
        actual: contrasenaData.actual,
        nueva: contrasenaData.nueva
      });

      if (response.exito) {
        Alert.alert('Éxito', 'Contraseña cambiada correctamente');
        setModalContrasenaVisible(false);
        setContrasenaData({ actual: '', nueva: '', confirmar: '' });
      } else {
        Alert.alert('Error', response.error || 'Error cambiando contraseña');
      }

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      Alert.alert('Error', 'No se pudo cambiar la contraseña');
    }
  };

  // Actualizar preferencias
  const actualizarPreferencia = async (categoria, clave, valor) => {
    try {
      const nuevasPreferencias = { ...preferencias };

      if (categoria) {
        nuevasPreferencias[categoria][clave] = valor;
      } else {
        nuevasPreferencias[clave] = valor;
      }

      setPreferencias(nuevasPreferencias);

      // Guardar en backend
      const response = await servicioAPI.actualizarPreferencias(nuevasPreferencias);
      if (!response.exito) {
        console.error('Error guardando preferencias:', response.error);
      }

    } catch (error) {
      console.error('Error actualizando preferencia:', error);
    }
  };

  // Renunciar a rol de administrador
  const renunciarAdministrador = async () => {
    try {
      if (!hayOtroAdmin) {
        Alert.alert(
          'No hay otro administrador',
          'Debes designar a otro familiar como administrador antes de renunciar a tu rol.',
          [
            { text: 'Entendido', onPress: () => navigation.navigate('VistasFamilia') }
          ]
        );
        return;
      }

      const response = await servicioAPI.renunciarAdministrador();

      if (response.exito) {
        Alert.alert(
          'Éxito',
          'Has renunciado al rol de administrador',
          [
            {
              text: 'Aceptar',
              onPress: async () => {
                // Actualizar información local
                const usuarioActualizado = { ...usuario, rol: 'familiar' };
                setUsuario(usuarioActualizado);
                setEsAdministrador(false);
                await AsyncStorage.setItem('usuarioInfo', JSON.stringify(usuarioActualizado));
                setModalRenunciarVisible(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Error renunciando al rol');
      }

    } catch (error) {
      console.error('Error renunciando administrador:', error);
      Alert.alert('Error', 'No se pudo renunciar al rol');
    }
  };

  // Cerrar sesión
  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              // Limpiar AsyncStorage
              await AsyncStorage.multiRemove([
                'sesionActiva',
                'usuarioInfo',
                'token',
                'rol'
              ]);

              // Navegar a login
              navigation.replace('PantallaLogin');
            } catch (error) {
              console.error('Error cerrando sesión:', error);
            }
          }
        }
      ]
    );
  };

  // Solicitar eliminar cuenta
  const solicitarEliminarCuenta = () => {
    Alert.alert(
      'Eliminar Cuenta',
      'Esta acción es permanente y eliminará todos tus datos. ¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar Eliminación',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.solicitarEliminacionCuenta();
              if (response.exito) {
                Alert.alert(
                  'Solicitud Enviada',
                  'Tu solicitud de eliminación ha sido enviada al administrador.',
                  [{ text: 'Aceptar' }]
                );
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo enviar la solicitud');
            }
          }
        }
      ]
    );
  };

  // Seleccionar foto de perfil
  const seleccionarFotoPerfil = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitas permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        // Aquí subirías la imagen al backend
        Alert.alert('Éxito', 'Foto de perfil actualizada (en desarrollo)');
      }

    } catch (error) {
      console.error('Error seleccionando foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  // Obtener icono según tipo de teléfono
  const obtenerIconoTipoTelefono = (tipo) => {
    const tipoEncontrado = TIPOS_TELEFONO.find(t => t.id === tipo);
    return tipoEncontrado?.icono || 'call-outline';
  };

  // Renderizar teléfono
  const renderTelefono = (telefono) => (
    <View key={telefono.id} style={styles.itemTelefono}>
      <View style={styles.infoTelefono}>
        <View style={styles.iconoTipoTelefono}>
          <Icon name={obtenerIconoTipoTelefono(telefono.tipo)} size={18} color={COLORES.AZUL_CIELO} />
        </View>
        <View style={styles.detallesTelefono}>
          <Text style={styles.numeroTelefono}>{telefono.numero}</Text>
          <Text style={styles.tipoTelefono}>
            {TIPOS_TELEFONO.find(t => t.id === telefono.tipo)?.nombre}
            {telefono.principal && ' • Principal'}
          </Text>
        </View>
      </View>

      <View style={styles.accionesTelefono}>
        {!telefono.principal && (
          <TouchableOpacity
            style={styles.botonAccionTelefono}
            onPress={() => marcarComoPrincipal(telefono.id)}
          >
            <Icon name="star-outline" size={18} color={COLORES.AMARILLO_PLATANO} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.botonAccionTelefono}
          onPress={() => eliminarTelefono(telefono.id)}
        >
          <Icon name="trash-outline" size={18} color={COLORES.ERROR} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando preferencias...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>

          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Preferencias</Text>
            <Text style={styles.subtituloPrincipal}>Configura tu cuenta y preferencias</Text>
          </View>

          <TouchableOpacity style={styles.botonRefrescar} onPress={onRefresh} disabled={refrescando}>
            <Icon
              name="refresh-outline"
              size={24}
              color={refrescando ? COLORES.GRIS_OSCURO : COLORES.TEXTO_OSCURO}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              colors={[COLORES.AMARILLO_PLATANO]}
              tintColor={COLORES.AMARILLO_PLATANO}
            />
          }
          contentContainerStyle={styles.contenedorScroll}
        >
          {/* Perfil del Usuario */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Perfil</Text>

            <View style={styles.contenedorPerfil}>
              <TouchableOpacity
                style={styles.contenedorFotoPerfil}
                onPress={seleccionarFotoPerfil}
              >
                <View style={styles.fotoPerfil}>
                  <Icon name="person-outline" size={40} color={COLORES.GRIS_MEDIO} />
                </View>
                <View style={styles.botonCambiarFoto}>
                  <Icon name="camera-outline" size={16} color={COLORES.BLANCO} />
                </View>
              </TouchableOpacity>

              <View style={styles.infoPerfil}>
                <Text style={styles.nombrePerfil}>
                  {usuario?.nombre} {usuario?.apellido}
                </Text>
                <Text style={styles.emailPerfil}>{usuario?.email}</Text>
                <View style={styles.badgeRol}>
                  <Text style={styles.textoBadgeRol}>
                    {esAdministrador ? 'Administrador' : 'Familiar'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Información Personal */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Información Personal</Text>

            <View style={styles.contenedorInformacion}>
              {/* Nombre (no editable) */}
              <View style={styles.itemInformacion}>
                <View style={styles.labelInformacion}>
                  <Icon name="person-outline" size={18} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.textoLabelInformacion}>Nombre</Text>
                </View>
                <Text style={styles.valorInformacion}>
                  {usuario?.nombre} {usuario?.apellido}
                </Text>
              </View>

              {/* Email (editable) */}
              <View style={styles.itemInformacion}>
                <View style={styles.labelInformacion}>
                  <Icon name="mail-outline" size={18} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.textoLabelInformacion}>Correo Electrónico</Text>
                </View>
                <TextInput
                  style={styles.inputInformacion}
                  value={usuario?.email || ''}
                  onChangeText={(text) => setUsuario({ ...usuario, email: text })}
                  placeholder="correo@ejemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORES.GRIS_MEDIO}
                />
              </View>

              {/* Botón para guardar cambios */}
              <TouchableOpacity
                style={styles.botonGuardarCambios}
                onPress={actualizarInformacionUsuario}
              >
                <Text style={styles.textoBotonGuardarCambios}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Teléfonos */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccionConBoton}>
              <Text style={styles.tituloSeccion}>Teléfonos</Text>
              <TouchableOpacity
                style={styles.botonAgregarTelefono}
                onPress={() => setModalTelefonoVisible(true)}
              >
                <Icon name="add-outline" size={20} color={COLORES.AZUL_CIELO_OSCURO} />
              </TouchableOpacity>
            </View>

            <View style={styles.contenedorTelefonos}>
              {telefonos.length > 0 ? (
                telefonos.map(renderTelefono)
              ) : (
                <Text style={styles.textoSinTelefonos}>No hay teléfonos registrados</Text>
              )}
            </View>
          </View>

          {/* Seguridad */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Seguridad</Text>

            <View style={styles.contenedorSeguridad}>
              <TouchableOpacity
                style={styles.itemAccion}
                onPress={() => setModalContrasenaVisible(true)}
              >
                <View style={styles.iconoAccionItem}>
                  <Icon name="key-outline" size={22} color={COLORES.ROJO_CLARO} />
                </View>
                <View style={styles.infoAccion}>
                  <Text style={styles.tituloAccion}>Cambiar Contraseña</Text>
                  <Text style={styles.descripcionAccion}>Actualiza tu contraseña periódicamente</Text>
                </View>
                <Icon name="chevron-forward-outline" size={20} color={COLORES.GRIS_MEDIO} />
              </TouchableOpacity>

              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="shield-checkmark-outline" size={22} color={COLORES.EXITO} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Autenticación en Dos Pasos</Text>
                    <Text style={styles.descripcionToggle}>Agrega una capa extra de seguridad</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.seguridad.autenticacionDosPasos}
                  onValueChange={(valor) => actualizarPreferencia('seguridad', 'autenticacionDosPasos', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.EXITO }}
                  thumbColor={COLORES.BLANCO}
                />
              </View>

              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="desktop-outline" size={22} color={COLORES.AZUL_CIELO} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Sesiones Activas</Text>
                    <Text style={styles.descripcionToggle}>Mostrar dispositivos conectados</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.seguridad.sesionesActivas}
                  onValueChange={(valor) => actualizarPreferencia('seguridad', 'sesionesActivas', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.AZUL_CIELO }}
                  thumbColor={COLORES.BLANCO}
                />
              </View>
            </View>
          </View>

          {/* Notificaciones */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Notificaciones</Text>

            <View style={styles.contenedorNotificaciones}>
              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="notifications-outline" size={22} color={COLORES.AMARILLO_PLATANO} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Notificaciones</Text>
                    <Text style={styles.descripcionToggle}>Recibir notificaciones importantes</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.notificaciones}
                  onValueChange={(valor) => actualizarPreferencia(null, 'notificaciones', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.AMARILLO_PLATANO }}
                  thumbColor={COLORES.BLANCO}
                />
              </View>

              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="volume-high-outline" size={22} color={COLORES.MORADO} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Sonido</Text>
                    <Text style={styles.descripcionToggle}>Sonido en notificaciones</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.sonidoNotificaciones}
                  onValueChange={(valor) => actualizarPreferencia(null, 'sonidoNotificaciones', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.MORADO }}
                  thumbColor={COLORES.BLANCO}
                  disabled={!preferencias.notificaciones}
                />
              </View>

              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="phone-portrait-outline" size={22} color={COLORES.TURQUESA} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Vibración</Text>
                    <Text style={styles.descripcionToggle}>Vibrar en notificaciones</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.vibracion}
                  onValueChange={(valor) => actualizarPreferencia(null, 'vibracion', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.TURQUESA }}
                  thumbColor={COLORES.BLANCO}
                  disabled={!preferencias.notificaciones}
                />
              </View>
            </View>
          </View>

          {/* Apariencia */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Apariencia</Text>

            <View style={styles.contenedorApariencia}>
              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="moon-outline" size={22} color={COLORES.INDIGO} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Modo Oscuro</Text>
                    <Text style={styles.descripcionToggle}>Tema oscuro para la aplicación</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.modoOscuro}
                  onValueChange={(valor) => actualizarPreferencia(null, 'modoOscuro', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.INDIGO }}
                  thumbColor={COLORES.BLANCO}
                />
              </View>

              {/* Tamaño de letra */}
              <View style={styles.itemSelector}>
                <View style={styles.infoSelector}>
                  <Icon name="text-outline" size={22} color={COLORES.NARANJA} />
                  <View style={styles.textosSelector}>
                    <Text style={styles.tituloSelector}>Tamaño de Letra</Text>
                    <Text style={styles.descripcionSelector}>Ajusta el tamaño del texto</Text>
                  </View>
                </View>
                <View style={styles.opcionesTamanio}>
                  {TAMANOS_LETRA.map((tamano) => (
                    <TouchableOpacity
                      key={tamano.id}
                      style={[
                        styles.opcionTamanio,
                        preferencias.tamanoLetra === tamano.id && styles.opcionTamanioSeleccionada
                      ]}
                      onPress={() => actualizarPreferencia(null, 'tamanoLetra', tamano.id)}
                    >
                      <Text style={[
                        styles.textoOpcionTamanio,
                        preferencias.tamanoLetra === tamano.id && styles.textoOpcionTamanioSeleccionada
                      ]}>
                        Aa
                      </Text>
                      <Text style={[
                        styles.labelOpcionTamanio,
                        preferencias.tamanoLetra === tamano.id && styles.labelOpcionTamanioSeleccionada
                      ]}>
                        {tamano.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Idioma */}
              <View style={styles.itemSelector}>
                <View style={styles.infoSelector}>
                  <Icon name="language-outline" size={22} color={COLORES.CELESTE} />
                  <View style={styles.textosSelector}>
                    <Text style={styles.tituloSelector}>Idioma</Text>
                    <Text style={styles.descripcionSelector}>Idioma de la aplicación</Text>
                  </View>
                </View>
                <View style={styles.opcionesIdioma}>
                  {IDIOMAS.map((idioma) => (
                    <TouchableOpacity
                      key={idioma.id}
                      style={[
                        styles.opcionIdioma,
                        preferencias.idioma === idioma.id && styles.opcionIdiomaSeleccionada
                      ]}
                      onPress={() => actualizarPreferencia(null, 'idioma', idioma.id)}
                    >
                      <Icon
                        name={idioma.icono}
                        size={16}
                        color={preferencias.idioma === idioma.id ? COLORES.BLANCO : COLORES.GRIS_OSCURO}
                      />
                      <Text style={[
                        styles.textoOpcionIdioma,
                        preferencias.idioma === idioma.id && styles.textoOpcionIdiomaSeleccionada
                      ]}>
                        {idioma.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Privacidad */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Privacidad</Text>

            <View style={styles.contenedorPrivacidad}>
              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="globe-outline" size={22} color={COLORES.VERDE_CLARO} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Perfil Público</Text>
                    <Text style={styles.descripcionToggle}>Mostrar perfil a otros familiares</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.privacidad.perfilPublico}
                  onValueChange={(valor) => actualizarPreferencia('privacidad', 'perfilPublico', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.VERDE_CLARO }}
                  thumbColor={COLORES.BLANCO}
                />
              </View>

              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="call-outline" size={22} color={COLORES.AZUL_CIELO} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Mostrar Teléfono</Text>
                    <Text style={styles.descripcionToggle}>Mostrar teléfono a familiares</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.privacidad.mostrarTelefono}
                  onValueChange={(valor) => actualizarPreferencia('privacidad', 'mostrarTelefono', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.AZUL_CIELO }}
                  thumbColor={COLORES.BLANCO}
                />
              </View>

              <View style={styles.itemToggle}>
                <View style={styles.infoToggle}>
                  <Icon name="mail-outline" size={22} color={COLORES.ROSA} />
                  <View style={styles.textosToggle}>
                    <Text style={styles.tituloToggle}>Mostrar Email</Text>
                    <Text style={styles.descripcionToggle}>Mostrar email a familiares</Text>
                  </View>
                </View>
                <Switch
                  value={preferencias.privacidad.mostrarEmail}
                  onValueChange={(valor) => actualizarPreferencia('privacidad', 'mostrarEmail', valor)}
                  trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.ROSA }}
                  thumbColor={COLORES.BLANCO}
                />
              </View>
            </View>
          </View>

          {/* Acciones de Administrador */}
          {esAdministrador && (
            <View style={styles.seccion}>
              <Text style={styles.tituloSeccion}>Administración</Text>

              <View style={styles.contenedorAdministracion}>
                <TouchableOpacity
                  style={styles.itemAccionEspecial}
                  onPress={() => setModalRenunciarVisible(true)}
                >
                  <View style={styles.iconoAccionEspecial}>
                    <Icon name="shield-outline" size={22} color={COLORES.AMARILLO_PLATANO} />
                  </View>
                  <View style={styles.infoAccionEspecial}>
                    <Text style={styles.tituloAccionEspecial}>Renunciar a Administrador</Text>
                    <Text style={styles.descripcionAccionEspecial}>
                      {hayOtroAdmin
                        ? 'Dejar de ser administrador del grupo familiar'
                        : 'Necesitas designar a otro administrador primero'}
                    </Text>
                  </View>
                  <Icon name="chevron-forward-outline" size={20} color={COLORES.GRIS_MEDIO} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Acciones de Cuenta */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Cuenta</Text>

            <View style={styles.contenedorCuenta}>
              <TouchableOpacity
                style={styles.itemAccion}
                onPress={cerrarSesion}
              >
                <View style={[styles.iconoAccionItem, { backgroundColor: COLORES.ROJO_CLARO + '20' }]}>
                  <Icon name="log-out-outline" size={22} color={COLORES.ROJO_CLARO} />
                </View>
                <View style={styles.infoAccion}>
                  <Text style={[styles.tituloAccion, { color: COLORES.ROJO_CLARO }]}>Cerrar Sesión</Text>
                  <Text style={styles.descripcionAccion}>Salir de tu cuenta actual</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.itemAccion}
                onPress={solicitarEliminarCuenta}
              >
                <View style={[styles.iconoAccionItem, { backgroundColor: COLORES.GRIS_OSCURO + '20' }]}>
                  <Icon name="trash-outline" size={22} color={COLORES.GRIS_OSCURO} />
                </View>
                <View style={styles.infoAccion}>
                  <Text style={[styles.tituloAccion, { color: COLORES.GRIS_OSCURO }]}>Eliminar Cuenta</Text>
                  <Text style={styles.descripcionAccion}>Eliminar permanentemente tu cuenta</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Información de la App */}
          <View style={styles.seccion}>
            <View style={styles.infoApp}>
              <Text style={styles.versionApp}>CuidaMe v1.0</Text>
              <Text style={styles.copyApp}>© 2024 Todos los derechos reservados</Text>
              <TouchableOpacity
                style={styles.botonSoporte}
                onPress={() => navigation.navigate('Soporte')}
              >
                <Text style={styles.textoBotonSoporte}>Soporte y Ayuda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal para agregar teléfono */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalTelefonoVisible}
        onRequestClose={() => setModalTelefonoVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Agregar Teléfono</Text>
              <TouchableOpacity onPress={() => setModalTelefonoVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <Text style={styles.modalLabel}>Número de Teléfono *</Text>
              <TextInput
                style={styles.input}
                value={nuevoTelefono.numero}
                onChangeText={(text) => setNuevoTelefono({ ...nuevoTelefono, numero: text })}
                placeholder="Ej: 123 456 7890"
                keyboardType="phone-pad"
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Tipo de Teléfono</Text>
              <View style={styles.opcionesTipoTelefono}>
                {TIPOS_TELEFONO.map(tipo => (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[
                      styles.opcionTipoTelefono,
                      nuevoTelefono.tipo === tipo.id && styles.opcionTipoTelefonoSeleccionada
                    ]}
                    onPress={() => setNuevoTelefono({ ...nuevoTelefono, tipo: tipo.id })}
                  >
                    <Icon
                      name={tipo.icono}
                      size={18}
                      color={nuevoTelefono.tipo === tipo.id ? COLORES.BLANCO : COLORES.GRIS_OSCURO}
                    />
                    <Text style={[
                      styles.textoOpcionTipoTelefono,
                      nuevoTelefono.tipo === tipo.id && styles.textoOpcionTipoTelefonoSeleccionada
                    ]}>
                      {tipo.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.opcionPrincipal}>
                <TouchableOpacity
                  style={styles.botonCheckbox}
                  onPress={() => setNuevoTelefono({ ...nuevoTelefono, principal: !nuevoTelefono.principal })}
                >
                  <Icon
                    name={nuevoTelefono.principal ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={nuevoTelefono.principal ? COLORES.EXITO : COLORES.GRIS_MEDIO}
                  />
                  <Text style={styles.textoCheckbox}>Marcar como teléfono principal</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => setModalTelefonoVisible(false)}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                onPress={agregarTelefono}
              >
                <Text style={styles.textoBotonModalAccion}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para cambiar contraseña */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalContrasenaVisible}
        onRequestClose={() => setModalContrasenaVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setModalContrasenaVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <Text style={styles.modalLabel}>Contraseña Actual *</Text>
              <TextInput
                style={styles.input}
                value={contrasenaData.actual}
                onChangeText={(text) => setContrasenaData({ ...contrasenaData, actual: text })}
                placeholder="Ingresa tu contraseña actual"
                secureTextEntry
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Nueva Contraseña *</Text>
              <TextInput
                style={styles.input}
                value={contrasenaData.nueva}
                onChangeText={(text) => setContrasenaData({ ...contrasenaData, nueva: text })}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Confirmar Nueva Contraseña *</Text>
              <TextInput
                style={styles.input}
                value={contrasenaData.confirmar}
                onChangeText={(text) => setContrasenaData({ ...contrasenaData, confirmar: text })}
                placeholder="Repite la nueva contraseña"
                secureTextEntry
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <View style={styles.consejosSeguridad}>
                <Text style={styles.tituloConsejos}>Consejos de seguridad:</Text>
                <Text style={styles.textoConsejos}>• Usa al menos 6 caracteres</Text>
                <Text style={styles.textoConsejos}>• Combina letras, números y símbolos</Text>
                <Text style={styles.textoConsejos}>• Evita contraseñas comunes</Text>
                <Text style={styles.textoConsejos}>• Cambia tu contraseña periódicamente</Text>
              </View>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => setModalContrasenaVisible(false)}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                onPress={cambiarContrasena}
              >
                <Text style={styles.textoBotonModalAccion}>Cambiar Contraseña</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para renunciar a administrador */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalRenunciarVisible}
        onRequestClose={() => setModalRenunciarVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Renunciar a Administrador</Text>
              <TouchableOpacity onPress={() => setModalRenunciarVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <View style={styles.infoAdvertencia}>
                <Icon name="warning-outline" size={40} color={COLORES.AMARILLO_PLATANO} />
                <Text style={styles.tituloAdvertencia}>¡Atención!</Text>
                <Text style={styles.textoAdvertencia}>
                  {hayOtroAdmin
                    ? 'Al renunciar al rol de administrador perderás los siguientes privilegios:'
                    : 'No puedes renunciar al rol de administrador porque eres el único administrador del grupo familiar.'}
                </Text>
              </View>

              {hayOtroAdmin ? (
                <>
                  <View style={styles.listaConsecuencias}>
                    <View style={styles.itemConsecuencia}>
                      <Icon name="close-circle-outline" size={18} color={COLORES.ROJO_CLARO} />
                      <Text style={styles.textoConsecuencia}>No podrás agregar o eliminar familiares</Text>
                    </View>
                    <View style={styles.itemConsecuencia}>
                      <Icon name="close-circle-outline" size={18} color={COLORES.ROJO_CLARO} />
                      <Text style={styles.textoConsecuencia}>No podrás generar códigos familiares</Text>
                    </View>
                    <View style={styles.itemConsecuencia}>
                      <Icon name="close-circle-outline" size={18} color={COLORES.ROJO_CLARO} />
                      <Text style={styles.textoConsecuencia}>No podrás configurar porcentajes de gastos</Text>
                    </View>
                    <View style={styles.itemConsecuencia}>
                      <Icon name="close-circle-outline" size={18} color={COLORES.ROJO_CLARO} />
                      <Text style={styles.textoConsecuencia}>No podrás editar información del adulto mayor</Text>
                    </View>
                  </View>

                  <Text style={styles.textoConfirmacion}>
                    ¿Estás seguro de que quieres renunciar al rol de administrador?
                  </Text>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.botonDesignarAdmin}
                  onPress={() => {
                    setModalRenunciarVisible(false);
                    navigation.navigate('VistasFamilia');
                  }}
                >
                  <Text style={styles.textoBotonDesignarAdmin}>Designar otro administrador</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => setModalRenunciarVisible(false)}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              {hayOtroAdmin && (
                <TouchableOpacity
                  style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]}
                  onPress={renunciarAdministrador}
                >
                  <Text style={styles.textoBotonModalAccion}>Renunciar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
  },
  contenedor: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    color: COLORES.TEXTO_OSCURO,
    marginTop: 20,
    fontSize: 16,
  },

  // Encabezado
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  botonAtras: {
    padding: 8,
  },
  tituloContainer: {
    flex: 1,
    alignItems: 'center',
  },
  tituloPrincipal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  subtituloPrincipal: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginTop: 2,
  },
  botonRefrescar: {
    padding: 8,
  },

  // Contenido
  contenedorScroll: {
    padding: 20,
    paddingBottom: 80,
  },

  // Secciones
  seccion: {
    marginBottom: 25,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 15,
  },
  encabezadoSeccionConBoton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  botonAgregarTelefono: {
    padding: 8,
  },

  // Perfil
  contenedorPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contenedorFotoPerfil: {
    position: 'relative',
    marginRight: 20,
  },
  fotoPerfil: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCambiarFoto: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPerfil: {
    flex: 1,
  },
  nombrePerfil: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  emailPerfil: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 8,
  },
  badgeRol: {
    alignSelf: 'flex-start',
    backgroundColor: COLORES.AMARILLO_PLATANO + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoBadgeRol: {
    fontSize: 12,
    color: COLORES.AMARILLO_OSCURO,
    fontWeight: '600',
  },

  // Información Personal
  contenedorInformacion: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInformacion: {
    marginBottom: 20,
  },
  labelInformacion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  textoLabelInformacion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 8,
  },
  valorInformacion: {
    fontSize: 16,
    color: COLORES.TEXTO_OSCURO,
    padding: 12,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 8,
  },
  inputInformacion: {
    fontSize: 16,
    color: COLORES.TEXTO_OSCURO,
    padding: 12,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  botonGuardarCambios: {
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotonGuardarCambios: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: '600',
  },

  // Teléfonos
  contenedorTelefonos: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemTelefono: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoTelefono: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconoTipoTelefono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detallesTelefono: {
    flex: 1,
  },
  numeroTelefono: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 2,
  },
  tipoTelefono: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  accionesTelefono: {
    flexDirection: 'row',
  },
  botonAccionTelefono: {
    padding: 8,
  },
  textoSinTelefonos: {
    textAlign: 'center',
    color: COLORES.GRIS_OSCURO,
    padding: 20,
    fontStyle: 'italic',
  },

  // Items de acción y toggle
  contenedorSeguridad: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contenedorNotificaciones: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contenedorApariencia: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contenedorPrivacidad: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contenedorCuenta: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contenedorAdministracion: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  itemAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  iconoAccionItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  infoAccion: {
    flex: 1,
  },
  tituloAccion: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 2,
  },
  descripcionAccion: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },

  itemAccionEspecial: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  iconoAccionEspecial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORES.AMARILLO_PLATANO + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  infoAccionEspecial: {
    flex: 1,
  },
  tituloAccionEspecial: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.AMARILLO_OSCURO,
    marginBottom: 2,
  },
  descripcionAccionEspecial: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },

  itemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textosToggle: {
    flex: 1,
    marginLeft: 15,
  },
  tituloToggle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 2,
  },
  descripcionToggle: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },

  // Selectores (tamaño letra, idioma)
  itemSelector: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  textosSelector: {
    flex: 1,
    marginLeft: 15,
  },
  tituloSelector: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 2,
  },
  descripcionSelector: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  opcionesTamanio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  opcionTamanio: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginHorizontal: 5,
  },
  opcionTamanioSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionTamanio: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 4,
  },
  textoOpcionTamanioSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },
  labelOpcionTamanio: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
  },
  labelOpcionTamanioSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  opcionesIdioma: {
    flexDirection: 'row',
  },
  opcionIdioma: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginHorizontal: 5,
  },
  opcionIdiomaSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionIdioma: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 6,
  },
  textoOpcionIdiomaSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Información de la App
  infoApp: {
    alignItems: 'center',
    padding: 20,
  },
  versionApp: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 8,
  },
  copyApp: {
    fontSize: 12,
    color: COLORES.GRIS_MEDIO,
    marginBottom: 15,
  },
  botonSoporte: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  textoBotonSoporte: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '500',
  },

  // Modal
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContenido: {
    backgroundColor: COLORES.BLANCO,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
  },
  modalEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  modalFormulario: {
    padding: 20,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },

  // Opciones tipo teléfono
  opcionesTipoTelefono: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  opcionTipoTelefono: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginRight: 8,
    marginBottom: 8,
  },
  opcionTipoTelefonoSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionTipoTelefono: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 6,
  },
  textoOpcionTipoTelefonoSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Checkbox principal
  opcionPrincipal: {
    marginBottom: 15,
  },
  botonCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  textoCheckbox: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
  },

  // Consejos seguridad
  consejosSeguridad: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
  },
  tituloConsejos: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 8,
  },
  textoConsejos: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 4,
  },

  // Info advertencia renunciar admin
  infoAdvertencia: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tituloAdvertencia: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.AMARILLO_OSCURO,
    marginTop: 12,
    marginBottom: 8,
  },
  textoAdvertencia: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
    lineHeight: 20,
  },
  listaConsecuencias: {
    marginBottom: 20,
  },
  itemConsecuencia: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  textoConsecuencia: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  textoConfirmacion: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  botonDesignarAdmin: {
    backgroundColor: COLORES.AMARILLO_PLATANO,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  textoBotonDesignarAdmin: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    fontWeight: '600',
  },

  // Botones del modal
  modalBotones: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  botonModalCancelar: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    alignItems: 'center',
    marginRight: 10,
  },
  textoBotonModalCancelar: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.GRIS_OSCURO,
  },
  botonModalAccion: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBotonModalAccion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.BLANCO,
  },
});