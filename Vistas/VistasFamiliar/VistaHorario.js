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
  Dimensions,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Polyfill findNodeHandle para web
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
  NARANJA: '#FF9800',
  ROSADO: '#F48FB1',
  TURQUESA: '#4DB6AC',
  INDIGO: '#7986CB',
  LIMA: '#D4E157',
};

const { width, height } = Dimensions.get('window');
const HORA_HEIGHT = 50;
// 🔹 Ajusta este valor para el ancho de las columnas de días
const ANCHO_COLUMNA_DIA = 58;
const DIA_WIDTH = Math.min(ANCHO_COLUMNA_DIA, (width - 40) / 7);

const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes', corto: 'Lun' },
  { id: 2, nombre: 'Martes', corto: 'Mar' },
  { id: 3, nombre: 'Miércoles', corto: 'Mié' },
  { id: 4, nombre: 'Jueves', corto: 'Jue' },
  { id: 5, nombre: 'Viernes', corto: 'Vie' },
  { id: 6, nombre: 'Sábado', corto: 'Sáb' },
  { id: 0, nombre: 'Domingo', corto: 'Dom' },
];

const EMOJIS_DISPONIBLES = ['🚿', '🍽️', '🚶', '💪', '🛌', '📚', '👪', '💊', '🏋️', '🎨', '🎵', '🧘', '🌿', '🐕', '📝', '🎮', '🧩', '🎭', '✍️', '🧹'];

const ACTIVIDADES_PREDEFINIDAS_DEMO = [
  { id: 'predef_banarse', nombre: 'Bañarse', color: COLORES.TURQUESA, emoji: '🚿' },
  { id: 'predef_comer', nombre: 'Comer', color: COLORES.NARANJA, emoji: '🍽️' },
  { id: 'predef_caminar', nombre: 'Caminar', color: COLORES.VERDE_CLARO, emoji: '🚶' },
  { id: 'predef_ejercicios', nombre: 'Ejercicios', color: COLORES.ROJO_CLARO, emoji: '💪' },
  { id: 'predef_descanso', nombre: 'Descanso', color: COLORES.MORADO, emoji: '🛌' },
  { id: 'predef_lectura', nombre: 'Lectura', color: COLORES.INDIGO, emoji: '📚' },
  { id: 'predef_visita', nombre: 'Visita Familiar', color: COLORES.ROSADO, emoji: '👪' },
  { id: 'predef_medicina', nombre: 'Tomar Medicina', color: COLORES.EXITO, emoji: '💊' },
];

// ========== COMPONENTE SELECTOR DE HORA ==========
const TimePicker = ({ value, onChange, label }) => {
  const [hora, minutos] = value.split(':').map(Number);
  const [horaSeleccionada, setHoraSeleccionada] = useState(hora);
  const [minutoSeleccionado, setMinutoSeleccionado] = useState(minutos);

  const incrementarHora = () => {
    const nueva = (horaSeleccionada + 1) % 24;
    setHoraSeleccionada(nueva);
    onChange(`${String(nueva).padStart(2, '0')}:${String(minutoSeleccionado).padStart(2, '0')}`);
  };

  const decrementarHora = () => {
    const nueva = (horaSeleccionada - 1 + 24) % 24;
    setHoraSeleccionada(nueva);
    onChange(`${String(nueva).padStart(2, '0')}:${String(minutoSeleccionado).padStart(2, '0')}`);
  };

  const incrementarMinuto = () => {
    let nuevoMinuto = minutoSeleccionado + 15;
    let nuevaHora = horaSeleccionada;
    if (nuevoMinuto >= 60) {
      nuevoMinuto = 0;
      nuevaHora = (horaSeleccionada + 1) % 24;
    }
    setHoraSeleccionada(nuevaHora);
    setMinutoSeleccionado(nuevoMinuto);
    onChange(`${String(nuevaHora).padStart(2, '0')}:${String(nuevoMinuto).padStart(2, '0')}`);
  };

  const decrementarMinuto = () => {
    let nuevoMinuto = minutoSeleccionado - 15;
    let nuevaHora = horaSeleccionada;
    if (nuevoMinuto < 0) {
      nuevoMinuto = 45;
      nuevaHora = (horaSeleccionada - 1 + 24) % 24;
    }
    setHoraSeleccionada(nuevaHora);
    setMinutoSeleccionado(nuevoMinuto);
    onChange(`${String(nuevaHora).padStart(2, '0')}:${String(nuevoMinuto).padStart(2, '0')}`);
  };

  const handleInputChange = (text) => {
    // Permitir solo números y ':'
    const cleaned = text.replace(/[^0-9:]/g, '');
    if (cleaned.length <= 5) {
      // Validar formato HH:MM
      if (cleaned.length === 5 && cleaned.includes(':')) {
        const [h, m] = cleaned.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
          setHoraSeleccionada(h);
          setMinutoSeleccionado(m);
          onChange(cleaned);
        }
      } else {
        // Actualizar parcial (mientras escribe)
        setHoraSeleccionada(0);
        setMinutoSeleccionado(0);
        onChange(cleaned);
      }
    }
  };

  return (
    <View style={styles.timePickerContainer}>
      {label && <Text style={styles.subLabel}>{label}</Text>}
      <View style={styles.timePickerRow}>
        <TouchableOpacity style={styles.timePickerButton} onPress={decrementarHora}>
          <Icon name="chevron-up-outline" size={20} color={COLORES.TEXTO_OSCURO} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.timePickerButton} onPress={incrementarHora}>
          <Icon name="chevron-down-outline" size={20} color={COLORES.TEXTO_OSCURO} />
        </TouchableOpacity>
      </View>
      <View style={styles.timePickerDisplay}>
        <Text style={styles.timePickerText}>{value}</Text>
      </View>
      <View style={styles.timePickerRow}>
        <TouchableOpacity style={styles.timePickerButton} onPress={decrementarMinuto}>
          <Icon name="chevron-up-outline" size={20} color={COLORES.TEXTO_OSCURO} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.timePickerButton} onPress={incrementarMinuto}>
          <Icon name="chevron-down-outline" size={20} color={COLORES.TEXTO_OSCURO} />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.timePickerInput}
        value={value}
        onChangeText={handleInputChange}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        placeholder="HH:MM"
      />
    </View>
  );
};

