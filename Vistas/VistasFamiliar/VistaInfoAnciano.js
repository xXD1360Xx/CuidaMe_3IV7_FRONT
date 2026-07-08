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
  Platform,
  StatusBar,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Colores estandarizados
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
  NARANJA: '#FF9800',
  ROSADO: '#F48FB1',
  TURQUESA: '#4DB6AC',
  INDIGO: '#7986CB',
};

// Colores por categoría para fondos sutiles
const COLOR_CATEGORIA = {
  enfermedad: { bg: COLORES.ROJO_CLARO + '15', border: COLORES.ROJO_CLARO, icon: 'medical-outline' },
  alergia: { bg: COLORES.NARANJA + '15', border: COLORES.NARANJA, icon: 'alert-circle-outline' },
  medicina: { bg: COLORES.EXITO + '15', border: COLORES.EXITO, icon: 'medkit-outline' },
  articulo: { bg: COLORES.AZUL_CIELO + '15', border: COLORES.AZUL_CIELO_OSCURO, icon: 'cube-outline' },
  hobby: { bg: COLORES.MORADO + '15', border: COLORES.MORADO, icon: 'happy-outline' },
  cita: { bg: COLORES.TURQUESA + '15', border: COLORES.TURQUESA, icon: 'calendar-outline' },
};

// Actividades predefinidas (hobbies)
const ACTIVIDADES_PREDEFINIDAS = [
  { nombre: 'Leer', emoji: '📖', color: COLORES.INDIGO },
  { nombre: 'Jardinería', emoji: '🌱', color: COLORES.VERDE_CLARO },
  { nombre: 'Pintar', emoji: '🎨', color: COLORES.ROSA },
  { nombre: 'Música', emoji: '🎵', color: COLORES.MORADO },
  { nombre: 'Tejer', emoji: '🧶', color: COLORES.NARANJA },
  { nombre: 'Manualidades', emoji: '🧩', color: COLORES.AMARILLO_PLATANO },
  { nombre: 'Cocinar', emoji: '👨‍🍳', color: COLORES.ROJO_CLARO },
  { nombre: 'Jugar cartas', emoji: '🃏', color: COLORES.TURQUESA },
  { nombre: 'Pasear', emoji: '🚶‍♀️', color: COLORES.EXITO },
];

