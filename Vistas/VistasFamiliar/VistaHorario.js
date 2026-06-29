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
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  LIMA: '#D4E157'
};

const { width } = Dimensions.get('window');
const HORA_HEIGHT = 60;
const DIA_WIDTH = (width - 60) / 7;

export default function VistaHorario({ navigation }) {
  // ========== ESTADOS ==========
  const [usuarioId, setUsuarioId] = useState(null);
  const [horario, setHorario] = useState([]);
  const [medicinas, setMedicinas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [actividadesFijas, setActividadesFijas] = useState([]);

  // Configuración con valores POR DEFECTO y BLINDADA
  const [configuracion, setConfiguracion] = useState({
    horaInicio: 8,
    horaFin: 22,
    horaDespertar: 7,
    horaDormir: 22,
    mostrarFines: true,
    mostrarMedicinas: true,
    mostrarEventos: true,
    mostrarActividades: true
  });

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [semanaActual, setSemanaActual] = useState(new Date());

  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [espacioSeleccionado, setEspacioSeleccionado] = useState({ dia: null, hora: null });

  const [nuevaActividad, setNuevaActividad] = useState({
    nombre: '',
    tipo: 'actividad_diaria',
    color: COLORES.AZUL_CIELO,
    dias: [],
    hora_inicio: '08:00',
    hora_fin: '09:00',
    duracion_minutos: 60,
    descripcion: '',
    recordatorio: true,
    esRecurrente: true,
    fecha_inicio: '',
    fecha_fin: null
  });

  const ACTIVIDADES_PREDEFINIDAS = [
    { id: 'banarse', nombre: 'Bañarse', color: COLORES.TURQUESA, emoji: '🚿', duracion: 30 },
    { id: 'comer', nombre: 'Comer', color: COLORES.NARANJA, emoji: '🍽️', duracion: 45 },
    { id: 'caminar', nombre: 'Caminar', color: COLORES.VERDE_CLARO, emoji: '🚶', duracion: 30 },
    { id: 'ejercicios', nombre: 'Ejercicios', color: COLORES.ROJO_CLARO, emoji: '💪', duracion: 30 },
    { id: 'descanso', nombre: 'Descanso', color: COLORES.MORADO, emoji: '🛌', duracion: 60 },
    { id: 'lectura', nombre: 'Lectura', color: COLORES.INDIGO, emoji: '📚', duracion: 45 },
    { id: 'visita', nombre: 'Visita Familiar', color: COLORES.ROSADO, emoji: '👪', duracion: 60 },
    { id: 'medicina', nombre: 'Tomar Medicina', color: COLORES.EXITO, emoji: '💊', duracion: 15 }
  ];

  const TIPOS_ACTIVIDADES = [
    { id: 'actividad_diaria', nombre: 'Actividad Diaria', emoji: '📅' },
    { id: 'medicina', nombre: 'Medicina', emoji: '💊' },
    { id: 'cita_medica', nombre: 'Cita Médica', emoji: '🩺' },
    { id: 'evento', nombre: 'Evento', emoji: '🎉' },
    { id: 'terapia', nombre: 'Terapia', emoji: '🧠' },
    { id: 'recreacion', nombre: 'Recreación', emoji: '🎮' },
    { id: 'personal', nombre: 'Cuidado Personal', emoji: '👤' }
  ];

  const DIAS_SEMANA = [
    { id: 0, nombre: 'Domingo', corto: 'Dom' },
    { id: 1, nombre: 'Lunes', corto: 'Lun' },
    { id: 2, nombre: 'Martes', corto: 'Mar' },
    { id: 3, nombre: 'Miércoles', corto: 'Mié' },
    { id: 4, nombre: 'Jueves', corto: 'Jue' },
    { id: 5, nombre: 'Viernes', corto: 'Vie' },
    { id: 6, nombre: 'Sábado', corto: 'Sáb' }
  ];

  // ========== CARGA INICIAL ÚNICA ==========
  useEffect(() => {
    const init = async () => {
      try {
        const id = await servicioAPI.obtenerUsuarioActualId();
        setUsuarioId(id);
        if (id) {
          await cargarDatosIniciales(id);
        } else {
          Alert.alert('Error', 'No se pudo identificar al usuario');
          setCargando(false);
        }
      } catch (error) {
        console.error('Error en init:', error);
        setCargando(false);
      }
    };
    init();
  }, []);

  // ========== FUNCIONES DE CARGA ==========
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
      await cargarActividadesFijas(id);
      generarHorario();
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del horario');
    } finally {
      setCargando(false);
    }
  };

  const cargarConfiguracion = async (id) => {
    try {
      const response = await servicioAPI.obtenerConfiguracionHorario(id);
      if (response.exito && response.configuracion) {
        setConfiguracion(prev => ({
          ...prev,
          ...response.configuracion
        }));
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const cargarMedicinas = async (id) => {
    try {
      const response = await servicioAPI.obtenerMedicinasHoy(id);
      if (response.exito) {
        setMedicinas(response.medicinas || []);
      }
    } catch (error) {
      console.error('Error cargando medicinas:', error);
    }
  };

  const cargarEventosSemana = async (id) => {
    try {
      const inicioSemana = obtenerInicioSemana(semanaActual);
      const finSemana = obtenerFinSemana(semanaActual);
      const response = await servicioAPI.obtenerEventosPorRango(
        id,
        inicioSemana.toISOString().split('T')[0],
        finSemana.toISOString().split('T')[0]
      );
      if (response.exito) {
        setEventos(response.eventos || []);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  };

  const cargarActividadesFijas = async (id) => {
    try {
      const response = await servicioAPI.obtenerActividadesFijas(id);
      if (response.exito) {
        setActividadesFijas(response.actividades || []);
      }
    } catch (error) {
      console.error('Error cargando actividades fijas:', error);
    }
  };

  // ========== RECARGA MANUAL ==========
  const recargarSemana = async () => {
    if (!usuarioId) return;
    setRefrescando(true);
    await cargarEventosSemana(usuarioId);
    await cargarActividadesFijas(usuarioId);
    generarHorario();
    setRefrescando(false);
  };

  // ========== GENERAR HORARIO ==========
  const generarHorario = () => {
    const inicio = configuracion.horaInicio || 8;
    const fin = configuracion.horaFin || 22;
    const horarioGenerado = [];

    for (let hora = inicio; hora <= fin; hora++) {
      const fila = { hora, label: formatearHora(hora), dias: {} };
      DIAS_SEMANA.forEach(dia => {
        fila.dias[dia.id] = { dia: dia.id, hora, actividades: [] };
      });
      horarioGenerado.push(fila);
    }

    // ---- Medicinas ----
    if (configuracion.mostrarMedicinas !== false) {
      medicinas.forEach(med => {
        if (!med.hora) return;
        const [horaMed, minMed] = med.hora.split(':').map(Number);
        if (isNaN(horaMed) || isNaN(minMed)) return;
        const pos = horaMed + (minMed / 60);
        if (pos >= inicio && pos <= fin) {
          const bloque = horarioGenerado.find(b => b.hora === horaMed);
          if (bloque) {
            const diasAplicar = med.frecuencia === 'diaria'
              ? DIAS_SEMANA.map(d => d.id)
              : obtenerDiasFrecuencia(med.frecuencia);
            diasAplicar.forEach(diaId => {
              if (bloque.dias[diaId]) {
                bloque.dias[diaId].actividades.push({
                  id: `medicina_${med.id}_${diaId}`,
                  tipo: 'medicina',
                  nombre: med.nombre || 'Medicina',
                  color: COLORES.EXITO,
                  hora_inicio: med.hora,
                  hora_fin: sumarMinutos(med.hora, 15),
                  duracion_minutos: 15,
                  descripcion: `Tomar ${med.dosis || ''}`,
                  esMedicina: true,
                  datos: med
                });
              }
            });
          }
        }
      });
    }

    // ---- Actividades fijas ----
    if (configuracion.mostrarActividades !== false) {
      actividadesFijas.forEach(act => {
        if (!act.hora_inicio || !act.hora_fin) return;
        const [hIni, mIni] = act.hora_inicio.split(':').map(Number);
        const [hFin, mFin] = act.hora_fin.split(':').map(Number);
        if (isNaN(hIni) || isNaN(mIni) || isNaN(hFin) || isNaN(mFin)) return;
        const posIni = hIni + (mIni / 60);
        const posFin = hFin + (mFin / 60);
        if (posIni >= inicio && posFin <= fin) {
          const bloquesOcupa = Math.ceil((posFin - posIni) * 4);
          const dias = act.dias || [];
          dias.forEach(diaId => {
            for (let i = 0; i < bloquesOcupa; i++) {
              const bloqueHora = hIni + Math.floor(i / 4);
              const bloque = horarioGenerado.find(b => b.hora === bloqueHora);
              if (bloque && bloque.dias[diaId]) {
                if (i === 0) {
                  bloque.dias[diaId].actividades.push({
                    id: `actividad_${act.id}_${diaId}`,
                    tipo: 'actividad_diaria',
                    nombre: act.nombre || 'Actividad',
                    color: act.color || COLORES.AZUL_CIELO,
                    hora_inicio: act.hora_inicio,
                    hora_fin: act.hora_fin,
                    duracion_minutos: act.duracion_minutos || 60,
                    descripcion: act.descripcion || '',
                    esRecurrente: act.esRecurrente,
                    alturaBloques: bloquesOcupa,
                    datos: act
                  });
                }
              }
            }
          });
        }
      });
    }

    // ---- Eventos ----
    if (configuracion.mostrarEventos !== false) {
      eventos.forEach(ev => {
        if (!ev.fecha_inicio) return;
        const fechaEv = new Date(ev.fecha_inicio);
        const diaSemana = fechaEv.getDay();
        const inicioSemana = obtenerInicioSemana(semanaActual);
        const finSemana = obtenerFinSemana(semanaActual);
        if (fechaEv >= inicioSemana && fechaEv <= finSemana) {
          const hIni = ev.hora_inicio ? parseInt(ev.hora_inicio.split(':')[0]) : 9;
          const mIni = ev.hora_inicio ? parseInt(ev.hora_inicio.split(':')[1]) : 0;
          const duracionHoras = ev.duracion_horas || 1;
          const posIni = hIni + (mIni / 60);
          if (posIni >= inicio && posIni + duracionHoras <= fin) {
            const bloquesOcupa = Math.ceil(duracionHoras * 4);
            const bloque = horarioGenerado.find(b => b.hora === hIni);
            if (bloque && bloque.dias[diaSemana]) {
              bloque.dias[diaSemana].actividades.push({
                id: `evento_${ev.id}`,
                tipo: 'evento',
                nombre: ev.titulo || 'Evento',
                color: ev.color_evento || COLORES.MORADO,
                hora_inicio: ev.hora_inicio || '09:00',
                hora_fin: sumarHoras(ev.hora_inicio || '09:00', duracionHoras),
                duracion_minutos: duracionHoras * 60,
                descripcion: ev.descripcion || '',
                ubicacion: ev.ubicacion,
                alturaBloques: bloquesOcupa,
                datos: ev
              });
            }
          }
        }
      });
    }

    setHorario(horarioGenerado);
  };

  // ========== UTILIDADES ==========
  const obtenerInicioSemana = (fecha) => {
    const inicio = new Date(fecha);
    inicio.setDate(inicio.getDate() - inicio.getDay());
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  };

  const obtenerFinSemana = (fecha) => {
    const fin = new Date(fecha);
    fin.setDate(fin.getDate() + (6 - fin.getDay()));
    fin.setHours(23, 59, 59, 999);
    return fin;
  };

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
      laborables: [1, 2, 3, 4, 5]
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

  // ========== NAVEGACIÓN DE SEMANA ==========
  const cambiarSemana = (direccion) => {
    const nueva = new Date(semanaActual);
    nueva.setDate(nueva.getDate() + (direccion * 7));
    setSemanaActual(nueva);
    recargarSemana();
  };

  const irAHoy = () => {
    setSemanaActual(new Date());
    recargarSemana();
  };

  // ========== CONFIGURACIÓN ==========
  const guardarConfiguracion = async () => {
    try {
      const response = await servicioAPI.guardarConfiguracionHorario(usuarioId, configuracion);
      if (response.exito) {
        Alert.alert('Éxito', 'Configuración guardada');
        setModalConfigVisible(false);
        if (usuarioId) await cargarDatosIniciales(usuarioId);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  // ========== MODALES DE ACTIVIDAD ==========
  const seleccionarEspacio = (dia, hora) => {
    setEspacioSeleccionado({ dia, hora });
    const fecha = obtenerFechaDelDia(dia);
    setNuevaActividad({
      nombre: '',
      tipo: 'actividad_diaria',
      color: COLORES.AZUL_CIELO,
      dias: [dia],
      hora_inicio: `${hora.toString().padStart(2, '0')}:00`,
      hora_fin: sumarMinutos(`${hora.toString().padStart(2, '0')}:00`, 60),
      duracion_minutos: 60,
      descripcion: '',
      recordatorio: true,
      esRecurrente: false,
      fecha_inicio: fecha.toISOString().split('T')[0],
      fecha_fin: null
    });
    setModalVisible(true);
  };

  const seleccionarActividad = (actividad, dia, hora) => {
    setActividadSeleccionada(actividad);
    setEspacioSeleccionado({ dia, hora });
    setNuevaActividad({
      nombre: actividad.nombre || '',
      tipo: actividad.tipo || 'actividad_diaria',
      color: actividad.color || COLORES.AZUL_CIELO,
      dias: actividad.esRecurrente ? (actividad.datos?.dias || [dia]) : [dia],
      hora_inicio: actividad.hora_inicio || '08:00',
      hora_fin: actividad.hora_fin || '09:00',
      duracion_minutos: actividad.duracion_minutos || 60,
      descripcion: actividad.descripcion || '',
      recordatorio: true,
      esRecurrente: actividad.esRecurrente || false,
      fecha_inicio: actividad.datos?.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin: actividad.datos?.fecha_fin || null
    });
    setModalVisible(true);
  };

  const obtenerFechaDelDia = (diaId) => {
    const fecha = obtenerInicioSemana(semanaActual);
    fecha.setDate(fecha.getDate() + diaId);
    return fecha;
  };

  const aplicarActividadPredefinida = (actPredef) => {
    const fecha = obtenerFechaDelDia(espacioSeleccionado.dia);
    setNuevaActividad({
      ...nuevaActividad,
      nombre: actPredef.nombre,
      color: actPredef.color,
      duracion_minutos: actPredef.duracion,
      descripcion: actPredef.nombre,
      fecha_inicio: fecha.toISOString().split('T')[0]
    });
  };

  const guardarActividad = async () => {
    try {
      if (!nuevaActividad.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar un nombre');
        return;
      }
      if (nuevaActividad.dias.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos un día');
        return;
      }
      const datos = {
        ...nuevaActividad,
        duracion_minutos: parseInt(String(nuevaActividad.duracion_minutos)) || 60
      };
      let response;
      if (actividadSeleccionada) {
        response = await servicioAPI.actualizarActividad(usuarioId, actividadSeleccionada.id, datos);
      } else {
        response = await servicioAPI.crearActividad(usuarioId, datos);
      }
      if (response.exito) {
        Alert.alert('Éxito', actividadSeleccionada ? 'Actividad actualizada' : 'Actividad creada');
        setModalVisible(false);
        setActividadSeleccionada(null);
        await recargarSemana();
      } else {
        Alert.alert('Error', response.error || 'No se pudo guardar');
      }
    } catch (error) {
      console.error('Error guardando actividad:', error);
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const eliminarActividad = async () => {
    if (!actividadSeleccionada) return;
    Alert.alert(
      'Eliminar Actividad',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarActividad(usuarioId, actividadSeleccionada.id);
              if (response.exito) {
                Alert.alert('Éxito', 'Actividad eliminada');
                setModalVisible(false);
                setActividadSeleccionada(null);
                await recargarSemana();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  // ========== RENDER DE CELDAS ==========
  const renderCeldaHorario = (diaId, hora) => {
    const esFin = diaId === 0 || diaId === 6;
    const bloqueHora = horario.find(b => b.hora === hora);
    const actividades = bloqueHora?.dias[diaId]?.actividades || [];
    const actividadesEnEstaHora = actividades.filter(a => {
      const [h] = a.hora_inicio.split(':').map(Number);
      return h === hora;
    });

    return (
      <TouchableOpacity
        style={[styles.celdaHorario, esFin && styles.celdaFinDeSemana]}
        onPress={() => seleccionarEspacio(diaId, hora)}
        activeOpacity={0.7}
      >
        {actividadesEnEstaHora.map(act => {
          const estilo = calcularEstiloActividad(act, hora);
          return (
            <TouchableOpacity
              key={act.id}
              style={[styles.actividad, estilo]}
              onPress={() => seleccionarActividad(act, diaId, hora)}
            >
              <Text style={styles.nombreActividad} numberOfLines={1}>
                {act.nombre}
              </Text>
              <Text style={styles.horaActividad} numberOfLines={1}>
                {act.hora_inicio} - {act.hora_fin}
              </Text>
            </TouchableOpacity>
          );
        })}
      </TouchableOpacity>
    );
  };

  const calcularEstiloActividad = (act, hora) => {
    const [hIni, mIni] = act.hora_inicio.split(':').map(Number);
    const duracion = act.duracion_minutos || 60;
    const top = (hIni + (mIni / 60) - hora) * HORA_HEIGHT;
    const altura = (duracion / 60) * HORA_HEIGHT;
    return {
      top: Math.max(0, top),
      height: Math.max(10, altura),
      backgroundColor: act.color || COLORES.AZUL_CIELO
    };
  };

  // ========== RENDER PRINCIPAL ==========
  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando horario...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const fechaInicioSemana = obtenerInicioSemana(semanaActual);
  const fechaFinSemana = obtenerFinSemana(semanaActual);
  const esAdministrador = usuarioRol === 'familiar_administrador' || usuarioRol === 'familiar_admin';

  // ========== VALORES SEGUROS PARA CONFIGURACIÓN ==========
  const config = {
    horaInicio: configuracion?.horaInicio ?? 8,
    horaFin: configuracion?.horaFin ?? 22,
    horaDespertar: configuracion?.horaDespertar ?? 7,
    horaDormir: configuracion?.horaDormir ?? 22,
    mostrarFines: configuracion?.mostrarFines ?? true,
    mostrarMedicinas: configuracion?.mostrarMedicinas ?? true,
    mostrarEventos: configuracion?.mostrarEventos ?? true,
    mostrarActividades: configuracion?.mostrarActividades ?? true
  };

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* ===== ENCABEZADO ===== */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Horario Semanal</Text>
            <Text style={styles.subtituloPrincipal}>
              {fechaInicioSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} -{' '}
              {fechaFinSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <TouchableOpacity style={styles.botonRefrescar} onPress={recargarSemana} disabled={refrescando}>
            <Icon name="refresh-outline" size={24} color={refrescando ? COLORES.GRIS_OSCURO : COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* ===== CONTROLES DE NAVEGACIÓN ===== */}
        <View style={styles.controlesNavegacion}>
          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarSemana(-1)}>
            <Icon name="chevron-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonHoy} onPress={irAHoy}>
            <Text style={styles.textoBotonHoy}>SEMANA ACTUAL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarSemana(1)}>
            <Icon name="chevron-forward-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* ===== LEYENDA ===== */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leyendaContainer}>
          {ACTIVIDADES_PREDEFINIDAS.map(act => (
            <TouchableOpacity
              key={act.id}
              style={[styles.itemLeyenda, { backgroundColor: act.color + '40' }]}
              onPress={() => {
                if (esAdministrador) {
                  setModalVisible(true);
                } else {
                  Alert.alert('Acceso Restringido', 'Solo administradores pueden agregar actividades.');
                }
              }}
            >
              <Text style={{ fontSize: 14, marginRight: 4 }}>{act.emoji}</Text>
              <Text style={[styles.textoLeyenda, { color: act.color }]}>{act.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ===== HORARIO ===== */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horarioContainer}>
          <View style={styles.columnaHoras}>
            {horario.map((fila, idx) => (
              <View key={idx} style={styles.celdaHora}>
                <Text style={styles.textoHora}>{fila.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.gridDias}>
            <View style={styles.encabezadosDias}>
              {DIAS_SEMANA.map(dia => {
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
                  {DIAS_SEMANA.map(dia => (
                    <View key={dia.id} style={styles.contenedorCeldaDia}>
                      {renderCeldaHorario(dia.id, fila.hora)}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* ===== BARRA DE ACCIONES ===== */}
        <View style={styles.barraAcciones}>
          <TouchableOpacity
            style={styles.botonAccionPrincipal}
            onPress={() => {
              if (esAdministrador) {
                setModalVisible(true);
              } else {
                Alert.alert('Acceso Restringido', 'Solo administradores pueden agregar actividades.');
              }
            }}
          >
            <Icon name="add-outline" size={24} color={COLORES.BLANCO} />
            <Text style={styles.textoBotonAccionPrincipal}>Agregar Actividad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonAccionSecundario} onPress={() => setModalConfigVisible(true)}>
            <Icon name="settings-outline" size={24} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* ===== ESTADÍSTICAS ===== */}
        <View style={styles.estadisticasContainer}>
          <View style={styles.itemEstadistica}>
            <Icon name="medkit-outline" size={20} color={COLORES.EXITO} />
            <Text style={styles.numeroEstadistica}>
              {medicinas.filter(m => m.frecuencia === 'diaria').length}
            </Text>
            <Text style={styles.textoEstadistica}>Medicinas diarias</Text>
          </View>
          <View style={styles.separadorEstadistica} />
          <View style={styles.itemEstadistica}>
            <Icon name="calendar-outline" size={20} color={COLORES.NARANJA} />
            <Text style={styles.numeroEstadistica}>{actividadesFijas.length}</Text>
            <Text style={styles.textoEstadistica}>Actividades fijas</Text>
          </View>
          <View style={styles.separadorEstadistica} />
          <View style={styles.itemEstadistica}>
            <Icon name="time-outline" size={20} color={COLORES.MORADO} />
            <Text style={styles.numeroEstadistica}>{eventos.length}</Text>
            <Text style={styles.textoEstadistica}>Eventos esta semana</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ===== MODAL DE ACTIVIDAD ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setActividadSeleccionada(null);
        }}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>
                {actividadSeleccionada ? 'Editar Actividad' : 'Nueva Actividad'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setActividadSeleccionada(null);
                }}
              >
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              {/* Nombre */}
              <Text style={styles.modalLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={nuevaActividad.nombre}
                onChangeText={text => setNuevaActividad({ ...nuevaActividad, nombre: text })}
                placeholder="Ej: Bañarse"
              />

              {/* Predefinidas */}
              <Text style={styles.modalLabel}>Actividades Predefinidas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actividadesPredefinidas}>
                {ACTIVIDADES_PREDEFINIDAS.map(act => (
                  <TouchableOpacity
                    key={act.id}
                    style={[styles.opcionPredefinida, { backgroundColor: act.color + '20', borderColor: act.color }]}
                    onPress={() => aplicarActividadPredefinida(act)}
                  >
                    <Text style={[styles.textoOpcionPredefinida, { color: act.color }]}>
                      {act.emoji} {act.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Tipo */}
              <Text style={styles.modalLabel}>Tipo</Text>
              <View style={styles.tiposContainer}>
                {TIPOS_ACTIVIDADES.map(tipo => (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[
                      styles.opcionTipo,
                      nuevaActividad.tipo === tipo.id && { backgroundColor: COLORES.AZUL_CIELO }
                    ]}
                    onPress={() => setNuevaActividad({ ...nuevaActividad, tipo: tipo.id })}
                  >
                    <Text style={{ fontSize: 16, marginRight: 6 }}>{tipo.emoji}</Text>
                    <Text
                      style={[
                        styles.textoOpcionTipo,
                        nuevaActividad.tipo === tipo.id && styles.textoOpcionTipoSeleccionado
                      ]}
                    >
                      {tipo.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color */}
              <Text style={styles.modalLabel}>Color</Text>
              <View style={styles.coloresContainer}>
                {[
                  COLORES.AZUL_CIELO,
                  COLORES.EXITO,
                  COLORES.AMARILLO_PLATANO,
                  COLORES.MORADO,
                  COLORES.NARANJA,
                  COLORES.ROSADO,
                  COLORES.TURQUESA,
                  COLORES.INDIGO,
                  COLORES.LIMA
                ].map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.opcionColor,
                      { backgroundColor: color },
                      nuevaActividad.color === color && styles.opcionColorSeleccionada
                    ]}
                    onPress={() => setNuevaActividad({ ...nuevaActividad, color })}
                  />
                ))}
              </View>

              {/* Días */}
              <Text style={styles.modalLabel}>Días</Text>
              <View style={styles.diasContainer}>
                {DIAS_SEMANA.map(dia => (
                  <TouchableOpacity
                    key={dia.id}
                    style={[
                      styles.opcionDia,
                      nuevaActividad.dias.includes(dia.id) && styles.opcionDiaSeleccionada
                    ]}
                    onPress={() => {
                      const nuevos = [...nuevaActividad.dias];
                      const idx = nuevos.indexOf(dia.id);
                      idx === -1 ? nuevos.push(dia.id) : nuevos.splice(idx, 1);
                      setNuevaActividad({ ...nuevaActividad, dias: nuevos });
                    }}
                  >
                    <Text
                      style={[
                        styles.textoOpcionDia,
                        nuevaActividad.dias.includes(dia.id) && styles.textoOpcionDiaSeleccionada
                      ]}
                    >
                      {dia.corto}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Horario */}
              <View style={styles.horarioInputs}>
                <View style={styles.inputMitad}>
                  <Text style={styles.subLabel}>Inicio</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaActividad.hora_inicio}
                    onChangeText={text => setNuevaActividad({ ...nuevaActividad, hora_inicio: text })}
                  />
                </View>
                <View style={styles.inputMitad}>
                  <Text style={styles.subLabel}>Fin</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaActividad.hora_fin}
                    onChangeText={text => setNuevaActividad({ ...nuevaActividad, hora_fin: text })}
                  />
                </View>
              </View>

              {/* Duración */}
              <Text style={styles.modalLabel}>Duración (minutos)</Text>
              <TextInput
                style={styles.input}
                value={String(nuevaActividad.duracion_minutos ?? 60)}
                onChangeText={text => {
                  const num = parseInt(text);
                  setNuevaActividad({ ...nuevaActividad, duracion_minutos: isNaN(num) ? 0 : num });
                }}
                keyboardType="numeric"
                placeholder="60"
              />

              {/* Recurrente */}
              <View style={styles.opcionRecurrente}>
                <TouchableOpacity
                  style={styles.botonRecurrente}
                  onPress={() => setNuevaActividad({ ...nuevaActividad, esRecurrente: !nuevaActividad.esRecurrente })}
                >
                  <Text style={{ fontSize: 24, marginRight: 8 }}>
                    {nuevaActividad.esRecurrente ? '✅' : '⚪'}
                  </Text>
                  <Text style={styles.textoRecurrente}>
                    {nuevaActividad.esRecurrente ? 'Recurrente' : 'Solo este día'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Descripción */}
              <Text style={styles.modalLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={nuevaActividad.descripcion}
                onChangeText={text => setNuevaActividad({ ...nuevaActividad, descripcion: text })}
                multiline
                numberOfLines={3}
              />

              {/* Recordatorio */}
              <View style={styles.opcionRecordatorio}>
                <TouchableOpacity
                  style={styles.botonRecordatorio}
                  onPress={() => setNuevaActividad({ ...nuevaActividad, recordatorio: !nuevaActividad.recordatorio })}
                >
                  <Text style={{ fontSize: 24, marginRight: 8 }}>
                    {nuevaActividad.recordatorio ? '🔔' : '🔕'}
                  </Text>
                  <Text style={styles.textoRecordatorio}>
                    {nuevaActividad.recordatorio ? 'Con recordatorio' : 'Sin recordatorio'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalBotones}>
              {actividadSeleccionada && (
                <TouchableOpacity
                  style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]}
                  onPress={eliminarActividad}
                >
                  <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => {
                  setModalVisible(false);
                  setActividadSeleccionada(null);
                }}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                onPress={guardarActividad}
              >
                <Text style={styles.textoBotonModalAccion}>
                  {actividadSeleccionada ? 'Actualizar' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== MODAL DE CONFIGURACIÓN ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={modalConfigVisible}
        onRequestClose={() => setModalConfigVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Configuración</Text>
              <TouchableOpacity onPress={() => setModalConfigVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              {/* Horas de visualización */}
              <View style={styles.seccionConfig}>
                <Text style={styles.tituloSeccionConfig}>Horas de visualización</Text>
                <View style={styles.rangoHoras}>
                  <View style={styles.inputRango}>
                    <Text style={styles.labelRango}>Inicio</Text>
                    <TextInput
                      style={styles.input}
                      value={String(config.horaInicio)}
                      onChangeText={text => {
                        const num = parseInt(text);
                        setConfiguracion({
                          ...configuracion,
                          horaInicio: isNaN(num) ? 8 : Math.max(0, Math.min(23, num))
                        });
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.separadorRango}>a</Text>
                  <View style={styles.inputRango}>
                    <Text style={styles.labelRango}>Fin</Text>
                    <TextInput
                      style={styles.input}
                      value={String(config.horaFin)}
                      onChangeText={text => {
                        const num = parseInt(text);
                        setConfiguracion({
                          ...configuracion,
                          horaFin: isNaN(num) ? 22 : Math.max(0, Math.min(23, num))
                        });
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Mostrar */}
              <View style={styles.seccionConfig}>
                <Text style={styles.tituloSeccionConfig}>Mostrar</Text>
                {[
                  { key: 'mostrarMedicinas', label: 'Medicinas' },
                  { key: 'mostrarEventos', label: 'Eventos' },
                  { key: 'mostrarActividades', label: 'Actividades' },
                  { key: 'mostrarFines', label: 'Fines de semana' }
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
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  fondo: { flex: 1 },
  contenedor: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCargando: { color: COLORES.TEXTO_OSCURO, marginTop: 20, fontSize: 16 },

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
  botonAtras: { padding: 8 },
  tituloContainer: { flex: 1, alignItems: 'center' },
  tituloPrincipal: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  subtituloPrincipal: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  botonRefrescar: { padding: 8 },

  controlesNavegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  botonControl: { padding: 10, borderRadius: 20, backgroundColor: COLORES.GRIS_CLARO },
  botonHoy: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORES.AMARILLO_PLATANO },
  textoBotonHoy: { color: COLORES.TEXTO_OSCURO, fontSize: 14, fontWeight: 'bold' },

  leyendaContainer: {
    backgroundColor: COLORES.BLANCO,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
  },
  textoLeyenda: { fontSize: 12, fontWeight: '600', marginLeft: 6 },

  horarioContainer: { flex: 1, backgroundColor: COLORES.BLANCO },
  columnaHoras: { width: 60, backgroundColor: COLORES.GRIS_CLARO },
  celdaHora: { height: HORA_HEIGHT, justifyContent: 'flex-start', paddingTop: 8, paddingLeft: 8, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_MEDIO },
  textoHora: { fontSize: 12, color: COLORES.GRIS_OSCURO, fontWeight: '600' },

  gridDias: { flex: 1 },
  encabezadosDias: { flexDirection: 'row', backgroundColor: COLORES.GRIS_CLARO },
  encabezadoDia: { width: DIA_WIDTH, alignItems: 'center', paddingVertical: 10, borderLeftWidth: 1, borderLeftColor: COLORES.GRIS_MEDIO },
  encabezadoFinDeSemana: { backgroundColor: COLORES.AZUL_CIELO + '20' },
  textoEncabezadoDia: { fontSize: 14, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  textoEncabezadoFinDeSemana: { color: COLORES.AZUL_CIELO_OSCURO },
  textoFechaDia: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginTop: 4 },
  textoFechaFinDeSemana: { color: COLORES.AZUL_CIELO },

  cuerpoHorario: { backgroundColor: COLORES.BLANCO },
  filaHoraria: { flexDirection: 'row', height: HORA_HEIGHT, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  contenedorCeldaDia: { width: DIA_WIDTH, borderLeftWidth: 1, borderLeftColor: COLORES.GRIS_CLARO },
  celdaHorario: { flex: 1, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO, position: 'relative', minHeight: HORA_HEIGHT },
  celdaFinDeSemana: { backgroundColor: COLORES.GRIS_CLARO + '80' },

  actividad: { position: 'absolute', left: 2, right: 2, borderRadius: 6, padding: 6, zIndex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  nombreActividad: { fontSize: 10, fontWeight: 'bold', color: COLORES.BLANCO, marginBottom: 2 },
  horaActividad: { fontSize: 8, color: COLORES.BLANCO, opacity: 0.9 },

  barraAcciones: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: COLORES.BLANCO, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonAccionPrincipal: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.AZUL_CIELO_OSCURO, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, flex: 1, marginRight: 15, justifyContent: 'center' },
  textoBotonAccionPrincipal: { color: COLORES.BLANCO, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  botonAccionSecundario: { padding: 12, borderRadius: 25, backgroundColor: COLORES.GRIS_CLARO },

  estadisticasContainer: { flexDirection: 'row', backgroundColor: COLORES.BLANCO, padding: 20, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  itemEstadistica: { flex: 1, alignItems: 'center' },
  numeroEstadistica: { fontSize: 24, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginTop: 8, marginBottom: 4 },
  textoEstadistica: { fontSize: 12, color: COLORES.GRIS_OSCURO, textAlign: 'center' },
  separadorEstadistica: { width: 1, backgroundColor: COLORES.GRIS_CLARO, marginHorizontal: 10 },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '90%' },
  modalEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, flex: 1 },
  modalFormulario: { maxHeight: 500 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: COLORES.TEXTO_OSCURO, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  inputMitad: { width: '48%' },
  subLabel: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginBottom: 5 },

  actividadesPredefinidas: { flexDirection: 'row', marginBottom: 15 },
  opcionPredefinida: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 10, borderWidth: 1 },
  textoOpcionPredefinida: { fontSize: 12, fontWeight: '600', marginLeft: 6 },

  tiposContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  opcionTipo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  textoOpcionTipo: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginLeft: 6 },
  textoOpcionTipoSeleccionado: { color: COLORES.BLANCO, fontWeight: 'bold' },

  coloresContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  opcionColor: { width: 30, height: 30, borderRadius: 15, marginRight: 10, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  opcionColorSeleccionada: { borderColor: COLORES.TEXTO_OSCURO, transform: [{ scale: 1.1 }] },

  diasContainer: { flexDirection: 'row', marginBottom: 15 },
  opcionDia: { flex: 1, paddingVertical: 10, marginHorizontal: 2, borderRadius: 8, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, alignItems: 'center' },
  opcionDiaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoOpcionDia: { fontSize: 12, color: COLORES.GRIS_OSCURO },
  textoOpcionDiaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  horarioInputs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  opcionRecurrente: { marginBottom: 15 },
  botonRecurrente: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  textoRecurrente: { fontSize: 14, color: COLORES.TEXTO_OSCURO, marginLeft: 10 },

  opcionRecordatorio: { marginBottom: 15 },
  botonRecordatorio: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  textoRecordatorio: { fontSize: 14, color: COLORES.TEXTO_OSCURO, marginLeft: 10 },

  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonModalCancelar: { flex: 1, paddingVertical: 14, marginRight: 10, borderRadius: 10, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center' },
  textoBotonModalCancelar: { color: COLORES.TEXTO_OSCURO, fontSize: 16, fontWeight: '600' },
  botonModalAccion: { flex: 1, paddingVertical: 14, marginLeft: 10, borderRadius: 10, alignItems: 'center' },
  textoBotonModalAccion: { color: COLORES.BLANCO, fontSize: 16, fontWeight: '600' },

  seccionConfig: { marginBottom: 25 },
  tituloSeccionConfig: { fontSize: 16, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 15 },
  rangoHoras: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputRango: { flex: 1, alignItems: 'center' },
  labelRango: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginBottom: 8 },
  separadorRango: { fontSize: 16, color: COLORES.GRIS_OSCURO, marginHorizontal: 15 },
  opcionConfig: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  textoOpcionConfig: { fontSize: 15, color: COLORES.TEXTO_OSCURO },
  switch: { width: 50, height: 28, borderRadius: 14, backgroundColor: COLORES.GRIS_MEDIO, justifyContent: 'center', paddingHorizontal: 2 },
  switchActivo: { backgroundColor: COLORES.EXITO },
  switchPunto: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORES.BLANCO, alignSelf: 'flex-start' },
  switchPuntoActivo: { alignSelf: 'flex-end' },
});