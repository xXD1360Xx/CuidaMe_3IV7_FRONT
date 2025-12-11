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
import Icon from 'react-native-vector-icons/Ionicons';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  NARANJA: '#FF9800',
  ROSADO: '#F48FB1',
  TURQUESA: '#4DB6AC',
  INDIGO: '#7986CB',
  LIMA: '#D4E157'
};

const { width } = Dimensions.get('window');
const HORA_HEIGHT = 60; // Altura de cada hora
const DIA_WIDTH = (width - 60) / 7; // Ancho de cada día

export default function VistaHorario({ navigation }) {
  const [horario, setHorario] = useState([]);
  const [medicinas, setMedicinas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [actividadesFijas, setActividadesFijas] = useState([]);
  const [configuracion, setConfiguracion] = useState({
    horaInicio: 8, // 8:00 AM
    horaFin: 22, // 10:00 PM
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
  const [modalActividadVisible, setModalActividadVisible] = useState(false);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [semanaActual, setSemanaActual] = useState(new Date());
  
  // Estados para actividades
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [espacioSeleccionado, setEspacioSeleccionado] = useState({ dia: null, hora: null });
  
  // Nueva actividad
  const [nuevaActividad, setNuevaActividad] = useState({
    nombre: '',
    tipo: 'actividad_diaria',
    color: COLORES.AZUL_CIELO,
    dias: [], // Array con números 0-6 (0: Domingo, 1: Lunes, ...)
    hora_inicio: '08:00',
    hora_fin: '09:00',
    duracion_minutos: 60,
    descripcion: '',
    recordatorio: true,
    esRecurrente: true,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: null
  });

  // Actividades predefinidas
  const ACTIVIDADES_PREDEFINIDAS = [
    { id: 'banarse', nombre: 'Bañarse', color: COLORES.TURQUESA, icono: 'water-outline', duracion: 30 },
    { id: 'comer', nombre: 'Comer', color: COLORES.NARANJA, icono: 'restaurant-outline', duracion: 45 },
    { id: 'caminar', nombre: 'Caminar', color: COLORES.VERDE_CLARO, icono: 'walk-outline', duracion: 30 },
    { id: 'ejercicios', nombre: 'Ejercicios', color: COLORES.ROJO_CLARO, icono: 'fitness-outline', duracion: 30 },
    { id: 'descanso', nombre: 'Descanso', color: COLORES.MORADO, icono: 'bed-outline', duracion: 60 },
    { id: 'lectura', nombre: 'Lectura', color: COLORES.INDIGO, icono: 'book-outline', duracion: 45 },
    { id: 'visita', nombre: 'Visita Familiar', color: COLORES.ROSADO, icono: 'people-outline', duracion: 60 },
    { id: 'medicina', nombre: 'Tomar Medicina', color: COLORES.EXITO, icono: 'medical-outline', duracion: 15 }
  ];

  // Tipos de actividades
  const TIPOS_ACTIVIDADES = [
    { id: 'actividad_diaria', nombre: 'Actividad Diaria', icono: 'calendar-outline' },
    { id: 'medicina', nombre: 'Medicina', icono: 'medical-outline' },
    { id: 'cita_medica', nombre: 'Cita Médica', icono: 'medkit-outline' },
    { id: 'evento', nombre: 'Evento', icono: 'calendar-outline' },
    { id: 'terapia', nombre: 'Terapia', icono: 'fitness-outline' },
    { id: 'recreacion', nombre: 'Recreación', icono: 'game-controller-outline' },
    { id: 'personal', nombre: 'Cuidado Personal', icono: 'person-outline' }
  ];

  // Días de la semana
  const DIAS_SEMANA = [
    { id: 0, nombre: 'Domingo', corto: 'Dom' },
    { id: 1, nombre: 'Lunes', corto: 'Lun' },
    { id: 2, nombre: 'Martes', corto: 'Mar' },
    { id: 3, nombre: 'Miércoles', corto: 'Mié' },
    { id: 4, nombre: 'Jueves', corto: 'Jue' },
    { id: 5, nombre: 'Viernes', corto: 'Vie' },
    { id: 6, nombre: 'Sábado', corto: 'Sáb' }
  ];

  // Cargar datos iniciales
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      
      // Obtener usuario actual
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioRol(usuario.rol);
      }
      
      // Cargar configuración
      await cargarConfiguracion();
      
      // Cargar medicinas
      await cargarMedicinas();
      
      // Cargar eventos de la semana
      await cargarEventosSemana();
      
      // Cargar actividades fijas
      await cargarActividadesFijas();
      
      // Generar horario
      generarHorario();
      
    } catch (error) {
      console.error('Error cargando datos del horario:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del horario');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [semanaActual, configuracion]);

  // Cargar configuración
  const cargarConfiguracion = async () => {
    try {
      const response = await servicioAPI.obtenerConfiguracionHorario();
      if (response.exito) {
        setConfiguracion(response.configuracion || configuracion);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  // Cargar medicinas
  const cargarMedicinas = async () => {
    try {
      const response = await servicioAPI.obtenerMedicinas();
      if (response.exito) {
        setMedicinas(response.medicinas || []);
      }
    } catch (error) {
      console.error('Error cargando medicinas:', error);
    }
  };

  // Cargar eventos de la semana
  const cargarEventosSemana = async () => {
    try {
      const inicioSemana = obtenerInicioSemana(semanaActual);
      const finSemana = obtenerFinSemana(semanaActual);
      
      const response = await servicioAPI.obtenerEventosPorRango(
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

  // Cargar actividades fijas
  const cargarActividadesFijas = async () => {
    try {
      const response = await servicioAPI.obtenerActividadesFijas();
      if (response.exito) {
        setActividadesFijas(response.actividades || []);
      }
    } catch (error) {
      console.error('Error cargando actividades fijas:', error);
    }
  };

  // Generar horario combinado
  const generarHorario = () => {
    const inicio = configuracion.horaInicio;
    const fin = configuracion.horaFin;
    const dias = DIAS_SEMANA;
    
    let horarioGenerado = [];
    
    // Crear matriz de horas x días
    for (let hora = inicio; hora <= fin; hora++) {
      const filaHoras = {
        hora: hora,
        label: formatearHora(hora),
        dias: {}
      };
      
      dias.forEach(dia => {
        filaHoras.dias[dia.id] = {
          dia: dia.id,
          hora: hora,
          actividades: []
        };
      });
      
      horarioGenerado.push(filaHoras);
    }
    
    // Agregar medicinas al horario
    if (configuracion.mostrarMedicinas) {
      medicinas.forEach(medicina => {
        const horaMedicina = parseInt(medicina.hora.split(':')[0]);
        const minutos = parseInt(medicina.hora.split(':')[1]);
        
        // Convertir a posición decimal
        const posicionHora = horaMedicina + (minutos / 60);
        
        if (posicionHora >= inicio && posicionHora <= fin) {
          // Encontrar el bloque de hora correspondiente
          const bloqueHora = horarioGenerado.find(bloque => bloque.hora === horaMedicina);
          
          if (bloqueHora) {
            // Aplicar a todos los días si es diaria
            const diasAplicar = medicina.frecuencia === 'diaria' ? 
              DIAS_SEMANA.map(d => d.id) : 
              obtenerDiasFrecuencia(medicina.frecuencia);
            
            diasAplicar.forEach(diaId => {
              if (bloqueHora.dias[diaId]) {
                bloqueHora.dias[diaId].actividades.push({
                  id: `medicina_${medicina.id}_${diaId}`,
                  tipo: 'medicina',
                  nombre: medicina.nombre,
                  color: COLORES.EXITO,
                  hora_inicio: medicina.hora,
                  hora_fin: sumarMinutos(medicina.hora, 15),
                  duracion_minutos: 15,
                  descripcion: `Tomar ${medicina.dosis}`,
                  esMedicina: true,
                  datos: medicina
                });
              }
            });
          }
        }
      });
    }
    
    // Agregar actividades fijas
    if (configuracion.mostrarActividades) {
      actividadesFijas.forEach(actividad => {
        const horaInicio = parseInt(actividad.hora_inicio.split(':')[0]);
        const minutosInicio = parseInt(actividad.hora_inicio.split(':')[1]);
        const horaFin = parseInt(actividad.hora_fin.split(':')[0]);
        const minutosFin = parseInt(actividad.hora_fin.split(':')[1]);
        
        const posicionInicio = horaInicio + (minutosInicio / 60);
        const posicionFin = horaFin + (minutosFin / 60);
        
        if (posicionInicio >= inicio && posicionFin <= fin) {
          // Calcular cuántos bloques ocupa
          const bloquesOcupa = Math.ceil((posicionFin - posicionInicio) * 4); // 4 bloques por hora (15 min cada uno)
          
          // Aplicar a los días especificados
          actividad.dias.forEach(diaId => {
            for (let i = 0; i < bloquesOcupa; i++) {
              const bloqueHora = horaInicio + Math.floor(i / 4);
              const minutoOffset = (i % 4) * 15;
              
              const bloque = horarioGenerado.find(b => b.hora === bloqueHora);
              
              if (bloque && bloque.dias[diaId]) {
                // Solo agregar si es el primer bloque de la actividad
                if (i === 0) {
                  bloque.dias[diaId].actividades.push({
                    id: `actividad_${actividad.id}_${diaId}`,
                    tipo: 'actividad_diaria',
                    nombre: actividad.nombre,
                    color: actividad.color,
                    hora_inicio: actividad.hora_inicio,
                    hora_fin: actividad.hora_fin,
                    duracion_minutos: actividad.duracion_minutos,
                    descripcion: actividad.descripcion,
                    esRecurrente: actividad.esRecurrente,
                    alturaBloques: bloquesOcupa,
                    datos: actividad
                  });
                }
              }
            }
          });
        }
      });
    }
    
    // Agregar eventos del calendario
    if (configuracion.mostrarEventos) {
      eventos.forEach(evento => {
        const fechaEvento = new Date(evento.fecha_inicio);
        const diaSemana = fechaEvento.getDay(); // 0-6
        
        if (fechaEvento >= obtenerInicioSemana(semanaActual) && 
            fechaEvento <= obtenerFinSemana(semanaActual)) {
          
          const horaInicio = evento.hora_inicio ? 
            parseInt(evento.hora_inicio.split(':')[0]) : 9;
          const minutosInicio = evento.hora_inicio ? 
            parseInt(evento.hora_inicio.split(':')[1]) : 0;
          const duracionHoras = evento.duracion_horas || 1;
          
          const posicionInicio = horaInicio + (minutosInicio / 60);
          
          if (posicionInicio >= inicio && posicionInicio + duracionHoras <= fin) {
            const bloqueHora = horaInicio;
            const bloquesOcupa = Math.ceil(duracionHoras * 4); // 4 bloques por hora
            
            const bloque = horarioGenerado.find(b => b.hora === bloqueHora);
            
            if (bloque && bloque.dias[diaSemana]) {
              bloque.dias[diaSemana].actividades.push({
                id: `evento_${evento.id}`,
                tipo: 'evento',
                nombre: evento.titulo,
                color: evento.color_evento || COLORES.MORADO,
                hora_inicio: evento.hora_inicio || '09:00',
                hora_fin: sumarHoras(evento.hora_inicio || '09:00', duracionHoras),
                duracion_minutos: duracionHoras * 60,
                descripcion: evento.descripcion,
                ubicacion: evento.ubicacion,
                alturaBloques: bloquesOcupa,
                datos: evento
              });
            }
          }
        }
      });
    }
    
    setHorario(horarioGenerado);
  };

  // Obtener inicio de semana
  const obtenerInicioSemana = (fecha) => {
    const inicio = new Date(fecha);
    const diaSemana = inicio.getDay();
    inicio.setDate(inicio.getDate() - diaSemana); // Ir al domingo
    inicio.setHours(0, 0, 0, 0);
    return inicio;
  };

  // Obtener fin de semana
  const obtenerFinSemana = (fecha) => {
    const fin = new Date(fecha);
    const diaSemana = fin.getDay();
    fin.setDate(fin.getDate() + (6 - diaSemana)); // Ir al sábado
    fin.setHours(23, 59, 59, 999);
    return fin;
  };

  // Obtener días según frecuencia
  const obtenerDiasFrecuencia = (frecuencia) => {
    switch(frecuencia) {
      case 'lunes':
        return [1];
      case 'martes':
        return [2];
      case 'miercoles':
        return [3];
      case 'jueves':
        return [4];
      case 'viernes':
        return [5];
      case 'sabado':
        return [6];
      case 'domingo':
        return [0];
      case 'lunes_miercoles_viernes':
        return [1, 3, 5];
      case 'martes_jueves':
        return [2, 4];
      case 'fin_semana':
        return [0, 6];
      case 'laborables':
        return [1, 2, 3, 4, 5];
      default:
        return [1, 2, 3, 4, 5, 6, 0]; // Todos los días
    }
  };

  // Formatear hora
  const formatearHora = (hora) => {
    const ampm = hora >= 12 ? 'PM' : 'AM';
    const hora12 = hora % 12 || 12;
    return `${hora12}:00 ${ampm}`;
  };

  // Sumar minutos a una hora
  const sumarMinutos = (hora, minutos) => {
    const [h, m] = hora.split(':').map(Number);
    const totalMinutos = h * 60 + m + minutos;
    const nuevaHora = Math.floor(totalMinutos / 60);
    const nuevosMinutos = totalMinutos % 60;
    return `${nuevaHora.toString().padStart(2, '0')}:${nuevosMinutos.toString().padStart(2, '0')}`;
  };

  // Sumar horas a una hora
  const sumarHoras = (hora, horas) => {
    return sumarMinutos(hora, horas * 60);
  };

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [semanaActual, configuracion]);

  // Refrescar manualmente
  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatos();
  }, [cargando]);

  // Navegar entre semanas
  const cambiarSemana = (direccion) => {
    const nuevaFecha = new Date(semanaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
    setSemanaActual(nuevaFecha);
  };

  // Ir a esta semana
  const irAHoy = () => {
    setSemanaActual(new Date());
  };

  // Obtener fecha del día en la semana actual
  const obtenerFechaDelDia = (diaId) => {
    const fecha = obtenerInicioSemana(semanaActual);
    fecha.setDate(fecha.getDate() + diaId);
    return fecha;
  };

  // Seleccionar espacio en el horario
  const seleccionarEspacio = (dia, hora) => {
    setEspacioSeleccionado({ dia, hora });
    
    // Preparar nueva actividad con la hora seleccionada
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

  // Seleccionar actividad existente
  const seleccionarActividad = (actividad, dia, hora) => {
    setActividadSeleccionada(actividad);
    setEspacioSeleccionado({ dia, hora });
    
    setNuevaActividad({
      nombre: actividad.nombre,
      tipo: actividad.tipo,
      color: actividad.color,
      dias: actividad.esRecurrente ? obtenerDiasActividad(actividad) : [dia],
      hora_inicio: actividad.hora_inicio,
      hora_fin: actividad.hora_fin,
      duracion_minutos: actividad.duracion_minutos,
      descripcion: actividad.descripcion || '',
      recordatorio: true,
      esRecurrente: actividad.esRecurrente,
      fecha_inicio: actividad.fecha_inicio || new Date().toISOString().split('T')[0],
      fecha_fin: actividad.fecha_fin || null
    });
    
    setModalVisible(true);
  };

  // Obtener días de una actividad
  const obtenerDiasActividad = (actividad) => {
    if (actividad.datos && actividad.datos.dias) {
      return actividad.datos.dias;
    }
    
    // Intentar deducir de los datos
    if (actividad.esMedicina && actividad.datos) {
      return obtenerDiasFrecuencia(actividad.datos.frecuencia || 'diaria');
    }
    
    return [espacioSeleccionado.dia];
  };

  // Guardar actividad
  const guardarActividad = async () => {
    try {
      if (!nuevaActividad.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar un nombre para la actividad');
        return;
      }
      
      if (nuevaActividad.dias.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos un día');
        return;
      }
      
      const datosActividad = {
        ...nuevaActividad,
        duracion_minutos: parseInt(nuevaActividad.duracion_minutos) || 60
      };
      
      let response;
      if (actividadSeleccionada) {
        // Actualizar actividad existente
        response = await servicioAPI.actualizarActividad(actividadSeleccionada.id, datosActividad);
      } else {
        // Crear nueva actividad
        response = await servicioAPI.crearActividad(datosActividad);
      }
      
      if (response.exito) {
        Alert.alert('Éxito', actividadSeleccionada ? 'Actividad actualizada' : 'Actividad creada');
        setModalVisible(false);
        setActividadSeleccionada(null);
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'No se pudo guardar la actividad');
      }
      
    } catch (error) {
      console.error('Error guardando actividad:', error);
      Alert.alert('Error', 'No se pudo guardar la actividad');
    }
  };

  // Eliminar actividad
  const eliminarActividad = () => {
    if (!actividadSeleccionada) return;
    
    Alert.alert(
      'Eliminar Actividad',
      '¿Estás seguro de que quieres eliminar esta actividad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarActividad(actividadSeleccionada.id);
              if (response.exito) {
                Alert.alert('Éxito', 'Actividad eliminada');
                setModalVisible(false);
                setActividadSeleccionada(null);
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la actividad');
            }
          }
        }
      ]
    );
  };

  // Aplicar actividad predefinida
  const aplicarActividadPredefinida = (actividadPredefinida) => {
    const fecha = obtenerFechaDelDia(espacioSeleccionado.dia);
    
    setNuevaActividad({
      nombre: actividadPredefinida.nombre,
      tipo: 'actividad_diaria',
      color: actividadPredefinida.color,
      dias: [espacioSeleccionado.dia],
      hora_inicio: nuevaActividad.hora_inicio,
      hora_fin: sumarMinutos(nuevaActividad.hora_inicio, actividadPredefinida.duracion),
      duracion_minutos: actividadPredefinida.duracion,
      descripcion: actividadPredefinida.nombre,
      recordatorio: true,
      esRecurrente: false,
      fecha_inicio: fecha.toISOString().split('T')[0],
      fecha_fin: null
    });
  };

  // Guardar configuración
  const guardarConfiguracion = async () => {
    try {
      const response = await servicioAPI.guardarConfiguracionHorario(configuracion);
      if (response.exito) {
        Alert.alert('Éxito', 'Configuración guardada');
        setModalConfigVisible(false);
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  // Calcular posición y altura de una actividad
  const calcularEstiloActividad = (actividad, hora) => {
    const [horaInicio, minutoInicio] = actividad.hora_inicio.split(':').map(Number);
    const horaDecimalInicio = horaInicio + (minutoInicio / 60);
    
    const top = (horaDecimalInicio - hora) * HORA_HEIGHT;
    const altura = (actividad.duracion_minutos / 60) * HORA_HEIGHT;
    
    return {
      top: top,
      height: altura,
      backgroundColor: actividad.color
    };
  };

  // Verificar si es fin de semana
  const esFinDeSemana = (diaId) => {
    return diaId === 0 || diaId === 6; // Domingo (0) o Sábado (6)
  };

  // Renderizar actividad
  const renderActividad = (actividad, diaId, hora) => {
    const estilo = calcularEstiloActividad(actividad, hora);
    
    return (
      <TouchableOpacity
        key={actividad.id}
        style={[styles.actividad, estilo]}
        onPress={() => seleccionarActividad(actividad, diaId, hora)}
        activeOpacity={0.7}
      >
        <Text style={styles.nombreActividad} numberOfLines={1}>
          {actividad.nombre}
        </Text>
        <Text style={styles.horaActividad} numberOfLines={1}>
          {actividad.hora_inicio} - {actividad.hora_fin}
        </Text>
      </TouchableOpacity>
    );
  };

  // Renderizar celda del horario
  const renderCeldaHorario = (diaId, hora) => {
    const dia = DIAS_SEMANA.find(d => d.id === diaId);
    const fecha = obtenerFechaDelDia(diaId);
    const esFin = esFinDeSemana(diaId);
    
    const actividadesEnEstaHora = [];
    
    // Buscar actividades que comienzan en esta hora
    const bloqueHora = horario.find(b => b.hora === hora);
    if (bloqueHora && bloqueHora.dias[diaId]) {
      actividadesEnEstaHora.push(...bloqueHora.dias[diaId].actividades);
    }
    
    // También buscar actividades que comenzaron antes pero siguen en esta hora
    const actividadesEnCurso = actividadesEnEstaHora.filter(a => {
      const [horaInicio] = a.hora_inicio.split(':').map(Number);
      return horaInicio < hora;
    });
    
    return (
      <TouchableOpacity
        style={[
          styles.celdaHorario,
          esFin && styles.celdaFinDeSemana
        ]}
        onPress={() => seleccionarEspacio(diaId, hora)}
        activeOpacity={0.7}
      >
        {actividadesEnEstaHora.filter(a => {
          const [horaInicio] = a.hora_inicio.split(':').map(Number);
          return horaInicio === hora;
        }).map(actividad => renderActividad(actividad, diaId, hora))}
      </TouchableOpacity>
    );
  };

  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando horario...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const fechaInicioSemana = obtenerInicioSemana(semanaActual);
  const fechaFinSemana = obtenerFinSemana(semanaActual);
  const esAdministrador = usuarioRol === 'familiar_administrador';

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          
          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Horario Semanal</Text>
            <Text style={styles.subtituloPrincipal}>
              {fechaInicioSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - 
              {fechaFinSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.botonRefrescar} onPress={onRefresh} disabled={refrescando}>
            <Icon 
              name="refresh-outline" 
              size={24} 
              color={refrescando ? COLORES.GRIS_OSCURO : COLORES.TEXTO_OSCURO} 
            />
          </TouchableOpacity>
        </View>

        {/* Controles de navegación */}
        <View style={styles.controlesNavegacion}>
          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarSemana(-1)}>
            <Icon name="chevron-back-outline" size={24} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.botonHoy} onPress={irAHoy}>
            <Text style={styles.textoBotonHoy}>SEMANA ACTUAL</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.botonControl} onPress={() => cambiarSemana(1)}>
            <Icon name="chevron-forward-outline" size={24} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* Leyenda de colores */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leyendaContainer}>
          {ACTIVIDADES_PREDEFINIDAS.map(actividad => (
            <TouchableOpacity
              key={actividad.id}
              style={[styles.itemLeyenda, { backgroundColor: actividad.color + '40' }]}
              onPress={() => setModalActividadVisible(true)}
            >
              <Icon name={actividad.icono} size={14} color={actividad.color} />
              <Text style={[styles.textoLeyenda, { color: actividad.color }]}>
                {actividad.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Horario principal */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horarioContainer}
        >
          {/* Columna de horas */}
          <View style={styles.columnaHoras}>
            {horario.map((fila, index) => (
              <View key={index} style={styles.celdaHora}>
                <Text style={styles.textoHora}>{fila.label}</Text>
              </View>
            ))}
          </View>
          
          {/* Grid de días */}
          <View style={styles.gridDias}>
            {/* Encabezados de días */}
            <View style={styles.encabezadosDias}>
              {DIAS_SEMANA.map(dia => {
                const fecha = obtenerFechaDelDia(dia.id);
                const esFin = esFinDeSemana(dia.id);
                
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
            
            {/* Celdas del horario */}
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

        {/* Barra de acciones */}
        <View style={styles.barraAcciones}>
          <TouchableOpacity 
            style={styles.botonAccionPrincipal}
            onPress={() => {
              const ahora = new Date();
              const horaActual = ahora.getHours();
              const diaActual = ahora.getDay();
              
              if (horaActual >= configuracion.horaInicio && horaActual <= configuracion.horaFin) {
                seleccionarEspacio(diaActual, horaActual);
              } else {
                Alert.alert(
                  'Hora fuera de rango',
                  'La hora actual está fuera del horario configurado. Usa el botón de configuración para ajustar los horarios.',
                  [{ text: 'Entendido' }]
                );
              }
            }}
          >
            <Icon name="add-outline" size={20} color={COLORES.BLANCO} />
            <Text style={styles.textoBotonAccionPrincipal}>Agregar Actividad</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.botonAccionSecundario}
            onPress={() => setModalConfigVisible(true)}
          >
            <Icon name="settings-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* Estadísticas */}
        <View style={styles.estadisticasContainer}>
          <View style={styles.itemEstadistica}>
            <Icon name="medical-outline" size={20} color={COLORES.EXITO} />
            <Text style={styles.numeroEstadistica}>
              {medicinas.filter(m => m.frecuencia === 'diaria').length}
            </Text>
            <Text style={styles.textoEstadistica}>Medicinas diarias</Text>
          </View>
          
          <View style={styles.separadorEstadistica} />
          
          <View style={styles.itemEstadistica}>
            <Icon name="calendar-outline" size={20} color={COLORES.MORADO} />
            <Text style={styles.numeroEstadistica}>{actividadesFijas.length}</Text>
            <Text style={styles.textoEstadistica}>Actividades fijas</Text>
          </View>
          
          <View style={styles.separadorEstadistica} />
          
          <View style={styles.itemEstadistica}>
            <Icon name="time-outline" size={20} color={COLORES.NARANJA} />
            <Text style={styles.numeroEstadistica}>{eventos.length}</Text>
            <Text style={styles.textoEstadistica}>Eventos esta semana</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Modal para actividad */}
      <Modal
        animationType="slide"
        transparent={true}
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
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setActividadSeleccionada(null);
              }}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <Text style={styles.modalLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={nuevaActividad.nombre}
                onChangeText={(text) => setNuevaActividad({...nuevaActividad, nombre: text})}
                placeholder="Ej: Bañarse, Tomar medicina, Caminar..."
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Actividades Predefinidas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actividadesPredefinidas}>
                {ACTIVIDADES_PREDEFINIDAS.map(actividad => (
                  <TouchableOpacity
                    key={actividad.id}
                    style={[
                      styles.opcionPredefinida,
                      { backgroundColor: actividad.color + '20', borderColor: actividad.color }
                    ]}
                    onPress={() => aplicarActividadPredefinida(actividad)}
                  >
                    <Icon name={actividad.icono} size={20} color={actividad.color} />
                    <Text style={[styles.textoOpcionPredefinida, { color: actividad.color }]}>
                      {actividad.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Tipo</Text>
              <View style={styles.tiposContainer}>
                {TIPOS_ACTIVIDADES.map(tipo => (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[
                      styles.opcionTipo,
                      nuevaActividad.tipo === tipo.id && { backgroundColor: COLORES.AZUL_CIELO }
                    ]}
                    onPress={() => setNuevaActividad({...nuevaActividad, tipo: tipo.id})}
                  >
                    <Icon 
                      name={tipo.icono} 
                      size={16} 
                      color={nuevaActividad.tipo === tipo.id ? COLORES.BLANCO : COLORES.GRIS_OSCURO} 
                    />
                    <Text style={[
                      styles.textoOpcionTipo,
                      nuevaActividad.tipo === tipo.id && styles.textoOpcionTipoSeleccionado
                    ]}>
                      {tipo.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Color</Text>
              <View style={styles.coloresContainer}>
                {[
                  COLORES.AZUL_CIELO, COLORES.EXITO, COLORES.AMARILLO_PLATANO,
                  COLORES.MORADO, COLORES.NARANJA, COLORES.ROSADO,
                  COLORES.TURQUESA, COLORES.INDIGO, COLORES.LIMA
                ].map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.opcionColor,
                      { backgroundColor: color },
                      nuevaActividad.color === color && styles.opcionColorSeleccionada
                    ]}
                    onPress={() => setNuevaActividad({...nuevaActividad, color})}
                  />
                ))}
              </View>

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
                      const nuevosDias = [...nuevaActividad.dias];
                      const index = nuevosDias.indexOf(dia.id);
                      
                      if (index === -1) {
                        nuevosDias.push(dia.id);
                      } else {
                        nuevosDias.splice(index, 1);
                      }
                      
                      setNuevaActividad({...nuevaActividad, dias: nuevosDias});
                    }}
                  >
                    <Text style={[
                      styles.textoOpcionDia,
                      nuevaActividad.dias.includes(dia.id) && styles.textoOpcionDiaSeleccionada
                    ]}>
                      {dia.corto}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Horario</Text>
              <View style={styles.horarioInputs}>
                <View style={styles.inputMitad}>
                  <Text style={styles.subLabel}>Inicio</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaActividad.hora_inicio}
                    onChangeText={(text) => setNuevaActividad({...nuevaActividad, hora_inicio: text})}
                    placeholder="08:00"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>
                
                <View style={styles.inputMitad}>
                  <Text style={styles.subLabel}>Fin</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaActividad.hora_fin}
                    onChangeText={(text) => setNuevaActividad({...nuevaActividad, hora_fin: text})}
                    placeholder="09:00"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>Duración (minutos)</Text>
              <TextInput
                style={styles.input}
                value={nuevaActividad.duracion_minutos?.toString()}
                onChangeText={(text) => setNuevaActividad({...nuevaActividad, duracion_minutos: text})}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Recurrente</Text>
              <View style={styles.opcionRecurrente}>
                <TouchableOpacity
                  style={styles.botonRecurrente}
                  onPress={() => setNuevaActividad({...nuevaActividad, esRecurrente: !nuevaActividad.esRecurrente})}
                >
                  <Icon 
                    name={nuevaActividad.esRecurrente ? "checkmark-circle" : "ellipse-outline"} 
                    size={24} 
                    color={nuevaActividad.esRecurrente ? COLORES.EXITO : COLORES.GRIS_MEDIO} 
                  />
                  <Text style={styles.textoRecurrente}>
                    {nuevaActividad.esRecurrente ? 'Sí, actividad recurrente' : 'No, solo para este día'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={nuevaActividad.descripcion}
                onChangeText={(text) => setNuevaActividad({...nuevaActividad, descripcion: text})}
                multiline
                numberOfLines={3}
                placeholder="Detalles adicionales..."
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <View style={styles.opcionRecordatorio}>
                <TouchableOpacity
                  style={styles.botonRecordatorio}
                  onPress={() => setNuevaActividad({...nuevaActividad, recordatorio: !nuevaActividad.recordatorio})}
                >
                  <Icon 
                    name={nuevaActividad.recordatorio ? "notifications" : "notifications-outline"} 
                    size={24} 
                    color={nuevaActividad.recordatorio ? COLORES.AMARILLO_PLATANO : COLORES.GRIS_MEDIO} 
                  />
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

      {/* Modal de configuración */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalConfigVisible}
        onRequestClose={() => setModalConfigVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Configuración del Horario</Text>
              <TouchableOpacity onPress={() => setModalConfigVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <View style={styles.seccionConfig}>
                <Text style={styles.tituloSeccionConfig}>Horas de visualización</Text>
                
                <View style={styles.rangoHoras}>
                  <View style={styles.inputRango}>
                    <Text style={styles.labelRango}>Hora de inicio</Text>
                    <TextInput
                      style={styles.input}
                      value={configuracion.horaInicio.toString()}
                      onChangeText={(text) => {
                        const valor = parseInt(text) || 8;
                        setConfiguracion({...configuracion, horaInicio: Math.max(0, Math.min(23, valor))});
                      }}
                      keyboardType="numeric"
                      placeholder="8"
                      placeholderTextColor={COLORES.GRIS_MEDIO}
                    />
                    <Text style={styles.textoAyuda}>AM</Text>
                  </View>
                  
                  <Text style={styles.separadorRango}>a</Text>
                  
                  <View style={styles.inputRango}>
                    <Text style={styles.labelRango}>Hora de fin</Text>
                    <TextInput
                      style={styles.input}
                      value={configuracion.horaFin.toString()}
                      onChangeText={(text) => {
                        const valor = parseInt(text) || 22;
                        setConfiguracion({...configuracion, horaFin: Math.max(0, Math.min(23, valor))});
                      }}
                      keyboardType="numeric"
                      placeholder="22"
                      placeholderTextColor={COLORES.GRIS_MEDIO}
                    />
                    <Text style={styles.textoAyuda}>PM</Text>
                  </View>
                </View>
              </View>

              <View style={styles.seccionConfig}>
                <Text style={styles.tituloSeccionConfig}>Rutina del adulto mayor</Text>
                
                <View style={styles.inputRutina}>
                  <Text style={styles.labelRutina}>Hora de despertar</Text>
                  <TextInput
                    style={styles.input}
                    value={configuracion.horaDespertar.toString()}
                    onChangeText={(text) => {
                      const valor = parseInt(text) || 7;
                      setConfiguracion({...configuracion, horaDespertar: Math.max(0, Math.min(23, valor))});
                    }}
                    keyboardType="numeric"
                    placeholder="7"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>
                
                <View style={styles.inputRutina}>
                  <Text style={styles.labelRutina}>Hora de dormir</Text>
                  <TextInput
                    style={styles.input}
                    value={configuracion.horaDormir.toString()}
                    onChangeText={(text) => {
                      const valor = parseInt(text) || 22;
                      setConfiguracion({...configuracion, horaDormir: Math.max(0, Math.min(23, valor))});
                    }}
                    keyboardType="numeric"
                    placeholder="22"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>
              </View>

              <View style={styles.seccionConfig}>
                <Text style={styles.tituloSeccionConfig}>Mostrar en horario</Text>
                
                <View style={styles.opcionConfig}>
                  <Text style={styles.textoOpcionConfig}>Medicinas</Text>
                  <TouchableOpacity
                    style={[
                      styles.switch,
                      configuracion.mostrarMedicinas && styles.switchActivo
                    ]}
                    onPress={() => setConfiguracion({...configuracion, mostrarMedicinas: !configuracion.mostrarMedicinas})}
                  >
                    <View style={[
                      styles.switchPunto,
                      configuracion.mostrarMedicinas && styles.switchPuntoActivo
                    ]} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.opcionConfig}>
                  <Text style={styles.textoOpcionConfig}>Eventos del calendario</Text>
                  <TouchableOpacity
                    style={[
                      styles.switch,
                      configuracion.mostrarEventos && styles.switchActivo
                    ]}
                    onPress={() => setConfiguracion({...configuracion, mostrarEventos: !configuracion.mostrarEventos})}
                  >
                    <View style={[
                      styles.switchPunto,
                      configuracion.mostrarEventos && styles.switchPuntoActivo
                    ]} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.opcionConfig}>
                  <Text style={styles.textoOpcionConfig}>Actividades fijas</Text>
                  <TouchableOpacity
                    style={[
                      styles.switch,
                      configuracion.mostrarActividades && styles.switchActivo
                    ]}
                    onPress={() => setConfiguracion({...configuracion, mostrarActividades: !configuracion.mostrarActividades})}
                  >
                    <View style={[
                      styles.switchPunto,
                      configuracion.mostrarActividades && styles.switchPuntoActivo
                    ]} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.opcionConfig}>
                  <Text style={styles.textoOpcionConfig}>Fines de semana</Text>
                  <TouchableOpacity
                    style={[
                      styles.switch,
                      configuracion.mostrarFines && styles.switchActivo
                    ]}
                    onPress={() => setConfiguracion({...configuracion, mostrarFines: !configuracion.mostrarFines})}
                  >
                    <View style={[
                      styles.switchPunto,
                      configuracion.mostrarFines && styles.switchPuntoActivo
                    ]} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity 
                style={styles.botonModalCancelar}
                onPress={() => setModalConfigVisible(false)}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                onPress={guardarConfiguracion}
              >
                <Text style={styles.textoBotonModalAccion}>Guardar</Text>
              </TouchableOpacity>
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
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginTop: 2,
  },
  botonRefrescar: {
    padding: 8,
  },
  
  // Controles de navegación
  controlesNavegacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORES.BLANCO,
  },
  botonControl: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  botonHoy: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORES.AMARILLO_PLATANO,
  },
  textoBotonHoy: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Leyenda
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
  textoLeyenda: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Contenedor del horario
  horarioContainer: {
    flex: 1,
    backgroundColor: COLORES.BLANCO,
  },
  
  // Columna de horas
  columnaHoras: {
    width: 60,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  celdaHora: {
    height: HORA_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_MEDIO,
  },
  textoHora: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    fontWeight: '600',
  },
  
  // Grid de días
  gridDias: {
    flex: 1,
  },
  encabezadosDias: {
    flexDirection: 'row',
    backgroundColor: COLORES.GRIS_CLARO,
  },
  encabezadoDia: {
    width: DIA_WIDTH,
    alignItems: 'center',
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderLeftColor: COLORES.GRIS_MEDIO,
  },
  encabezadoFinDeSemana: {
    backgroundColor: COLORES.AZUL_CIELO + '20',
  },
  textoEncabezadoDia: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  textoEncabezadoFinDeSemana: {
    color: COLORES.AZUL_CIELO_OSCURO,
  },
  textoFechaDia: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginTop: 4,
  },
  textoFechaFinDeSemana: {
    color: COLORES.AZUL_CIELO,
  },
  
  // Cuerpo del horario
  cuerpoHorario: {
    backgroundColor: COLORES.BLANCO,
  },
  filaHoraria: {
    flexDirection: 'row',
    height: HORA_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  contenedorCeldaDia: {
    width: DIA_WIDTH,
    borderLeftWidth: 1,
    borderLeftColor: COLORES.GRIS_CLARO,
  },
  
  // Celda del horario
  celdaHorario: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
    position: 'relative',
    minHeight: HORA_HEIGHT,
  },
  celdaFinDeSemana: {
    backgroundColor: COLORES.GRIS_CLARO + '80',
  },
  
  // Actividades
  actividad: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 6,
    padding: 6,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nombreActividad: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORES.BLANCO,
    marginBottom: 2,
  },
  horaActividad: {
    fontSize: 8,
    color: COLORES.BLANCO,
    opacity: 0.9,
  },
  
  // Barra de acciones
  barraAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORES.BLANCO,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  botonAccionPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 1,
    marginRight: 15,
    justifyContent: 'center',
  },
  textoBotonAccionPrincipal: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  botonAccionSecundario: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  
  // Estadísticas
  estadisticasContainer: {
    flexDirection: 'row',
    backgroundColor: COLORES.BLANCO,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  itemEstadistica: {
    flex: 1,
    alignItems: 'center',
  },
  numeroEstadistica: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginTop: 8,
    marginBottom: 4,
  },
  textoEstadistica: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
  },
  separadorEstadistica: {
    width: 1,
    backgroundColor: COLORES.GRIS_CLARO,
    marginHorizontal: 10,
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
    padding: 25,
    maxHeight: '90%',
  },
  modalEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    flex: 1,
  },
  modalFormulario: {
    maxHeight: 500,
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORES.TEXTO_OSCURO,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputMitad: {
    width: '48%',
  },
  subLabel: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 5,
  },
  
  // Actividades predefinidas
  actividadesPredefinidas: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  opcionPredefinida: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
  },
  textoOpcionPredefinida: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Tipos de actividades
  tiposContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  opcionTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textoOpcionTipo: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 6,
  },
  textoOpcionTipoSeleccionado: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },
  
  // Colores
  coloresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  opcionColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  opcionColorSeleccionada: {
    borderColor: COLORES.TEXTO_OSCURO,
    transform: [{ scale: 1.1 }],
  },
  
  // Días
  diasContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  opcionDia: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    alignItems: 'center',
  },
  opcionDiaSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionDia: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  textoOpcionDiaSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },
  
  // Horario inputs
  horarioInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  
  // Opciones recurrentes
  opcionRecurrente: {
    marginBottom: 15,
  },
  botonRecurrente: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  textoRecurrente: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
  },
  
  // Recordatorio
  opcionRecordatorio: {
    marginBottom: 15,
  },
  botonRecordatorio: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  textoRecordatorio: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
  },
  
  // Botones del modal
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  botonModalCancelar: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
  },
  textoBotonModalCancelar: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    fontWeight: '600',
  },
  botonModalAccion: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBotonModalAccion: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Configuración
  seccionConfig: {
    marginBottom: 25,
  },
  tituloSeccionConfig: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 15,
  },
  rangoHoras: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputRango: {
    flex: 1,
    alignItems: 'center',
  },
  labelRango: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 8,
  },
  separadorRango: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    marginHorizontal: 15,
  },
  textoAyuda: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginTop: 5,
    fontStyle: 'italic',
  },
  inputRutina: {
    marginBottom: 15,
  },
  labelRutina: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 8,
  },
  opcionConfig: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  textoOpcionConfig: {
    fontSize: 15,
    color: COLORES.TEXTO_OSCURO,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.GRIS_MEDIO,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActivo: {
    backgroundColor: COLORES.EXITO,
  },
  switchPunto: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORES.BLANCO,
    alignSelf: 'flex-start',
  },
  switchPuntoActivo: {
    alignSelf: 'flex-end',
  },
});