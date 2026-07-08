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
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Colores estandarizados con VistaHorario
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

const { width, height } = Dimensions.get('window');
const DIA_WIDTH = (width - 40) / 7 > 50 ? (width - 40) / 7 : 50;

// ============================================================
// COMPONENTE SELECTOR DE HORA (reutilizado de VistaHorario)
// ============================================================
const TimePicker = ({ value, onChange, label }) => {
  const [digits, setDigits] = useState('');
  const [horaValida, setHoraValida] = useState(true);

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      const hh = h.padStart(2, '0');
      const mm = m.padStart(2, '0');
      setDigits(hh + mm);
    } else {
      setDigits('');
    }
  }, [value]);

  const getDisplay = (d) => {
    if (d.length === 0) return '';
    if (d.length === 1) return d;
    if (d.length === 2) return d;
    if (d.length === 3) return d.slice(0, 2) + ':' + d.slice(2);
    if (d.length === 4) return d.slice(0, 2) + ':' + d.slice(2);
    return '';
  };

  const handleChangeText = (text) => {
    if (text === '') {
      setDigits('');
      setHoraValida(true);
      return;
    }
    const numeros = text.replace(/\D/g, '');
    if (numeros.length === 0) {
      setDigits('');
      return;
    }
    let nuevos = numeros.slice(0, 4);

    if (nuevos.length >= 2) {
      const hora = parseInt(nuevos.slice(0, 2));
      if (hora > 23) {
        if (nuevos.length === 2) {
          nuevos = nuevos.slice(0, 1);
        } else {
          const primerDigito = nuevos.slice(0, 1);
          nuevos = primerDigito + nuevos.slice(2);
        }
      }
    }

    if (nuevos.length === 4) {
      const minutos = parseInt(nuevos.slice(2, 4));
      if (minutos > 59) {
        nuevos = nuevos.slice(0, 3);
      }
    }

    setDigits(nuevos);
    setHoraValida(true);

    if (nuevos.length === 4) {
      const hh = nuevos.slice(0, 2);
      const mm = nuevos.slice(2, 4);
      onChange(hh + ':' + mm);
    }
  };

  const handleBlur = () => {
    // No forzar completado
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Backspace' && digits.length > 0) {
      setDigits('');
      setHoraValida(true);
    }
  };

  return (
    <View style={styles.timePickerContainer}>
      {label && <Text style={styles.subLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, { width: 80, textAlign: 'center' }, !horaValida && styles.inputError]}
        value={getDisplay(digits)}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        keyboardType="numeric"
        maxLength={5}
        placeholder="00:00"
        selectTextOnFocus={true}
      />
    </View>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function VistaCalendario({ navigation }) {
  // ========== ESTADOS ==========
  const [usuarioId, setUsuarioId] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [eventos, setEventos] = useState([]);
  const [familiares, setFamiliares] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Fechas
  const [fechaActual, setFechaActual] = useState(new Date());
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anoActual, setAnoActual] = useState(new Date().getFullYear());

  // Selección
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);

  // Evento en edición
  const [eventoEditando, setEventoEditando] = useState(null);

  // Modales
  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [modalEventosDiaVisible, setModalEventosDiaVisible] = useState(false);

  // Formulario de evento
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: '',
    tipo: 'cita_medica',
    color: COLORES.EXITO,
    fecha_inicio: '',
    fecha_fin: '',
    hora_inicio: '09:00',
    duracion_minutos: 60,
    descripcion: '',
    familiar_id: null,
    recordatorio: true,
    ubicacion: '',
  });

  // Duración
  const OPCIONES_DURACION = [
    { label: '30 min', value: 30 },
    { label: '60 min', value: 60 },
    { label: 'Otro', value: 0 },
  ];
  const [duracionSeleccionada, setDuracionSeleccionada] = useState(60);
  const [duracionPersonalizada, setDuracionPersonalizada] = useState('');

  // Date pickers
  const [isStartDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisible] = useState(false);

  // Tipos de eventos
  const tiposEventos = [
    { id: 'cita_medica', nombre: 'Cita Médica', color: COLORES.EXITO, icono: 'medical-outline' },
    { id: 'visita', nombre: 'Visita Familiar', color: COLORES.AZUL_CIELO, icono: 'people-outline' },
    { id: 'evento_social', nombre: 'Evento Social', color: COLORES.MORADO, icono: 'gift-outline' },
    { id: 'cuidado_familiar', nombre: 'Cuidado Familiar', color: COLORES.AMARILLO_PLATANO, icono: 'heart-outline' },
    { id: 'terapia', nombre: 'Terapia', color: COLORES.TURQUESA, icono: 'fitness-outline' },
    { id: 'vacaciones', nombre: 'Vacaciones', color: COLORES.NARANJA, icono: 'airplane-outline' },
    { id: 'reunion', nombre: 'Reunión', color: COLORES.ROSADO, icono: 'chatbubbles-outline' },
    { id: 'otro', nombre: 'Otro', color: COLORES.GRIS_OSCURO, icono: 'ellipsis-horizontal-outline' },
  ];

  // ========== FUNCIONES DE FECHA ==========
  const esHoy = (fecha) => {
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear();
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    if (isNaN(fecha)) return 'Fecha inválida';
    return fecha.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatearHora = (horaStr) => {
    if (!horaStr) return '';
    const [h, m] = horaStr.split(':');
    return `${h}:${m}`;
  };

  const obtenerNombreMes = () => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mesActual];
  };

  const obtenerIconoTipo = (tipoId) => {
    const tipo = tiposEventos.find(t => t.id === tipoId);
    return tipo ? tipo.icono : 'ellipsis-horizontal-outline';
  };

  const obtenerColorTipo = (tipoId) => {
    const tipo = tiposEventos.find(t => t.id === tipoId);
    return tipo ? tipo.color : COLORES.GRIS_OSCURO;
  };

  const obtenerNombreTipo = (tipoId) => {
    const tipo = tiposEventos.find(t => t.id === tipoId);
    return tipo ? tipo.nombre : 'Otro';
  };

  // ========== ESTADO DEL MES ==========
  const obtenerEstadoMes = () => {
    const hoy = new Date();
    if (mesActual === hoy.getMonth() && anoActual === hoy.getFullYear()) return 'actual';
    if (anoActual > hoy.getFullYear() || (anoActual === hoy.getFullYear() && mesActual > hoy.getMonth())) return 'futuro';
    return 'pasado';
  };

  const estadoColores = {
    actual: { bg: '#FFE135', text: COLORES.TEXTO_OSCURO },
    futuro: { bg: '#87CEEB', text: COLORES.TEXTO_OSCURO },
    pasado: { bg: '#D3D3D3', text: COLORES.GRIS_OSCURO },
  };
  const estadoMes = obtenerEstadoMes();
  const estadoColor = estadoColores[estadoMes] || estadoColores.actual;

  // ========== CARGA DE DATOS ==========
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const id = await servicioAPI.obtenerUsuarioActualId();
      if (!id) {
        Alert.alert('Error', 'Usuario no identificado');
        setCargando(false);
        return;
      }
      setUsuarioId(id);

      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioRol(usuario.rol || '');
      }

      const familiaresRes = await servicioAPI.obtenerFamiliares(id);
      if (familiaresRes.exito) {
        setFamiliares(familiaresRes.familiares || []);
      }

      await cargarEventosMes(id);
    } catch (error) {
      console.error('Error cargando calendario:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [mesActual, anoActual]);

  const cargarEventosMes = async (idUsuario) => {
    try {
      const fechaInicio = new Date(anoActual, mesActual, 1);
      const fechaFin = new Date(anoActual, mesActual + 1, 0);
      const response = await servicioAPI.obtenerEventosPorRango(
        idUsuario,
        fechaInicio.toISOString().split('T')[0],
        fechaFin.toISOString().split('T')[0]
      );
      if (response.exito) {
        setEventos(response.eventos || []);
      } else {
        setEventos([]);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setEventos([]);
    }
  };

  const recargarDatos = async () => {
    if (!usuarioId) return;
    setRefrescando(true);
    await cargarEventosMes(usuarioId);
    setRefrescando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (usuarioId) {
      cargarEventosMes(usuarioId);
    }
  }, [mesActual, anoActual]);

  // ========== NAVEGACIÓN DEL MES ==========
  const cambiarMes = (direccion) => {
    const nuevaFecha = new Date(anoActual, mesActual + direccion, 1);
    setMesActual(nuevaFecha.getMonth());
    setAnoActual(nuevaFecha.getFullYear());
    setFechaActual(nuevaFecha);
  };

  // ========== GENERAR DÍAS ==========
  const generarDiasMes = () => {
    const primerDia = new Date(anoActual, mesActual, 1);
    const ultimoDia = new Date(anoActual, mesActual + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();

    const dias = [];
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push({ dia: null, fecha: null });
    }
    for (let i = 1; i <= diasEnMes; i++) {
      const fecha = new Date(anoActual, mesActual, i);
      const fechaStr = fecha.toISOString().split('T')[0];
      const eventosDia = eventos.filter(ev => {
        const inicio = new Date(ev.fecha_inicio).toISOString().split('T')[0];
        const fin = ev.fecha_fin ? new Date(ev.fecha_fin).toISOString().split('T')[0] : inicio;
        return fechaStr >= inicio && fechaStr <= fin;
      });
      dias.push({
        dia: i,
        fecha: fechaStr,
        esHoy: esHoy(fecha),
        eventos: eventosDia,
      });
    }
    return dias;
  };

  const obtenerEventosParaFecha = (fechaStr) => {
    return eventos.filter(ev => {
      const inicio = new Date(ev.fecha_inicio).toISOString().split('T')[0];
      const fin = ev.fecha_fin ? new Date(ev.fecha_fin).toISOString().split('T')[0] : inicio;
      return fechaStr >= inicio && fechaStr <= fin;
    });
  };

  // ========== SELECCIÓN ==========
  const toggleModoSeleccion = () => {
    if (modoSeleccion) {
      setModoSeleccion(false);
      setDiasSeleccionados([]);
    } else {
      setModoSeleccion(true);
      setDiasSeleccionados([]);
    }
  };

  const seleccionarDia = (dia, fecha) => {
    if (!fecha) return;
    if (modoSeleccion) {
      const index = diasSeleccionados.indexOf(fecha);
      if (index === -1) {
        setDiasSeleccionados([...diasSeleccionados, fecha]);
      } else {
        const nuevos = [...diasSeleccionados];
        nuevos.splice(index, 1);
        setDiasSeleccionados(nuevos);
        // Si ya no hay días seleccionados, salir del modo
        if (nuevos.length === 0) {
          setModoSeleccion(false);
        }
      }
    } else {
      setDiaSeleccionado(fecha);
      const eventosDia = obtenerEventosParaFecha(fecha);
      if (eventosDia.length > 0) {
        setModalEventosDiaVisible(true);
      } else {
        abrirFormularioCrear(fecha);
      }
    }
  };

  // ========== EVENTOS SELECCIONADOS PARA ELIMINAR ==========
  const obtenerEventosEnDiasSeleccionados = () => {
    const eventosEnDias = [];
    diasSeleccionados.forEach(fecha => {
      const evs = obtenerEventosParaFecha(fecha);
      evs.forEach(ev => {
        if (!eventosEnDias.find(e => e.id === ev.id)) {
          eventosEnDias.push(ev);
        }
      });
    });
    return eventosEnDias;
  };

  const eliminarEventosSeleccionados = () => {

    if (!usuarioId) {
      Alert.alert('Error', 'Usuario no identificado');
      return;
    }

    const eventosAEliminar = obtenerEventosEnDiasSeleccionados();
    if (eventosAEliminar.length === 0) {
      Alert.alert('Info', 'No hay eventos para eliminar en los días seleccionados');
      return;
    }
    Alert.alert(
      'Eliminar eventos',
      `¿Eliminar ${eventosAEliminar.length} evento(s) de los días seleccionados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const ev of eventosAEliminar) {
                await servicioAPI.eliminarEvento(usuarioId, ev.id);
              }
              Alert.alert('Éxito', `Eliminados ${eventosAEliminar.length} evento(s)`);
              await recargarDatos();
              setModoSeleccion(false);
              setDiasSeleccionados([]);
            } catch (error) {
              Alert.alert('Error', 'No se pudieron eliminar algunos eventos');
            }
          },
        },
      ]
    );
  };

  // ========== CRUD EVENTO ==========
  const abrirFormularioCrear = (fecha = null) => {
    const hoy = new Date();
    const fechaStr = fecha || hoy.toISOString().split('T')[0];
    setEventoEditando(null);
    setNuevoEvento({
      titulo: '',
      tipo: 'cita_medica',
      color: COLORES.EXITO,
      fecha_inicio: fechaStr,
      fecha_fin: fechaStr,
      hora_inicio: '09:00',
      duracion_minutos: 60,
      descripcion: '',
      familiar_id: null,
      recordatorio: true,
      ubicacion: '',
    });
    setDuracionSeleccionada(60);
    setDuracionPersonalizada('');
    setModalCrearVisible(true);
  };

  const abrirFormularioEditar = (evento) => {
    setEventoEditando(evento.id);
    const fechaInicio = evento.fecha_inicio;
    const fechaFin = evento.fecha_fin || fechaInicio;
    const dur = evento.duracion_minutos || 60;
    let durSel = 60;
    if (dur === 30 || dur === 60) {
      durSel = dur;
      setDuracionPersonalizada('');
    } else {
      durSel = 0;
      setDuracionPersonalizada(String(dur));
    }
    setDuracionSeleccionada(durSel);

    setNuevoEvento({
      titulo: evento.titulo || '',
      tipo: evento.tipo_evento || 'cita_medica',
      color: evento.color_evento || COLORES.EXITO,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      hora_inicio: evento.hora_inicio || '09:00',
      duracion_minutos: dur,
      descripcion: evento.descripcion || '',
      familiar_id: evento.familiar_id || null,
      recordatorio: evento.recordatorio !== undefined ? evento.recordatorio : true,
      ubicacion: evento.ubicacion || '',
    });
    setModalCrearVisible(true);
  };

  const handleDuracionChange = (value) => {
    setDuracionSeleccionada(value);
    if (value === 0) {
      setDuracionPersonalizada('');
      setNuevoEvento(prev => ({ ...prev, duracion_minutos: 0 }));
    } else {
      setDuracionPersonalizada('');
      setNuevoEvento(prev => ({ ...prev, duracion_minutos: value }));
    }
  };

  const handleDuracionPersonalizada = (text) => {
    const num = parseInt(text);
    if (!isNaN(num) && num > 0) {
      setDuracionPersonalizada(text);
      setNuevoEvento(prev => ({ ...prev, duracion_minutos: num }));
    } else {
      setDuracionPersonalizada(text);
      setNuevoEvento(prev => ({ ...prev, duracion_minutos: 0 }));
    }
  };

  const guardarEvento = async () => {
    try {
      if (!nuevoEvento.titulo.trim()) {
        Alert.alert('Error', 'Debes ingresar un título');
        return;
      }
      if (!nuevoEvento.fecha_inicio) {
        Alert.alert('Error', 'Debes seleccionar una fecha de inicio');
        return;
      }
      if (nuevoEvento.duracion_minutos <= 0) {
        Alert.alert('Error', 'Debes seleccionar una duración válida');
        return;
      }

      const datosEvento = {
        titulo: nuevoEvento.titulo.trim(),
        tipo_evento: nuevoEvento.tipo,
        color_evento: nuevoEvento.color,
        fecha_inicio: nuevoEvento.fecha_inicio,
        fecha_fin: nuevoEvento.fecha_fin || nuevoEvento.fecha_inicio,
        hora_inicio: nuevoEvento.hora_inicio,
        duracion_minutos: nuevoEvento.duracion_minutos,
        descripcion: nuevoEvento.descripcion,
        familiar_id: nuevoEvento.familiar_id,
        recordatorio: nuevoEvento.recordatorio,
        ubicacion: nuevoEvento.ubicacion,
      };

      let response;
      if (eventoEditando) {
        response = await servicioAPI.actualizarEvento(eventoEditando, usuarioId, datosEvento);
      } else {
        response = await servicioAPI.crearEvento(usuarioId, datosEvento);
      }

      if (response.exito) {
        Alert.alert('Éxito', eventoEditando ? 'Evento actualizado' : 'Evento creado');
        setModalCrearVisible(false);
        setEventoEditando(null);
        await recargarDatos();
      } else {
        Alert.alert('Error', response.error || 'No se pudo guardar');
      }
    } catch (error) {
      console.error('Error guardando evento:', error);
      Alert.alert('Error', 'Error de conexión');
    }
  };

  const eliminarEvento = (eventoId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarEvento(usuarioId, eventoId);
              if (response.exito) {
                Alert.alert('Éxito', 'Evento eliminado');
                setModalCrearVisible(false);
                setModalEventosDiaVisible(false);
                await recargarDatos();
              } else {
                Alert.alert('Error', response.error || 'No se pudo eliminar');
              }
            } catch (error) {
              Alert.alert('Error', 'Error de conexión');
            }
          },
        },
      ]
    );
  };

  // ========== RENDER ==========
  const renderDia = ({ item }) => {
    if (!item.dia) return <View style={styles.diaVacio} />;
    const estaSeleccionado = diasSeleccionados.includes(item.fecha);
    const esDiaSeleccionado = diaSeleccionado === item.fecha;

    return (
      <TouchableOpacity
        style={[
          styles.diaContainer,
          item.esHoy && styles.diaHoy,
          esDiaSeleccionado && styles.diaSeleccionado,
          estaSeleccionado && styles.diaSeleccionadoMultiple,
        ]}
        onPress={() => seleccionarDia(item.dia, item.fecha)}
        onLongPress={() => {
          if (!modoSeleccion) {
            setModoSeleccion(true);
            setDiasSeleccionados([item.fecha]);
          } else {
            const idx = diasSeleccionados.indexOf(item.fecha);
            if (idx === -1) {
              setDiasSeleccionados([...diasSeleccionados, item.fecha]);
            } else {
              const nuevos = [...diasSeleccionados];
              nuevos.splice(idx, 1);
              setDiasSeleccionados(nuevos);
              if (nuevos.length === 0) {
                setModoSeleccion(false);
              }
            }
          }
        }}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.textoDia,
          item.esHoy && styles.textoDiaHoy,
          (esDiaSeleccionado || estaSeleccionado) && styles.textoDiaSeleccionado,
        ]}>
          {item.dia}
        </Text>
        <View style={styles.miniEventosContainer}>
          {item.eventos.slice(0, 3).map(ev => (
            <View
              key={ev.id}
              style={[styles.miniEvento, { backgroundColor: ev.color_evento || obtenerColorTipo(ev.tipo_evento) }]}
            />
          ))}
        </View>
        {item.eventos.length > 3 && (
          <Text style={styles.masEventos}>+{item.eventos.length - 3}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (cargando) {
    return (
      <View style={styles.fondoBlanco}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AZUL_CIELO_OSCURO} />
          <Text style={styles.textoCargando}>Cargando calendario...</Text>
        </SafeAreaView>
      </View>
    );
  }

  const diasMes = generarDiasMes();
  const eventosAEliminar = obtenerEventosEnDiasSeleccionados();

  return (
    <View style={styles.fondoBlanco}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.contenedor}>
        {/* ===== ENCABEZADO ===== */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          <Text style={styles.tituloPrincipal}>Calendario</Text>
          <TouchableOpacity style={styles.botonRefrescar} onPress={recargarDatos} disabled={refrescando}>
            <Icon name="refresh-outline" size={24} color={refrescando ? COLORES.GRIS_OSCURO : COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* ===== NAVEGACIÓN + ESTADO MES ===== */}
        <View style={styles.controlesNavegacion}>
          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarMes(-1)}>
            <Icon name="chevron-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>

          <View style={[styles.estadoMesContainer, { backgroundColor: estadoColor.bg }]}>
            <Text style={[styles.estadoMesTexto, { color: estadoColor.text }]}>
              {estadoMes === 'actual' ? 'Mes actual' : estadoMes === 'futuro' ? 'Mes futuro' : 'Mes pasado'}
            </Text>
            <Text style={[styles.estadoMesFechas, { color: estadoColor.text }]}>
              {obtenerNombreMes()} {anoActual}
            </Text>
          </View>

          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarMes(1)}>
            <Icon name="chevron-forward-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* ===== DÍAS DE LA SEMANA ===== */}
        <View style={styles.diasSemanaContainer}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
            <View key={i} style={styles.diaSemana}>
              <Text style={styles.textoDiaSemana}>{d}</Text>
            </View>
          ))}
        </View>

        {/* ===== GRID ===== */}
        <View style={styles.gridContainer}>
          <FlatList
            data={diasMes}
            renderItem={renderDia}
            keyExtractor={(item, index) => index.toString()}
            numColumns={7}
            scrollEnabled={false}
            contentContainerStyle={styles.calendarioGrid}
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={recargarDatos}
                colors={[COLORES.AMARILLO_PLATANO]}
                tintColor={COLORES.AMARILLO_PLATANO}
              />
            }
          />
        </View>

        {/* ===== BOTONES DE ACCIÓN ===== */}
        <View style={styles.botonesAccion}>
          {modoSeleccion ? (
            <>
              {eventosAEliminar.length > 0 && (
                <TouchableOpacity
                  style={[styles.botonAccion, styles.botonEliminar]}
                  onPress={eliminarEventosSeleccionados}
                >
                  <Text style={styles.textoBotonAccion}>Eliminar {eventosAEliminar.length} evento{eventosAEliminar.length > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.botonAccion, styles.botonCancelar]}
                onPress={() => {
                  setModoSeleccion(false);
                  setDiasSeleccionados([]);
                }}
              >
                <Text style={styles.textoBotonAccion}>Cancelar</Text>
              </TouchableOpacity>
              {diasSeleccionados.length > 0 && (
                <TouchableOpacity
                  style={[styles.botonAccion, styles.botonCrearEvento]}
                  onPress={() => {
                    const fechasOrdenadas = [...diasSeleccionados].sort();
                    setNuevoEvento(prev => ({
                      ...prev,
                      fecha_inicio: fechasOrdenadas[0],
                      fecha_fin: fechasOrdenadas[fechasOrdenadas.length - 1],
                      titulo: `Evento del ${fechasOrdenadas[0]}`,
                    }));
                    setModalCrearVisible(true);
                  }}
                >
                  <Text style={styles.textoBotonAccion}>Crear Evento</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.botonAccion, styles.botonSeleccionar]}
                onPress={toggleModoSeleccion}
              >
                <Text style={styles.textoBotonAccion}>Seleccionar días</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonAccion, styles.botonNuevo]}
                onPress={() => abrirFormularioCrear()}
              >
                <Text style={styles.textoBotonAccion}>+ Nuevo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ===== EVENTOS PRÓXIMOS ===== */}
        <View style={styles.seccionEventos}>
          <Text style={styles.tituloSeccion}>Eventos Próximos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventosScrollContent}>
            {eventos.slice(0, 10).map(evento => (
              <TouchableOpacity
                key={evento.id}
                style={[styles.tarjetaEvento, { borderLeftColor: evento.color_evento || obtenerColorTipo(evento.tipo_evento) }]}
                onPress={() => abrirFormularioEditar(evento)}
                activeOpacity={0.7}
              >
                <View style={styles.encabezadoEvento}>
                  <Icon name={obtenerIconoTipo(evento.tipo_evento)} size={20} color={evento.color_evento || obtenerColorTipo(evento.tipo_evento)} />
                  <Text style={styles.tituloEvento} numberOfLines={1}>{evento.titulo}</Text>
                </View>
                <Text style={styles.fechaEvento}>{formatearFecha(evento.fecha_inicio)}</Text>
                {evento.hora_inicio && (
                  <Text style={styles.horaEvento}>{formatearHora(evento.hora_inicio)} • {evento.duracion_minutos || 60}min</Text>
                )}
                {evento.ubicacion && <Text style={styles.ubicacionEvento} numberOfLines={1}>📍 {evento.ubicacion}</Text>}
              </TouchableOpacity>
            ))}
            {eventos.length === 0 && (
              <View style={styles.sinEventosContainer}>
                <Icon name="calendar-outline" size={40} color={COLORES.GRIS_MEDIO} />
                <Text style={styles.textoSinEventos}>No hay eventos</Text>
                <Text style={styles.subtextoSinEventos}>Toca en un día para agregar</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* ============================================================
          MODAL CREAR/EDITAR EVENTO
      ============================================================ */}
      <Modal
        animationType="slide"
        transparent
        visible={modalCrearVisible}
        onRequestClose={() => {
          setModalCrearVisible(false);
          setEventoEditando(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPress={() => {
            setModalCrearVisible(false);
            setEventoEditando(null);
          }}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>
                  {eventoEditando ? 'Editar Evento' : 'Nuevo Evento'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setModalCrearVisible(false);
                  setEventoEditando(null);
                }}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalFormulario}>
                <Text style={styles.modalLabel}>Título *</Text>
                <TextInput
                  style={styles.input}
                  value={nuevoEvento.titulo}
                  onChangeText={(text) => setNuevoEvento({ ...nuevoEvento, titulo: text })}
                  placeholder="Ej: Cita con cardiólogo"
                  placeholderTextColor={COLORES.GRIS_MEDIO}
                />

                <Text style={styles.modalLabel}>Tipo</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tiposContainer}>
                  {tiposEventos.map(tipo => (
                    <TouchableOpacity
                      key={tipo.id}
                      style={[
                        styles.opcionTipo,
                        { backgroundColor: nuevoEvento.tipo === tipo.id ? tipo.color + '40' : COLORES.GRIS_CLARO },
                        nuevoEvento.tipo === tipo.id && styles.opcionTipoSeleccionada,
                      ]}
                      onPress={() => setNuevoEvento({ ...nuevoEvento, tipo: tipo.id, color: tipo.color })}
                    >
                      <Icon name={tipo.icono} size={18} color={nuevoEvento.tipo === tipo.id ? tipo.color : COLORES.GRIS_OSCURO} />
                      <Text style={[styles.textoOpcionTipo, { color: nuevoEvento.tipo === tipo.id ? tipo.color : COLORES.GRIS_OSCURO }]}>
                        {tipo.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.modalLabel}>Color</Text>
                <View style={styles.coloresContainer}>
                  {[COLORES.EXITO, COLORES.AZUL_CIELO, COLORES.AMARILLO_PLATANO, COLORES.MORADO, COLORES.NARANJA, COLORES.ROSADO, COLORES.TURQUESA, COLORES.ROJO_CLARO, COLORES.GRIS_OSCURO].map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.opcionColor, { backgroundColor: color }, nuevoEvento.color === color && styles.opcionColorSeleccionada]}
                      onPress={() => setNuevoEvento({ ...nuevoEvento, color })}
                    />
                  ))}
                </View>

                {/* FECHAS */}
                <View style={styles.filaInputs}>
                  <View style={styles.inputMitad}>
                    <Text style={styles.modalLabel}>Fecha inicio</Text>
                    <TouchableOpacity style={styles.inputFecha} onPress={() => setStartDatePickerVisible(true)}>
                      <Text style={styles.textoInputFecha}>
                        {nuevoEvento.fecha_inicio ? formatearFecha(nuevoEvento.fecha_inicio) : 'Seleccionar'}
                      </Text>
                      <Icon name="calendar-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputMitad}>
                    <Text style={styles.modalLabel}>Fecha fin</Text>
                    <TouchableOpacity style={styles.inputFecha} onPress={() => setEndDatePickerVisible(true)}>
                      <Text style={styles.textoInputFecha}>
                        {nuevoEvento.fecha_fin ? formatearFecha(nuevoEvento.fecha_fin) : 'Misma que inicio'}
                      </Text>
                      <Icon name="calendar-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* HORA Y DURACIÓN */}
                <View style={styles.filaInputs}>
                  <View style={styles.inputMitad}>
                    <Text style={styles.modalLabel}>Hora</Text>
                    <TimePicker
                      value={nuevoEvento.hora_inicio}
                      onChange={(val) => setNuevoEvento({ ...nuevoEvento, hora_inicio: val })}
                    />
                  </View>
                  <View style={styles.inputMitad}>
                    <Text style={styles.modalLabel}>Duración</Text>
                    <View style={styles.duracionContainer}>
                      {OPCIONES_DURACION.map((op) => (
                        <TouchableOpacity
                          key={op.value}
                          style={[
                            styles.botonDuracion,
                            duracionSeleccionada === op.value && styles.botonDuracionSeleccionado,
                          ]}
                          onPress={() => handleDuracionChange(op.value)}
                        >
                          <Text style={[styles.textoBotonDuracion, duracionSeleccionada === op.value && styles.textoBotonDuracionSeleccionado]}>
                            {op.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {duracionSeleccionada === 0 && (
                      <TextInput
                        style={[styles.input, { marginTop: 8 }]}
                        placeholder="Minutos (ej: 45)"
                        keyboardType="numeric"
                        value={duracionPersonalizada}
                        onChangeText={handleDuracionPersonalizada}
                        placeholderTextColor={COLORES.GRIS_MEDIO}
                      />
                    )}
                  </View>
                </View>

                {/* FAMILIAR RESPONSABLE */}
                <Text style={styles.modalLabel}>Familiar responsable</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familiaresContainer}>
                  <TouchableOpacity
                    style={[
                      styles.opcionFamiliar,
                      !nuevoEvento.familiar_id && styles.opcionFamiliarSeleccionada,
                    ]}
                    onPress={() => setNuevoEvento({ ...nuevoEvento, familiar_id: null })}
                  >
                    <Icon name="person-outline" size={18} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.textoOpcionFamiliar}>Ninguno</Text>
                  </TouchableOpacity>
                  {familiares.map(f => (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.opcionFamiliar,
                        { borderColor: f.color || COLORES.AZUL_CIELO },
                        nuevoEvento.familiar_id === f.id && {
                          backgroundColor: (f.color || COLORES.AZUL_CIELO) + '20',
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => setNuevoEvento({ ...nuevoEvento, familiar_id: f.id })}
                    >
                      <View style={[styles.avatarFamiliar, { backgroundColor: f.color || COLORES.AZUL_CIELO }]}>
                        <Text style={styles.textoAvatarFamiliar}>
                          {f.nombre ? f.nombre.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                      <Text style={styles.textoOpcionFamiliar}>{f.nombre?.split(' ')[0] || 'Familiar'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.modalLabel}>Ubicación</Text>
                <TextInput
                  style={styles.input}
                  value={nuevoEvento.ubicacion}
                  onChangeText={(text) => setNuevoEvento({ ...nuevoEvento, ubicacion: text })}
                  placeholder="Ej: Hospital Central"
                  placeholderTextColor={COLORES.GRIS_MEDIO}
                />

                <Text style={styles.modalLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={nuevoEvento.descripcion}
                  onChangeText={(text) => setNuevoEvento({ ...nuevoEvento, descripcion: text })}
                  multiline
                  numberOfLines={3}
                  placeholder="Detalles adicionales..."
                  placeholderTextColor={COLORES.GRIS_MEDIO}
                />

                <View style={styles.filaSwitch}>
                  <Text style={styles.modalLabel}>Recordatorio</Text>
                  <TouchableOpacity
                    style={[styles.switch, nuevoEvento.recordatorio && styles.switchActivo]}
                    onPress={() => setNuevoEvento({ ...nuevoEvento, recordatorio: !nuevoEvento.recordatorio })}
                  >
                    <View style={[styles.switchPunto, nuevoEvento.recordatorio && styles.switchPuntoActivo]} />
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalBotones}>
                <TouchableOpacity
                  style={styles.botonModalCancelar}
                  onPress={() => {
                    setModalCrearVisible(false);
                    setEventoEditando(null);
                  }}
                >
                  <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                </TouchableOpacity>
                {eventoEditando && (
                  <TouchableOpacity
                    style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]}
                    onPress={() => eliminarEvento(eventoEditando)}
                  >
                    <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                  onPress={guardarEvento}
                >
                  <Text style={styles.textoBotonModalAccion}>
                    {eventoEditando ? 'Actualizar' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          MODAL EVENTOS DEL DÍA
      ============================================================ */}
      <Modal
        animationType="slide"
        transparent
        visible={modalEventosDiaVisible}
        onRequestClose={() => setModalEventosDiaVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPress={() => setModalEventosDiaVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>Eventos del día</Text>
                <TouchableOpacity onPress={() => setModalEventosDiaVisible(false)}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.listaEventosDia}>
                {diaSeleccionado && obtenerEventosParaFecha(diaSeleccionado).length > 0 ? (
                  obtenerEventosParaFecha(diaSeleccionado).map(evento => (
                    <TouchableOpacity
                      key={evento.id}
                      style={[styles.eventoDia, { borderLeftColor: evento.color_evento || obtenerColorTipo(evento.tipo_evento) }]}
                      onPress={() => {
                        setModalEventosDiaVisible(false);
                        abrirFormularioEditar(evento);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.encabezadoEventoDia}>
                        <Icon name={obtenerIconoTipo(evento.tipo_evento)} size={20} color={evento.color_evento || obtenerColorTipo(evento.tipo_evento)} />
                        <Text style={styles.tituloEventoDia}>{evento.titulo}</Text>
                        <TouchableOpacity
                          style={styles.botonEliminarEvento}
                          onPress={() => eliminarEvento(evento.id)}
                        >
                          <Icon name="trash-outline" size={18} color={COLORES.ERROR} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.detalleEventoDia}>
                        {evento.hora_inicio && `${formatearHora(evento.hora_inicio)} • `}
                        {obtenerNombreTipo(evento.tipo_evento)}
                      </Text>
                      {evento.descripcion && <Text style={styles.descripcionEventoDia}>{evento.descripcion}</Text>}
                      {evento.ubicacion && <Text style={styles.ubicacionEventoDia}>📍 {evento.ubicacion}</Text>}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.sinEventosDia}>
                    <Icon name="calendar-outline" size={60} color={COLORES.GRIS_MEDIO} />
                    <Text style={styles.textoSinEventosDia}>No hay eventos</Text>
                    <Text style={styles.subtextoSinEventosDia}>Toca "Agregar" para crear uno</Text>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.botonAgregarEventoDia}
                onPress={() => {
                  setModalEventosDiaVisible(false);
                  if (diaSeleccionado) {
                    abrirFormularioCrear(diaSeleccionado);
                  } else {
                    abrirFormularioCrear();
                  }
                }}
              >
                <Icon name="add-outline" size={22} color={COLORES.BLANCO} />
                <Text style={styles.textoBotonAgregarEventoDia}>Agregar Nuevo Evento</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          DATE PICKERS
      ============================================================ */}
      <DateTimePickerModal
        isVisible={isStartDatePickerVisible}
        mode="date"
        onConfirm={(date) => {
          setStartDatePickerVisible(false);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const fechaStr = `${year}-${month}-${day}`;
          setNuevoEvento(prev => ({
            ...prev,
            fecha_inicio: fechaStr,
            fecha_fin: prev.fecha_fin && prev.fecha_fin >= fechaStr ? prev.fecha_fin : fechaStr,
          }));
        }}
        onCancel={() => setStartDatePickerVisible(false)}
        date={nuevoEvento.fecha_inicio ? new Date(nuevoEvento.fecha_inicio) : new Date()}
        locale="es-ES"
      />

      <DateTimePickerModal
        isVisible={isEndDatePickerVisible}
        mode="date"
        onConfirm={(date) => {
          setEndDatePickerVisible(false);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const fechaStr = `${year}-${month}-${day}`;
          setNuevoEvento(prev => ({
            ...prev,
            fecha_fin: fechaStr,
          }));
        }}
        onCancel={() => setEndDatePickerVisible(false)}
        date={nuevoEvento.fecha_fin ? new Date(nuevoEvento.fecha_fin) : new Date()}
        locale="es-ES"
        minimumDate={nuevoEvento.fecha_inicio ? new Date(nuevoEvento.fecha_inicio) : undefined}
      />
    </View>
  );
}

// ============================================================
// ESTILOS (estandarizados con VistaHorario)
// ============================================================
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
  botonAtras: { padding: 4 },
  tituloPrincipal: { fontSize: 22, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  botonRefrescar: { padding: 4 },

  // Navegación
  controlesNavegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  botonControl: { padding: 8, borderRadius: 16, backgroundColor: COLORES.GRIS_CLARO },
  estadoMesContainer: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 8,
  },
  estadoMesTexto: { fontSize: 16, fontWeight: 'bold' },
  estadoMesFechas: { fontSize: 13, fontWeight: '600' },

  // Días semana
  diasSemanaContainer: {
    flexDirection: 'row',
    backgroundColor: COLORES.BLANCO,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  diaSemana: { width: DIA_WIDTH, alignItems: 'center' },
  textoDiaSemana: { fontSize: 13, fontWeight: 'bold', color: COLORES.GRIS_OSCURO },

  // Grid
  gridContainer: { flex: 0.55, backgroundColor: COLORES.BLANCO },
  calendarioGrid: { paddingHorizontal: 10, paddingBottom: 10 },
  diaVacio: { width: DIA_WIDTH, height: DIA_WIDTH, margin: 2 },
  diaContainer: {
    width: DIA_WIDTH,
    height: DIA_WIDTH,
    margin: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    position: 'relative',
  },
  diaHoy: { backgroundColor: COLORES.AMARILLO_PLATANO + '40', borderWidth: 2, borderColor: COLORES.AMARILLO_PLATANO },
  diaSeleccionado: { backgroundColor: COLORES.AZUL_CIELO + '40', borderWidth: 2, borderColor: COLORES.AZUL_CIELO },
  diaSeleccionadoMultiple: { backgroundColor: COLORES.EXITO + '40', borderWidth: 2, borderColor: COLORES.EXITO },
  textoDia: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_OSCURO },
  textoDiaHoy: { color: COLORES.AMARILLO_OSCURO, fontWeight: 'bold' },
  textoDiaSeleccionado: { color: COLORES.AZUL_CIELO_OSCURO, fontWeight: 'bold' },

  miniEventosContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    justifyContent: 'center',
  },
  miniEvento: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 1 },
  masEventos: { position: 'absolute', top: 2, right: 4, fontSize: 10, color: COLORES.GRIS_OSCURO },

  // Botones acción
  botonesAccion: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
    gap: 8,
    flexWrap: 'wrap',
  },
  botonAccion: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, minWidth: 80, alignItems: 'center' },
  botonSeleccionar: { backgroundColor: COLORES.AZUL_CIELO_OSCURO },
  botonNuevo: { backgroundColor: COLORES.EXITO },
  botonCancelar: { backgroundColor: COLORES.ERROR },
  botonCrearEvento: { backgroundColor: COLORES.EXITO },
  botonEliminar: { backgroundColor: COLORES.ERROR },
  textoBotonAccion: { color: COLORES.BLANCO, fontSize: 14, fontWeight: 'bold' },

  // Eventos próximos
  seccionEventos: {
    backgroundColor: COLORES.BLANCO,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 0.45,
  },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 10 },
  eventosScrollContent: { paddingVertical: 4, paddingHorizontal: 2, gap: 10 },
  tarjetaEvento: {
    width: 200,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    borderLeftWidth: 4,
  },
  encabezadoEvento: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tituloEvento: { fontSize: 15, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginLeft: 8, flex: 1 },
  fechaEvento: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginBottom: 4 },
  horaEvento: { fontSize: 13, color: COLORES.TEXTO_OSCURO, fontWeight: '500' },
  ubicacionEvento: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginTop: 4 },
  sinEventosContainer: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 40 },
  textoSinEventos: { fontSize: 16, color: COLORES.GRIS_OSCURO, marginTop: 10 },
  subtextoSinEventos: { fontSize: 14, color: COLORES.GRIS_MEDIO, textAlign: 'center' },

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
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  inputError: { borderColor: COLORES.ERROR, borderWidth: 2 },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  filaInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  inputMitad: { width: '48%' },

  // Fecha
  inputFecha: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textoInputFecha: { fontSize: 14, color: COLORES.TEXTO_OSCURO, flex: 1 },

  // Tipos
  tiposContainer: { flexDirection: 'row', marginBottom: 8 },
  opcionTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  opcionTipoSeleccionada: { borderWidth: 2 },
  textoOpcionTipo: { fontSize: 12, fontWeight: '600', marginLeft: 6 },

  // Colores
  coloresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  opcionColor: { width: 32, height: 32, borderRadius: 16, marginRight: 10, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  opcionColorSeleccionada: { borderColor: COLORES.TEXTO_OSCURO, transform: [{ scale: 1.1 }] },

  // Duración
  duracionContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  botonDuracion: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: COLORES.GRIS_CLARO, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  botonDuracionSeleccionado: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoBotonDuracion: { fontSize: 12, color: COLORES.TEXTO_OSCURO },
  textoBotonDuracionSeleccionado: { color: COLORES.BLANCO, fontWeight: 'bold' },

  // TimePicker
  timePickerContainer: { alignItems: 'center', marginVertical: 4 },
  subLabel: { fontSize: 13, color: COLORES.GRIS_OSCURO, marginBottom: 4 },

  // Familiar
  familiaresContainer: { flexDirection: 'row', marginBottom: 8 },
  opcionFamiliar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  opcionFamiliarSeleccionada: { backgroundColor: COLORES.AZUL_CIELO + '20', borderWidth: 2 },
  avatarFamiliar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  textoAvatarFamiliar: { color: COLORES.BLANCO, fontSize: 12, fontWeight: 'bold' },
  textoOpcionFamiliar: { fontSize: 13, color: COLORES.TEXTO_OSCURO },

  // Switch
  filaSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORES.GRIS_MEDIO, justifyContent: 'center', paddingHorizontal: 2 },
  switchActivo: { backgroundColor: COLORES.EXITO },
  switchPunto: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORES.BLANCO, alignSelf: 'flex-start' },
  switchPuntoActivo: { alignSelf: 'flex-end' },

  // Botones modal
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

  // Modal eventos del día
  listaEventosDia: { maxHeight: 400 },
  eventoDia: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  encabezadoEventoDia: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tituloEventoDia: { fontSize: 16, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginLeft: 10, flex: 1 },
  botonEliminarEvento: { padding: 4 },
  detalleEventoDia: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginBottom: 4 },
  descripcionEventoDia: { fontSize: 14, color: COLORES.TEXTO_OSCURO, marginTop: 6 },
  ubicacionEventoDia: { fontSize: 13, color: COLORES.GRIS_OSCURO, marginTop: 4 },
  sinEventosDia: { alignItems: 'center', paddingVertical: 40 },
  textoSinEventosDia: { fontSize: 16, color: COLORES.GRIS_OSCURO, marginTop: 10 },
  subtextoSinEventosDia: { fontSize: 14, color: COLORES.GRIS_MEDIO },
  botonAgregarEventoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  textoBotonAgregarEventoDia: { color: COLORES.BLANCO, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});