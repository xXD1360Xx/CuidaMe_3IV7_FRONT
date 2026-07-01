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
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
const HORA_HEIGHT = 55;
const DIA_WIDTH = (width - 60) / 7;

// Días: LUNES primero
const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes', corto: 'Lun' },
  { id: 2, nombre: 'Martes', corto: 'Mar' },
  { id: 3, nombre: 'Miércoles', corto: 'Mié' },
  { id: 4, nombre: 'Jueves', corto: 'Jue' },
  { id: 5, nombre: 'Viernes', corto: 'Vie' },
  { id: 6, nombre: 'Sábado', corto: 'Sáb' },
  { id: 0, nombre: 'Domingo', corto: 'Dom' },
];

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

export default function VistaHorario({ navigation }) {
  // ========== ESTADOS ==========
  const [usuarioId, setUsuarioId] = useState(null);
  const [horario, setHorario] = useState([]);
  const [medicinas, setMedicinas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [actividadesBase, setActividadesBase] = useState(ACTIVIDADES_PREDEFINIDAS_DEMO);
  const [actividadesOcurrencias, setActividadesOcurrencias] = useState([]);

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

  // Estados de selección
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [celdasSeleccionadas, setCeldasSeleccionadas] = useState([]);

  // Estados para modales
  const [modalBaseVisible, setModalBaseVisible] = useState(false);
  const [actividadBaseEditando, setActividadBaseEditando] = useState(null);
  const [nuevaActividadBase, setNuevaActividadBase] = useState({
    nombre: '',
    tipo: 'rutinaria',
    color: COLORES.AZUL_CIELO,
    descripcion: '',
  });

  // Modal para editar ocurrencia (clic en celda)
  const [modalOcurrenciaVisible, setModalOcurrenciaVisible] = useState(false);
  const [ocurrenciaEditando, setOcurrenciaEditando] = useState(null);
  const [nuevaOcurrencia, setNuevaOcurrencia] = useState({
    actividad_base_id: null,
    dias: [],
    hora_inicio: '08:00',
    hora_fin: '09:00',
    duracion_minutos: 60,
    esRecurrente: true, // Por defecto recurrente
    fecha_inicio: '',
    fecha_fin: null,
  });

  // Notificación
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '' });
  const animNotificacion = useRef(new Animated.Value(0)).current;
  const timeoutNotificacion = useRef(null);

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
      await Promise.all([
        cargarConfiguracion(id),
        cargarMedicinas(id),
        cargarEventosSemana(id),
        cargarActividadesBase(id),
        cargarOcurrenciasSemana(id),
      ]);
      generarHorario();
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
      let base = [...ACTIVIDADES_PREDEFINIDAS_DEMO];
      if (res.exito && res.actividades) {
        const creadas = res.actividades.filter(
          (act) => !base.some((p) => p.nombre === act.nombre)
        );
        base = [...base, ...creadas];
      }
      setActividadesBase(base);
    } catch (error) {
      console.warn('Usando actividades demo:', error);
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
        console.warn('⚠️ No se obtuvieron ocurrencias, usando vacío');
        setActividadesOcurrencias([]);
      }
    } catch (error) {
      console.warn('⚠️ Error cargando ocurrencias:', error);
      setActividadesOcurrencias([]);
    }
  };

  const recargarSemana = async () => {
    if (!usuarioId) return;
    setRefrescando(true);
    try {
      // Cargar en paralelo pero esperar a que terminen
      await Promise.all([
        cargarEventosSemana(usuarioId),
        cargarOcurrenciasSemana(usuarioId),
        cargarActividadesBase(usuarioId),
      ]);
      // Después de cargar, regenerar horario
      generarHorario();
    } catch (error) {
      console.error('Error recargando semana:', error);
    } finally {
      setRefrescando(false);
    }
  };
  // ========== GENERAR HORARIO ==========
  const generarHorario = () => {
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
                  hora_inicio: oc.hora_inicio,
                  hora_fin: oc.hora_fin,
                  duracion_minutos: oc.duracion_minutos || 60,
                  datos: oc,
                  esOcurrencia: true,
                  ocurrenciaId: oc.id,
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
              });
            }
          }
        }
      });
    }

    setHorario(horarioGenerado);
  };

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
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
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
    if (timeoutNotificacion.current) clearTimeout(timeoutNotificacion.current);
    setNotificacion({ visible: true, mensaje: mensaje || '' }); // Asegurar string
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

  // ========== SELECCIÓN ==========
  const toggleModoSeleccion = () => {
    setModoSeleccion(!modoSeleccion);
    if (!modoSeleccion) {
      setActividadSeleccionada(null);
      setCeldasSeleccionadas([]);
    }
  };

  const seleccionarActividad = (act) => {
    if (!modoSeleccion) return;
    setActividadSeleccionada(act.id === actividadSeleccionada ? null : act);
  };

  const toggleCeldaSeleccionada = (dia, hora) => {
    if (!modoSeleccion) return;
    const idx = celdasSeleccionadas.findIndex((c) => c.dia === dia && c.hora === hora);
    if (idx >= 0) {
      setCeldasSeleccionadas(celdasSeleccionadas.filter((_, i) => i !== idx));
    } else {
      setCeldasSeleccionadas([...celdasSeleccionadas, { dia, hora }]);
    }
  };

  const cancelarSeleccion = () => {
    setModoSeleccion(false);
    setActividadSeleccionada(null);
    setCeldasSeleccionadas([]);
  };

  const estaListoParaAsignar = () => {
    return modoSeleccion && actividadSeleccionada && celdasSeleccionadas.length > 0;
  };

  const asignarActividad = async () => {
    if (!estaListoParaAsignar()) return;

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
            await crearOcurrencia(actividadSeleccionada.id, parseInt(diaId), inicio, fin);
            inicio = horas[i];
            fin = horas[i];
          }
        }
        await crearOcurrencia(actividadSeleccionada.id, parseInt(diaId), inicio, fin);
      }

      mostrarNotificacion(`✅ Asignado a ${celdasSeleccionadas.length} horarios`);
      setModoSeleccion(false);
      setActividadSeleccionada(null);
      setCeldasSeleccionadas([]);
      await recargarSemana(); // Esperar a que termine la recarga
    } catch (error) {
      console.error('Error asignando:', error);
      Alert.alert('Error', 'No se pudo asignar');
    }
  };

  const crearOcurrencia = async (actId, dia, inicio, fin) => {
    const data = {
      actividad_base_id: actId,
      dias: [dia],
      hora_inicio: `${inicio.toString().padStart(2, '0')}:00`,
      hora_fin: `${(fin + 1).toString().padStart(2, '0')}:00`,
      duracion_minutos: (fin + 1 - inicio) * 60,
      esRecurrente: nuevaOcurrencia.esRecurrente,
      fecha_inicio: obtenerFechaDelDia(dia).toISOString().split('T')[0],
      fecha_fin: nuevaOcurrencia.esRecurrente ? null : obtenerFechaDelDia(dia).toISOString().split('T')[0],
    };
    await servicioAPI.crearOcurrencia(usuarioId, data);
  };

  // ========== GESTIÓN DE ACTIVIDADES BASE ==========
  const guardarActividadBase = async () => {
    try {
      if (!nuevaActividadBase.nombre.trim()) {
        Alert.alert('Error', 'El nombre es requerido');
        return;
      }
      await servicioAPI.crearActividadBase(usuarioId, nuevaActividadBase);
      mostrarNotificacion('✅ Actividad creada');
      setModalBaseVisible(false);
      setNuevaActividadBase({ nombre: '', tipo: 'rutinaria', color: COLORES.AZUL_CIELO, descripcion: '' });
      recargarSemana();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  // ========== CLIC EN CELDA (editar ocurrencia) ==========
  const handlePressCelda = (dia, hora) => {
    if (modoSeleccion) return;

    const bloqueHora = horario.find((b) => b.hora === hora);
    const actividad = bloqueHora?.dias[dia]?.actividades.find(
      (a) => a.esOcurrencia && a.ocurrenciaId
    );

    if (actividad) {
      // Editar ocurrencia existente
      setOcurrenciaEditando(actividad.datos);
      setNuevaOcurrencia({
        actividad_base_id: actividad.datos.actividad_base_id,
        dias: actividad.datos.dias || [dia],
        hora_inicio: actividad.datos.hora_inicio,
        hora_fin: actividad.datos.hora_fin,
        duracion_minutos: actividad.datos.duracion_minutos,
        esRecurrente: actividad.datos.esRecurrente || true,
        fecha_inicio: actividad.datos.fecha_inicio || new Date().toISOString().split('T')[0],
        fecha_fin: actividad.datos.fecha_fin || null,
      });
      setModalOcurrenciaVisible(true);
    } else {
      // Crear nueva ocurrencia
      const fecha = obtenerFechaDelDia(dia);
      setOcurrenciaEditando(null);
      setNuevaOcurrencia({
        actividad_base_id: null,
        dias: [dia],
        hora_inicio: `${hora.toString().padStart(2, '0')}:00`,
        hora_fin: `${(hora + 1).toString().padStart(2, '0')}:00`,
        duracion_minutos: 60,
        esRecurrente: true,
        fecha_inicio: fecha.toISOString().split('T')[0],
        fecha_fin: null,
      });
      setModalOcurrenciaVisible(true);
    }
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
                setNuevaActividadBase({ nombre: '', tipo: 'rutinaria', color: COLORES.AZUL_CIELO, descripcion: '' });
                setModalBaseVisible(true);
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ],
          { cancelable: true }
        );
        return;
      }

      const data = { ...nuevaOcurrencia };
      // Asegurar que fecha_fin sea null si es recurrente
      if (data.esRecurrente) {
        data.fecha_fin = null;
      } else {
        // Si no es recurrente, la fecha_fin es la misma que fecha_inicio (solo ese día)
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
      recargarSemana();
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

    return (
      <TouchableOpacity
        style={[
          styles.celdaHorario,
          esFin && styles.celdaFinDeSemana,
          esSeleccionada && styles.celdaSeleccionadaMultiple,
        ]}
        onPress={() => {
          if (modoSeleccion) {
            toggleCeldaSeleccionada(diaId, hora);
          } else {
            handlePressCelda(diaId, hora);
          }
        }}
        activeOpacity={0.7}
      >
        {actividades.map((act) => {
          const [hIni, mIni] = act.hora_inicio.split(':').map(Number);
          const duracion = act.duracion_minutos || 60;
          const top = (hIni + mIni / 60 - hora) * HORA_HEIGHT;
          const altura = (duracion / 60) * HORA_HEIGHT;
          const estilo = {
            top: Math.max(0, top),
            height: Math.max(10, altura),
            backgroundColor: act.color || COLORES.AZUL_CIELO,
          };
          return (
            <View key={act.id} style={[styles.actividad, estilo]}>
              <Text style={styles.nombreActividad} numberOfLines={1}>
                {act.nombre}
              </Text>
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

  // Colores según estado de la semana
  const estadoColores = {
    actual: { bg: '#FFE135', text: COLORES.TEXTO_OSCURO }, // Amarillo
    futura: { bg: '#87CEEB', text: COLORES.TEXTO_OSCURO }, // Azul cielo
    pasada: { bg: '#D3D3D3', text: COLORES.GRIS_OSCURO }, // Gris
  };
  const estadoColor = estadoColores[estado] || estadoColores.actual;

  return (
    <GestureHandlerRootView style={styles.fondoBlanco}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.columnaHoras}>
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

        {/* ===== BOTONES DE ACCIÓN (arriba a la derecha) ===== */}
        <View style={styles.botonesAccion}>
          {modoSeleccion ? (
            <>
              <TouchableOpacity style={[styles.botonAccion, styles.botonCancelar]} onPress={cancelarSeleccion}>
                <Text style={styles.textoBotonAccion}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.botonAccion,
                  styles.botonAsignar,
                  !estaListoParaAsignar() && styles.botonDeshabilitado,
                ]}
                onPress={asignarActividad}
                disabled={!estaListoParaAsignar()}
              >
                <Text style={styles.textoBotonAccion}>Asignar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.botonAccion, styles.botonSeleccionar]} onPress={toggleModoSeleccion}>
                <Text style={styles.textoBotonAccion}>Seleccionar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonAccion, styles.botonNueva]} onPress={() => setModalBaseVisible(true)}>
                <Text style={styles.textoBotonAccion}>+ Nueva</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ===== ACTIVIDADES EN 3 FILAS ===== */}
        <View style={styles.seccionActividades}>
          <ScrollView contentContainerStyle={styles.grillaActividades}>
            {actividadesBase.map((act) => {
              const seleccionada = actividadSeleccionada?.id === act.id;
              const tieneOcurrencia = actividadesOcurrencias.some((oc) => oc.actividad_base_id === act.id);
              return (
                <TouchableOpacity
                  key={act.id}
                  style={[
                    styles.cuadradoActividad,
                    { backgroundColor: seleccionada ? act.color : act.color + '40' },
                    seleccionada && styles.cuadradoActividadSeleccionada,
                    tieneOcurrencia && styles.cuadradoActividadConOcurrencia,
                  ]}
                  onPress={() => seleccionarActividad(act)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiActividad}>{act.emoji || '📌'}</Text>
                  <Text style={[styles.nombreActividadCuadrado, { color: seleccionada ? COLORES.BLANCO : act.color }]}>
                    {act.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* ===== MODAL NUEVA ACTIVIDAD ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalBaseVisible}
        onRequestClose={() => setModalBaseVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPressOut={() => setModalBaseVisible(false)}
        >
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Nueva Actividad</Text>
              <TouchableOpacity onPress={() => setModalBaseVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalFormulario}>
              <Text style={styles.modalLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={nuevaActividadBase.nombre}
                onChangeText={(t) => setNuevaActividadBase({ ...nuevaActividadBase, nombre: t })}
                placeholder="Ej: Terapia"
              />
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
              <Text style={styles.modalLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={nuevaActividadBase.descripcion}
                onChangeText={(t) => setNuevaActividadBase({ ...nuevaActividadBase, descripcion: t })}
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalBaseVisible(false)}>
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarActividadBase}>
                <Text style={styles.textoBotonModalAccion}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===== MODAL OCURRENCIA (editar horario) ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalOcurrenciaVisible}
        onRequestClose={() => setModalOcurrenciaVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPressOut={() => setModalOcurrenciaVisible(false)}
        >
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>{ocurrenciaEditando ? 'Editar horario' : 'Nuevo horario'}</Text>
              <TouchableOpacity onPress={() => setModalOcurrenciaVisible(false)}>
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
                    setNuevaActividadBase({ nombre: '', tipo: 'rutinaria', color: COLORES.AZUL_CIELO, descripcion: '' });
                    setModalBaseVisible(true);
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

              <View style={styles.horarioInputs}>
                <View style={styles.inputMitad}>
                  <Text style={styles.subLabel}>Inicio</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaOcurrencia.hora_inicio}
                    onChangeText={(t) => setNuevaOcurrencia({ ...nuevaOcurrencia, hora_inicio: t })}
                  />
                </View>
                <View style={styles.inputMitad}>
                  <Text style={styles.subLabel}>Fin</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaOcurrencia.hora_fin}
                    onChangeText={(t) => setNuevaOcurrencia({ ...nuevaOcurrencia, hora_fin: t })}
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>Duración (minutos)</Text>
              <TextInput
                style={styles.input}
                value={String(nuevaOcurrencia.duracion_minutos)}
                onChangeText={(t) => {
                  const num = parseInt(t);
                  setNuevaOcurrencia({ ...nuevaOcurrencia, duracion_minutos: isNaN(num) ? 0 : num });
                }}
                keyboardType="numeric"
              />

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
              <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalOcurrenciaVisible(false)}>
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarOcurrencia}>
                <Text style={styles.textoBotonModalAccion}>{ocurrenciaEditando ? 'Actualizar' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
          onPressOut={() => setModalConfigVisible(false)}
        >
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
                    <TextInput
                      style={styles.input}
                      value={String(configuracion.horaInicio ?? 8)}
                      onChangeText={(t) => {
                        const num = parseInt(t);
                        setConfiguracion({ ...configuracion, horaInicio: isNaN(num) ? 8 : Math.max(0, Math.min(23, num)) });
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.separadorRango}>a</Text>
                  <View style={styles.inputRango}>
                    <Text style={styles.labelRango}>Fin</Text>
                    <TextInput
                      style={styles.input}
                      value={String(configuracion.horaFin ?? 22)}
                      onChangeText={(t) => {
                        const num = parseInt(t);
                        setConfiguracion({ ...configuracion, horaFin: isNaN(num) ? 22 : Math.max(0, Math.min(23, num)) });
                      }}
                      keyboardType="numeric"
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
        </TouchableOpacity>
      </Modal>

      {/* ===== NOTIFICACIÓN ===== */}
      {notificacion.visible && notificacion.mensaje && (
        <Animated.View
          style={[
            styles.notificacionContainer,
            {
              opacity: animNotificacion,
              transform: [{ translateY: animNotificacion.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            },
          ]}
        >
          <View style={styles.notificacionContenido}>
            <Icon name="checkmark-circle" size={20} color={COLORES.BLANCO} style={{ marginRight: 10 }} />
            <Text style={styles.notificacionTexto}>{notificacion.mensaje}</Text>
          </View>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  fondoBlanco: { flex: 1, backgroundColor: COLORES.BLANCO },
  contenedor: { flex: 1, paddingTop: 20 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCargando: { color: COLORES.GRIS_OSCURO, marginTop: 20, fontSize: 16 },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  botonAtras: { padding: 8 },
  tituloPrincipal: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  botonConfig: { padding: 8 },

  controlesNavegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  botonControl: { padding: 10, borderRadius: 20, backgroundColor: COLORES.GRIS_CLARO },
  estadoSemanaContainer: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 10,
  },
  estadoSemanaTexto: { fontSize: 16, fontWeight: 'bold' },
  estadoSemanaFechas: { fontSize: 12, fontWeight: 'bold' },

  horarioWrapper: { flex: 0.7, backgroundColor: COLORES.BLANCO },
  horarioScroll: { flex: 1 },
  columnaHoras: { width: 60, backgroundColor: COLORES.GRIS_CLARO },
  celdaHora: { height: HORA_HEIGHT, justifyContent: 'flex-start', paddingTop: 8, paddingLeft: 8, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_MEDIO },
  textoHora: { fontSize: 12, color: COLORES.GRIS_OSCURO, fontWeight: '600' },

  gridDias: { flex: 1 },
  encabezadosDias: { flexDirection: 'row', backgroundColor: COLORES.GRIS_CLARO },
  encabezadoDia: { width: DIA_WIDTH, alignItems: 'center', paddingVertical: 8, borderLeftWidth: 1, borderLeftColor: COLORES.GRIS_MEDIO },
  encabezadoFinDeSemana: { backgroundColor: COLORES.GRIS_CLARO + '40' }, // más sutil
  textoEncabezadoDia: { fontSize: 13, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  textoEncabezadoFinDeSemana: { color: COLORES.GRIS_OSCURO },
  textoFechaDia: { fontSize: 11, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  textoFechaFinDeSemana: { color: COLORES.GRIS_OSCURO },

  cuerpoHorario: { backgroundColor: COLORES.BLANCO },
  filaHoraria: { flexDirection: 'row', height: HORA_HEIGHT, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  contenedorCeldaDia: { width: DIA_WIDTH, borderLeftWidth: 1, borderLeftColor: COLORES.GRIS_CLARO },
  celdaHorario: { flex: 1, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO, position: 'relative', minHeight: HORA_HEIGHT },
  celdaFinDeSemana: { backgroundColor: COLORES.GRIS_CLARO + '40' }, // más sutil
  celdaSeleccionadaMultiple: { backgroundColor: COLORES.AZUL_CIELO + '40', borderColor: COLORES.AZUL_CIELO, borderWidth: 2 },

  actividad: { position: 'absolute', left: 2, right: 2, borderRadius: 4, padding: 4, zIndex: 1 },
  nombreActividad: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO, // negro en negritas
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },

  botonesAccion: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
    gap: 12,
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
  botonAsignar: { backgroundColor: COLORES.EXITO },
  botonDeshabilitado: { backgroundColor: COLORES.GRIS_MEDIO },
  textoBotonAccion: { color: COLORES.BLANCO, fontSize: 13, fontWeight: 'bold' },

  seccionActividades: {
    backgroundColor: COLORES.BLANCO,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
    flex: 0.2,
  },
  grillaActividades: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    paddingBottom: 8,
  },
  cuadradoActividad: {
    width: (width - 48) / 3,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
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
  emojiActividad: { fontSize: 18 },
  nombreActividadCuadrado: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', marginTop: 2 },

  // Modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  modalEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  modalFormulario: { maxHeight: 400 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  coloresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  opcionColor: { width: 32, height: 32, borderRadius: 16, marginRight: 10, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  opcionColorSeleccionada: { borderColor: COLORES.TEXTO_OSCURO, transform: [{ scale: 1.1 }] },
  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonModalCancelar: { flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 8, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center' },
  textoBotonModalCancelar: { color: COLORES.TEXTO_OSCURO, fontSize: 14, fontWeight: '600' },
  botonModalAccion: { flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 8, alignItems: 'center' },
  textoBotonModalAccion: { color: COLORES.BLANCO, fontSize: 14, fontWeight: '600' },

  selectorActividades: { flexDirection: 'row', marginBottom: 8 },
  opcionActividad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, marginRight: 8 },
  textoOpcionActividad: { fontSize: 12, fontWeight: '600', marginLeft: 4 },

  diasContainer: { flexDirection: 'row', marginBottom: 8 },
  opcionDia: { flex: 1, paddingVertical: 8, marginHorizontal: 2, borderRadius: 8, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, alignItems: 'center' },
  opcionDiaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoOpcionDia: { fontSize: 11, color: COLORES.GRIS_OSCURO },
  textoOpcionDiaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  horarioInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inputMitad: { width: '48%' },
  subLabel: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginBottom: 4 },
  opcionRecurrente: { marginBottom: 8 },
  botonRecurrente: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  switchRecurrente: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORES.GRIS_MEDIO, justifyContent: 'center', paddingHorizontal: 2, marginRight: 10 },
  switchPuntoRecurrente: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORES.BLANCO, alignSelf: 'flex-start' },
  switchPuntoActivoRecurrente: { alignSelf: 'flex-end', backgroundColor: COLORES.EXITO },
  textoRecurrente: { fontSize: 14, color: COLORES.TEXTO_OSCURO, marginLeft: 8 },

  // Config
  seccionConfig: { marginBottom: 16 },
  tituloSeccionConfig: { fontSize: 15, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 10 },
  rangoHoras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputRango: { flex: 1, alignItems: 'center' },
  labelRango: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginBottom: 4 },
  separadorRango: { fontSize: 16, color: COLORES.GRIS_OSCURO, marginHorizontal: 10 },
  opcionConfig: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  textoOpcionConfig: { fontSize: 14, color: COLORES.TEXTO_OSCURO },
  switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORES.GRIS_MEDIO, justifyContent: 'center', paddingHorizontal: 2 },
  switchActivo: { backgroundColor: COLORES.EXITO },
  switchPunto: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORES.BLANCO, alignSelf: 'flex-start' },
  switchPuntoActivo: { alignSelf: 'flex-end' },

  // Notificación
  notificacionContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    padding: 12,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  notificacionContenido: { flexDirection: 'row', alignItems: 'center' },
  notificacionTexto: { color: COLORES.BLANCO, fontSize: 14, flex: 1 },
});