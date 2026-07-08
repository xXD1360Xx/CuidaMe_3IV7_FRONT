import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FlatList,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

if (Platform.OS === 'web') {
  const RN = require('react-native');
  if (!RN.findNodeHandle) {
    global.findNodeHandle = (ref) => ref?._nativeTag || ref;
  }
}

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
  INDIGO: '#3F51B5',
  ROSA: '#E91E63',
  AMARILLO: '#FFC107',
  CIAN: '#00BCD4'
};

const { width } = Dimensions.get('window');

const COLOR_FRECUENCIA = {
  diaria: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
  semanal: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100' },
  mensual: { bg: '#E3F2FD', border: '#2196F3', text: '#0D47A1' },
  ocasional: { bg: '#F3E5F5', border: '#9C27B0', text: '#4A148C' }
};

const COLOR_FILTRO = {
  hoy: COLOR_FRECUENCIA.diaria.border,
  semana: COLOR_FRECUENCIA.semanal.border,
  mes: COLOR_FRECUENCIA.mensual.border,
  ocasional: COLOR_FRECUENCIA.ocasional.border,
  todas: '#607D8B',
};

const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
  { id: 0, nombre: 'Domingo' },
];

// Función para formatear hora en formato 12h (AM/PM)
const formatearHoraAMPM = (horaStr) => {
  if (!horaStr) return '';
  const [h, m] = horaStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return horaStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export default function VistaMedicinas({ navigation }) {
  const [medicinas, setMedicinas] = useState([]);
  const [medicinasHoy, setMedicinasHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [medicinaSeleccionada, setMedicinaSeleccionada] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoy');
  const [campoEnFoco, setCampoEnFoco] = useState(null);

  const [modalEstadisticasVisible, setModalEstadisticasVisible] = useState(false);
  const [estadisticasTipo, setEstadisticasTipo] = useState('');
  const [medicinasFiltradas, setMedicinasFiltradas] = useState([]);

  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '' });
  const animNotificacion = useRef(new Animated.Value(0)).current;
  const timeoutNotificacion = useRef(null);

  const [modalTimePickerVisible, setModalTimePickerVisible] = useState(false);
  const [horaSeleccionada, setHoraSeleccionada] = useState('08');
  const [minutoSeleccionado, setMinutoSeleccionado] = useState('00');
  const horas = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutos = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const inputNombreRef = useRef(null);
  const inputDosisRef = useRef(null);

  // Estado de notificaciones (simulado)
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(2);

  const [nuevaMedicina, setNuevaMedicina] = useState({
    nombre: '',
    dosis: '',
    frecuencia: 'diaria',
    horarios: [],
    dias: [],
    duracion: '',
    proposito: '',
    instrucciones: '',
    stock: '30',
    stock_minimo: '10'
  });

  const horariosPredefinidos = [
    { id: 'manana', nombre: 'Mañana', hora: '08:00', icono: 'sunny-outline', color: '#FFD93D' },
    { id: 'mediodia', nombre: 'Mediodía', hora: '12:00', icono: 'restaurant-outline', color: '#F9A825' },
    { id: 'tarde', nombre: 'Tarde', hora: '16:00', icono: 'partly-sunny-outline', color: '#FF8A65' },
    { id: 'noche', nombre: 'Noche', hora: '20:00', icono: 'moon-outline', color: '#7E57C2' },
    { id: 'otra', nombre: 'Otra', hora: '--:--', icono: 'time-outline', color: '#9C27B0' }
  ];

  const frecuencias = [
    { id: 'diaria', nombre: 'Diaria', icono: 'calendar-outline' },
    { id: 'semanal', nombre: 'Semanal', icono: 'calendar-outline' },
    { id: 'mensual', nombre: 'Mensual', icono: 'calendar-outline' },
    { id: 'ocasional', nombre: 'Ocasional', icono: 'medical-outline' }
  ];

  // ---------- CARGA DE DATOS ----------
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) {
        setCargando(false);
        return;
      }

      const [todasRes, hoyRes] = await Promise.all([
        servicioAPI.obtenerTodasMedicinas(usuarioId),
        servicioAPI.obtenerMedicinasHoy(usuarioId)
      ]);

      const limpiar = (arr) => (arr || []).filter(item => item !== null && item !== undefined);

      if (todasRes.exito) {
        const limpias = limpiar(todasRes.medicinas).map(med => ({
          ...med,
          horarios: Array.isArray(med.horarios) ? med.horarios : [],
          tomada_hoy: Array.isArray(med.tomada_hoy) ? med.tomada_hoy : [],
          stock: med.stock ?? med.stock_actual ?? 0,
          stock_minimo: med.stock_minimo ?? 10,
          dias: Array.isArray(med.dias) ? med.dias : [],
        }));
        setMedicinas(limpias);
      }
      if (hoyRes.exito) {
        const hoyLimpio = limpiar(hoyRes.medicinas).map(med => ({
          ...med,
          horarios: Array.isArray(med.horarios) ? med.horarios : [],
          tomada_hoy: Array.isArray(med.tomada_hoy) ? med.tomada_hoy : [],
          stock: med.stock ?? med.stock_actual ?? 0,
          stock_minimo: med.stock_minimo ?? 10,
          dias: Array.isArray(med.dias) ? med.dias : [],
        }));
        setMedicinasHoy(hoyLimpio);
      }

      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioRol(usuario.rol);
      }
    } catch (error) {
      console.error('Error cargando medicinas:', error);
      Alert.alert('Error', 'No se pudieron cargar las medicinas');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatos();
  }, [cargando]);

  // ---------- FILTROS Y SEPARACIÓN ----------
  const obtenerMedicinasFiltradas = () => {
    let lista = [];
    switch (filtroPeriodo) {
      case 'hoy': lista = medicinasHoy; break;
      case 'semana': lista = medicinas.filter(m => m && m.frecuencia === 'semanal'); break;
      case 'mes': lista = medicinas.filter(m => m && m.frecuencia === 'mensual'); break;
      case 'ocasional': lista = medicinas.filter(m => m && m.frecuencia === 'ocasional'); break;
      case 'todas':
        const orden = { ocasional: 0, diaria: 1, semanal: 2, mensual: 3 };
        lista = [...medicinas].sort((a, b) => (orden[a.frecuencia] || 999) - (orden[b.frecuencia] || 999));
        break;
      default: lista = medicinas; break;
    }
    const pendientes = lista.filter(m => !estaCompletadaHoy(m));
    const completadas = lista.filter(m => estaCompletadaHoy(m));
    return { pendientes, completadas };
  };

  const estaCompletadaHoy = (med) => {
    if (!med) return false;
    const horarios = Array.isArray(med.horarios) ? med.horarios : [];
    const tomadas = Array.isArray(med.tomada_hoy) ? med.tomada_hoy : [];
    if (horarios.length === 0) return false;
    const horariosValidos = horarios.filter(h => h && typeof h === 'string' && h !== 'otra' && !h.startsWith('custom_'));
    if (horariosValidos.length === 0) return false;
    return horariosValidos.every(h => tomadas.includes(h));
  };

  // ---------- NOTIFICACIÓN ----------
  const mostrarNotificacion = (mensaje) => {
    if (timeoutNotificacion.current) clearTimeout(timeoutNotificacion.current);
    setNotificacion({ visible: true, mensaje });
    Animated.timing(animNotificacion, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    timeoutNotificacion.current = setTimeout(() => {
      Animated.timing(animNotificacion, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setNotificacion({ visible: false, mensaje: '' }));
    }, 3000);
  };

  // ---------- COMPLETAR TOMA ----------
  const completarToma = async (item) => {
    if (!item) return;
    const horarios = Array.isArray(item.horarios) ? item.horarios : [];
    const tomadas = Array.isArray(item.tomada_hoy) ? item.tomada_hoy : [];
    const horariosValidos = horarios.filter(h => h && typeof h === 'string' && h !== 'otra' && !h.startsWith('custom_'));
    const pendientes = horariosValidos.filter(h => !tomadas.includes(h));
    if (pendientes.length === 0) {
      Alert.alert('Completado', `Ya se tomaron todas las dosis de ${item.nombre} hoy`);
      return;
    }
    const proximoHorario = pendientes[0];
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) {
        Alert.alert('Error', 'Usuario no identificado');
        return;
      }
      const response = await servicioAPI.marcarMedicinaTomada(usuarioId, item.id, hoy, proximoHorario);
      if (response.exito) {
        const nuevoStock = Math.max(0, (item.stock || 0) - 1);
        await servicioAPI.actualizarStockMedicina(item.id, nuevoStock);
        const nombreHorario = horariosPredefinidos.find(h => h.id === proximoHorario)?.nombre || proximoHorario;
        mostrarNotificacion(`✅ Dosis de ${nombreHorario} de ${item.nombre} completada`);
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'No se pudo marcar la toma');
      }
    } catch (error) {
      console.error('Error completando toma:', error);
      Alert.alert('Error', 'Error de conexión al completar la toma');
    }
  };

  // ---------- DESHACER TOMA ----------
  const deshacerToma = async (item) => {
    if (!item) return;
    const horarios = Array.isArray(item.horarios) ? item.horarios : [];
    const tomadas = Array.isArray(item.tomada_hoy) ? item.tomada_hoy : [];
    const horariosValidos = horarios.filter(h => h && typeof h === 'string' && h !== 'otra' && !h.startsWith('custom_'));
    const ultimoHorario = tomadas.filter(h => horariosValidos.includes(h)).pop();
    if (!ultimoHorario) {
      Alert.alert('Info', 'No hay tomas para deshacer');
      return;
    }
    try {
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) {
        Alert.alert('Error', 'Usuario no identificado');
        return;
      }
      // Suponiendo que existe un endpoint para eliminar una toma específica.
      // Si no existe, se puede simular localmente, pero lo ideal es llamar al backend.
      const response = await servicioAPI.eliminarTomaMedicina(usuarioId, item.id, ultimoHorario);
      if (response.exito) {
        const nombreHorario = horariosPredefinidos.find(h => h.id === ultimoHorario)?.nombre || ultimoHorario;
        mostrarNotificacion(`↩️ Toma de ${nombreHorario} de ${item.nombre} deshecha`);
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'No se pudo deshacer la toma');
      }
    } catch (error) {
      console.error('Error deshaciendo toma:', error);
      Alert.alert('Error', 'Error de conexión al deshacer la toma');
    }
  };

  // ---------- CRUD ----------
  const seleccionarHorario = (horarioId) => {
    if (horarioId === 'otra') {
      setModalTimePickerVisible(true);
      return;
    }
    setNuevaMedicina(prev => {
      const nuevos = prev.horarios.includes(horarioId)
        ? prev.horarios.filter(id => id !== horarioId)
        : [...prev.horarios, horarioId];
      return { ...prev, horarios: nuevos };
    });
  };

  const toggleDiaSemana = (diaId) => {
    setNuevaMedicina(prev => {
      const nuevos = prev.dias.includes(diaId)
        ? prev.dias.filter(d => d !== diaId)
        : [...prev.dias, diaId];
      return { ...prev, dias: nuevos };
    });
  };

  const confirmarHorarioCustom = () => {
    const horaStr = `${horaSeleccionada}:${minutoSeleccionado}`;
    const customId = `custom_${horaStr}`;
    setNuevaMedicina(prev => {
      const sinOtros = prev.horarios.filter(id => id !== 'otra' && !id.startsWith('custom_'));
      return { ...prev, horarios: [...sinOtros, customId] };
    });
    setModalTimePickerVisible(false);
  };

  const abrirModalAgregar = (horarioId = null) => {
    setNuevaMedicina({
      nombre: '',
      dosis: '',
      frecuencia: 'diaria',
      horarios: horarioId ? [horarioId] : [],
      dias: [],
      duracion: '',
      proposito: '',
      instrucciones: '',
      stock: '30',
      stock_minimo: '10'
    });
    setMedicinaSeleccionada(null);
    setCampoEnFoco(null);
    setModalAgregarVisible(true);
    setTimeout(() => {
      if (inputNombreRef.current) inputNombreRef.current.focus();
    }, 300);
  };

  const abrirModalEditar = (medicina, campoFoco = null, toggleHorarioId = null) => {
    if (!medicina) return;
    setMedicinaSeleccionada(medicina);
    setCampoEnFoco(campoFoco);
    let horariosIds = Array.isArray(medicina.horarios) ? medicina.horarios : [];
    if (toggleHorarioId) {
      horariosIds = horariosIds.includes(toggleHorarioId)
        ? horariosIds.filter(id => id !== toggleHorarioId)
        : [...horariosIds, toggleHorarioId];
    }
    setNuevaMedicina({
      nombre: medicina.nombre || '',
      dosis: medicina.dosis || '',
      frecuencia: medicina.frecuencia || 'diaria',
      horarios: horariosIds,
      dias: Array.isArray(medicina.dias) ? medicina.dias : [],
      duracion: medicina.duracion?.toString() || '',
      proposito: medicina.proposito || '',
      instrucciones: medicina.instrucciones || '',
      stock: (medicina.stock || 30).toString(),
      stock_minimo: (medicina.stock_minimo || 10).toString()
    });
    setModalAgregarVisible(true);
    if (campoFoco) {
      setTimeout(() => {
        if (campoFoco === 'nombre' && inputNombreRef.current) inputNombreRef.current.focus();
        else if (campoFoco === 'dosis' && inputDosisRef.current) inputDosisRef.current.focus();
      }, 300);
    }
  };

  const guardarMedicina = async () => {
    try {
      if (!nuevaMedicina.nombre.trim()) { Alert.alert('Error', 'Nombre requerido'); return; }
      if (!nuevaMedicina.dosis.trim()) { Alert.alert('Error', 'Dosis requerida'); return; }
      if (nuevaMedicina.horarios.length === 0) { Alert.alert('Error', 'Selecciona al menos un horario'); return; }

      const datosMedicina = {
        ...nuevaMedicina,
        horarios: nuevaMedicina.horarios,
        dias: nuevaMedicina.frecuencia === 'semanal' ? nuevaMedicina.dias : [],
        duracion: nuevaMedicina.duracion ? parseInt(nuevaMedicina.duracion) : null,
        stock: parseInt(nuevaMedicina.stock),
        stock_minimo: parseInt(nuevaMedicina.stock_minimo)
      };

      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      let response;
      if (medicinaSeleccionada) {
        response = await servicioAPI.actualizarMedicina(usuarioId, medicinaSeleccionada.id, datosMedicina);
      } else {
        response = await servicioAPI.crearMedicina(usuarioId, datosMedicina);
      }

      if (response.exito) {
        Alert.alert('Éxito', medicinaSeleccionada ? 'Medicina actualizada' : 'Medicina agregada');
        setModalAgregarVisible(false);
        setMedicinaSeleccionada(null);
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'Error guardando');
      }
    } catch (error) {
      console.error('Error guardando medicina:', error);
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const eliminarMedicina = (medicinaId) => {
    if (!medicinaId) return;
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar esta medicina?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarMedicina(medicinaId);
              if (response.exito) {
                Alert.alert('Éxito', 'Medicina eliminada');
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  // ---------- ESTADÍSTICAS ----------
  const abrirModalEstadisticas = (tipo) => {
    let filtradas = [];
    if (tipo === 'bajoStock') {
      filtradas = medicinas.filter(m => m && (m.stock || 0) < (m.stock_minimo || 10) && (m.stock || 0) > 0);
    } else if (tipo === 'sinStock') {
      filtradas = medicinas.filter(m => m && (m.stock || 0) === 0);
    } else {
      filtradas = medicinas.filter(m => m);
    }
    setMedicinasFiltradas(filtradas);
    setEstadisticasTipo(tipo);
    setModalEstadisticasVisible(true);
  };

  const actualizarStock = async (medicinaId, incremento) => {
    try {
      const medicina = medicinas.find(m => m.id === medicinaId);
      if (!medicina) return;
      const stockActual = medicina.stock || 0;
      const nuevoStock = Math.max(0, stockActual + incremento);
      await servicioAPI.actualizarStockMedicina(medicinaId, nuevoStock);
      const actualizarLista = (lista) => lista.map(m =>
        m.id === medicinaId ? { ...m, stock: nuevoStock } : m
      );
      setMedicinasFiltradas(prev => actualizarLista(prev));
      setMedicinas(prev => actualizarLista(prev));
      setMedicinasHoy(prev => actualizarLista(prev));
      mostrarNotificacion(`Stock de ${medicina.nombre} actualizado a ${nuevoStock}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el stock');
    }
  };

  // ---------- SWIPE ACTIONS ----------
  const renderLeftActions = (progress, dragX, item) => {
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
  };

  const renderRightActions = (progress, dragX, item) => {
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
  };

  const handleSwipeLeft = (item) => { abrirModalEditar(item, null); };
  const handleSwipeRight = (item) => { eliminarMedicina(item.id); };

  // ---------- RENDER DE FILA ----------
  const renderFilaMedicina = ({ item, esPendiente }) => {
    if (!item) return null;
    const horarios = Array.isArray(item.horarios) ? item.horarios : [];
    const tomadaHoy = Array.isArray(item.tomada_hoy) ? item.tomada_hoy : [];
    const freqColor = COLOR_FRECUENCIA[item.frecuencia] || COLOR_FRECUENCIA.diaria;

    return (
      <Swipeable
        renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
        onSwipeableLeftOpen={() => handleSwipeLeft(item)}
        onSwipeableRightOpen={() => handleSwipeRight(item)}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
        overshootFriction={1}
      >
        <View style={[styles.filaMedicina, { backgroundColor: freqColor.bg }]}>
          {/* Nombre y propósito */}
          <TouchableOpacity
            style={styles.columnaNombre}
            onPress={() => abrirModalEditar(item, 'nombre')}
            activeOpacity={0.6}
          >
            <Text style={styles.textoMedicinaNombre} numberOfLines={2}>{item.nombre || 'Sin nombre'}</Text>
            {item.proposito && <Text style={styles.textoProposito} numberOfLines={1}>{item.proposito}</Text>}
          </TouchableOpacity>

          {/* Dosis */}
          <TouchableOpacity
            style={styles.columnaDosis}
            onPress={() => abrirModalEditar(item, 'dosis')}
            activeOpacity={0.6}
          >
            <Text style={styles.textoDosis}>{item.dosis || '--'}</Text>
          </TouchableOpacity>

          {/* Horarios */}
          <View style={styles.columnaHorarios}>
            {horariosPredefinidos.filter(h => h.id !== 'otra').map(horario => {
              const tieneEsteHorario = horarios.includes(horario.id);
              const yaTomadaHoy = tomadaHoy.includes(horario.id);
              // Si el horario es custom, mostramos la hora formateada; si no, mostramos el icono
              return (
                <TouchableOpacity
                  key={horario.id}
                  style={[
                    styles.horarioItem,
                    tieneEsteHorario && styles.horarioItemActivo,
                    yaTomadaHoy && styles.horarioItemCompletado,
                  ]}
                  onPress={() => abrirModalEditar(item, null, horario.id)}
                >
                  <Icon
                    name={horario.icono}
                    size={16}
                    color={tieneEsteHorario ? (yaTomadaHoy ? COLORES.EXITO : horario.color) : COLORES.GRIS_MEDIO}
                  />
                  {tieneEsteHorario && yaTomadaHoy && (
                    <View style={styles.checkmarkOverlay}>
                      <Icon name="checkmark-circle" size={12} color={COLORES.BLANCO} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {horarios.filter(h => h && typeof h === 'string' && h.startsWith('custom_')).map(h => {
              const yaTomadaHoy = tomadaHoy.includes(h);
              const horaCustom = h.replace('custom_', '');
              return (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.horarioItem,
                    styles.horarioItemActivo,
                    yaTomadaHoy && styles.horarioItemCompletado,
                    { backgroundColor: yaTomadaHoy ? COLORES.EXITO + '30' : COLORES.MORADO + '20' }
                  ]}
                  onPress={() => abrirModalEditar(item, null, h)}
                >
                  <Text style={[styles.horaCustom, { color: yaTomadaHoy ? COLORES.EXITO : COLORES.MORADO }]}>
                    {formatearHoraAMPM(horaCustom)}
                  </Text>
                  {yaTomadaHoy && (
                    <View style={styles.checkmarkOverlay}>
                      <Icon name="checkmark-circle" size={12} color={COLORES.BLANCO} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Acción: según pendiente/completada */}
          <View style={styles.columnaAcciones}>
            {esPendiente ? (
              <TouchableOpacity
                style={[styles.botonTomar, { backgroundColor: COLORES.EXITO }]}
                onPress={() => completarToma(item)}
              >
                <Icon name="checkmark-outline" size={22} color={COLORES.BLANCO} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.botonTomar, { backgroundColor: COLORES.ROJO_CLARO }]}
                onPress={() => deshacerToma(item)}
              >
                <Icon name="close-outline" size={22} color={COLORES.BLANCO} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Swipeable>
    );
  };

  // ---------- RENDER DE CABECERA ----------
  const renderCabeceraTabla = () => (
    <View style={styles.filaCabecera}>
      <View style={styles.columnaNombre}>
        <Text style={styles.textoCabecera}>Medicina</Text>
        <Text style={styles.textoCabeceraEmoji}>💊</Text>
      </View>
      <View style={styles.columnaDosis}>
        <Text style={styles.textoCabecera}>Dosis</Text>
        <Text style={styles.textoCabeceraEmoji}>💉</Text>
      </View>
      <View style={styles.columnaHorarios}>
        {horariosPredefinidos.filter(h => h.id !== 'otra').map(horario => (
          <View key={horario.id} style={styles.horarioCabeceraItem}>
            <Text style={[styles.textoCabeceraHorario, { color: horario.color }]}>
              {horario.nombre}
            </Text>
            <Icon name={horario.icono} size={12} color={horario.color} style={{ marginTop: 1 }} />
          </View>
        ))}
      </View>
      <View style={styles.columnaAcciones}>
        <Text style={styles.textoCabecera}>Acción</Text>
        <Icon name="return-down-forward-outline" size={14} color={COLORES.BLANCO} style={{ marginTop: 1 }} />
      </View>
    </View>
  );

  // ---------- TIME PICKER ----------
  const renderTimePicker = () => (
    <Modal
      animationType="slide"
      transparent
      visible={modalTimePickerVisible}
      onRequestClose={() => setModalTimePickerVisible(false)}
    >
      <TouchableOpacity style={styles.modalFondo} activeOpacity={1} onPressOut={() => setModalTimePickerVisible(false)}>
        <View style={[styles.modalContenido, { maxHeight: '60%' }]}>
          <View style={styles.modalEncabezado}>
            <Text style={styles.modalTitulo}>Seleccionar hora</Text>
            <TouchableOpacity onPress={() => setModalTimePickerVisible(false)}>
              <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
            </TouchableOpacity>
          </View>
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerColumna}>
              <Text style={styles.timePickerLabel}>Hora</Text>
              <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                {horas.map(h => (
                  <TouchableOpacity key={h} style={[styles.timePickerItem, horaSeleccionada === h && styles.timePickerItemSelected]} onPress={() => setHoraSeleccionada(h)}>
                    <Text style={[styles.timePickerItemText, horaSeleccionada === h && styles.timePickerItemTextSelected]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.timePickerColumna}>
              <Text style={styles.timePickerLabel}>Min</Text>
              <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                {minutos.map(m => (
                  <TouchableOpacity key={m} style={[styles.timePickerItem, minutoSeleccionado === m && styles.timePickerItemSelected]} onPress={() => setMinutoSeleccionado(m)}>
                    <Text style={[styles.timePickerItemText, minutoSeleccionado === m && styles.timePickerItemTextSelected]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={styles.modalBotones}>
            <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalTimePickerVisible(false)}>
              <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={confirmarHorarioCustom}>
              <Text style={styles.textoBotonModalAccion}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ---------- MODAL ESTADÍSTICAS ----------
  const renderModalEstadisticas = () => {
    const titulo = estadisticasTipo === 'bajoStock' ? 'Medicinas con bajo stock' :
      estadisticasTipo === 'sinStock' ? 'Medicinas sin stock' : 'Todas las medicinas';
    return (
      <Modal
        animationType="slide"
        transparent
        visible={modalEstadisticasVisible}
        onRequestClose={() => setModalEstadisticasVisible(false)}
      >
        <TouchableOpacity style={styles.modalFondo} activeOpacity={1} onPressOut={() => setModalEstadisticasVisible(false)}>
          <View style={[styles.modalContenido, { maxHeight: '80%' }]}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>{titulo}</Text>
              <TouchableOpacity onPress={() => setModalEstadisticasVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={medicinasFiltradas}
              keyExtractor={item => item?.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => {
                if (!item) return null;
                const stockVal = item.stock || 0;
                return (
                  <Swipeable
                    renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
                    renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                    onSwipeableLeftOpen={() => handleSwipeLeft(item)}
                    onSwipeableRightOpen={() => handleSwipeRight(item)}
                    overshootLeft={false}
                    overshootRight={false}
                    friction={2}
                  >
                    <View style={[styles.filaMedicina, { paddingVertical: 6, backgroundColor: COLORES.GRIS_CLARO + '40' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.textoMedicinaNombre}>{item.nombre}</Text>
                        <Text style={styles.textoProposito}>Dosis: {item.dosis}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 4 }}>
                        <TouchableOpacity onPress={() => actualizarStock(item.id, -1)} style={styles.botonStock}>
                          <Icon name="remove-outline" size={16} color={COLORES.ERROR} />
                        </TouchableOpacity>
                        <TextInput style={[styles.inputStock, { width: 40, textAlign: 'center', fontSize: 14 }]} value={String(stockVal)} onChangeText={(text) => {
                          const num = parseInt(text);
                          if (!isNaN(num) && num >= 0) actualizarStock(item.id, num - stockVal);
                        }} keyboardType="numeric" />
                        <TouchableOpacity onPress={() => actualizarStock(item.id, 1)} style={styles.botonStock}>
                          <Icon name="add-outline" size={16} color={COLORES.EXITO} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Swipeable>
                );
              }}
              ListEmptyComponent={() => (
                <View style={styles.sinMedicinas}>
                  <Icon name="medkit-outline" size={60} color={COLORES.GRIS_MEDIO} />
                  <Text style={styles.textoSinMedicinas}>No hay medicinas en esta categoría</Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ---------- RENDER PRINCIPAL ----------
  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.BLANCO, COLORES.BLANCO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando medicinas...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const { pendientes, completadas } = obtenerMedicinasFiltradas();
  const totalPendientes = pendientes.length;
  const totalCompletadas = completadas.length;

  const esAdministrador = usuarioRol === 'familiar_admin' || usuarioRol === 'familiar_administrador';

  const totalMedicinas = medicinas.filter(m => m).length;
  const bajoStock = medicinas.filter(m => m && (m.stock || 0) < (m.stock_minimo || 10) && (m.stock || 0) > 0).length;
  const sinStock = medicinas.filter(m => m && (m.stock || 0) === 0).length;

  return (
    <GestureHandlerRootView style={styles.fondo}>
      <LinearGradient colors={[COLORES.BLANCO, COLORES.BLANCO]} style={styles.fondo}>
        <SafeAreaView style={styles.contenedor}>
          {/* Encabezado */}
          <View style={styles.encabezado}>
            <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
            </TouchableOpacity>
            <View style={styles.tituloContainer}>
              <Text style={styles.tituloPrincipal}>Gestión de Medicinas</Text>
              <Text style={styles.subtituloPrincipal}>
                {totalPendientes} pendientes • {totalCompletadas} completadas
              </Text>
            </View>
            {/* Botón de notificaciones con badge */}
            <TouchableOpacity style={styles.botonNotificaciones} onPress={() => alert('Notificaciones')}>
              <Icon name="notifications-outline" size={28} color={COLORES.TEXTO_OSCURO} />
              {notificacionesNoLeidas > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeTexto}>{notificacionesNoLeidas}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Filtros */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosContainer} contentContainerStyle={{ justifyContent: 'space-around', alignItems: 'center' }}>
            {[
              { key: 'hoy', label: 'Hoy', color: COLOR_FILTRO.hoy },
              { key: 'semana', label: 'Semana', color: COLOR_FILTRO.semana },
              { key: 'mes', label: 'Mes', color: COLOR_FILTRO.mes },
              { key: 'ocasional', label: 'Ocasional', color: COLOR_FILTRO.ocasional },
              { key: 'todas', label: 'Todas', color: COLOR_FILTRO.todas },
            ].map(({ key, label, color }) => (
              <TouchableOpacity
                key={key}
                style={[styles.filtroBotonGrande, filtroPeriodo === key && { backgroundColor: color, borderColor: color }]}
                onPress={() => setFiltroPeriodo(key)}
              >
                <Text style={[styles.textoFiltroGrande, filtroPeriodo === key && { color: COLORES.BLANCO }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORES.AMARILLO_PLATANO]} />}
            contentContainerStyle={styles.contenedorScroll}
          >
            {/* Tabla principal */}
            <View style={styles.tablaContainer}>
              {renderCabeceraTabla()}

              {/* Pendientes */}
              <View style={styles.seccionTabla}>
                <View style={styles.tituloSeccionTabla}>
                  <Text style={styles.textoTituloSeccionTabla}>Pendientes de Tomar</Text>
                  <Text style={styles.contadorSeccionTabla}>{totalPendientes}</Text>
                </View>
                {pendientes.length > 0 ? (
                  <FlatList
                    data={pendientes}
                    renderItem={({ item }) => renderFilaMedicina({ item, esPendiente: true })}
                    keyExtractor={item => item?.id?.toString() || Math.random().toString()}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.mensajeVacioSeccion}>
                    <Text style={styles.textoMensajeVacio}>✨ Todas las medicinas están completas hoy</Text>
                  </View>
                )}
              </View>

              {/* Completadas */}
              <View style={[styles.seccionTabla, { borderTopWidth: 2, borderTopColor: COLORES.GRIS_MEDIO, marginTop: 8, paddingTop: 8 }]}>
                <View style={styles.tituloSeccionTabla}>
                  <Text style={styles.textoTituloSeccionTabla}>Ya tomadas</Text>
                  <Text style={styles.contadorSeccionTabla}>{totalCompletadas}</Text>
                </View>
                {completadas.length > 0 ? (
                  <FlatList
                    data={completadas}
                    renderItem={({ item }) => renderFilaMedicina({ item, esPendiente: false })}
                    keyExtractor={item => item?.id?.toString() || Math.random().toString()}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.mensajeVacioSeccion}>
                    <Text style={styles.textoMensajeVacio}>No hay medicinas completadas aún</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Gestionar medicinas */}
            <View style={styles.seccion}>
              <Text style={styles.tituloSeccion}>📋 Gestionar medicinas</Text>
              <View style={styles.contenedorTarjetas}>
                {medicinas.length > 0 ? (
                  <FlatList
                    data={medicinas}
                    renderItem={({ item }) => (
                      <Swipeable
                        renderLeftActions={(progress, dragX) => renderLeftActions(progress, dragX, item)}
                        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
                        onSwipeableLeftOpen={() => handleSwipeLeft(item)}
                        onSwipeableRightOpen={() => handleSwipeRight(item)}
                        overshootLeft={false}
                        overshootRight={false}
                        friction={2}
                      >
                        <TouchableOpacity
                          activeOpacity={0.7}
                          style={[styles.tarjetaMedicina, { backgroundColor: COLOR_FRECUENCIA[item.frecuencia]?.bg || COLORES.GRIS_CLARO, borderColor: COLOR_FRECUENCIA[item.frecuencia]?.border || COLORES.GRIS_MEDIO, borderWidth: 2 }]}
                          onPress={() => abrirModalEditar(item, null)}
                        >
                          <View style={styles.tarjetaHeader}>
                            <Text style={[styles.tarjetaNombre, { color: COLOR_FRECUENCIA[item.frecuencia]?.text || COLORES.TEXTO_OSCURO }]}>{item.nombre}</Text>
                            <View style={[styles.tarjetaBadgeFrecuencia, { backgroundColor: COLOR_FRECUENCIA[item.frecuencia]?.border || COLORES.GRIS_MEDIO }]}>
                              <Text style={styles.tarjetaTextoBadge}>
                                {item.frecuencia === 'diaria' ? 'Diaria' :
                                  item.frecuencia === 'semanal' ? 'Semanal' :
                                    item.frecuencia === 'mensual' ? 'Mensual' : 'Ocasional'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.tarjetaDetalles}>
                            <Text style={styles.tarjetaDosis}>Dosis: <Text style={{ fontWeight: '600' }}>{item.dosis || '--'}</Text></Text>
                            <Text style={styles.tarjetaHorarios}>Horarios: {(item.horarios || []).join(', ').replace(/custom_/g, '')}</Text>
                            <Text style={styles.tarjetaStock}>Stock: <Text style={{ fontWeight: '600', color: (item.stock || 0) <= (item.stock_minimo || 10) ? COLORES.ERROR : COLORES.TEXTO_OSCURO }}>
                              {item.stock || 0} / {item.stock_minimo || 10}
                            </Text></Text>
                          </View>
                          <View style={styles.tarjetaAcciones}>
                            <TouchableOpacity style={[styles.tarjetaBoton, styles.tarjetaBotonEditar]} onPress={() => abrirModalEditar(item, null)}>
                              <Icon name="create-outline" size={18} color={COLORES.BLANCO} />
                              <Text style={styles.tarjetaBotonTexto}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tarjetaBoton, styles.tarjetaBotonEliminar]} onPress={() => eliminarMedicina(item.id)}>
                              <Icon name="trash-outline" size={18} color={COLORES.BLANCO} />
                              <Text style={styles.tarjetaBotonTexto}>Eliminar</Text>
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      </Swipeable>
                    )}
                    keyExtractor={item => item?.id?.toString() || Math.random().toString()}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.sinMedicinas}>
                    <Icon name="medkit-outline" size={60} color={COLORES.GRIS_MEDIO} />
                    <Text style={styles.textoSinMedicinas}>No hay medicinas registradas</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Estadísticas */}
            <View style={styles.estadisticasContainer}>
              <TouchableOpacity style={[styles.botonEstadisticaGrande, { backgroundColor: COLORES.AZUL_CIELO_OSCURO }]} onPress={() => abrirModalEstadisticas('total')}>
                <Icon name="medkit-outline" size={22} color={COLORES.BLANCO} />
                <Text style={styles.textoBotonEstadisticaGrande}>Total: {totalMedicinas}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonEstadisticaGrande, { backgroundColor: COLORES.AMARILLO_PLATANO }]} onPress={() => abrirModalEstadisticas('bajoStock')}>
                <Icon name="warning-outline" size={22} color={COLORES.TEXTO_OSCURO} />
                <Text style={[styles.textoBotonEstadisticaGrande, { color: COLORES.TEXTO_OSCURO }]}>Bajo stock: {bajoStock}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonEstadisticaGrande, { backgroundColor: COLORES.ROJO_CLARO }]} onPress={() => abrirModalEstadisticas('sinStock')}>
                <Icon name="alert-circle-outline" size={22} color={COLORES.BLANCO} />
                <Text style={styles.textoBotonEstadisticaGrande}>Sin stock: {sinStock}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Botón flotante */}
          {esAdministrador && (
            <TouchableOpacity style={styles.botonFlotante} onPress={() => abrirModalAgregar()}>
              <Icon name="add-outline" size={30} color={COLORES.BLANCO} />
            </TouchableOpacity>
          )}
        </SafeAreaView>

        {/* Modal agregar/editar */}
        <Modal animationType="slide" transparent visible={modalAgregarVisible} onRequestClose={() => { setModalAgregarVisible(false); setMedicinaSeleccionada(null); }}>
          <TouchableOpacity style={styles.modalFondo} activeOpacity={1} onPressOut={() => { setModalAgregarVisible(false); setMedicinaSeleccionada(null); }}>
            <View style={[styles.modalContenido, { maxHeight: '90%' }]}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>{medicinaSeleccionada ? 'Editar Medicina' : 'Nueva Medicina'}</Text>
                <TouchableOpacity onPress={() => { setModalAgregarVisible(false); setMedicinaSeleccionada(null); }}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalFormulario} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalLabel}>Nombre *</Text>
                <TextInput ref={inputNombreRef} style={[styles.input, campoEnFoco === 'nombre' && styles.inputFoco]} value={nuevaMedicina.nombre} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, nombre: text })} placeholder="Ej: Paracetamol" onFocus={() => setCampoEnFoco('nombre')} />

                <Text style={styles.modalLabel}>Dosis *</Text>
                <TextInput ref={inputDosisRef} style={[styles.input, campoEnFoco === 'dosis' && styles.inputFoco]} value={nuevaMedicina.dosis} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, dosis: text })} placeholder="Ej: 500mg" onFocus={() => setCampoEnFoco('dosis')} />

                <Text style={styles.modalLabel}>Horarios *</Text>
                <View style={styles.horariosContainer}>
                  {horariosPredefinidos.map(horario => {
                    const seleccionado = nuevaMedicina.horarios.includes(horario.id);
                    const horaMostrar = horario.hora !== '--:--' ? formatearHoraAMPM(horario.hora) : '';
                    return (
                      <TouchableOpacity key={horario.id} style={[styles.opcionHorario, seleccionado && { backgroundColor: horario.color, borderColor: horario.color }]} onPress={() => seleccionarHorario(horario.id)}>
                        <Icon name={horario.icono} size={20} color={seleccionado ? COLORES.BLANCO : horario.color} />
                        <Text style={[styles.textoOpcionHorario, seleccionado && { color: COLORES.BLANCO, fontWeight: 'bold' }]}>{horario.nombre}</Text>
                        <Text style={[styles.horaOpcion, seleccionado && { color: COLORES.BLANCO }]}>{horaMostrar}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.modalLabel}>Frecuencia</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.frecuenciasContainer}>
                  {frecuencias.map(frec => (
                    <TouchableOpacity key={frec.id} style={[styles.opcionFrecuencia, nuevaMedicina.frecuencia === frec.id && styles.opcionFrecuenciaSeleccionada]} onPress={() => setNuevaMedicina({ ...nuevaMedicina, frecuencia: frec.id })}>
                      <Icon name={frec.icono} size={18} color={nuevaMedicina.frecuencia === frec.id ? COLORES.BLANCO : COLORES.GRIS_OSCURO} />
                      <Text style={[styles.textoOpcionFrecuencia, nuevaMedicina.frecuencia === frec.id && styles.textoOpcionFrecuenciaSeleccionada]}>{frec.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Selector de días para frecuencia semanal */}
                {nuevaMedicina.frecuencia === 'semanal' && (
                  <>
                    <Text style={styles.modalLabel}>Días de la semana * (por defecto Lunes)</Text>
                    <View style={styles.diasContainer}>
                      {DIAS_SEMANA.map(dia => (
                        <TouchableOpacity
                          key={dia.id}
                          style={[
                            styles.opcionDia,
                            nuevaMedicina.dias.includes(dia.id) && styles.opcionDiaSeleccionada,
                            nuevaMedicina.dias.length === 0 && dia.id === 1 && styles.opcionDiaSeleccionada
                          ]}
                          onPress={() => toggleDiaSemana(dia.id)}
                        >
                          <Text style={[styles.textoOpcionDia, nuevaMedicina.dias.includes(dia.id) && styles.textoOpcionDiaSeleccionada]}>
                            {dia.nombre.slice(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {nuevaMedicina.dias.length === 0 && (
                      <Text style={styles.textoAyudaDia}>* Se seleccionará Lunes por defecto si no eliges ninguno</Text>
                    )}
                  </>
                )}

                <View style={styles.filaInputs}>
                  <View style={styles.inputMitad}><Text style={styles.modalLabel}>Stock actual</Text><TextInput style={styles.input} value={nuevaMedicina.stock} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, stock: text })} keyboardType="numeric" /></View>
                  <View style={styles.inputMitad}><Text style={styles.modalLabel}>Stock mínimo</Text><TextInput style={styles.input} value={nuevaMedicina.stock_minimo} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, stock_minimo: text })} keyboardType="numeric" /></View>
                </View>

                <Text style={styles.modalLabel}>Duración (días)</Text>
                <TextInput style={styles.input} value={nuevaMedicina.duracion} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, duracion: text })} keyboardType="numeric" placeholder="Opcional" />

                <Text style={styles.modalLabel}>Propósito</Text>
                <TextInput style={styles.input} value={nuevaMedicina.proposito} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, proposito: text })} />

                <Text style={styles.modalLabel}>Instrucciones</Text>
                <TextInput style={[styles.input, styles.textArea]} value={nuevaMedicina.instrucciones} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, instrucciones: text })} multiline numberOfLines={3} />
              </ScrollView>

              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.botonModalCancelar} onPress={() => { setModalAgregarVisible(false); setMedicinaSeleccionada(null); }}><Text style={styles.textoBotonModalCancelar}>Cancelar</Text></TouchableOpacity>
                {medicinaSeleccionada && <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]} onPress={() => eliminarMedicina(medicinaSeleccionada.id)}><Text style={styles.textoBotonModalAccion}>Eliminar</Text></TouchableOpacity>}
                <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarMedicina}><Text style={styles.textoBotonModalAccion}>{medicinaSeleccionada ? 'Actualizar' : 'Guardar'}</Text></TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Time picker */}
        {renderTimePicker()}

        {/* Modal estadísticas */}
        {renderModalEstadisticas()}

        {/* Notificación (esquina superior derecha) */}
        {notificacion.visible && (
          <Animated.View style={[styles.notificacionContainer, { opacity: animNotificacion, transform: [{ translateY: animNotificacion.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
            <View style={styles.notificacionContenido}>
              <Icon name="checkmark-circle" size={20} color={COLORES.BLANCO} style={{ marginRight: 10 }} />
              <Text style={styles.notificacionTexto}>{notificacion.mensaje}</Text>
            </View>
          </Animated.View>
        )}
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORES.BLANCO },
  contenedor: { flex: 1, paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCargando: { color: COLORES.GRIS_OSCURO, marginTop: 20, fontSize: 18 },

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
  tituloPrincipal: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
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

  filtrosContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  filtroBotonGrande: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORES.GRIS_MEDIO,
    backgroundColor: COLORES.GRIS_CLARO,
    gap: 8,
    minWidth: 90,
    marginRight: 10,
    height: 48,
  },
  textoFiltroGrande: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 18,
  },

  contenedorScroll: { padding: 12, paddingBottom: 70 },

  tablaContainer: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },

  filaCabecera: {
    flexDirection: 'row',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  textoCabecera: { color: COLORES.BLANCO, fontSize: 12, fontWeight: 'bold', textAlign: 'center', lineHeight: 14 },
  textoCabeceraEmoji: { color: COLORES.BLANCO, fontSize: 14, textAlign: 'center', lineHeight: 16 },

  columnaNombre: { flex: 2.0, alignItems: 'center', paddingHorizontal: 1 },
  columnaDosis: { flex: 0.7, alignItems: 'center', paddingHorizontal: 1 },
  columnaHorarios: { flex: 2.3, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1 },
  columnaAcciones: { flex: 0.9, alignItems: 'center', justifyContent: 'center', gap: 1 },

  horarioCabeceraItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textoCabeceraHorario: { fontSize: 10, fontWeight: 'bold', marginBottom: 1, flexShrink: 0 },

  // Filas de medicina
  filaMedicina: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    minHeight: 42,
  },
  textoMedicinaNombre: { fontSize: 14, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center', marginBottom: 1 },
  textoProposito: { fontSize: 11, color: COLORES.GRIS_OSCURO, fontStyle: 'italic', textAlign: 'center' },
  textoDosis: { fontSize: 14, color: COLORES.TEXTO_OSCURO, textAlign: 'center', fontWeight: '500' },

  horarioItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: 4,
    marginHorizontal: 0.5,
    backgroundColor: COLORES.GRIS_CLARO,
    minHeight: 28,
    position: 'relative',
  },
  horarioItemActivo: { backgroundColor: COLORES.AZUL_CIELO + '30', borderWidth: 1, borderColor: COLORES.AZUL_CIELO_OSCURO },
  horarioItemCompletado: { backgroundColor: COLORES.EXITO + '30', borderColor: COLORES.EXITO },
  checkmarkOverlay: { position: 'absolute', top: -3, right: -3, backgroundColor: COLORES.BLANCO, borderRadius: 8 },
  horaCustom: { fontSize: 10, fontWeight: 'bold' },

  botonTomar: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
    minHeight: 30,
  },

  swipeLeft: { backgroundColor: COLORES.AZUL_CIELO_OSCURO, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', flexDirection: 'row', gap: 6 },
  swipeRight: { backgroundColor: COLORES.ERROR, justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', flexDirection: 'row', gap: 6 },
  swipeText: { color: COLORES.BLANCO, fontSize: 14, fontWeight: 'bold' },

  // Secciones de la tabla
  seccionTabla: { paddingHorizontal: 2 },
  tituloSeccionTabla: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  textoTituloSeccionTabla: { fontSize: 16, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  contadorSeccionTabla: { fontSize: 14, fontWeight: '600', color: COLORES.GRIS_OSCURO, backgroundColor: COLORES.GRIS_CLARO, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  mensajeVacioSeccion: { paddingVertical: 12, alignItems: 'center' },
  textoMensajeVacio: { fontSize: 14, color: COLORES.GRIS_OSCURO, fontStyle: 'italic' },

  // Tarjetas de gestión
  seccion: { marginBottom: 20 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 12, paddingHorizontal: 4 },
  contenedorTarjetas: { backgroundColor: COLORES.BLANCO, borderRadius: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },

  tarjetaMedicina: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 2 },
  tarjetaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tarjetaNombre: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  tarjetaBadgeFrecuencia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tarjetaTextoBadge: { color: COLORES.BLANCO, fontSize: 14, fontWeight: 'bold' },
  tarjetaDetalles: { gap: 4, marginBottom: 10 },
  tarjetaDosis: { fontSize: 14, color: COLORES.TEXTO_OSCURO },
  tarjetaHorarios: { fontSize: 14, color: COLORES.GRIS_OSCURO },
  tarjetaStock: { fontSize: 14, color: COLORES.TEXTO_OSCURO },
  tarjetaAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO, paddingTop: 8 },
  tarjetaBoton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, gap: 6 },
  tarjetaBotonEditar: { backgroundColor: COLORES.AZUL_CIELO_OSCURO },
  tarjetaBotonEliminar: { backgroundColor: COLORES.ROJO_CLARO },
  tarjetaBotonTexto: { color: COLORES.BLANCO, fontSize: 14, fontWeight: 'bold' },

  // Estadísticas
  estadisticasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  botonEstadisticaGrande: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 25,
    gap: 8,
    flex: 1,
    minHeight: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  textoBotonEstadisticaGrande: { color: COLORES.BLANCO, fontSize: 15, fontWeight: 'bold' },

  sinMedicinas: { padding: 30, alignItems: 'center' },
  textoSinMedicinas: { fontSize: 16, color: COLORES.GRIS_OSCURO, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  subtextoSinMedicinas: { fontSize: 14, color: COLORES.GRIS_MEDIO, textAlign: 'center' },

  botonFlotante: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },

  // Modales
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
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
  input: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 8, padding: 10, fontSize: 15, color: COLORES.TEXTO_OSCURO, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  inputFoco: { borderWidth: 2, borderColor: COLORES.AZUL_CIELO_OSCURO, backgroundColor: COLORES.BLANCO },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  filaInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  inputMitad: { width: '48%' },

  horariosContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  opcionHorario: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginBottom: 6,
  },
  textoOpcionHorario: { fontSize: 13, color: COLORES.TEXTO_OSCURO, marginLeft: 6, flex: 1 },
  horaOpcion: { fontSize: 11, color: COLORES.GRIS_OSCURO },

  frecuenciasContainer: { flexDirection: 'row', marginBottom: 4 },
  opcionFrecuencia: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginRight: 6,
  },
  opcionFrecuenciaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO_OSCURO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoOpcionFrecuencia: { fontSize: 13, color: COLORES.GRIS_OSCURO, marginLeft: 4 },
  textoOpcionFrecuenciaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  diasContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  opcionDia: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  opcionDiaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoOpcionDia: { fontSize: 13, color: COLORES.TEXTO_OSCURO },
  textoOpcionDiaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },
  textoAyudaDia: { fontSize: 12, color: COLORES.GRIS_OSCURO, fontStyle: 'italic', marginTop: 4 },

  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonModalCancelar: { flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 8, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center' },
  textoBotonModalCancelar: { color: COLORES.TEXTO_OSCURO, fontSize: 15, fontWeight: '600' },
  botonModalAccion: { flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 8, alignItems: 'center' },
  textoBotonModalAccion: { color: COLORES.BLANCO, fontSize: 15, fontWeight: '600' },

  timePickerContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, height: 250 },
  timePickerColumna: { flex: 1, alignItems: 'center', maxWidth: 120 },
  timePickerLabel: { fontSize: 16, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 8 },
  timePickerScroll: { flex: 1, width: '100%' },
  timePickerItem: { paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  timePickerItemSelected: { backgroundColor: COLORES.AZUL_CIELO + '40' },
  timePickerItemText: { fontSize: 20, color: COLORES.GRIS_OSCURO },
  timePickerItemTextSelected: { color: COLORES.TEXTO_OSCURO, fontWeight: 'bold', fontSize: 22 },

  botonStock: { padding: 4, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 4 },
  inputStock: { backgroundColor: COLORES.BLANCO, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, borderRadius: 4, padding: 2, fontSize: 14 },

  notificacionContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: width * 0.8,
  },
  notificacionContenido: { flexDirection: 'row', alignItems: 'center' },
  notificacionTexto: { color: COLORES.BLANCO, fontSize: 14, flex: 1 },
});