export default function VistaInfoAnciano({ navigation }) {
  const [adultoMayor, setAdultoMayor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState('');
  const [modalData, setModalData] = useState({});
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);

  // Estados para el formulario de edición del adulto mayor
  const [formAdultoMayor, setFormAdultoMayor] = useState({
    nombre: '',
    fecha_nacimiento: '',
    genero: '',
    estado_salud: '',
    nivel_dependencia: '',
    contacto_emergencia: '',
    telefono_emergencia: '',
    notas: '',
  });

  // Estados para agregar/editar elementos
  const [nuevaEnfermedad, setNuevaEnfermedad] = useState({ nombre: '', fecha_diagnostico: '', tratamiento: '' });
  const [nuevaAlergia, setNuevaAlergia] = useState({ nombre: '', severidad: 'baja', reaccion: '' });
  const [nuevoArticulo, setNuevoArticulo] = useState({ nombre: '', cantidad: '1', ubicacion: '', estado: 'optimo' });
  const [nuevoHobby, setNuevoHobby] = useState({ nombre: '', emoji: '📌', color: COLORES.MORADO });
  const [nuevaCita, setNuevaCita] = useState({ especialista: '', frecuencia: 'mensual', proxima_cita: '', ubicacion: '' });

  // ---------- CARGA DE DATOS ----------
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (!usuarioData) {
        setCargando(false);
        return;
      }
      const usuario = JSON.parse(usuarioData);
      setUsuarioRol(usuario.rol);
      const id = usuario.id;
      setUsuarioId(id);

      const response = await servicioAPI.obtenerAdultoMayorPrincipal(id);
      if (response.exito && response.adultoMayor) {
        setAdultoMayor(response.adultoMayor);
        // Precargar formulario de edición
        setFormAdultoMayor({
          nombre: response.adultoMayor.nombre || '',
          fecha_nacimiento: response.adultoMayor.fecha_nacimiento || '',
          genero: response.adultoMayor.genero || '',
          estado_salud: response.adultoMayor.estado_salud || '',
          nivel_dependencia: response.adultoMayor.nivel_dependencia || '',
          contacto_emergencia: response.adultoMayor.contacto_emergencia || '',
          telefono_emergencia: response.adultoMayor.telefono_emergencia || '',
          notas: response.adultoMayor.notas || '',
        });
      } else {
        setAdultoMayor(null);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
      // Simular notificaciones no leídas
      setNotificacionesNoLeidas(2);
    }, [cargarDatos])
  );

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatos();
  }, [cargarDatos]);

  // ---------- UTILIDADES ----------
  const esAdministrador = usuarioRol === 'familiar_admin' || usuarioRol === 'familiar_principal';

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '--';
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento)) return '--';
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Fecha no disponible';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha)) return 'Fecha inválida';
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatearFechaInput = (fechaStr) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha)) return '';
    return fecha.toISOString().split('T')[0];
  };

  const obtenerColorEstadoSalud = (estado) => {
    const map = {
      excelente: COLORES.EXITO,
      bueno: COLORES.VERDE_CLARO,
      regular: COLORES.AMARILLO_PLATANO,
      malo: COLORES.ERROR,
    };
    return map[estado?.toLowerCase()] || COLORES.GRIS_OSCURO;
  };

  // ---------- NAVEGACIÓN ----------
  const navegarA = (destino, params = {}) => {
    navigation.navigate(destino, params);
  };

  const irANotificaciones = () => {
    Alert.alert('Notificaciones', 'Tienes notificaciones pendientes');
    setNotificacionesNoLeidas(0);
  };

  // ---------- CRUD DE ELEMENTOS ----------
  const abrirModal = (tipo, datos = {}) => {
    setModalTipo(tipo);
    setModalData(datos);
    setModalVisible(true);
    // Precargar datos según tipo
    switch (tipo) {
      case 'enfermedad':
        setNuevaEnfermedad({
          nombre: datos.nombre || '',
          fecha_diagnostico: datos.fecha_diagnostico || '',
          tratamiento: datos.tratamiento || '',
        });
        break;
      case 'alergia':
        setNuevaAlergia({
          nombre: datos.nombre || '',
          severidad: datos.severidad || 'baja',
          reaccion: datos.reaccion || '',
        });
        break;
      case 'articulo':
        setNuevoArticulo({
          nombre: datos.nombre || '',
          cantidad: datos.cantidad?.toString() || '1',
          ubicacion: datos.ubicacion || '',
          estado: datos.estado || 'optimo',
        });
        break;
      case 'hobby':
        setNuevoHobby({
          nombre: datos.nombre || '',
          emoji: datos.emoji || '📌',
          color: datos.color || COLORES.MORADO,
        });
        break;
      case 'cita':
        setNuevaCita({
          especialista: datos.especialista || '',
          frecuencia: datos.frecuencia || 'mensual',
          proxima_cita: datos.proxima_cita || '',
          ubicacion: datos.ubicacion || '',
        });
        break;
      case 'editarAdulto':
        // Abrir modal de edición del adulto mayor con datos precargados
        setFormAdultoMayor({
          nombre: adultoMayor?.nombre || '',
          fecha_nacimiento: adultoMayor?.fecha_nacimiento || '',
          genero: adultoMayor?.genero || '',
          estado_salud: adultoMayor?.estado_salud || '',
          nivel_dependencia: adultoMayor?.nivel_dependencia || '',
          contacto_emergencia: adultoMayor?.contacto_emergencia || '',
          telefono_emergencia: adultoMayor?.telefono_emergencia || '',
          notas: adultoMayor?.notas || '',
        });
        setModalTipo('editarAdulto');
        setModalVisible(true);
        break;
    }
  };

  const guardarModal = async () => {
    try {
      const tipo = modalTipo;
      if (tipo === 'editarAdulto') {
        // Guardar cambios del adulto mayor
        const response = await servicioAPI.actualizarAdultoMayor(usuarioId, adultoMayor.id, formAdultoMayor); if (response.exito) {
          Alert.alert('Éxito', 'Información actualizada correctamente');
          setModalVisible(false);
          cargarDatos();
        } else {
          Alert.alert('Error', response.error || 'No se pudo actualizar');
        }
        return;
      }

      // Validaciones para otros tipos
      if (tipo === 'enfermedad' && !nuevaEnfermedad.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre de la enfermedad');
        return;
      }
      if (tipo === 'alergia' && !nuevaAlergia.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre de la alergia');
        return;
      }
      if (tipo === 'articulo' && !nuevoArticulo.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre del artículo');
        return;
      }
      if (tipo === 'hobby' && !nuevoHobby.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre del hobby');
        return;
      }
      if (tipo === 'cita' && !nuevaCita.especialista.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre del especialista');
        return;
      }

      // Si es un hobby, también agregarlo como actividad base
      if (tipo === 'hobby' && !modalData.id) {
        // Agregar a actividades base para VistaHorario
        await servicioAPI.crearActividadBase(usuarioId, {
          nombre: nuevoHobby.nombre,
          emoji: nuevoHobby.emoji || '📌',
          color: nuevoHobby.color || COLORES.MORADO,
          tipo: 'recreacion',
          descripcion: 'Hobby del adulto mayor',
        });
      }

      Alert.alert('Éxito', 'Información guardada correctamente');
      setModalVisible(false);
      // Resetear estados
      setNuevaEnfermedad({ nombre: '', fecha_diagnostico: '', tratamiento: '' });
      setNuevaAlergia({ nombre: '', severidad: 'baja', reaccion: '' });
      setNuevoArticulo({ nombre: '', cantidad: '1', ubicacion: '', estado: 'optimo' });
      setNuevoHobby({ nombre: '', emoji: '📌', color: COLORES.MORADO });
      setNuevaCita({ especialista: '', frecuencia: 'mensual', proxima_cita: '', ubicacion: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error guardando datos:', error);
      Alert.alert('Error', 'No se pudo guardar la información');
    }
  };

  const eliminarElemento = (tipo, id) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar este ${tipo}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              Alert.alert('Éxito', `${tipo} eliminado correctamente`);
              cargarDatos();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  // ---------- RENDER DE SWIPEABLE ----------
  const renderSwipeableItem = (item, tipo, categoria, onEdit, onDelete) => {
    const colores = COLOR_CATEGORIA[categoria] || COLOR_CATEGORIA.hobby;

    return (
      <Swipeable
        renderLeftActions={(progress, dragX) => {
          const trans = dragX.interpolate({
            inputRange: [0, 50, 100, 200],
            outputRange: [-20, 0, 0, 0],
          });
          return (
            <Animated.View style={[styles.swipeLeft, { transform: [{ translateX: trans }] }]}>
              <Icon name="create-outline" size={24} color={COLORES.BLANCO} />
              <Text style={styles.swipeText}>Editar</Text>
            </Animated.View>
          );
        }}
        renderRightActions={(progress, dragX) => {
          const trans = dragX.interpolate({
            inputRange: [-200, -100, -50, 0],
            outputRange: [0, 0, 0, -20],
          });
          return (
            <Animated.View style={[styles.swipeRight, { transform: [{ translateX: trans }] }]}>
              <Icon name="trash-outline" size={24} color={COLORES.BLANCO} />
              <Text style={styles.swipeText}>Eliminar</Text>
            </Animated.View>
          );
        }}
        onSwipeableLeftOpen={() => onEdit(item)}
        onSwipeableRightOpen={() => onDelete(item.id)}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
      >
        <TouchableOpacity
          style={[styles.itemLista, { backgroundColor: colores.bg, borderLeftColor: colores.border, borderLeftWidth: 4 }]}
          onPress={() => onEdit(item)}
          activeOpacity={0.7}
        >
          <View style={styles.infoItem}>
            <Icon name={colores.icon} size={20} color={colores.border} />
            <Text style={styles.textoItem}>{item.nombre}</Text>
            {item.detalle && <Text style={styles.detalleItem}>{item.detalle}</Text>}
          </View>
          <Icon name="chevron-forward-outline" size={20} color={COLORES.GRIS_OSCURO} />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // ---------- RENDER PRINCIPAL ----------
  if (cargando) {
    return (
      <View style={styles.fondoBlanco}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando información...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!adultoMayor) {
    return (
      <View style={styles.fondoBlanco}>
        <SafeAreaView style={styles.contenedor}>
          <View style={styles.encabezado}>
            <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
            </TouchableOpacity>
            <View style={styles.tituloContainer}>
              <Text style={styles.tituloPrincipal}>Información del Adulto Mayor</Text>
            </View>
            <TouchableOpacity style={styles.botonNotificaciones} onPress={irANotificaciones}>
              <Icon name="notifications-outline" size={28} color={COLORES.TEXTO_OSCURO} />
              {notificacionesNoLeidas > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeTexto}>{notificacionesNoLeidas}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sinAdultoContainer}>
            <Icon name="person-outline" size={80} color={COLORES.GRIS_MEDIO} />
            <Text style={styles.sinAdultoTitulo}>No hay adulto mayor asignado</Text>
            <Text style={styles.sinAdultoSubtitulo}>
              Registra la información de la persona a quien vas a cuidar.
            </Text>

            <TouchableOpacity
              style={styles.botonAgregarAdulto}
              onPress={() => {
                navigation.replace('CrearAnciano', {
                  usuarioId: usuarioId,
                  codigoFamiliar: null,
                });
              }}
            >
              <Icon name="add-outline" size={24} color={COLORES.BLANCO} />
              <Text style={styles.textoBotonAgregarAdulto}>Agregar adulto mayor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonSaltarAdulto}
              onPress={() => navigation.replace('Principal')}
            >
              <Text style={styles.textoBotonSaltarAdulto}>Saltar por ahora</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const edad = calcularEdad(adultoMayor.fecha_nacimiento);

  return (
    <GestureHandlerRootView style={styles.fondoBlanco}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Información General</Text>
            <Text style={styles.subtituloPrincipal}>{adultoMayor?.nombre || 'Adulto Mayor'}</Text>
          </View>
          <TouchableOpacity style={styles.botonNotificaciones} onPress={irANotificaciones}>
            <Icon name="notifications-outline" size={28} color={COLORES.TEXTO_OSCURO} />
            {notificacionesNoLeidas > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeTexto}>{notificacionesNoLeidas}</Text>
              </View>
            )}
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
          {/* Tarjeta de información básica */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="person-circle-outline" size={28} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.tituloSeccion}>Información Básica</Text>
              {esAdministrador && (
                <TouchableOpacity
                  style={styles.botonEditar}
                  onPress={() => abrirModal('editarAdulto')}
                >
                  <Icon name="create-outline" size={22} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contenedorTarjeta}>
              <View style={styles.filaInfo}>
                <View style={styles.itemInfo}>
                  <Icon name="calendar-outline" size={20} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Edad:</Text>
                  <Text style={styles.valorInfo}>{edad} años</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Icon name="male-female-outline" size={20} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Género:</Text>
                  <Text style={styles.valorInfo}>
                    {adultoMayor?.genero === 'M' || adultoMayor?.genero === 'Masculino'
                      ? 'Masculino'
                      : adultoMayor?.genero === 'F' || adultoMayor?.genero === 'Femenino'
                        ? 'Femenino'
                        : 'No especificado'}
                  </Text>
                </View>
              </View>

              <View style={styles.filaInfo}>
                <View style={styles.itemInfo}>
                  <Icon name="heart-outline" size={20} color={COLORES.ROJO_CLARO} />
                  <Text style={styles.labelInfo}>Estado de salud:</Text>
                  <View
                    style={[
                      styles.estadoSalud,
                      { backgroundColor: obtenerColorEstadoSalud(adultoMayor?.estado_salud) },
                    ]}
                  >
                    <Text style={styles.textoEstadoSalud}>
                      {adultoMayor?.estado_salud?.toUpperCase() || 'NO ESPECIFICADO'}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemInfo}>
                  <Icon name="bed-outline" size={20} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Dependencia:</Text>
                  <Text style={styles.valorInfo}>
                    {adultoMayor?.nivel_dependencia === 'alta'
                      ? 'Alta'
                      : adultoMayor?.nivel_dependencia === 'media'
                        ? 'Media'
                        : adultoMayor?.nivel_dependencia === 'baja'
                          ? 'Baja'
                          : 'No especificada'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCompleta}>
                <Icon name="calendar-outline" size={18} color={COLORES.GRIS_OSCURO} />
                <Text style={styles.labelInfo}>Fecha de nacimiento:</Text>
                <Text style={styles.valorInfo}>{formatearFecha(adultoMayor?.fecha_nacimiento)}</Text>
              </View>

              {adultoMayor?.contacto_emergencia && (
                <View style={styles.infoCompleta}>
                  <Icon name="call-outline" size={18} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Contacto emergencia:</Text>
                  <Text style={styles.valorInfo}>{adultoMayor.contacto_emergencia}</Text>
                </View>
              )}

              {adultoMayor?.telefono_emergencia && (
                <View style={styles.infoCompleta}>
                  <Icon name="call-outline" size={18} color={COLORES.ERROR} />
                  <Text style={styles.labelInfo}>Teléfono emergencia:</Text>
                  <Text style={[styles.valorInfo, { color: COLORES.ERROR }]}>
                    {adultoMayor.telefono_emergencia}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Enfermedades */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="medical-outline" size={24} color={COLORES.ROJO_CLARO} />
              <Text style={styles.tituloSeccion}>Enfermedades y Condiciones</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('enfermedad')}>
                  <Icon name="add-outline" size={24} color={COLORES.ROJO_CLARO} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.enfermedades?.length > 0 ? (
                adultoMayor.enfermedades.map((enfermedad) =>
                  renderSwipeableItem(
                    {
                      ...enfermedad,
                      detalle: `${enfermedad.fecha_diagnostico ? 'Diagnóstico: ' + formatearFecha(enfermedad.fecha_diagnostico) : ''}${enfermedad.tratamiento ? ' • Tratamiento: ' + enfermedad.tratamiento : ''}`,
                    },
                    'enfermedad',
                    'enfermedad',
                    (item) => abrirModal('enfermedad', item),
                    (id) => eliminarElemento('enfermedad', id)
                  )
                )
              ) : (
                <Text style={styles.textoVacioLista}>No hay enfermedades registradas</Text>
              )}
            </View>
          </View>

          {/* Alergias */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="alert-circle-outline" size={24} color={COLORES.NARANJA} />
              <Text style={styles.tituloSeccion}>Alergias</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('alergia')}>
                  <Icon name="add-outline" size={24} color={COLORES.NARANJA} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.alergias?.length > 0 ? (
                adultoMayor.alergias.map((alergia) =>
                  renderSwipeableItem(
                    {
                      ...alergia,
                      detalle: `Severidad: ${alergia.severidad?.toUpperCase() || 'No especificada'}${alergia.reaccion ? ' • Reacción: ' + alergia.reaccion : ''}`,
                    },
                    'alergia',
                    'alergia',
                    (item) => abrirModal('alergia', item),
                    (id) => eliminarElemento('alergia', id)
                  )
                )
              ) : (
                <Text style={styles.textoVacioLista}>No hay alergias registradas</Text>
              )}
            </View>
          </View>

          {/* Medicinas Habituales */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="medkit-outline" size={24} color={COLORES.EXITO} />
              <Text style={styles.tituloSeccion}>Medicinas Habituales</Text>
              <TouchableOpacity style={styles.botonVerTodo} onPress={() => navegarA('Medicinas')}>
                <Text style={styles.textoBotonVerTodo}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.medicinas_habituales?.length > 0 ? (
                adultoMayor.medicinas_habituales.slice(0, 5).map((medicina) =>
                  renderSwipeableItem(
                    {
                      ...medicina,
                      detalle: `${medicina.dosis || ''}${medicina.frecuencia ? ' • ' + medicina.frecuencia : ''}`,
                    },
                    'medicina',
                    'medicina',
                    (item) => navegarA('Medicinas', { medicinaId: item.id }),
                    (id) => eliminarElemento('medicina', id)
                  )
                )
              ) : (
                <Text style={styles.textoVacioLista}>No hay medicinas registradas</Text>
              )}
              {adultoMayor?.medicinas_habituales?.length > 5 && (
                <TouchableOpacity style={styles.botonVerMas} onPress={() => navegarA('Medicinas')}>
                  <Text style={styles.textoBotonVerMas}>
                    Ver {adultoMayor.medicinas_habituales.length - 5} medicinas más
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Artículos */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="cube-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.tituloSeccion}>Artículos y Equipamiento</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('articulo')}>
                  <Icon name="add-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.articulos?.length > 0 ? (
                adultoMayor.articulos.map((articulo) =>
                  renderSwipeableItem(
                    {
                      ...articulo,
                      detalle: `Cantidad: ${articulo.cantidad || 1}${articulo.ubicacion ? ' • Ubicación: ' + articulo.ubicacion : ''}${articulo.estado ? ' • Estado: ' + articulo.estado : ''}`,
                    },
                    'artículo',
                    'articulo',
                    (item) => abrirModal('articulo', item),
                    (id) => eliminarElemento('artículo', id)
                  )
                )
              ) : (
                <Text style={styles.textoVacioLista}>No hay artículos registrados</Text>
              )}
            </View>
          </View>

          {/* Hobbies */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="happy-outline" size={24} color={COLORES.MORADO} />
              <Text style={styles.tituloSeccion}>Hobbies y Actividades</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('hobby')}>
                  <Icon name="add-outline" size={24} color={COLORES.MORADO} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.hobbies?.length > 0 ? (
                adultoMayor.hobbies.map((hobby) =>
                  renderSwipeableItem(
                    hobby,
                    'hobby',
                    'hobby',
                    (item) => abrirModal('hobby', item),
                    (id) => eliminarElemento('hobby', id)
                  )
                )
              ) : (
                <Text style={styles.textoVacioLista}>No hay hobbies registrados</Text>
              )}
            </View>
          </View>

          {/* Citas Médicas Rutinarias */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="calendar-outline" size={24} color={COLORES.TURQUESA} />
              <Text style={styles.tituloSeccion}>Citas Médicas Rutinarias</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('cita')}>
                  <Icon name="add-outline" size={24} color={COLORES.TURQUESA} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.citas_rutinarias?.length > 0 ? (
                adultoMayor.citas_rutinarias.map((cita) =>
                  renderSwipeableItem(
                    {
                      ...cita,
                      detalle: `Frecuencia: ${cita.frecuencia || 'No especificada'}${cita.proxima_cita ? ' • Próxima: ' + formatearFecha(cita.proxima_cita) : ''}${cita.ubicacion ? ' • Lugar: ' + cita.ubicacion : ''}`,
                    },
                    'cita',
                    'cita',
                    (item) => abrirModal('cita', item),
                    (id) => eliminarElemento('cita', id)
                  )
                )
              ) : (
                <Text style={styles.textoVacioLista}>No hay citas rutinarias registradas</Text>
              )}
            </View>
          </View>

          {/* Notas */}
          {adultoMayor?.notas && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="document-text-outline" size={24} color={COLORES.GRIS_OSCURO} />
                <Text style={styles.tituloSeccion}>Notas Adicionales</Text>
              </View>
              <View style={styles.contenedorTarjeta}>
                <Text style={styles.textoNotas}>{adultoMayor.notas}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ===== MODAL AGREGAR/EDITAR ELEMENTOS ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>
                  {modalData.id ? 'Editar' : 'Agregar'}{' '}
                  {modalTipo === 'enfermedad'
                    ? 'Enfermedad'
                    : modalTipo === 'alergia'
                      ? 'Alergia'
                      : modalTipo === 'articulo'
                        ? 'Artículo'
                        : modalTipo === 'hobby'
                          ? 'Hobby'
                          : modalTipo === 'cita'
                            ? 'Cita'
                            : 'Adulto Mayor'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalFormulario}>
                {modalTipo === 'editarAdulto' ? (
                  // Formulario completo de edición del adulto mayor
                  <>
                    <Text style={styles.modalLabel}>Nombre *</Text>
                    <TextInput
                      style={styles.input}
                      value={formAdultoMayor.nombre}
                      onChangeText={(text) => setFormAdultoMayor({ ...formAdultoMayor, nombre: text })}
                      placeholder="Nombre completo"
                    />

                    <Text style={styles.modalLabel}>Fecha de nacimiento</Text>
                    <TextInput
                      style={styles.input}
                      value={formAdultoMayor.fecha_nacimiento}
                      onChangeText={(text) => setFormAdultoMayor({ ...formAdultoMayor, fecha_nacimiento: text })}
                      placeholder="YYYY-MM-DD"
                    />

                    <Text style={styles.modalLabel}>Género</Text>
                    <View style={styles.opcionesGenero}>
                      <TouchableOpacity
                        style={[styles.opcionGenero, formAdultoMayor.genero === 'M' && styles.opcionGeneroSeleccionada]}
                        onPress={() => setFormAdultoMayor({ ...formAdultoMayor, genero: 'M' })}
                      >
                        <Text style={[styles.textoOpcionGenero, formAdultoMayor.genero === 'M' && styles.textoOpcionGeneroSeleccionada]}>
                          Masculino
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.opcionGenero, formAdultoMayor.genero === 'F' && styles.opcionGeneroSeleccionada]}
                        onPress={() => setFormAdultoMayor({ ...formAdultoMayor, genero: 'F' })}
                      >
                        <Text style={[styles.textoOpcionGenero, formAdultoMayor.genero === 'F' && styles.textoOpcionGeneroSeleccionada]}>
                          Femenino
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.modalLabel}>Estado de salud</Text>
                    <View style={styles.opcionesEstadoSalud}>
                      {['excelente', 'bueno', 'regular', 'malo'].map((estado) => (
                        <TouchableOpacity
                          key={estado}
                          style={[
                            styles.opcionEstadoSalud,
                            { backgroundColor: obtenerColorEstadoSalud(estado) + '30' },
                            formAdultoMayor.estado_salud === estado && styles.opcionEstadoSaludSeleccionada,
                          ]}
                          onPress={() => setFormAdultoMayor({ ...formAdultoMayor, estado_salud: estado })}
                        >
                          <Text
                            style={[
                              styles.textoOpcionEstadoSalud,
                              formAdultoMayor.estado_salud === estado && styles.textoOpcionEstadoSaludSeleccionada,
                              { color: obtenerColorEstadoSalud(estado) },
                            ]}
                          >
                            {estado.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.modalLabel}>Nivel de dependencia</Text>
                    <View style={styles.opcionesDependencia}>
                      {['baja', 'media', 'alta'].map((nivel) => (
                        <TouchableOpacity
                          key={nivel}
                          style={[
                            styles.opcionDependencia,
                            formAdultoMayor.nivel_dependencia === nivel && styles.opcionDependenciaSeleccionada,
                          ]}
                          onPress={() => setFormAdultoMayor({ ...formAdultoMayor, nivel_dependencia: nivel })}
                        >
                          <Text
                            style={[
                              styles.textoOpcionDependencia,
                              formAdultoMayor.nivel_dependencia === nivel && styles.textoOpcionDependenciaSeleccionada,
                            ]}
                          >
                            {nivel.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.modalLabel}>Contacto de emergencia</Text>
                    <TextInput
                      style={styles.input}
                      value={formAdultoMayor.contacto_emergencia}
                      onChangeText={(text) => setFormAdultoMayor({ ...formAdultoMayor, contacto_emergencia: text })}
                      placeholder="Nombre del contacto de emergencia"
                    />

                    <Text style={styles.modalLabel}>Teléfono de emergencia</Text>
                    <TextInput
                      style={styles.input}
                      value={formAdultoMayor.telefono_emergencia}
                      onChangeText={(text) => setFormAdultoMayor({ ...formAdultoMayor, telefono_emergencia: text })}
                      placeholder="Teléfono de emergencia"
                      keyboardType="phone-pad"
                    />

                    <Text style={styles.modalLabel}>Notas adicionales</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formAdultoMayor.notas}
                      onChangeText={(text) => setFormAdultoMayor({ ...formAdultoMayor, notas: text })}
                      multiline
                      numberOfLines={4}
                      placeholder="Notas adicionales..."
                    />
                  </>
                ) : modalTipo === 'enfermedad' ? (
                  <>
                    <Text style={styles.modalLabel}>Nombre de la enfermedad *</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevaEnfermedad.nombre}
                      onChangeText={(text) => setNuevaEnfermedad({ ...nuevaEnfermedad, nombre: text })}
                      placeholder="Ej: Hipertensión, Diabetes"
                    />
                    <Text style={styles.modalLabel}>Fecha de diagnóstico</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevaEnfermedad.fecha_diagnostico}
                      onChangeText={(text) => setNuevaEnfermedad({ ...nuevaEnfermedad, fecha_diagnostico: text })}
                      placeholder="YYYY-MM-DD"
                    />
                    <Text style={styles.modalLabel}>Tratamiento</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={nuevaEnfermedad.tratamiento}
                      onChangeText={(text) => setNuevaEnfermedad({ ...nuevaEnfermedad, tratamiento: text })}
                      multiline
                      numberOfLines={3}
                      placeholder="Describe el tratamiento..."
                    />
                  </>
                ) : modalTipo === 'alergia' ? (
                  <>
                    <Text style={styles.modalLabel}>Nombre de la alergia *</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevaAlergia.nombre}
                      onChangeText={(text) => setNuevaAlergia({ ...nuevaAlergia, nombre: text })}
                      placeholder="Ej: Penicilina, Polen"
                    />
                    <Text style={styles.modalLabel}>Severidad</Text>
                    <View style={styles.opcionesSeveridad}>
                      {['baja', 'media', 'alta'].map((sev) => (
                        <TouchableOpacity
                          key={sev}
                          style={[
                            styles.opcionSeveridad,
                            { backgroundColor: sev === 'baja' ? COLORES.VERDE_CLARO : sev === 'media' ? COLORES.AMARILLO_PLATANO : COLORES.ERROR },
                            nuevaAlergia.severidad === sev && styles.opcionSeveridadSeleccionada,
                          ]}
                          onPress={() => setNuevaAlergia({ ...nuevaAlergia, severidad: sev })}
                        >
                          <Text style={[styles.textoOpcionSeveridad, nuevaAlergia.severidad === sev && styles.textoOpcionSeveridadSeleccionada]}>
                            {sev.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.modalLabel}>Reacción</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={nuevaAlergia.reaccion}
                      onChangeText={(text) => setNuevaAlergia({ ...nuevaAlergia, reaccion: text })}
                      multiline
                      numberOfLines={3}
                      placeholder="Describe la reacción..."
                    />
                  </>
                ) : modalTipo === 'articulo' ? (
                  <>
                    <Text style={styles.modalLabel}>Nombre del artículo *</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevoArticulo.nombre}
                      onChangeText={(text) => setNuevoArticulo({ ...nuevoArticulo, nombre: text })}
                      placeholder="Ej: Bastón, Silla de ruedas"
                    />
                    <Text style={styles.modalLabel}>Cantidad</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevoArticulo.cantidad}
                      onChangeText={(text) => setNuevoArticulo({ ...nuevoArticulo, cantidad: text })}
                      keyboardType="numeric"
                    />
                    <Text style={styles.modalLabel}>Ubicación</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevoArticulo.ubicacion}
                      onChangeText={(text) => setNuevoArticulo({ ...nuevoArticulo, ubicacion: text })}
                      placeholder="Ej: Habitación principal"
                    />
                    <Text style={styles.modalLabel}>Estado</Text>
                    <View style={styles.opcionesEstado}>
                      {['optimo', 'regular', 'reparar'].map((est) => (
                        <TouchableOpacity
                          key={est}
                          style={[
                            styles.opcionEstado,
                            { backgroundColor: est === 'optimo' ? COLORES.EXITO : est === 'regular' ? COLORES.AMARILLO_PLATANO : COLORES.ERROR },
                            nuevoArticulo.estado === est && styles.opcionEstadoSeleccionada,
                          ]}
                          onPress={() => setNuevoArticulo({ ...nuevoArticulo, estado: est })}
                        >
                          <Text style={[styles.textoOpcionEstado, nuevoArticulo.estado === est && styles.textoOpcionEstadoSeleccionada]}>
                            {est.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : modalTipo === 'hobby' ? (
                  <>
                    <Text style={styles.modalLabel}>Nombre del hobby *</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevoHobby.nombre}
                      onChangeText={(text) => setNuevoHobby({ ...nuevoHobby, nombre: text })}
                      placeholder="Ej: Lectura, Jardinería"
                    />
                    <Text style={styles.modalLabel}>Emoji</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevoHobby.emoji}
                      onChangeText={(text) => setNuevoHobby({ ...nuevoHobby, emoji: text })}
                      placeholder="Ej: 📖"
                      maxLength={2}
                    />
                    <Text style={styles.modalLabel}>Color</Text>
                    <View style={styles.coloresContainer}>
                      {[COLORES.INDIGO, COLORES.VERDE_CLARO, COLORES.ROSA, COLORES.MORADO, COLORES.NARANJA, COLORES.AMARILLO_PLATANO, COLORES.ROJO_CLARO, COLORES.TURQUESA, COLORES.EXITO].map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[styles.opcionColor, { backgroundColor: color }, nuevoHobby.color === color && styles.opcionColorSeleccionada]}
                          onPress={() => setNuevoHobby({ ...nuevoHobby, color })}
                        />
                      ))}
                    </View>
                  </>
                ) : modalTipo === 'cita' ? (
                  <>
                    <Text style={styles.modalLabel}>Especialista *</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevaCita.especialista}
                      onChangeText={(text) => setNuevaCita({ ...nuevaCita, especialista: text })}
                      placeholder="Ej: Cardiólogo, Geriatra"
                    />
                    <Text style={styles.modalLabel}>Frecuencia</Text>
                    <View style={styles.opcionesFrecuencia}>
                      {['semanal', 'mensual', 'trimestral', 'semestral', 'anual'].map((frec) => (
                        <TouchableOpacity
                          key={frec}
                          style={[styles.opcionFrecuencia, nuevaCita.frecuencia === frec && styles.opcionFrecuenciaSeleccionada]}
                          onPress={() => setNuevaCita({ ...nuevaCita, frecuencia: frec })}
                        >
                          <Text style={[styles.textoOpcionFrecuencia, nuevaCita.frecuencia === frec && styles.textoOpcionFrecuenciaSeleccionada]}>
                            {frec.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.modalLabel}>Próxima cita</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevaCita.proxima_cita}
                      onChangeText={(text) => setNuevaCita({ ...nuevaCita, proxima_cita: text })}
                      placeholder="YYYY-MM-DD"
                    />
                    <Text style={styles.modalLabel}>Ubicación</Text>
                    <TextInput
                      style={styles.input}
                      value={nuevaCita.ubicacion}
                      onChangeText={(text) => setNuevaCita({ ...nuevaCita, ubicacion: text })}
                      placeholder="Ej: Hospital Central"
                    />
                  </>
                ) : null}
              </ScrollView>

              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalVisible(false)}>
                  <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarModal}>
                  <Text style={styles.textoBotonModalAccion}>
                    {modalData.id ? 'Actualizar' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </GestureHandlerRootView>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  fondoBlanco: { flex: 1, backgroundColor: COLORES.BLANCO },
  contenedor: { flex: 1, paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCargando: { color: COLORES.GRIS_OSCURO, marginTop: 20, fontSize: 16 },

  // Encabezado
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  botonAtras: { padding: 6 },
  tituloContainer: { flex: 1, alignItems: 'center' },
  tituloPrincipal: { fontSize: 22, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  subtituloPrincipal: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  botonNotificaciones: { padding: 6, position: 'relative' },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORES.ERROR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeTexto: { color: COLORES.BLANCO, fontSize: 11, fontWeight: 'bold' },

  // Sin adulto
  sinAdultoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  sinAdultoTitulo: { fontSize: 22, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center', marginTop: 16, marginBottom: 8 },
  sinAdultoSubtitulo: { fontSize: 16, color: COLORES.GRIS_OSCURO, textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  botonAgregarAdulto: {
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    gap: 8,
  },
  textoBotonAgregarAdulto: { color: COLORES.BLANCO, fontSize: 18, fontWeight: 'bold' },
  botonSaltarAdulto: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    width: '100%',
    alignItems: 'center',
  },
  textoBotonSaltarAdulto: { color: COLORES.GRIS_OSCURO, fontSize: 16 },

  // Secciones
  seccion: { marginBottom: 24 },
  encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginLeft: 10, flex: 1 },
  botonEditar: { padding: 6 },
  botonAgregar: { padding: 6 },
  botonVerTodo: { padding: 6 },
  textoBotonVerTodo: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 14, fontWeight: '500' },

  contenedorTarjeta: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  // Info básica
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  labelInfo: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginLeft: 6, marginRight: 4 },
  valorInfo: { fontSize: 14, fontWeight: '500', color: COLORES.TEXTO_OSCURO },
  infoCompleta: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  estadoSalud: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 6 },
  textoEstadoSalud: { color: COLORES.BLANCO, fontSize: 11, fontWeight: 'bold' },

  // Items con swipe
  itemLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  textoItem: { fontSize: 15, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginLeft: 10, flex: 1 },
  detalleItem: { fontSize: 13, color: COLORES.GRIS_OSCURO, width: '100%', marginLeft: 34, marginTop: 2 },

  swipeLeft: { backgroundColor: COLORES.AZUL_CIELO_OSCURO, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', flexDirection: 'row', gap: 6 },
  swipeRight: { backgroundColor: COLORES.ERROR, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', flexDirection: 'row', gap: 6 },
  swipeText: { color: COLORES.BLANCO, fontSize: 14, fontWeight: 'bold' },

  botonVerMas: { marginTop: 10, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  textoBotonVerMas: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 14, fontWeight: '500' },
  textoNotas: { fontSize: 14, color: COLORES.TEXTO_OSCURO, lineHeight: 22, fontStyle: 'italic' },
  textoVacioLista: { textAlign: 'center', color: COLORES.GRIS_OSCURO, fontSize: 14, paddingVertical: 20, fontStyle: 'italic' },

  // Modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido: {
    backgroundColor: COLORES.BLANCO,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  modalFormulario: { maxHeight: 500, paddingHorizontal: 4 },
  modalLabel: { fontSize: 15, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORES.TEXTO_OSCURO,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },

  opcionesGenero: { flexDirection: 'row', marginBottom: 8 },
  opcionGenero: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, alignItems: 'center', backgroundColor: COLORES.GRIS_CLARO },
  opcionGeneroSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO, borderWidth: 2 },
  textoOpcionGenero: { fontSize: 14, color: COLORES.GRIS_OSCURO, fontWeight: '500' },
  textoOpcionGeneroSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  opcionesEstadoSalud: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  opcionEstadoSalud: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  opcionEstadoSaludSeleccionada: { borderColor: COLORES.TEXTO_OSCURO, borderWidth: 2 },
  textoOpcionEstadoSalud: { fontSize: 13, fontWeight: '500' },
  textoOpcionEstadoSaludSeleccionada: { fontWeight: 'bold' },

  opcionesDependencia: { flexDirection: 'row', marginBottom: 8 },
  opcionDependencia: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, alignItems: 'center', backgroundColor: COLORES.GRIS_CLARO },
  opcionDependenciaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO, borderWidth: 2 },
  textoOpcionDependencia: { fontSize: 14, color: COLORES.GRIS_OSCURO, fontWeight: '500' },
  textoOpcionDependenciaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  coloresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  opcionColor: { width: 36, height: 36, borderRadius: 18, marginRight: 10, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  opcionColorSeleccionada: { borderColor: COLORES.TEXTO_OSCURO, transform: [{ scale: 1.1 }] },

  opcionesSeveridad: { flexDirection: 'row', marginBottom: 8 },
  opcionSeveridad: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  opcionSeveridadSeleccionada: { borderWidth: 2, borderColor: COLORES.TEXTO_OSCURO },
  textoOpcionSeveridad: { color: COLORES.BLANCO, fontSize: 12, fontWeight: 'bold' },
  textoOpcionSeveridadSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  opcionesEstado: { flexDirection: 'row', marginBottom: 8 },
  opcionEstado: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: 8, alignItems: 'center' },
  opcionEstadoSeleccionada: { borderWidth: 2, borderColor: COLORES.TEXTO_OSCURO },
  textoOpcionEstado: { color: COLORES.BLANCO, fontSize: 12, fontWeight: 'bold' },
  textoOpcionEstadoSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  opcionesFrecuencia: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  opcionFrecuencia: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORES.GRIS_CLARO, marginRight: 8, marginBottom: 8 },
  opcionFrecuenciaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO, borderWidth: 2 },
  textoOpcionFrecuencia: { fontSize: 13, color: COLORES.TEXTO_OSCURO, fontWeight: '500' },
  textoOpcionFrecuenciaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  botonModalCancelar: { flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 8, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center' },
  textoBotonModalCancelar: { color: COLORES.TEXTO_OSCURO, fontSize: 15, fontWeight: '600' },
  botonModalAccion: { flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 8, alignItems: 'center' },
  textoBotonModalAccion: { color: COLORES.BLANCO, fontSize: 15, fontWeight: '600' },
});