export default function VistaHorario({ navigation }) {
  // ========== ESTADOS ==========
  const [usuarioId, setUsuarioId] = useState(null);
  const [horario, setHorario] = useState([]);
  const [medicinas, setMedicinas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [actividadesBase, setActividadesBase] = useState([]);
  const [actividadesOcurrencias, setActividadesOcurrencias] = useState([]);
  const [callbackNuevaActividad, setCallbackNuevaActividad] = useState(null);

  const [configuracion, setConfiguracion] = useState({
    horaInicio: 8,
    horaFin: 22,
    horaDespertar: 7,
    horaDormir: 22,
    mostrarFines: true,
    mostrarMedicinas: true,
    mostrarEventos: true,
    mostrarActividades: true,
  });

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [semanaActual, setSemanaActual] = useState(new Date());

  // Modo selección
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionTipo, setSeleccionTipo] = useState(null);
  const [celdasSeleccionadas, setCeldasSeleccionadas] = useState([]);
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState([]);

  // Estados para modales
  const [modalBaseVisible, setModalBaseVisible] = useState(false);
  const [actividadBaseEditando, setActividadBaseEditando] = useState(null);
  const [nuevaActividadBase, setNuevaActividadBase] = useState({
    nombre: '',
    emoji: '📌',
    color: COLORES.AZUL_CIELO,
    descripcion: '',
  });

  const [modalOcurrenciaVisible, setModalOcurrenciaVisible] = useState(false);
  const [ocurrenciaEditando, setOcurrenciaEditando] = useState(null);
  const [nuevaOcurrencia, setNuevaOcurrencia] = useState({
    actividad_base_id: null,
    dias: [],
    hora_inicio: '08:00',
    hora_fin: '09:00',
    duracion_minutos: 60,
    esRecurrente: true,
    fecha_inicio: '',
    fecha_fin: null,
  });

  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '' });

  // ========== FUNCIONES DE FECHA ==========
  const obtenerInicioSemana = (fecha) => {
    const inicio = new Date(fecha);
    const dia = inicio.getDay();
    const offset = dia === 0 ? 6 : dia - 1;
    inicio.setDate(inicio.getDate() - offset);
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  };

  const obtenerFinSemana = (fecha) => {
    const fin = obtenerInicioSemana(fecha);
    fin.setDate(fin.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return fin;
  };

  const obtenerFechaDelDia = (diaId) => {
    const fecha = obtenerInicioSemana(semanaActual);
    const offset = diaId === 0 ? 6 : diaId - 1;
    fecha.setDate(fecha.getDate() + offset);
    return fecha;
  };

  // ========== CARGA DE DATOS ==========
  const cargarDatosIniciales = async (id) => {
    try {
      setCargando(true);
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioRol(usuario.rol || '');
      }

      await cargarConfiguracion(id);
      await cargarMedicinas(id);
      await cargarEventosSemana(id);
      await cargarActividadesBase(id);
      await cargarOcurrenciasSemana(id);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
    }
  };

  const cargarConfiguracion = async (id) => {
    try {
      const res = await servicioAPI.obtenerConfiguracionHorario(id);
      if (res.exito && res.configuracion) {
        setConfiguracion((prev) => ({ ...prev, ...res.configuracion }));
      }
    } catch (error) {
      console.warn('Configuración no disponible:', error);
    }
  };

  const cargarMedicinas = async (id) => {
    try {
      const res = await servicioAPI.obtenerMedicinasHoy(id);
      if (res.exito) setMedicinas(res.medicinas || []);
    } catch (error) {
      console.warn('Medicinas no disponibles:', error);
    }
  };

  const cargarEventosSemana = async (id) => {
    try {
      const inicio = obtenerInicioSemana(semanaActual);
      const fin = obtenerFinSemana(semanaActual);
      const res = await servicioAPI.obtenerEventosPorRango(
        id,
        inicio.toISOString().split('T')[0],
        fin.toISOString().split('T')[0]
      );
      if (res.exito) setEventos(res.eventos || []);
    } catch (error) {
      console.warn('Eventos no disponibles:', error);
    }
  };

  const cargarActividadesBase = async (id) => {
    try {
      const res = await servicioAPI.obtenerActividadesBase(id);
      if (res.exito && res.actividades && res.actividades.length > 0) {
        const base = res.actividades.map(act => ({
          id: act.id,
          nombre: act.nombre,
          color: act.color || COLORES.AZUL_CIELO,
          emoji: act.emoji || '📌',
          descripcion: act.descripcion || '',
        }));
        setActividadesBase(base);
      } else {
        console.warn('⚠️ No se obtuvieron actividades del backend, usando demo');
        setActividadesBase(ACTIVIDADES_PREDEFINIDAS_DEMO);
      }
    } catch (error) {
      console.warn('Error cargando actividades base:', error);
      setActividadesBase(ACTIVIDADES_PREDEFINIDAS_DEMO);
    }
  };

  const cargarOcurrenciasSemana = async (id) => {
    try {
      const inicio = obtenerInicioSemana(semanaActual);
      const fin = obtenerFinSemana(semanaActual);
      const res = await servicioAPI.obtenerOcurrenciasPorRango(
        id,
        inicio.toISOString().split('T')[0],
        fin.toISOString().split('T')[0]
      );
      if (res && res.exito && Array.isArray(res.ocurrencias)) {
        setActividadesOcurrencias(res.ocurrencias);
      } else {
        setActividadesOcurrencias([]);
      }
    } catch (error) {
      console.warn('Error cargando ocurrencias:', error);
      setActividadesOcurrencias([]);
    }
  };

  const recargarSemana = async () => {
    if (!usuarioId) return;
    setRefrescando(true);
    try {
      await cargarEventosSemana(usuarioId);
      await cargarOcurrenciasSemana(usuarioId);
      await cargarActividadesBase(usuarioId);
      // Forzar regeneración del horario después de cargar los datos
      generarHorario(); // <--- AÑADE ESTA LÍNEA
    } catch (error) {
      console.error('Error recargando semana:', error);
    } finally {
      setRefrescando(false);
    }
  };
  // ========== GENERAR HORARIO ==========
  const generarHorario = useCallback(() => {
    const inicio = configuracion.horaInicio || 8;
    const fin = configuracion.horaFin || 22;
    const horarioGenerado = [];

    for (let hora = inicio; hora <= fin; hora++) {
      const fila = { hora, label: formatearHora(hora), dias: {} };
      DIAS_SEMANA.forEach((dia) => {
        fila.dias[dia.id] = { dia: dia.id, hora, actividades: [] };
      });
      horarioGenerado.push(fila);
    }

    // Medicinas
    if (configuracion.mostrarMedicinas !== false) {
      medicinas.forEach((med) => {
        if (!med.hora) return;
        const [h, m] = med.hora.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;
        const pos = h + m / 60;
        if (pos >= inicio && pos <= fin) {
          const bloque = horarioGenerado.find((b) => b.hora === h);
          if (bloque) {
            const dias = med.frecuencia === 'diaria'
              ? DIAS_SEMANA.map((d) => d.id)
              : obtenerDiasFrecuencia(med.frecuencia);
            dias.forEach((diaId) => {
              if (bloque.dias[diaId]) {
                bloque.dias[diaId].actividades.push({
                  id: `med_${med.id}_${diaId}`,
                  tipo: 'medicina',
                  nombre: med.nombre || 'Medicina',
                  color: COLORES.EXITO,
                  hora_inicio: med.hora,
                  hora_fin: sumarMinutos(med.hora, 15),
                  duracion_minutos: 15,
                  esMedicina: true,
                });
              }
            });
          }
        }
      });
    }

    // Ocurrencias
    if (configuracion.mostrarActividades !== false) {
      actividadesOcurrencias.forEach((oc) => {
        if (!oc.hora_inicio || !oc.hora_fin) return;
        const [hIni, mIni] = oc.hora_inicio.split(':').map(Number);
        const [hFin, mFin] = oc.hora_fin.split(':').map(Number);
        if (isNaN(hIni) || isNaN(mIni) || isNaN(hFin) || isNaN(mFin)) return;
        const posIni = hIni + mIni / 60;
        const posFin = hFin + mFin / 60;
        if (posIni >= inicio && posFin <= fin) {
          const bloques = Math.ceil((posFin - posIni) * 4);
          const dias = oc.dias || [];
          const actividadBase = actividadesBase.find(a => a.id === oc.actividad_base_id);
          const emoji = actividadBase?.emoji || '📌';
          dias.forEach((diaId) => {
            for (let i = 0; i < bloques; i++) {
              const bh = hIni + Math.floor(i / 4);
              const bloque = horarioGenerado.find((b) => b.hora === bh);
              if (bloque && bloque.dias[diaId] && i === 0) {
                bloque.dias[diaId].actividades.push({
                  id: `oc_${oc.id}_${diaId}`,
                  tipo: 'actividad',
                  nombre: oc.actividad_base_nombre || 'Actividad',
                  color: oc.color || COLORES.AZUL_CIELO,
                  emoji: emoji,
                  hora_inicio: oc.hora_inicio,
                  hora_fin: oc.hora_fin,
                  duracion_minutos: oc.duracion_minutos || 60,
                  datos: oc,
                  esOcurrencia: true,
                  ocurrenciaId: oc.id,
                  alturaBloques: bloques,
                });
              }
            }
          });
        }
      });
    }

    // Eventos
    if (configuracion.mostrarEventos !== false) {
      eventos.forEach((ev) => {
        if (!ev.fecha_inicio) return;
        const fechaEv = new Date(ev.fecha_inicio);
        const dia = fechaEv.getDay();
        const inicioSemana = obtenerInicioSemana(semanaActual);
        const finSemana = obtenerFinSemana(semanaActual);
        if (fechaEv >= inicioSemana && fechaEv <= finSemana) {
          const h = ev.hora_inicio ? parseInt(ev.hora_inicio.split(':')[0]) : 9;
          const m = ev.hora_inicio ? parseInt(ev.hora_inicio.split(':')[1]) : 0;
          const dur = ev.duracion_horas || 1;
          const pos = h + m / 60;
          if (pos >= inicio && pos + dur <= fin) {
            const bloques = Math.ceil(dur * 4);
            const bloque = horarioGenerado.find((b) => b.hora === h);
            if (bloque && bloque.dias[dia]) {
              bloque.dias[dia].actividades.push({
                id: `ev_${ev.id}`,
                tipo: 'evento',
                nombre: ev.titulo || 'Evento',
                color: ev.color_evento || COLORES.MORADO,
                hora_inicio: ev.hora_inicio || '09:00',
                hora_fin: sumarHoras(ev.hora_inicio || '09:00', dur),
                duracion_minutos: dur * 60,
                esEvento: true,
                alturaBloques: bloques,
              });
            }
          }
        }
      });
    }

    setHorario(horarioGenerado);
  }, [configuracion, medicinas, eventos, actividadesOcurrencias, actividadesBase, semanaActual]);

  // ========== EFECTO PARA REGENERAR HORARIO ==========
  useEffect(() => {
    if (!cargando) {
      generarHorario();
    }
  }, [generarHorario, cargando, actividadesOcurrencias]); // <--- AÑADE actividadesOcurrencias a las dependencias 

  // ========== UTILIDADES ==========
  const obtenerDiasFrecuencia = (frec) => {
    const map = {
      lunes: [1],
      martes: [2],
      miercoles: [3],
      jueves: [4],
      viernes: [5],
      sabado: [6],
      domingo: [0],
      lunes_miercoles_viernes: [1, 3, 5],
      martes_jueves: [2, 4],
      fin_semana: [0, 6],
      laborables: [1, 2, 3, 4, 5],
    };
    return map[frec] || [1, 2, 3, 4, 5, 6, 0];
  };

  const formatearHora = (hora) => {
    const ampm = hora >= 12 ? 'PM' : 'AM';
    const h12 = hora % 12 || 12;
    return `${h12}:00 ${ampm}`;
  };

  const sumarMinutos = (hora, minutos) => {
    const [h, m] = hora.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '00:00';
    const total = h * 60 + m + minutos;
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const sumarHoras = (hora, horas) => sumarMinutos(hora, horas * 60);

  // ========== NAVEGACIÓN ==========
  const cambiarSemana = (dir) => {
    const nueva = new Date(semanaActual);
    nueva.setDate(nueva.getDate() + dir * 7);
    setSemanaActual(nueva);
    recargarSemana();
  };

  const obtenerEstadoSemana = () => {
    const hoy = new Date();
    const inicio = obtenerInicioSemana(semanaActual);
    const fin = obtenerFinSemana(semanaActual);
    if (inicio <= hoy && hoy <= fin) return 'actual';
    if (inicio > hoy) return 'futura';
    return 'pasada';
  };

  // ========== CONFIGURACIÓN ==========
  const guardarConfiguracion = async () => {
    try {
      const response = await servicioAPI.guardarConfiguracionHorario(usuarioId, configuracion);
      if (response.exito) {
        Alert.alert('Éxito', 'Configuración guardada');
        setModalConfigVisible(false);
        if (usuarioId) await cargarDatosIniciales(usuarioId);
      } else {
        Alert.alert('Error', response.error || 'No se pudo guardar la configuración');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  // ========== NOTIFICACIONES ==========
  const mostrarNotificacion = (mensaje) => {
    setNotificacion({ visible: true, mensaje: mensaje || '' });
    setTimeout(() => {
      setNotificacion({ visible: false, mensaje: '' });
    }, 3000);
  };

  // ========== SELECCIÓN ==========
  const toggleModoSeleccion = () => {
    if (modoSeleccion) {
      setModoSeleccion(false);
      setSeleccionTipo(null);
      setCeldasSeleccionadas([]);
      setActividadesSeleccionadas([]);
    } else {
      setModoSeleccion(true);
      setSeleccionTipo(null);
      setCeldasSeleccionadas([]);
      setActividadesSeleccionadas([]);
    }
  };

  const estaListoParaAsignar = () => {
    return modoSeleccion && actividadesSeleccionadas.length === 1 && celdasSeleccionadas.length > 0;
  };

  const textoEliminar = () => {
    if (seleccionTipo === 'horarios') {
      const count = celdasSeleccionadas.filter(c => c.tieneDato).length;
      return count >= 1 ? `Eliminar ${count} horario${count > 1 ? 's' : ''}` : null;
    } else if (seleccionTipo === 'actividades') {
      const count = actividadesSeleccionadas.length;
      return count >= 2 ? `Eliminar ${count} actividades` : null;
    }
    return null;
  };

  const eliminarSeleccionados = async () => {
    if (seleccionTipo === 'horarios') {
      const celdasConDato = celdasSeleccionadas.filter(c => c.tieneDato);
      if (celdasConDato.length === 0) {
        Alert.alert('Info', 'No hay horarios seleccionados para eliminar');
        return;
      }
      Alert.alert(
        'Eliminar horarios',
        `¿Eliminar ${celdasConDato.length} horario(s) seleccionado(s)?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                for (const celda of celdasConDato) {
                  const bloqueHora = horario.find(b => b.hora === celda.hora);
                  const actividad = bloqueHora?.dias[celda.dia]?.actividades.find(a => a.esOcurrencia && a.ocurrenciaId);
                  if (actividad) {
                    await servicioAPI.eliminarOcurrencia(actividad.ocurrenciaId);
                  }
                }
                mostrarNotificacion(`✅ Eliminados ${celdasConDato.length} horarios`);
                setModoSeleccion(false);
                setSeleccionTipo(null);
                setCeldasSeleccionadas([]);
                recargarSemana();
              } catch (error) {
                Alert.alert('Error', 'No se pudieron eliminar los horarios');
              }
            },
          },
        ]
      );
    } else if (seleccionTipo === 'actividades') {
      if (actividadesSeleccionadas.length < 2) {
        Alert.alert('Info', 'Selecciona al menos 2 actividades para eliminar');
        return;
      }
      Alert.alert(
        'Eliminar actividades',
        `¿Eliminar ${actividadesSeleccionadas.length} actividad(es) seleccionada(s)? Esto también eliminará sus horarios asociados.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              try {
                for (const actId of actividadesSeleccionadas) {
                  await servicioAPI.eliminarActividadBase(actId);
                }
                mostrarNotificacion(`✅ Eliminadas ${actividadesSeleccionadas.length} actividades`);
                setModoSeleccion(false);
                setSeleccionTipo(null);
                setActividadesSeleccionadas([]);
                recargarSemana();
              } catch (error) {
                Alert.alert('Error', 'No se pudieron eliminar las actividades');
              }
            },
          },
        ]
      );
    }
  };

  const crearOcurrencia = async (actId, dia, inicio, fin, esRecurrente) => {
    const data = {
      actividad_base_id: actId,
      dias: [dia],
      hora_inicio: `${String(inicio).padStart(2, '0')}:00`,
      hora_fin: `${String(fin + 1).padStart(2, '0')}:00`,
      duracion_minutos: (fin + 1 - inicio) * 60,
      esRecurrente: esRecurrente,
      fecha_inicio: obtenerFechaDelDia(dia).toISOString().split('T')[0],
      fecha_fin: esRecurrente ? null : obtenerFechaDelDia(dia).toISOString().split('T')[0],
    };
    await servicioAPI.crearOcurrencia(usuarioId, data);
  };

  const asignarActividad = async () => {
    if (!estaListoParaAsignar()) {
      Alert.alert('Info', 'Selecciona exactamente una actividad y al menos un horario');
      return;
    }

    const actividadId = actividadesSeleccionadas[0];
    const actividad = actividadesBase.find(a => a.id === actividadId);
    if (!actividad) {
      Alert.alert('Error', 'Actividad no encontrada');
      return;
    }

    try {
      const grupos = {};
      celdasSeleccionadas.forEach((c) => {
        if (!grupos[c.dia]) grupos[c.dia] = [];
        grupos[c.dia].push(c.hora);
      });

      for (const diaId of Object.keys(grupos)) {
        const horas = grupos[diaId].sort((a, b) => a - b);
        let inicio = horas[0];
        let fin = horas[0];
        for (let i = 1; i < horas.length; i++) {
          if (horas[i] === fin + 1) {
            fin = horas[i];
          } else {
            await crearOcurrencia(actividad.id, parseInt(diaId), inicio, fin, nuevaOcurrencia.esRecurrente);
            inicio = horas[i];
            fin = horas[i];
          }
        }
        await crearOcurrencia(actividad.id, parseInt(diaId), inicio, fin, nuevaOcurrencia.esRecurrente);
      }

      mostrarNotificacion(`✅ Asignado a ${celdasSeleccionadas.length} horario(s) para "${actividad.nombre}"`);
      setModoSeleccion(false);
      setSeleccionTipo(null);
      setCeldasSeleccionadas([]);
      setActividadesSeleccionadas([]);
      await recargarSemana();
    } catch (error) {
      console.error('Error asignando:', error);
      Alert.alert('Error', 'No se pudo asignar');
    }
  };

  // ========== CRUD ACTIVIDAD BASE ==========
  const guardarActividadBase = async () => {
    try {
      if (!nuevaActividadBase.nombre.trim()) {
        Alert.alert('Error', 'El nombre es requerido');
        return;
      }
      const data = {
        nombre: nuevaActividadBase.nombre,
        emoji: nuevaActividadBase.emoji || '📌',
        color: nuevaActividadBase.color || COLORES.AZUL_CIELO,
        descripcion: nuevaActividadBase.descripcion || '',
      };
      let nuevoId = null;
      if (actividadBaseEditando) {
        await servicioAPI.actualizarActividadBase(actividadBaseEditando.id, data);
        nuevoId = actividadBaseEditando.id;
        mostrarNotificacion('✅ Actividad actualizada');
      } else {
        const res = await servicioAPI.crearActividadBase(usuarioId, data);
        nuevoId = res.id;
        if (res.reutilizada) {
          mostrarNotificacion('♻️ Actividad existente reutilizada');
        } else {
          mostrarNotificacion('✅ Actividad creada');
        }
      }
      setModalBaseVisible(false);
      setActividadBaseEditando(null);
      setNuevaActividadBase({ nombre: '', emoji: '📌', color: COLORES.AZUL_CIELO, descripcion: '' });
      recargarSemana();
      if (callbackNuevaActividad) {
        callbackNuevaActividad(nuevoId);
        setCallbackNuevaActividad(null);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const eliminarActividadBase = async () => {
    if (!actividadBaseEditando) return;
    Alert.alert(
      'Eliminar actividad',
      '¿Estás seguro? Se eliminarán todos los horarios asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await servicioAPI.eliminarActividadBase(actividadBaseEditando.id);
              mostrarNotificacion('✅ Actividad eliminada');
              setModalBaseVisible(false);
              setActividadBaseEditando(null);
              recargarSemana();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  // ========== CRUD OCURRENCIA ==========
  const [celdaSeleccionadaParaModal, setCeldaSeleccionadaParaModal] = useState(null);

  // Opciones de duración
  const OPCIONES_DURACION = [
    { label: '30 min', value: 30 },
    { label: '60 min', value: 60 },
    { label: 'Otro', value: 0 },
  ];

  const [duracionSeleccionada, setDuracionSeleccionada] = useState(60);
  const [duracionPersonalizada, setDuracionPersonalizada] = useState('');

  const handleDuracionChange = (value) => {
    setDuracionSeleccionada(value);
    if (value === 0) {
      setDuracionPersonalizada('');
    } else {
      const inicio = nuevaOcurrencia.hora_inicio;
      const fin = sumarMinutos(inicio, value);
      setNuevaOcurrencia(prev => ({
        ...prev,
        duracion_minutos: value,
        hora_fin: fin,
      }));
    }
  };

  const handleDuracionPersonalizada = (text) => {
    const num = parseInt(text);
    if (!isNaN(num) && num > 0) {
      setDuracionPersonalizada(text);
      const inicio = nuevaOcurrencia.hora_inicio;
      const fin = sumarMinutos(inicio, num);
      setNuevaOcurrencia(prev => ({
        ...prev,
        duracion_minutos: num,
        hora_fin: fin,
      }));
    } else {
      setDuracionPersonalizada(text);
    }
  };

  // Actualizar hora fin cuando cambia inicio o duración
  useEffect(() => {
    if (nuevaOcurrencia.hora_inicio && nuevaOcurrencia.duracion_minutos > 0) {
      const fin = sumarMinutos(nuevaOcurrencia.hora_inicio, nuevaOcurrencia.duracion_minutos);
      setNuevaOcurrencia(prev => ({
        ...prev,
        hora_fin: fin,
      }));
    }
  }, [nuevaOcurrencia.hora_inicio, nuevaOcurrencia.duracion_minutos]);

  const handlePressCelda = (dia, hora) => {
    if (modoSeleccion) return;
    setCeldaSeleccionadaParaModal({ dia, hora });
    const bloqueHora = horario.find(b => b.hora === hora);
    const actividad = bloqueHora?.dias[dia]?.actividades.find(a => a.esOcurrencia && a.ocurrenciaId);
    if (actividad) {
      setOcurrenciaEditando(actividad.datos);
      setNuevaOcurrencia({
        actividad_base_id: actividad.datos.actividad_base_id,
        dias: actividad.datos.dias || [dia],
        hora_inicio: actividad.datos.hora_inicio,
        hora_fin: actividad.datos.hora_fin,
        duracion_minutos: actividad.datos.duracion_minutos || 60,
        esRecurrente: actividad.datos.esRecurrente || true,
        fecha_inicio: actividad.datos.fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_fin: actividad.datos.fecha_fin || null,
      });
      const dur = actividad.datos.duracion_minutos || 60;
      if (dur === 30 || dur === 60) {
        setDuracionSeleccionada(dur);
        setDuracionPersonalizada('');
      } else {
        setDuracionSeleccionada(0);
        setDuracionPersonalizada(String(dur));
      }
      setModalOcurrenciaVisible(true);
    } else {
      const fecha = obtenerFechaDelDia(dia);
      setOcurrenciaEditando(null);
      setNuevaOcurrencia({
        actividad_base_id: null,
        dias: [dia],
        hora_inicio: `${String(hora).padStart(2, '0')}:00`,
        hora_fin: `${String(hora + 1).padStart(2, '0')}:00`,
        duracion_minutos: 60,
        esRecurrente: true,
        fecha_inicio: fecha.toISOString().split('T')[0],
        fecha_fin: null,
      });
      setDuracionSeleccionada(60);
      setDuracionPersonalizada('');
      setModalOcurrenciaVisible(true);
    }
  };

  const handlePressActividadBase = (act) => {
    if (modoSeleccion) return;
    setActividadBaseEditando(act);
    setNuevaActividadBase({
      nombre: act.nombre,
      emoji: act.emoji || '📌',
      color: act.color || COLORES.AZUL_CIELO,
      descripcion: act.descripcion || '',
    });
    setModalBaseVisible(true);
  };

  const guardarOcurrencia = async () => {
    try {
      if (!nuevaOcurrencia.actividad_base_id) {
        Alert.alert(
          'Seleccionar actividad',
          'Elige una actividad para este horario',
          [
            ...actividadesBase.map((act) => ({
              text: `${act.emoji || '📌'} ${act.nombre}`,
              onPress: () => {
                setNuevaOcurrencia((prev) => ({ ...prev, actividad_base_id: act.id }));
                setTimeout(() => guardarOcurrencia(), 100);
              },
            })),
            {
              text: 'Crear nueva',
              onPress: () => {
                setModalOcurrenciaVisible(false);
                setActividadBaseEditando(null);
                setNuevaActividadBase({ nombre: '', emoji: '📌', color: COLORES.AZUL_CIELO, descripcion: '' });
                setModalBaseVisible(true);
                setCallbackNuevaActividad((nuevoId) => {
                  setNuevaOcurrencia(prev => ({ ...prev, actividad_base_id: nuevoId }));
                  setModalOcurrenciaVisible(true);
                  setTimeout(() => guardarOcurrencia(), 100);
                });
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ],
          { cancelable: true }
        );
        return;
      }

      const data = { ...nuevaOcurrencia };
      data.hora_inicio = data.hora_inicio.substring(0, 5);
      data.hora_fin = data.hora_fin.substring(0, 5);
      if (data.esRecurrente) {
        data.fecha_fin = null;
      } else {
        data.fecha_fin = data.fecha_inicio;
      }

      if (ocurrenciaEditando) {
        await servicioAPI.actualizarOcurrencia(ocurrenciaEditando.id, data);
        mostrarNotificacion('✅ Horario actualizado');
      } else {
        await servicioAPI.crearOcurrencia(usuarioId, data);
        mostrarNotificacion('✅ Horario agregado');
      }
      setModalOcurrenciaVisible(false);
      setOcurrenciaEditando(null);
      setCeldaSeleccionadaParaModal(null);
      // Esperar un momento para que los datos se refresquen
      await recargarSemana();
      // Forzar regeneración adicional
      setTimeout(() => generarHorario(), 100);
    } catch (error) {
      console.error('Error guardando ocurrencia:', error);
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const eliminarOcurrencia = async () => {
    if (!ocurrenciaEditando) return;
    Alert.alert(
      'Eliminar horario',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await servicioAPI.eliminarOcurrencia(ocurrenciaEditando.id);
              mostrarNotificacion('🗑️ Horario eliminado');
              setModalOcurrenciaVisible(false);
              setOcurrenciaEditando(null);
              setCeldaSeleccionadaParaModal(null);
              recargarSemana();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  // ========== RENDER DE CELDA ==========
  const renderCeldaHorario = (diaId, hora) => {
    const esFin = diaId === 0 || diaId === 6;
    const bloqueHora = horario.find((b) => b.hora === hora);
    const actividades = bloqueHora?.dias[diaId]?.actividades || [];
    const esSeleccionada = celdasSeleccionadas.some((c) => c.dia === diaId && c.hora === hora);
    const esCeldaModal = celdaSeleccionadaParaModal?.dia === diaId && celdaSeleccionadaParaModal?.hora === hora;

    const actividadesAgrupadas = {};
    actividades.forEach(act => {
      const key = act.id;
      if (!actividadesAgrupadas[key]) {
        actividadesAgrupadas[key] = [];
      }
      actividadesAgrupadas[key].push(act);
    });

    return (
      <TouchableOpacity
        style={[
          styles.celdaHorario,
          esFin && styles.celdaFinDeSemana,
          (esSeleccionada || esCeldaModal) && styles.celdaSeleccionadaMultiple,
        ]}
        onPress={() => {
          if (modoSeleccion) {
            // Si hay 2 o más actividades seleccionadas, no permitir seleccionar horarios
            if (actividadesSeleccionadas.length >= 2) {
              Alert.alert('Info', 'Ya tienes 2 o más actividades seleccionadas. Para seleccionar horarios, deselecciona algunas actividades.');
              return;
            }
            const idx = celdasSeleccionadas.findIndex(c => c.dia === diaId && c.hora === hora);
            let nuevasCeldas;
            if (idx >= 0) {
              nuevasCeldas = celdasSeleccionadas.filter((_, i) => i !== idx);
            } else {
              const bloqueHora = horario.find(b => b.hora === hora);
              const tieneDato = bloqueHora?.dias[diaId]?.actividades?.length > 0;
              nuevasCeldas = [...celdasSeleccionadas, { dia: diaId, hora, tieneDato }];
            }
            setCeldasSeleccionadas(nuevasCeldas);
            if (nuevasCeldas.length === 0 && actividadesSeleccionadas.length === 0) {
              setModoSeleccion(false);
              setSeleccionTipo(null);
            }
          } else {
            handlePressCelda(diaId, hora);
          }
        }}
        onLongPress={() => {
          if (!modoSeleccion) {
            setModoSeleccion(true);
            setSeleccionTipo('horarios');
            setActividadesSeleccionadas([]);
            const bloqueHora = horario.find(b => b.hora === hora);
            const tieneDato = bloqueHora?.dias[diaId]?.actividades?.length > 0;
            setCeldasSeleccionadas([{ dia: diaId, hora, tieneDato }]);
          }
        }}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        {Object.values(actividadesAgrupadas).map((grupo, idx) => {
          const act = grupo[0];
          const [hIni, mIni] = act.hora_inicio.split(':').map(Number);
          const duracion = act.duracion_minutos || 60;
          const top = (hIni + mIni / 60 - hora) * HORA_HEIGHT;
          const altura = (duracion / 60) * HORA_HEIGHT;
          const totalActividades = Object.keys(actividadesAgrupadas).length;
          const offset = idx / totalActividades;
          const width = 1 / totalActividades;
          const estilo = {
            top: Math.max(0, top),
            height: Math.max(10, altura),
            backgroundColor: act.color || COLORES.AZUL_CIELO,
            left: offset * 100 + '%',
            width: width * 100 + '%',
          };
          return (
            <View key={act.id} style={[styles.actividad, estilo]}>
              <Text style={styles.nombreActividad} numberOfLines={1}>
                {act.nombre}
              </Text>
              <Text style={styles.emojiActividadHorario}>{act.emoji || '📌'}</Text>
            </View>
          );
        })}
      </TouchableOpacity>
    );
  };

  // ========== RENDER PRINCIPAL ==========
  useEffect(() => {
    const init = async () => {
      const id = await servicioAPI.obtenerUsuarioActualId();
      setUsuarioId(id);
      if (id) {
        await cargarDatosIniciales(id);
      } else {
        setCargando(false);
        Alert.alert('Error', 'Usuario no identificado');
      }
    };
    init();
  }, []);

  if (cargando) {
    return (
      <View style={styles.fondoBlanco}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AZUL_CIELO_OSCURO} />
          <Text style={styles.textoCargando}>Cargando horario...</Text>
        </SafeAreaView>
      </View>
    );
  }

  const inicioSemana = obtenerInicioSemana(semanaActual);
  const finSemana = obtenerFinSemana(semanaActual);
  const estado = obtenerEstadoSemana();

  const estadoColores = {
    actual: { bg: '#FFE135', text: COLORES.TEXTO_OSCURO },
    futura: { bg: '#87CEEB', text: COLORES.TEXTO_OSCURO },
    pasada: { bg: '#D3D3D3', text: COLORES.GRIS_OSCURO },
  };
  const estadoColor = estadoColores[estado] || estadoColores.actual;

  const textoEliminarResult = textoEliminar();
  const mostrarAsignar = modoSeleccion && (actividadesSeleccionadas.length === 1) && celdasSeleccionadas.length > 0;
  const asignarHabilitado = estaListoParaAsignar();

  // Reglas de bloqueo:
  // - Si hay 2 o más actividades seleccionadas → no se pueden seleccionar horarios (se bloquean las celdas)
  const bloqueoCeldas = actividadesSeleccionadas.length >= 2;
  // - Si hay horarios seleccionados → solo se puede seleccionar UNA actividad (ya implementado en el onPress de actividades)
  const seleccionUnicaActividad = celdasSeleccionadas.length > 0;

  return (
    <GestureHandlerRootView style={styles.fondoBlanco}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.contenedor}>
        {/* ===== ENCABEZADO ===== */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          <Text style={styles.tituloPrincipal}>Horario Semanal</Text>
          <TouchableOpacity style={styles.botonConfig} onPress={() => setModalConfigVisible(true)}>
            <Icon name="settings-outline" size={24} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* ===== CONTROLES + ESTADO SEMANA ===== */}
        <View style={styles.controlesNavegacion}>
          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarSemana(-1)}>
            <Icon name="chevron-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>

          <View style={[styles.estadoSemanaContainer, { backgroundColor: estadoColor.bg }]}>
            <Text style={[styles.estadoSemanaTexto, { color: estadoColor.text }]}>
              {estado === 'actual' ? 'Semana actual' : estado === 'futura' ? 'Semana futura' : 'Semana pasada'}
            </Text>
            <Text style={[styles.estadoSemanaFechas, { color: estadoColor.text }]}>
              {inicioSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} -{' '}
              {finSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>

          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarSemana(1)}>
            <Icon name="chevron-forward-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* ===== HORARIO ===== */}
        <View style={styles.horarioWrapper}>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargarSemana} colors={[COLORES.AMARILLO_PLATANO]} />}
            style={styles.horarioScroll}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              {/* Columna de horas: primera fila vacía para alinear */}
              <View style={styles.columnaHoras}>
                {/* Primera fila vacía (para la cabecera de días) */}
                <View style={styles.celdaHoraVacia} />
                {horario.map((fila, idx) => (
                  <View key={idx} style={styles.celdaHora}>
                    <Text style={styles.textoHora}>{fila.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.gridDias}>
                <View style={styles.encabezadosDias}>
                  {DIAS_SEMANA.map((dia) => {
                    const fecha = obtenerFechaDelDia(dia.id);
                    const esFin = dia.id === 0 || dia.id === 6;
                    return (
                      <View key={dia.id} style={[styles.encabezadoDia, esFin && styles.encabezadoFinDeSemana]}>
                        <Text style={[styles.textoEncabezadoDia, esFin && styles.textoEncabezadoFinDeSemana]}>
                          {dia.corto}
                        </Text>
                        <Text style={[styles.textoFechaDia, esFin && styles.textoFechaFinDeSemana]}>
                          {fecha.getDate()}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.cuerpoHorario}>
                  {horario.map((fila, horaIndex) => (
                    <View key={horaIndex} style={styles.filaHoraria}>
                      {DIAS_SEMANA.map((dia) => (
                        <View key={dia.id} style={styles.contenedorCeldaDia}>
                          {renderCeldaHorario(dia.id, fila.hora)}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </ScrollView>
        </View>

        {/* ===== BOTONES DE ACCIÓN ===== */}
        <View style={styles.botonesAccion}>
          {modoSeleccion ? (
            <>
              {textoEliminarResult && (
                <TouchableOpacity style={[styles.botonAccion, styles.botonEliminar]} onPress={eliminarSeleccionados}>
                  <Text style={styles.textoBotonAccion}>{textoEliminarResult}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.botonAccion, styles.botonCancelar]} onPress={toggleModoSeleccion}>
                <Text style={styles.textoBotonAccion}>Cancelar</Text>
              </TouchableOpacity>
              {mostrarAsignar && (
                <TouchableOpacity
                  style={[
                    styles.botonAccion,
                    styles.botonAsignar,
                    !asignarHabilitado ? styles.botonDeshabilitado : styles.botonAsignarActivo,
                  ]}
                  onPress={asignarActividad}
                  disabled={!asignarHabilitado}
                >
                  <Text style={styles.textoBotonAccion}>Asignar</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.botonAccion, styles.botonSeleccionar]} onPress={toggleModoSeleccion}>
                <Text style={styles.textoBotonAccion}>Seleccionar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonAccion, styles.botonNueva]} onPress={() => {
                setActividadBaseEditando(null);
                setNuevaActividadBase({ nombre: '', emoji: '📌', color: COLORES.AZUL_CIELO, descripcion: '' });
                setModalBaseVisible(true);
              }}>
                <Text style={styles.textoBotonAccion}>+ Nueva</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ===== ACTIVIDADES ===== */}
        <View style={styles.seccionActividades}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.grillaActividades}>
              {actividadesBase.map((act) => {
                const seleccionada = actividadesSeleccionadas.includes(act.id);
                const tieneOcurrencia = actividadesOcurrencias.some((oc) => oc.actividad_base_id === act.id);
                // Si hay horarios seleccionados, solo se permite seleccionar UNA actividad, y si ya hay una seleccionada, las demás se bloquean.
                const bloqueada = seleccionUnicaActividad && actividadesSeleccionadas.length > 0 && !seleccionada;
                return (
                  <TouchableOpacity
                    key={act.id}
                    style={[
                      styles.cuadradoActividad,
                      { backgroundColor: seleccionada ? act.color : act.color + '40' },
                      seleccionada && styles.cuadradoActividadSeleccionada,
                      tieneOcurrencia && styles.cuadradoActividadConOcurrencia,
                      bloqueada && styles.cuadradoActividadBloqueada,
                    ]}
                    onPress={() => {
                      if (modoSeleccion) {
                        // Si hay horarios seleccionados, solo permitir seleccionar una actividad
                        if (seleccionUnicaActividad) {
                          // Si ya hay una seleccionada y no es esta, no hacer nada
                          if (actividadesSeleccionadas.length > 0 && !seleccionada) return;
                          // Si es la misma, deseleccionarla (permitir deseleccionar)
                          if (seleccionada) {
                            setActividadesSeleccionadas([]);
                            if (celdasSeleccionadas.length === 0) {
                              setModoSeleccion(false);
                              setSeleccionTipo(null);
                            }
                            return;
                          }
                          // Si no hay seleccionada, seleccionar esta
                          setActividadesSeleccionadas([act.id]);
                          setSeleccionTipo('horarios');
                          return;
                        }
                        // Sin horarios seleccionados: selección múltiple
                        const idx = actividadesSeleccionadas.indexOf(act.id);
                        let nuevasActividades;
                        if (idx >= 0) {
                          nuevasActividades = actividadesSeleccionadas.filter(id => id !== act.id);
                        } else {
                          nuevasActividades = [...actividadesSeleccionadas, act.id];
                        }
                        setActividadesSeleccionadas(nuevasActividades);
                        if (nuevasActividades.length > 0) {
                          setSeleccionTipo('actividades');
                        }
                        if (nuevasActividades.length === 0 && celdasSeleccionadas.length === 0) {
                          setModoSeleccion(false);
                          setSeleccionTipo(null);
                        }
                      } else {
                        handlePressActividadBase(act);
                      }
                    }}
                    onLongPress={() => {
                      if (!modoSeleccion) {
                        setModoSeleccion(true);
                        setSeleccionTipo('horarios');
                        setCeldasSeleccionadas([]);
                        setActividadesSeleccionadas([act.id]);
                      }
                    }}
                    delayLongPress={500}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiActividad}>{act.emoji || '📌'}</Text>
                    <Text style={[styles.nombreActividadCuadrado, { color: seleccionada ? COLORES.BLANCO : act.color }]}>
                      {act.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* ===== MODAL NUEVA/EDITAR ACTIVIDAD BASE ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalBaseVisible}
        onRequestClose={() => {
          setModalBaseVisible(false);
          setCeldaSeleccionadaParaModal(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPress={() => {
            setModalBaseVisible(false);
            setCeldaSeleccionadaParaModal(null);
          }}
        >
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>{actividadBaseEditando ? 'Editar Actividad' : 'Nueva Actividad'}</Text>
                <TouchableOpacity onPress={() => {
                  setModalBaseVisible(false);
                  setCeldaSeleccionadaParaModal(null);
                }}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalFormulario}>
                <Text style={styles.modalLabel}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={nuevaActividadBase.nombre}
                  onChangeText={(t) => setNuevaActividadBase({ ...nuevaActividadBase, nombre: t })}
                  placeholder="Ej: Jardinería, Lectura..."
                />

                <Text style={styles.modalLabel}>Emoji</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorEmoji}>
                  {EMOJIS_DISPONIBLES.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.opcionEmoji,
                        nuevaActividadBase.emoji === emoji && styles.opcionEmojiSeleccionada,
                      ]}
                      onPress={() => setNuevaActividadBase({ ...nuevaActividadBase, emoji })}
                    >
                      <Text style={{ fontSize: 28 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.modalLabel}>Color</Text>
                <View style={styles.coloresContainer}>
                  {[COLORES.AZUL_CIELO, COLORES.EXITO, COLORES.AMARILLO_PLATANO, COLORES.MORADO, COLORES.NARANJA, COLORES.ROSADO, COLORES.TURQUESA, COLORES.INDIGO].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.opcionColor, { backgroundColor: c }, nuevaActividadBase.color === c && styles.opcionColorSeleccionada]}
                      onPress={() => setNuevaActividadBase({ ...nuevaActividadBase, color: c })}
                    />
                  ))}
                </View>

                <Text style={styles.modalLabel}>Descripción (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={nuevaActividadBase.descripcion}
                  onChangeText={(t) => setNuevaActividadBase({ ...nuevaActividadBase, descripcion: t })}
                  multiline
                  numberOfLines={3}
                  placeholder="Breve descripción..."
                />
              </ScrollView>
              <View style={styles.modalBotones}>
                {actividadBaseEditando && (
                  <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.ROJO_CLARO }]} onPress={eliminarActividadBase}>
                    <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.botonModalCancelar} onPress={() => {
                  setModalBaseVisible(false);
                  setCeldaSeleccionadaParaModal(null);
                }}>
                  <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarActividadBase}>
                  <Text style={styles.textoBotonModalAccion}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ===== MODAL OCURRENCIA ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalOcurrenciaVisible}
        onRequestClose={() => {
          setModalOcurrenciaVisible(false);
          setCeldaSeleccionadaParaModal(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPress={() => {
            setModalOcurrenciaVisible(false);
            setCeldaSeleccionadaParaModal(null);
          }}
        >
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>{ocurrenciaEditando ? 'Editar horario' : 'Nuevo horario'}</Text>
                <TouchableOpacity onPress={() => {
                  setModalOcurrenciaVisible(false);
                  setCeldaSeleccionadaParaModal(null);
                }}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalFormulario}>
                <Text style={styles.modalLabel}>Actividad</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorActividades}>
                  {actividadesBase.map((act) => (
                    <TouchableOpacity
                      key={act.id}
                      style={[
                        styles.opcionActividad,
                        nuevaOcurrencia.actividad_base_id === act.id && { backgroundColor: act.color + '40', borderColor: act.color },
                      ]}
                      onPress={() => setNuevaOcurrencia({ ...nuevaOcurrencia, actividad_base_id: act.id })}
                    >
                      <Text style={{ fontSize: 20 }}>{act.emoji || '📌'}</Text>
                      <Text style={[styles.textoOpcionActividad, { color: act.color }]}>{act.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.opcionActividad}
                    onPress={() => {
                      setModalOcurrenciaVisible(false);
                      setActividadBaseEditando(null);
                      setNuevaActividadBase({ nombre: '', emoji: '📌', color: COLORES.AZUL_CIELO, descripcion: '' });
                      setModalBaseVisible(true);
                      setCallbackNuevaActividad((nuevoId) => {
                        setNuevaOcurrencia(prev => ({ ...prev, actividad_base_id: nuevoId }));
                        setModalOcurrenciaVisible(true);
                        setTimeout(() => guardarOcurrencia(), 100);
                      });
                    }}
                  >
                    <Icon name="add-circle-outline" size={24} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.textoOpcionActividad}>Nueva</Text>
                  </TouchableOpacity>
                </ScrollView>

                <Text style={styles.modalLabel}>Días</Text>
                <View style={styles.diasContainer}>
                  {DIAS_SEMANA.map((dia) => (
                    <TouchableOpacity
                      key={dia.id}
                      style={[styles.opcionDia, nuevaOcurrencia.dias.includes(dia.id) && styles.opcionDiaSeleccionada]}
                      onPress={() => {
                        const nuevos = [...nuevaOcurrencia.dias];
                        const idx = nuevos.indexOf(dia.id);
                        idx === -1 ? nuevos.push(dia.id) : nuevos.splice(idx, 1);
                        setNuevaOcurrencia({ ...nuevaOcurrencia, dias: nuevos });
                      }}
                    >
                      <Text style={[styles.textoOpcionDia, nuevaOcurrencia.dias.includes(dia.id) && styles.textoOpcionDiaSeleccionada]}>
                        {dia.corto}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Duración, Inicio y Fin */}
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
                  />
                )}

                <View style={styles.horarioInputs}>
                  <View style={styles.inputMitad}>
                    <Text style={styles.subLabel}>Inicio</Text>
                    <TimePicker
                      value={nuevaOcurrencia.hora_inicio}
                      onChange={(val) => setNuevaOcurrencia(prev => ({ ...prev, hora_inicio: val }))}
                    />
                  </View>
                  <View style={styles.inputMitad}>
                    <Text style={styles.subLabel}>Fin</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: COLORES.GRIS_CLARO, color: COLORES.GRIS_OSCURO }]}
                      value={nuevaOcurrencia.hora_fin}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.opcionRecurrente}>
                  <TouchableOpacity
                    style={styles.botonRecurrente}
                    onPress={() => setNuevaOcurrencia({ ...nuevaOcurrencia, esRecurrente: !nuevaOcurrencia.esRecurrente })}
                  >
                    <View style={styles.switchRecurrente}>
                      <View style={[styles.switchPuntoRecurrente, nuevaOcurrencia.esRecurrente && styles.switchPuntoActivoRecurrente]} />
                    </View>
                    <Text style={styles.textoRecurrente}>
                      {nuevaOcurrencia.esRecurrente ? 'Repetir todas las semanas' : 'Solo esta semana'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              <View style={styles.modalBotones}>
                {ocurrenciaEditando && (
                  <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.ROJO_CLARO }]} onPress={eliminarOcurrencia}>
                    <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.botonModalCancelar} onPress={() => {
                  setModalOcurrenciaVisible(false);
                  setCeldaSeleccionadaParaModal(null);
                }}>
                  <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarOcurrencia}>
                  <Text style={styles.textoBotonModalAccion}>{ocurrenciaEditando ? 'Actualizar' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ===== MODAL CONFIGURACIÓN ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalConfigVisible}
        onRequestClose={() => setModalConfigVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPress={() => setModalConfigVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>Configuración</Text>
                <TouchableOpacity onPress={() => setModalConfigVisible(false)}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalFormulario}>
                <View style={styles.seccionConfig}>
                  <Text style={styles.tituloSeccionConfig}>Horas</Text>
                  <View style={styles.rangoHoras}>
                    <View style={styles.inputRango}>
                      <Text style={styles.labelRango}>Inicio</Text>
                      <TimePicker
                        value={`${String(configuracion.horaInicio).padStart(2, '0')}:00`}
                        onChange={(val) => {
                          const h = parseInt(val.split(':')[0]);
                          if (!isNaN(h)) {
                            setConfiguracion(prev => ({ ...prev, horaInicio: h }));
                          }
                        }}
                        label=""
                      />
                    </View>
                    <Text style={styles.separadorRango}>a</Text>
                    <View style={styles.inputRango}>
                      <Text style={styles.labelRango}>Fin</Text>
                      <TimePicker
                        value={`${String(configuracion.horaFin).padStart(2, '0')}:00`}
                        onChange={(val) => {
                          const h = parseInt(val.split(':')[0]);
                          if (!isNaN(h)) {
                            setConfiguracion(prev => ({ ...prev, horaFin: h }));
                          }
                        }}
                        label=""
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.seccionConfig}>
                  <Text style={styles.tituloSeccionConfig}>Mostrar</Text>
                  {[
                    { key: 'mostrarMedicinas', label: 'Medicinas' },
                    { key: 'mostrarEventos', label: 'Eventos' },
                    { key: 'mostrarActividades', label: 'Actividades' },
                    { key: 'mostrarFines', label: 'Fines de semana' },
                  ].map(({ key, label }) => (
                    <View key={key} style={styles.opcionConfig}>
                      <Text style={styles.textoOpcionConfig}>{label}</Text>
                      <TouchableOpacity
                        style={[styles.switch, configuracion[key] && styles.switchActivo]}
                        onPress={() => setConfiguracion({ ...configuracion, [key]: !configuracion[key] })}
                      >
                        <View style={[styles.switchPunto, configuracion[key] && styles.switchPuntoActivo]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalConfigVisible(false)}>
                  <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarConfiguracion}>
                  <Text style={styles.textoBotonModalAccion}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ===== NOTIFICACIÓN ===== */}
      {notificacion.visible && notificacion.mensaje && (
        <View style={styles.notificacionContainer}>
          <View style={styles.notificacionContenido}>
            <Text style={styles.notificacionTexto}>{notificacion.mensaje}</Text>
          </View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  fondoBlanco: { flex: 1, backgroundColor: COLORES.BLANCO },
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
  botonAtras: { padding: 4 },
  tituloPrincipal: { fontSize: 22, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  botonConfig: { padding: 4 },

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
  estadoSemanaContainer: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 8,
  },
  estadoSemanaTexto: { fontSize: 16, fontWeight: 'bold' },
  estadoSemanaFechas: { fontSize: 13, fontWeight: '600' },

  horarioWrapper: { flex: 0.8, backgroundColor: COLORES.BLANCO },
  horarioScroll: { flex: 1 },
  columnaHoras: { width: 75, backgroundColor: COLORES.GRIS_CLARO },
  celdaHora: { height: HORA_HEIGHT, justifyContent: 'flex-start', paddingTop: 6, paddingLeft: 4, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_MEDIO },
  celdaHoraVacia: { height: 36, width: 75, backgroundColor: COLORES.GRIS_CLARO, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_MEDIO },
  textoHora: { fontSize: 12, color: COLORES.GRIS_OSCURO, fontWeight: '600' },

  gridDias: { flex: 1 },
  encabezadosDias: { flexDirection: 'row', backgroundColor: COLORES.GRIS_CLARO },
  encabezadoDia: { width: DIA_WIDTH, alignItems: 'center', paddingVertical: 8, borderLeftWidth: 1, borderLeftColor: COLORES.GRIS_MEDIO },
  encabezadoFinDeSemana: { backgroundColor: COLORES.GRIS_CLARO + '30' },
  textoEncabezadoDia: { fontSize: 13, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  textoEncabezadoFinDeSemana: { color: COLORES.GRIS_OSCURO },
  textoFechaDia: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  textoFechaFinDeSemana: { color: COLORES.GRIS_OSCURO },

  cuerpoHorario: { backgroundColor: COLORES.BLANCO },
  filaHoraria: { flexDirection: 'row', height: HORA_HEIGHT, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  contenedorCeldaDia: { width: DIA_WIDTH, borderLeftWidth: 1, borderLeftColor: COLORES.GRIS_CLARO },
  celdaHorario: { flex: 1, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO, position: 'relative', minHeight: HORA_HEIGHT },
  celdaFinDeSemana: { backgroundColor: COLORES.GRIS_CLARO + '30' },
  celdaSeleccionadaMultiple: { backgroundColor: COLORES.AZUL_CIELO + '50', borderColor: COLORES.AZUL_CIELO_OSCURO, borderWidth: 2 },

  actividad: { position: 'absolute', borderRadius: 4, padding: 2, zIndex: 1, overflow: 'hidden' },
  nombreActividad: { fontSize: 10, fontWeight: 'bold', color: COLORES.BLANCO, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  emojiActividadHorario: { fontSize: 11, textAlign: 'center', color: COLORES.BLANCO, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

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
  botonAccion: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  botonSeleccionar: { backgroundColor: COLORES.AZUL_CIELO_OSCURO },
  botonNueva: { backgroundColor: COLORES.EXITO },
  botonCancelar: { backgroundColor: COLORES.ROJO_CLARO },
  botonAsignar: { backgroundColor: COLORES.GRIS_MEDIO, opacity: 0.7 },
  botonAsignarActivo: { backgroundColor: COLORES.EXITO, opacity: 1 },
  botonEliminar: { backgroundColor: COLORES.ERROR },
  botonDeshabilitado: { backgroundColor: COLORES.GRIS_MEDIO, opacity: 0.5 },
  textoBotonAccion: { color: COLORES.BLANCO, fontSize: 14, fontWeight: 'bold' },

  seccionActividades: {
    backgroundColor: COLORES.BLANCO,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
    flex: 0.2,
    minHeight: 150,
  },
  grillaActividades: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    height: 3 * (60 + 6) + 12,
    alignItems: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  cuadradoActividad: {
    width: 100,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
    marginBottom: 6,
  },
  cuadradoActividadSeleccionada: {
    borderColor: COLORES.TEXTO_OSCURO,
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  cuadradoActividadConOcurrencia: {
    borderColor: COLORES.EXITO,
    borderWidth: 2,
  },
  cuadradoActividadBloqueada: {
    opacity: 0.4,
  },
  emojiActividad: { fontSize: 20 },
  nombreActividadCuadrado: { fontSize: 11, fontWeight: 'bold', textAlign: 'center' },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  modalEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  modalFormulario: { maxHeight: 400 },
  modalLabel: { fontSize: 15, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  coloresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  opcionColor: { width: 36, height: 36, borderRadius: 18, marginRight: 10, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  opcionColorSeleccionada: { borderColor: COLORES.TEXTO_OSCURO, transform: [{ scale: 1.1 }] },
  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonModalCancelar: { flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 8, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center' },
  textoBotonModalCancelar: { color: COLORES.TEXTO_OSCURO, fontSize: 15, fontWeight: '600' },
  botonModalAccion: { flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 8, alignItems: 'center' },
  textoBotonModalAccion: { color: COLORES.BLANCO, fontSize: 15, fontWeight: '600' },

  selectorEmoji: { flexDirection: 'row', marginVertical: 8 },
  opcionEmoji: { padding: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, marginRight: 8 },
  opcionEmojiSeleccionada: { backgroundColor: COLORES.AZUL_CIELO + '40', borderColor: COLORES.AZUL_CIELO_OSCURO },

  selectorActividades: { flexDirection: 'row', marginBottom: 8 },
  opcionActividad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, marginRight: 8 },
  textoOpcionActividad: { fontSize: 13, fontWeight: '600', marginLeft: 4 },

  diasContainer: { flexDirection: 'row', marginBottom: 8 },
  opcionDia: { flex: 1, paddingVertical: 8, marginHorizontal: 2, borderRadius: 8, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, alignItems: 'center' },
  opcionDiaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoOpcionDia: { fontSize: 12, color: COLORES.GRIS_OSCURO },
  textoOpcionDiaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  // TimePicker estilos
  timePickerContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 2,
  },
  timePickerButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timePickerDisplay: {
    paddingVertical: 4,
  },
  timePickerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  timePickerInput: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    width: 80,
    textAlign: 'center',
    marginTop: 4,
  },

  duracionContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  botonDuracion: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORES.GRIS_CLARO, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  botonDuracionSeleccionado: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoBotonDuracion: { fontSize: 14, color: COLORES.TEXTO_OSCURO },
  textoBotonDuracionSeleccionado: { color: COLORES.BLANCO, fontWeight: 'bold' },

  horarioInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inputMitad: { width: '48%' },
  subLabel: { fontSize: 13, color: COLORES.GRIS_OSCURO, marginBottom: 4 },

  opcionRecurrente: { marginBottom: 8 },
  botonRecurrente: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  switchRecurrente: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORES.GRIS_MEDIO, justifyContent: 'center', paddingHorizontal: 2, marginRight: 8 },
  switchPuntoRecurrente: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORES.BLANCO, alignSelf: 'flex-start' },
  switchPuntoActivoRecurrente: { alignSelf: 'flex-end', backgroundColor: COLORES.EXITO },
  textoRecurrente: { fontSize: 14, color: COLORES.TEXTO_OSCURO },

  seccionConfig: { marginBottom: 16 },
  tituloSeccionConfig: { fontSize: 16, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 10 },
  rangoHoras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputRango: { flex: 1, alignItems: 'center' },
  labelRango: { fontSize: 13, color: COLORES.GRIS_OSCURO, marginBottom: 4 },
  separadorRango: { fontSize: 16, color: COLORES.GRIS_OSCURO, marginHorizontal: 10 },
  opcionConfig: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  textoOpcionConfig: { fontSize: 15, color: COLORES.TEXTO_OSCURO },
  switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORES.GRIS_MEDIO, justifyContent: 'center', paddingHorizontal: 2 },
  switchActivo: { backgroundColor: COLORES.EXITO },
  switchPunto: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORES.BLANCO, alignSelf: 'flex-start' },
  switchPuntoActivo: { alignSelf: 'flex-end' },

  notificacionContainer: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  notificacionContenido: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  notificacionTexto: { color: COLORES.BLANCO, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});