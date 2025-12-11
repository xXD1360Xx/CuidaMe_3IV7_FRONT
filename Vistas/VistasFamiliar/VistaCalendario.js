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
  TURQUESA: '#4DB6AC'
};

const { width } = Dimensions.get('window');
const DIA_WIDTH = (width - 60) / 7;

export default function VistaCalendario({ navigation, route }) {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anoActual, setAnoActual] = useState(new Date().getFullYear());
  const [eventos, setEventos] = useState([]);
  const [familiares, setFamiliares] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEventoVisible, setModalEventoVisible] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [modoSeleccionMultiple, setModoSeleccionMultiple] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState('');
  
  // Estados para nuevo evento
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: '',
    tipo: 'cita_medica',
    color: COLORES.EXITO,
    fecha_inicio: '',
    fecha_fin: '',
    hora: '09:00',
    duracion: '1', // horas
    descripcion: '',
    familiar_id: null,
    recordatorio: true,
    ubicacion: ''
  });

  // Tipos de eventos predefinidos
  const tiposEventos = [
    { id: 'cita_medica', nombre: 'Cita Médica', color: COLORES.EXITO, icono: 'medical-outline' },
    { id: 'visita', nombre: 'Visita Familiar', color: COLORES.AZUL_CIELO, icono: 'people-outline' },
    { id: 'evento_social', nombre: 'Evento Social', color: COLORES.MORADO, icono: 'wine-outline' },
    { id: 'cuidado_familiar', nombre: 'Cuidado Familiar', color: COLORES.AMARILLO_PLATANO, icono: 'heart-outline' },
    { id: 'terapia', nombre: 'Terapia', color: COLORES.TURQUESA, icono: 'fitness-outline' },
    { id: 'vacaciones', nombre: 'Vacaciones', color: COLORES.NARANJA, icono: 'airplane-outline' },
    { id: 'reunion', nombre: 'Reunión', color: COLORES.ROSADO, icono: 'chatbubble-outline' },
    { id: 'otro', nombre: 'Otro', color: COLORES.GRIS_OSCURO, icono: 'ellipse-outline' }
  ];

  // Horas disponibles para eventos
  const horasDisponibles = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // Duraciones disponibles (horas)
  const duracionesDisponibles = ['0.5', '1', '1.5', '2', '2.5', '3', '4', '6', '8'];

  // Cargar datos iniciales
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      
      // Obtener usuario actual
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioRol(usuario.rol);
        
        // Cargar familiares
        const familiaresResponse = await servicioAPI.obtenerFamiliares();
        if (familiaresResponse.exito) {
          setFamiliares(familiaresResponse.familiares || []);
          
          // Asignar colores a los familiares si no los tienen
          const coloresFamiliares = [
            COLORES.AZUL_CIELO, COLORES.EXITO, COLORES.AMARILLO_PLATANO,
            COLORES.MORADO, COLORES.NARANJA, COLORES.ROSADO,
            COLORES.TURQUESA, COLORES.ROJO_CLARO
          ];
          
          const familiaresConColores = familiaresResponse.familiares.map((familiar, index) => ({
            ...familiar,
            color: familiar.color || coloresFamiliares[index % coloresFamiliares.length]
          }));
          
          setFamiliares(familiaresConColores);
        }
        
        // Cargar eventos del mes actual
        await cargarEventosMes();
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del calendario');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [mesActual, anoActual]);

  // Cargar eventos del mes
  const cargarEventosMes = async () => {
    try {
      const fechaInicio = new Date(anoActual, mesActual, 1);
      const fechaFin = new Date(anoActual, mesActual + 1, 0);
      
      const response = await servicioAPI.obtenerEventosPorRango(
        fechaInicio.toISOString().split('T')[0],
        fechaFin.toISOString().split('T')[0]
      );
      
      if (response.exito) {
        setEventos(response.eventos || []);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [mesActual, anoActual]);

  // Refrescar manualmente
  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatos();
  }, [cargando]);

  // Navegar entre meses
  const cambiarMes = (direccion) => {
    const nuevaFecha = new Date(anoActual, mesActual + direccion, 1);
    setMesActual(nuevaFecha.getMonth());
    setAnoActual(nuevaFecha.getFullYear());
    setFechaActual(nuevaFecha);
  };

  // Ir al mes actual
  const irAHoy = () => {
    const hoy = new Date();
    setMesActual(hoy.getMonth());
    setAnoActual(hoy.getFullYear());
    setFechaActual(hoy);
  };

  // Generar días del mes
  const generarDiasMes = () => {
    const primerDia = new Date(anoActual, mesActual, 1);
    const ultimoDia = new Date(anoActual, mesActual + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    
    const primerDiaSemana = primerDia.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    
    const dias = [];
    
    // Agregar días vacíos al principio si es necesario
    for (let i = 0; i < primerDiaSemana; i++) {
      dias.push({ dia: null, fecha: null });
    }
    
    // Agregar los días del mes
    for (let i = 1; i <= diasEnMes; i++) {
      const fecha = new Date(anoActual, mesActual, i);
      dias.push({ 
        dia: i, 
        fecha: fecha.toISOString().split('T')[0],
        esHoy: esHoy(fecha),
        eventos: obtenerEventosDia(fecha)
      });
    }
    
    return dias;
  };

  // Verificar si es hoy
  const esHoy = (fecha) => {
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear();
  };

  // Obtener eventos para un día específico
  const obtenerEventosDia = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    return eventos.filter(evento => {
      const fechaEvento = new Date(evento.fecha_inicio).toISOString().split('T')[0];
      const fechaFin = evento.fecha_fin ? 
        new Date(evento.fecha_fin).toISOString().split('T')[0] : 
        fechaEvento;
      
      return fechaStr >= fechaEvento && fechaStr <= fechaFin;
    });
  };

  // Obtener eventos para un día específico (por fecha string)
  const obtenerEventosParaFecha = (fechaStr) => {
    return eventos.filter(evento => {
      const fechaEvento = new Date(evento.fecha_inicio).toISOString().split('T')[0];
      const fechaFin = evento.fecha_fin ? 
        new Date(evento.fecha_fin).toISOString().split('T')[0] : 
        fechaEvento;
      
      return fechaStr >= fechaEvento && fechaStr <= fechaFin;
    });
  };

  // Seleccionar día
  const seleccionarDia = (dia, fecha) => {
    if (!fecha) return;
    
    if (modoSeleccionMultiple) {
      // Modo selección múltiple
      const fechaStr = fecha;
      const index = diasSeleccionados.indexOf(fechaStr);
      
      if (index === -1) {
        setDiasSeleccionados([...diasSeleccionados, fechaStr]);
      } else {
        const nuevosDias = [...diasSeleccionados];
        nuevosDias.splice(index, 1);
        setDiasSeleccionados(nuevosDias);
      }
    } else {
      // Modo normal: abrir modal para agregar evento
      setDiaSeleccionado(fecha);
      const eventosDia = obtenerEventosParaFecha(fecha);
      
      // Si hay eventos, mostrar modal de evento
      if (eventosDia.length > 0) {
        setNuevoEvento({
          titulo: '',
          tipo: 'cita_medica',
          color: COLORES.EXITO,
          fecha_inicio: fecha,
          fecha_fin: fecha,
          hora: '09:00',
          duracion: '1',
          descripcion: '',
          familiar_id: null,
          recordatorio: true,
          ubicacion: ''
        });
        setModalEventoVisible(true);
      } else {
        // Preparar nuevo evento para este día
        const fechaObj = new Date(fecha);
        const horaActual = fechaObj.getHours().toString().padStart(2, '0') + 
                          ':' + fechaObj.getMinutes().toString().padStart(2, '0');
        
        setNuevoEvento({
          titulo: '',
          tipo: 'cita_medica',
          color: COLORES.EXITO,
          fecha_inicio: fecha,
          fecha_fin: fecha,
          hora: horaActual,
          duracion: '1',
          descripcion: '',
          familiar_id: null,
          recordatorio: true,
          ubicacion: ''
        });
        setModalVisible(true);
      }
    }
  };

  // Iniciar selección múltiple
  const iniciarSeleccionMultiple = () => {
    setModoSeleccionMultiple(true);
    setDiasSeleccionados([]);
    Alert.alert(
      'Modo selección múltiple',
      'Ahora puedes seleccionar varios días. Toque los días que desee seleccionar.'
    );
  };

  // Cancelar selección múltiple
  const cancelarSeleccionMultiple = () => {
    setModoSeleccionMultiple(false);
    setDiasSeleccionados([]);
  };

  // Crear evento para días seleccionados
  const crearEventoMultiplesDias = () => {
    if (diasSeleccionados.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un día');
      return;
    }
    
    // Ordenar fechas
    const fechasOrdenadas = [...diasSeleccionados].sort();
    const fechaInicio = fechasOrdenadas[0];
    const fechaFin = fechasOrdenadas[fechasOrdenadas.length - 1];
    
    setNuevoEvento({
      ...nuevoEvento,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      titulo: `Cuidado por ${fechaInicio} a ${fechaFin}`
    });
    
    setModalVisible(true);
    setModoSeleccionMultiple(false);
    setDiasSeleccionados([]);
  };

  // Guardar evento
  const guardarEvento = async () => {
    try {
      // Validaciones
      if (!nuevoEvento.titulo.trim()) {
        Alert.alert('Error', 'Debes ingresar un título para el evento');
        return;
      }
      
      if (!nuevoEvento.fecha_inicio) {
        Alert.alert('Error', 'Debes seleccionar una fecha de inicio');
        return;
      }
      
      // Preparar datos para enviar
      const datosEvento = {
        ...nuevoEvento,
        tipo_evento: nuevoEvento.tipo,
        color_evento: nuevoEvento.color,
        fecha_inicio: nuevoEvento.fecha_inicio,
        fecha_fin: nuevoEvento.fecha_fin || nuevoEvento.fecha_inicio,
        hora_inicio: nuevoEvento.hora,
        duracion_horas: parseFloat(nuevoEvento.duracion),
        usuario_id: await obtenerUsuarioId()
      };
      
      // Llamar a la API para guardar el evento
      const response = await servicioAPI.crearEvento(datosEvento);
      
      if (response.exito) {
        Alert.alert('Éxito', 'Evento guardado correctamente');
        setModalVisible(false);
        setModalEventoVisible(false);
        onRefresh();
        
        // Limpiar formulario
        setNuevoEvento({
          titulo: '',
          tipo: 'cita_medica',
          color: COLORES.EXITO,
          fecha_inicio: '',
          fecha_fin: '',
          hora: '09:00',
          duracion: '1',
          descripcion: '',
          familiar_id: null,
          recordatorio: true,
          ubicacion: ''
        });
      } else {
        Alert.alert('Error', response.error || 'No se pudo guardar el evento');
      }
      
    } catch (error) {
      console.error('Error guardando evento:', error);
      Alert.alert('Error', 'No se pudo guardar el evento');
    }
  };

  // Obtener ID del usuario actual
  const obtenerUsuarioId = async () => {
    try {
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        return usuario.id;
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo usuario ID:', error);
      return null;
    }
  };

  // Función para editar evento
  const editarEvento = async (eventoId) => {
    try {
      // Buscar el evento en la lista
      const evento = eventos.find(e => e.id === eventoId);
      if (!evento) {
        Alert.alert('Error', 'Evento no encontrado');
        return;
      }
      
      // Preparar datos para edición
      setNuevoEvento({
        titulo: evento.titulo,
        tipo: evento.tipo_evento || 'cita_medica',
        color: evento.color_evento || COLORES.EXITO,
        fecha_inicio: evento.fecha_inicio,
        fecha_fin: evento.fecha_fin || evento.fecha_inicio,
        hora: evento.hora_inicio || '09:00',
        duracion: evento.duracion_horas?.toString() || '1',
        descripcion: evento.descripcion || '',
        familiar_id: evento.familiar_id || null,
        recordatorio: evento.recordatorio !== undefined ? evento.recordatorio : true,
        ubicacion: evento.ubicacion || ''
      });
      
      setEventoEditando(eventoId);
      setModalEditarVisible(true);
      
    } catch (error) {
      console.error('Error preparando edición:', error);
      Alert.alert('Error', 'No se pudo cargar el evento para editar');
    }
  };

  // Función para guardar evento editado
  const guardarEventoEditado = async () => {
    try {
      if (!eventoEditando) return;
      
      // Validaciones
      if (!nuevoEvento.titulo.trim()) {
        Alert.alert('Error', 'Debes ingresar un título para el evento');
        return;
      }
      
      // Preparar datos para actualizar
      const datosEvento = {
        ...nuevoEvento,
        tipo_evento: nuevoEvento.tipo,
        color_evento: nuevoEvento.color,
        fecha_inicio: nuevoEvento.fecha_inicio,
        fecha_fin: nuevoEvento.fecha_fin || nuevoEvento.fecha_inicio,
        hora_inicio: nuevoEvento.hora,
        duracion_horas: parseFloat(nuevoEvento.duracion)
      };
      
      // Llamar a la API para actualizar
      const response = await servicioAPI.actualizarEvento(eventoEditando, datosEvento);
      
      if (response.exito) {
        Alert.alert('Éxito', 'Evento actualizado correctamente');
        setModalEditarVisible(false);
        setEventoEditando(null);
        onRefresh();
        
        // Limpiar formulario
        setNuevoEvento({
          titulo: '',
          tipo: 'cita_medica',
          color: COLORES.EXITO,
          fecha_inicio: '',
          fecha_fin: '',
          hora: '09:00',
          duracion: '1',
          descripcion: '',
          familiar_id: null,
          recordatorio: true,
          ubicacion: ''
        });
      } else {
        Alert.alert('Error', response.error || 'No se pudo actualizar el evento');
      }
      
    } catch (error) {
      console.error('Error actualizando evento:', error);
      Alert.alert('Error', 'No se pudo actualizar el evento');
    }
  };

  // Eliminar evento
  const eliminarEvento = (eventoId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarEvento(eventoId);
              if (response.exito) {
                Alert.alert('Éxito', 'Evento eliminado correctamente');
                onRefresh();
              } else {
                Alert.alert('Error', response.error || 'No se pudo eliminar el evento');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el evento');
            }
          }
        }
      ]
    );
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Formatear hora
  const formatearHora = (horaStr) => {
    const [horas, minutos] = horaStr.split(':');
    return `${horas}:${minutos}`;
  };

  // Obtener nombre del mes
  const obtenerNombreMes = () => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mesActual];
  };

  // Obtener nombre del tipo de evento
  const obtenerNombreTipoEvento = (tipoId) => {
    const tipo = tiposEventos.find(t => t.id === tipoId);
    return tipo ? tipo.nombre : 'Otro';
  };

  // Obtener color del tipo de evento
  const obtenerColorTipoEvento = (tipoId) => {
    const tipo = tiposEventos.find(t => t.id === tipoId);
    return tipo ? tipo.color : COLORES.GRIS_OSCURO;
  };

  // Obtener icono del tipo de evento
  const obtenerIconoTipoEvento = (tipoId) => {
    const tipo = tiposEventos.find(t => t.id === tipoId);
    return tipo ? tipo.icono : 'ellipse-outline';
  };

  // Renderizar mini evento en el día
  const renderMiniEvento = (evento) => {
    const color = evento.color_evento || obtenerColorTipoEvento(evento.tipo_evento);
    return (
      <View 
        key={evento.id} 
        style={[
          styles.miniEvento, 
          { backgroundColor: color }
        ]}
      />
    );
  };

  // Renderizar día del calendario
  const renderDia = ({ item }) => {
    if (!item.dia) {
      return <View style={styles.diaVacio} />;
    }
    
    const estaSeleccionado = diasSeleccionados.includes(item.fecha);
    const esDiaSeleccionado = diaSeleccionado === item.fecha;
    
    return (
      <TouchableOpacity
        style={[
          styles.diaContainer,
          item.esHoy && styles.diaHoy,
          esDiaSeleccionado && styles.diaSeleccionado,
          estaSeleccionado && styles.diaSeleccionadoMultiple
        ]}
        onPress={() => seleccionarDia(item.dia, item.fecha)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.textoDia,
          item.esHoy && styles.textoDiaHoy,
          (esDiaSeleccionado || estaSeleccionado) && styles.textoDiaSeleccionado
        ]}>
          {item.dia}
        </Text>
        
        {/* Mini indicadores de eventos */}
        <View style={styles.miniEventosContainer}>
          {item.eventos.slice(0, 3).map(evento => renderMiniEvento(evento))}
        </View>
        
        {item.eventos.length > 3 && (
          <Text style={styles.masEventos}>+{item.eventos.length - 3}</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Mostrar pantalla de carga
  if (cargando) {
    return (
      <LinearGradient 
        colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]}
        style={styles.fondo}
      >
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando calendario...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const diasMes = generarDiasMes();
  const nombreMes = obtenerNombreMes();

  return (
    <LinearGradient 
      colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]}
      style={styles.fondo}
    >
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity 
            style={styles.botonAtras}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          
          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Calendario</Text>
            <Text style={styles.subtituloPrincipal}>{nombreMes} {anoActual}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.botonRefrescar}
            onPress={onRefresh}
            disabled={refrescando}
          >
            <Icon 
              name="refresh-outline" 
              size={24} 
              color={refrescando ? COLORES.GRIS_OSCURO : COLORES.TEXTO_OSCURO} 
            />
          </TouchableOpacity>
        </View>

        {/* Controles del calendario */}
        <View style={styles.controlesCalendario}>
          <TouchableOpacity 
            style={styles.botonControl}
            onPress={() => cambiarMes(-1)}
          >
            <Icon name="chevron-back-outline" size={24} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.botonHoy}
            onPress={irAHoy}
          >
            <Text style={styles.textoBotonHoy}>HOY</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.botonControl}
            onPress={() => cambiarMes(1)}
          >
            <Icon name="chevron-forward-outline" size={24} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* Días de la semana */}
        <View style={styles.diasSemanaContainer}>
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dia, index) => (
            <View key={index} style={styles.diaSemana}>
              <Text style={styles.textoDiaSemana}>{dia}</Text>
            </View>
          ))}
        </View>

        {/* Calendario - Grid de días */}
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
              onRefresh={onRefresh}
              colors={[COLORES.AMARILLO_PLATANO]}
              tintColor={COLORES.AMARILLO_PLATANO}
            />
          }
        />

        {/* Modo selección múltiple */}
        {modoSeleccionMultiple && (
          <View style={styles.barraSeleccionMultiple}>
            <Text style={styles.textoSeleccionMultiple}>
              {diasSeleccionados.length} día(s) seleccionado(s)
            </Text>
            
            <View style={styles.botonesSeleccion}>
              <TouchableOpacity 
                style={[styles.botonSeleccion, { backgroundColor: COLORES.ERROR }]}
                onPress={cancelarSeleccionMultiple}
              >
                <Text style={styles.textoBotonSeleccion}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.botonSeleccion, { backgroundColor: COLORES.EXITO }]}
                onPress={crearEventoMultiplesDias}
              >
                <Text style={styles.textoBotonSeleccion}>Crear Evento</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Barra de acciones */}
        <View style={styles.barraAcciones}>
          {!modoSeleccionMultiple ? (
            <>
              <TouchableOpacity 
                style={styles.botonAccion}
                onPress={iniciarSeleccionMultiple}
              >
                <Icon name="calendar-outline" size={20} color={COLORES.BLANCO} />
                <Text style={styles.textoBotonAccion}>Seleccionar Múltiples Días</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.botonAccionSecundario}
                onPress={() => {
                  setDiaSeleccionado(new Date().toISOString().split('T')[0]);
                  setModalVisible(true);
                }}
              >
                <Icon name="add-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.botonAccion, { backgroundColor: COLORES.ROJO_CLARO }]}
              onPress={cancelarSeleccionMultiple}
            >
              <Icon name="close-outline" size={20} color={COLORES.BLANCO} />
              <Text style={styles.textoBotonAccion}>Cancelar Selección</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lista de eventos próximos */}
        <View style={styles.seccionEventos}>
          <Text style={styles.tituloSeccion}>Eventos Próximos</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {eventos.slice(0, 10).map(evento => (
              <TouchableOpacity 
                key={evento.id}
                style={[
                  styles.tarjetaEvento,
                  { borderLeftColor: evento.color_evento || obtenerColorTipoEvento(evento.tipo_evento) }
                ]}
                onPress={() => {
                  // Navegar a detalles del evento
                  navigation.navigate('DetalleEvento', { eventoId: evento.id });
                }}
                onLongPress={() => {
                  // Mostrar menú de opciones al mantener presionado
                  Alert.alert(
                    'Opciones del Evento',
                    'Selecciona una acción',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Editar', 
                        onPress: () => editarEvento(evento.id)
                      },
                      { 
                        text: 'Eliminar', 
                        style: 'destructive',
                        onPress: () => eliminarEvento(evento.id)
                      }
                    ]
                  );
                }}
              >
                <View style={styles.encabezadoEvento}>
                  <Icon 
                    name={obtenerIconoTipoEvento(evento.tipo_evento)} 
                    size={16} 
                    color={evento.color_evento || obtenerColorTipoEvento(evento.tipo_evento)} 
                  />
                  <Text style={styles.tituloEvento} numberOfLines={1}>
                    {evento.titulo}
                  </Text>
                  {/* Botón de editar rápido */}
                  <TouchableOpacity 
                    style={styles.botonEditarRapido}
                    onPress={() => editarEvento(evento.id)}
                  >
                    <Icon name="create-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
                  </TouchableOpacity>
                </View>
                              
                <Text style={styles.fechaEvento}>
                  {formatearFecha(evento.fecha_inicio)}
                </Text>
                
                {evento.hora_inicio && (
                  <Text style={styles.horaEvento}>
                    {formatearHora(evento.hora_inicio)}
                    {evento.duracion_horas && ` • ${evento.duracion_horas}h`}
                  </Text>
                )}
                
                {evento.ubicacion && (
                  <Text style={styles.ubicacionEvento} numberOfLines={1}>
                    📍 {evento.ubicacion}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
            
            {eventos.length === 0 && (
              <View style={styles.sinEventosContainer}>
                <Icon name="calendar-outline" size={40} color={COLORES.GRIS_MEDIO} />
                <Text style={styles.textoSinEventos}>No hay eventos próximos</Text>
                <Text style={styles.subtextoSinEventos}>
                  Toca en un día para agregar un evento
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Modal para crear nuevo evento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>
                {diaSeleccionado ? `Evento para ${formatearFecha(diaSeleccionado)}` : 'Nuevo Evento'}
              </Text>
              
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalFormulario}>
              <Text style={styles.modalLabel}>Título del evento *</Text>
              <TextInput
                style={styles.input}
                value={nuevoEvento.titulo}
                onChangeText={(text) => setNuevoEvento({...nuevoEvento, titulo: text})}
                placeholder="Ej: Cita con cardiólogo"
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />
              
              <Text style={styles.modalLabel}>Tipo de evento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tiposContainer}>
                {tiposEventos.map(tipo => (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[
                      styles.opcionTipo,
                      { 
                        backgroundColor: nuevoEvento.tipo === tipo.id ? tipo.color + '40' : COLORES.GRIS_CLARO,
                        borderColor: tipo.color
                      }
                    ]}
                    onPress={() => {
                      setNuevoEvento({...nuevoEvento, tipo: tipo.id, color: tipo.color});
                    }}
                  >
                    <Icon name={tipo.icono} size={20} color={tipo.color} />
                    <Text style={[
                      styles.textoOpcionTipo,
                      { color: nuevoEvento.tipo === tipo.id ? tipo.color : COLORES.GRIS_OSCURO }
                    ]}>
                      {tipo.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Text style={styles.modalLabel}>Color personalizado</Text>
              <View style={styles.coloresContainer}>
                {[
                  COLORES.EXITO, COLORES.AZUL_CIELO, COLORES.AMARILLO_PLATANO,
                  COLORES.MORADO, COLORES.NARANJA, COLORES.ROSADO,
                  COLORES.TURQUESA, COLORES.ROJO_CLARO, COLORES.GRIS_OSCURO
                ].map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.opcionColor,
                      { backgroundColor: color },
                      nuevoEvento.color === color && styles.opcionColorSeleccionada
                    ]}
                    onPress={() => setNuevoEvento({...nuevoEvento, color})}
                  />
                ))}
              </View>
              
              <View style={styles.filaInputs}>
                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Fecha inicio</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoEvento.fecha_inicio}
                    editable={false}
                    placeholder="Seleccionar fecha"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>
                
                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Fecha fin</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoEvento.fecha_fin}
                    onChangeText={(text) => setNuevoEvento({...nuevoEvento, fecha_fin: text})}
                    placeholder="Misma que inicio"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>
              </View>
              
              <View style={styles.filaInputs}>
                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Hora</Text>
                  <View style={styles.selectorHora}>
                    <Text style={styles.textoHoraSeleccionada}>
                      {nuevoEvento.hora}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horasContainer}>
                      {horasDisponibles.map(hora => (
                        <TouchableOpacity
                          key={hora}
                          style={[
                            styles.opcionHora,
                            nuevoEvento.hora === hora && styles.opcionHoraSeleccionada
                          ]}
                          onPress={() => setNuevoEvento({...nuevoEvento, hora})}
                        >
                          <Text style={[
                            styles.textoOpcionHora,
                            nuevoEvento.hora === hora && styles.textoOpcionHoraSeleccionada
                          ]}>
                            {hora}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                
                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Duración (horas)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.duracionesContainer}>
                    {duracionesDisponibles.map(duracion => (
                      <TouchableOpacity
                        key={duracion}
                        style={[
                          styles.opcionDuracion,
                          nuevoEvento.duracion === duracion && styles.opcionDuracionSeleccionada
                        ]}
                        onPress={() => setNuevoEvento({...nuevoEvento, duracion})}
                      >
                        <Text style={[
                          styles.textoOpcionDuracion,
                          nuevoEvento.duracion === duracion && styles.textoOpcionDuracionSeleccionada
                        ]}>
                          {duracion}h
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              
              <Text style={styles.modalLabel}>Familiar responsable</Text>
              {familiares.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familiaresContainer}>
                  <TouchableOpacity
                    style={[
                      styles.opcionFamiliar,
                      !nuevoEvento.familiar_id && styles.opcionFamiliarSeleccionada
                    ]}
                    onPress={() => setNuevoEvento({...nuevoEvento, familiar_id: null})}
                  >
                    <Icon name="person-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.textoOpcionFamiliar}>Ninguno</Text>
                  </TouchableOpacity>
                  
                  {familiares.map(familiar => (
                    <TouchableOpacity
                      key={familiar.id}
                      style={[
                        styles.opcionFamiliar,
                        { borderColor: familiar.color },
                        nuevoEvento.familiar_id === familiar.id && { 
                          backgroundColor: familiar.color + '20',
                          borderWidth: 2
                        }
                      ]}
                      onPress={() => setNuevoEvento({...nuevoEvento, familiar_id: familiar.id})}
                    >
                      <View style={[styles.avatarFamiliar, { backgroundColor: familiar.color }]}>
                        <Text style={styles.textoAvatarFamiliar}>
                          {familiar.nombre.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.textoOpcionFamiliar}>{familiar.nombre.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.textoNoFamiliares}>No hay familiares registrados</Text>
              )}
              
              <Text style={styles.modalLabel}>Ubicación</Text>
              <TextInput
                style={styles.input}
                value={nuevoEvento.ubicacion}
                onChangeText={(text) => setNuevoEvento({...nuevoEvento, ubicacion: text})}
                placeholder="Ej: Hospital Central, Casa, etc."
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />
              
              <Text style={styles.modalLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={nuevoEvento.descripcion}
                onChangeText={(text) => setNuevoEvento({...nuevoEvento, descripcion: text})}
                multiline
                numberOfLines={3}
                placeholder="Detalles adicionales del evento..."
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />
              
              <View style={styles.filaSwitch}>
                <Text style={styles.modalLabel}>Recordatorio</Text>
                <TouchableOpacity
                  style={[
                    styles.switch,
                    nuevoEvento.recordatorio && styles.switchActivo
                  ]}
                  onPress={() => setNuevoEvento({...nuevoEvento, recordatorio: !nuevoEvento.recordatorio})}
                >
                  <View style={[
                    styles.switchPunto,
                    nuevoEvento.recordatorio && styles.switchPuntoActivo
                  ]} />
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={styles.modalBotones}>
              <TouchableOpacity 
                style={styles.botonModalCancelar}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.botonModalGuardar}
                onPress={guardarEvento}
              >
                <Text style={styles.textoBotonModalGuardar}>Guardar Evento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para editar evento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEditarVisible}
        onRequestClose={() => {
          setModalEditarVisible(false);
          setEventoEditando(null);
        }}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Editar Evento</Text>
              
              <TouchableOpacity onPress={() => {
                setModalEditarVisible(false);
                setEventoEditando(null);
              }}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalFormulario}>
              {/* TODO: Copia aquí TODO el contenido del formulario 
                  del modal de crear evento, pero cambia:
                  1. El título a "Editar Evento"
                  2. El botón de guardar que llame a guardarEventoEditado()
              */}
            </ScrollView>
            
            <View style={styles.modalBotones}>
              <TouchableOpacity 
                style={styles.botonModalCancelar}
                onPress={() => {
                  setModalEditarVisible(false);
                  setEventoEditando(null);
                }}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.botonModalGuardar}
                onPress={guardarEventoEditado}
              >
                <Text style={styles.textoBotonModalGuardar}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para ver eventos del día */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEventoVisible}
        onRequestClose={() => setModalEventoVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>
                Eventos para {diaSeleccionado ? formatearFecha(diaSeleccionado) : 'hoy'}
              </Text>
              
              <TouchableOpacity onPress={() => setModalEventoVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.listaEventosDia}>
              {diaSeleccionado && obtenerEventosParaFecha(diaSeleccionado).length > 0 ? (
                obtenerEventosParaFecha(diaSeleccionado).map(evento => (
                  <TouchableOpacity 
                    key={evento.id}
                    style={[
                      styles.eventoDia,
                      { borderLeftColor: evento.color_evento || obtenerColorTipoEvento(evento.tipo_evento) }
                    ]}
                    onPress={() => {
                      setModalEventoVisible(false);
                      // Navegar a detalles del evento
                      navigation.navigate('DetalleEvento', { eventoId: evento.id });
                    }}
                  >
                    <View style={styles.encabezadoEventoDia}>
                      <Icon 
                        name={obtenerIconoTipoEvento(evento.tipo_evento)} 
                        size={20} 
                        color={evento.color_evento || obtenerColorTipoEvento(evento.tipo_evento)} 
                      />
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
                      {obtenerNombreTipoEvento(evento.tipo_evento)}
                    </Text>
                    
                    {evento.descripcion && (
                      <Text style={styles.descripcionEventoDia}>{evento.descripcion}</Text>
                    )}
                    
                    {evento.ubicacion && (
                      <Text style={styles.ubicacionEventoDia}>📍 {evento.ubicacion}</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.sinEventosDia}>
                  <Icon name="calendar-outline" size={60} color={COLORES.GRIS_MEDIO} />
                  <Text style={styles.textoSinEventosDia}>No hay eventos para este día</Text>
                  <Text style={styles.subtextoSinEventosDia}>
                    Toca "Agregar Evento" para crear uno nuevo
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.botonAgregarEventoDia}
              onPress={() => {
                setModalEventoVisible(false);
                setModalVisible(true);
              }}
            >
              <Icon name="add-outline" size={24} color={COLORES.BLANCO} />
              <Text style={styles.textoBotonAgregarEventoDia}>Agregar Nuevo Evento</Text>
            </TouchableOpacity>
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
  
  // Controles del calendario
  controlesCalendario: {
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
  
  // Días de la semana
  diasSemanaContainer: {
    flexDirection: 'row',
    backgroundColor: COLORES.BLANCO,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  diaSemana: {
    width: DIA_WIDTH,
    alignItems: 'center',
  },
  textoDiaSemana: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORES.GRIS_OSCURO,
  },
  
  // Grid del calendario
  calendarioGrid: {
    backgroundColor: COLORES.BLANCO,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  diaVacio: {
    width: DIA_WIDTH,
    height: DIA_WIDTH,
    margin: 2,
  },
  diaContainer: {
    width: DIA_WIDTH,
    height: DIA_WIDTH,
    margin: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
  },
  diaHoy: {
    backgroundColor: COLORES.AMARILLO_PLATANO + '40',
    borderWidth: 2,
    borderColor: COLORES.AMARILLO_PLATANO,
  },
  diaSeleccionado: {
    backgroundColor: COLORES.AZUL_CIELO + '40',
    borderWidth: 2,
    borderColor: COLORES.AZUL_CIELO,
  },
  diaSeleccionadoMultiple: {
    backgroundColor: COLORES.EXITO + '40',
    borderWidth: 2,
    borderColor: COLORES.EXITO,
  },
  textoDia: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
  },
  textoDiaHoy: {
    color: COLORES.AMARILLO_OSCURO,
    fontWeight: 'bold',
  },
  textoDiaSeleccionado: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontWeight: 'bold',
  },
  
  // Mini eventos
  miniEventosContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    justifyContent: 'center',
  },
  miniEvento: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  masEventos: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
  },
  
  // Barra de selección múltiple
  barraSeleccionMultiple: {
    backgroundColor: COLORES.EXITO,
    padding: 15,
    alignItems: 'center',
  },
  textoSeleccionMultiple: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  botonesSeleccion: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  botonSeleccion: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  textoBotonSeleccion: {
    color: COLORES.BLANCO,
    fontSize: 14,
    fontWeight: 'bold',
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
  botonAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  textoBotonAccion: {
    color: COLORES.BLANCO,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  botonAccionSecundario: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  
  // Sección de eventos próximos
  seccionEventos: {
    backgroundColor: COLORES.BLANCO,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 15,
  },
  tarjetaEvento: {
    width: 200,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    padding: 15,
    marginRight: 10,
    borderLeftWidth: 4,
  },
  encabezadoEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tituloEvento: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 8,
    flex: 1,
  },
  fechaEvento: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 4,
  },
  horaEvento: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    fontWeight: '500',
    marginBottom: 4,
  },
  ubicacionEvento: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginTop: 4,
  },
  sinEventosContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 60,
  },
  textoSinEventos: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    marginTop: 10,
    marginBottom: 5,
  },
  subtextoSinEventos: {
    fontSize: 14,
    color: COLORES.GRIS_MEDIO,
    textAlign: 'center',
  },

  botonEditarRapido: {
  padding: 4,
  marginLeft: 8,
  },

  botonesEventoDia: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  botonEditarEvento: {
    padding: 5,
    marginRight: 8,
  },

  botonEliminarEvento: {
    padding: 5,
  },
  
  // Modal
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContenido: {
    backgroundColor: COLORES.BLANCO,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  filaInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputMitad: {
    width: '48%',
  },
  
  // Tipos de eventos
  tiposContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  opcionTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  textoOpcionTipo: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
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
  
  // Selector de hora
  selectorHora: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 10,
    padding: 10,
  },
  textoHoraSeleccionada: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 10,
    textAlign: 'center',
  },
  horasContainer: {
    flexDirection: 'row',
  },
  opcionHora: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: COLORES.BLANCO,
  },
  opcionHoraSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionHora: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  textoOpcionHoraSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },
  
  // Duración
  duracionesContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  opcionDuracion: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: COLORES.BLANCO,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  opcionDuracionSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionDuracion: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  textoOpcionDuracionSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },
  
  // Familiares
  familiaresContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  opcionFamiliar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  opcionFamiliarSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO + '20',
    borderColor: COLORES.AZUL_CIELO,
    borderWidth: 2,
  },
  avatarFamiliar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textoAvatarFamiliar: {
    color: COLORES.BLANCO,
    fontSize: 12,
    fontWeight: 'bold',
  },
  textoOpcionFamiliar: {
    fontSize: 12,
    color: COLORES.TEXTO_OSCURO,
  },
  textoNoFamiliares: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // Switch
  filaSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
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
  botonModalGuardar: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 10,
    borderRadius: 10,
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    alignItems: 'center',
  },
  textoBotonModalGuardar: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal de eventos del día
  listaEventosDia: {
    maxHeight: 400,
  },
  eventoDia: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  encabezadoEventoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tituloEventoDia: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
    flex: 1,
  },
  botonEliminarEvento: {
    padding: 5,
  },
  detalleEventoDia: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 5,
  },
  descripcionEventoDia: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    marginTop: 8,
    lineHeight: 20,
  },
  ubicacionEventoDia: {
    fontSize: 13,
    color: COLORES.GRIS_OSCURO,
    marginTop: 5,
  },
  sinEventosDia: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  textoSinEventosDia: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    marginTop: 10,
    marginBottom: 5,
  },
  subtextoSinEventosDia: {
    fontSize: 14,
    color: COLORES.GRIS_MEDIO,
    textAlign: 'center',
  },
  botonAgregarEventoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderRadius: 10,
    paddingVertical: 16,
    marginTop: 20,
  },
  textoBotonAgregarEventoDia: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});