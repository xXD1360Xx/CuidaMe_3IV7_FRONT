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
  Animated
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
  TURQUESA: '#4DB6AC'
};

const { width } = Dimensions.get('window');

export default function VistaMedicinas({ navigation }) {
  // --- Estados ---
  const [medicinas, setMedicinas] = useState([]);
  const [medicinasHoy, setMedicinasHoy] = useState([]);
  const [medicinasFrecuentes, setMedicinasFrecuentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [medicinaSeleccionada, setMedicinaSeleccionada] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoy');

  // Estados para modal de estadísticas
  const [modalEstadisticasVisible, setModalEstadisticasVisible] = useState(false);
  const [estadisticasTipo, setEstadisticasTipo] = useState('');
  const [medicinasFiltradas, setMedicinasFiltradas] = useState([]);

  // Estados para notificación
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '' });
  const animNotificacion = useRef(new Animated.Value(0)).current;
  const timeoutNotificacion = useRef(null);

  const [nuevaMedicina, setNuevaMedicina] = useState({
    nombre: '',
    dosis: '',
    frecuencia: 'diaria',
    horarios: [],
    duracion: '',
    proposito: '',
    instrucciones: '',
    stock: '30',
    stock_minimo: '10'
  });

  const horariosPredefinidos = [
    { id: 'manana', nombre: 'Mañana', hora: '08:00', icono: 'sunny-outline', color: '#FFD93D' },
    { id: 'mediodia', nombre: 'Mediodía', hora: '12:00', icono: 'restaurant-outline', color: '#F9A825' },
    { id: 'tarde', nombre: 'Tarde', hora: '16:00', icono: 'partly-sunny-outline', color: '#42A5F5' },
    { id: 'noche', nombre: 'Noche', hora: '20:00', icono: 'moon-outline', color: '#5C6BC0' }
  ];

  const frecuencias = [
    { id: 'diaria', nombre: 'Diaria', icono: 'calendar-outline' },
    { id: 'semanal', nombre: 'Semanal', icono: 'calendar-outline' },
    { id: 'mensual', nombre: 'Mensual', icono: 'calendar-outline' },
    { id: 'ocasional', nombre: 'Solo cuando es necesario', icono: 'medical-outline' }
  ];

  // --- Carga de datos ---
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) {
        setCargando(false);
        return;
      }

      const [todasRes, hoyRes, frecuentesRes] = await Promise.all([
        servicioAPI.obtenerTodasMedicinas(usuarioId),
        servicioAPI.obtenerMedicinasHoy(usuarioId),
        servicioAPI.obtenerMedicinasFrecuentes(usuarioId, 5)
      ]);

      const limpiar = (arr) => (arr || []).filter(item => item !== null && item !== undefined);

      if (todasRes.exito) setMedicinas(limpiar(todasRes.medicinas));
      if (hoyRes.exito) {
        const hoyLimpio = limpiar(hoyRes.medicinas).map(med => ({
          ...med,
          tomada_hoy: Array.isArray(med.tomada_hoy) ? med.tomada_hoy : []
        }));
        setMedicinasHoy(hoyLimpio);
      }
      if (frecuentesRes.exito) setMedicinasFrecuentes(limpiar(frecuentesRes.medicinas));

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

  // --- Filtros de período ---
  const obtenerMedicinasPorPeriodo = () => {
    switch (filtroPeriodo) {
      case 'hoy':
        return medicinasHoy;
      case 'semana':
        return medicinas.filter(m => m && (m.frecuencia === 'diaria' || m.frecuencia === 'semanal'));
      case 'mes':
        return medicinas.filter(m => m);
      default:
        return medicinas.filter(m => m);
    }
  };

  // --- Notificación ---
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

  // --- Completar toma ---
  const completarToma = async (item) => {
    if (!item) return;
    const horariosDelDia = horariosPredefinidos.map(h => h.id);
    const tomados = Array.isArray(item.tomada_hoy) ? item.tomada_hoy : [];
    const proximoHorario = horariosDelDia.find(h => !tomados.includes(h));
    if (!proximoHorario) {
      Alert.alert('Completado', `Ya se tomaron todas las dosis de ${item.nombre} hoy`);
      return;
    }

    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await servicioAPI.marcarMedicinaTomada(item.id, hoy, proximoHorario);
      if (response.exito) {
        const nuevoStock = Math.max(0, (item.stock || 0) - 1);
        await servicioAPI.actualizarStockMedicina(item.id, nuevoStock);

        const nombreHorario = horariosPredefinidos.find(h => h.id === proximoHorario)?.nombre || '';
        const mensaje = `✅ Completada toma de ${nombreHorario} de ${item.nombre}`;
        mostrarNotificacion(mensaje);
        onRefresh();
      } else {
        Alert.alert('Error', 'No se pudo marcar la toma');
      }
    } catch (error) {
      console.error('Error completando toma:', error);
      Alert.alert('Error', 'No se pudo completar la toma');
    }
  };

  // --- CRUD ---
  const seleccionarHorario = (horarioId) => {
    const horario = horariosPredefinidos.find(h => h.id === horarioId);
    if (!horario) return;
    const nuevosHorarios = [...nuevaMedicina.horarios];
    const index = nuevosHorarios.findIndex(h => h.id === horarioId);
    if (index === -1) nuevosHorarios.push(horario);
    else nuevosHorarios.splice(index, 1);
    setNuevaMedicina({ ...nuevaMedicina, horarios: nuevosHorarios });
  };

  const abrirModalAgregar = (horarioId = null) => {
    if (horarioId) {
      const horario = horariosPredefinidos.find(h => h.id === horarioId);
      if (horario) {
        setNuevaMedicina({
          ...nuevaMedicina,
          horarios: [horario]
        });
      }
    } else {
      setNuevaMedicina({
        nombre: '',
        dosis: '',
        frecuencia: 'diaria',
        horarios: [],
        duracion: '',
        proposito: '',
        instrucciones: '',
        stock: '30',
        stock_minimo: '10'
      });
    }
    setMedicinaSeleccionada(null);
    setModalAgregarVisible(true);
  };

  const abrirModalEditar = (medicina) => {
    if (!medicina) return;
    setMedicinaSeleccionada(medicina);
    setNuevaMedicina({
      nombre: medicina.nombre || '',
      dosis: medicina.dosis || '',
      frecuencia: medicina.frecuencia || 'diaria',
      horarios: Array.isArray(medicina.horarios) ? medicina.horarios.map(h => ({ id: h })) : [],
      duracion: medicina.duracion?.toString() || '',
      proposito: medicina.proposito || '',
      instrucciones: medicina.instrucciones || '',
      stock: medicina.stock?.toString() || '30',
      stock_minimo: medicina.stock_minimo?.toString() || '10'
    });
    setModalAgregarVisible(true);
  };

  const guardarMedicina = async () => {
    try {
      if (!nuevaMedicina.nombre.trim()) {
        Alert.alert('Error', 'Nombre requerido');
        return;
      }
      if (!nuevaMedicina.dosis.trim()) {
        Alert.alert('Error', 'Dosis requerida');
        return;
      }
      if (nuevaMedicina.horarios.length === 0) {
        Alert.alert('Error', 'Selecciona al menos un horario');
        return;
      }

      const datosMedicina = {
        ...nuevaMedicina,
        horarios: nuevaMedicina.horarios.map(h => h.id),
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

  // --- Estadísticas interactivas ---
  const abrirModalEstadisticas = (tipo) => {
    let filtradas = [];
    if (tipo === 'bajoStock') {
      filtradas = medicinas.filter(m => m && m.stock < m.stock_minimo && m.stock > 0);
    } else if (tipo === 'sinStock') {
      filtradas = medicinas.filter(m => m && m.stock === 0);
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
      const nuevoStock = Math.max(0, (medicina.stock || 0) + incremento);
      await servicioAPI.actualizarStockMedicina(medicinaId, nuevoStock);
      setMedicinasFiltradas(prev =>
        prev.map(m => m.id === medicinaId ? { ...m, stock: nuevoStock } : m)
      );
      setMedicinas(prev =>
        prev.map(m => m.id === medicinaId ? { ...m, stock: nuevoStock } : m)
      );
      setMedicinasHoy(prev =>
        prev.map(m => m.id === medicinaId ? { ...m, stock: nuevoStock } : m)
      );
      mostrarNotificacion(`Stock de ${medicina.nombre} actualizado a ${nuevoStock}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el stock');
    }
  };

  // --- Render helpers ---
  const esAdministrador = usuarioRol === 'familiar_admin' || usuarioRol === 'familiar_administrador';

  // --- CABECERA DE TABLA (rediseñada) ---
  const renderCabeceraTabla = () => (
    <View style={styles.filaCabecera}>
      {/* Columna Medicina: alineada a la izquierda */}
      <View style={[styles.columnaNombre, { alignItems: 'flex-start' }]}>
        <Text style={styles.textoCabecera}>Medicina</Text>
      </View>
      {/* Columna Dosis: más cerca de Medicina, con separación reducida */}
      <View style={[styles.columnaDosis, { alignItems: 'center' }]}>
        <Text style={styles.textoCabecera}>Dosis</Text>
      </View>
      {/* Columna Horarios: con mayor separación entre recuadros y nombres completos */}
      <View style={[styles.columnaHorarios, { justifyContent: 'space-between' }]}>
        {horariosPredefinidos.map(horario => (
          <View key={horario.id} style={styles.horarioCabeceraItem}>
            <Icon name={horario.icono} size={14} color={horario.color} />
            <Text style={[styles.textoCabeceraHorario, { color: horario.color, fontSize: 10 }]}>
              {horario.nombre}
            </Text>
          </View>
        ))}
      </View>
      {/* Columna Acciones: pegada a la derecha, con texto alineado a la derecha */}
      <View style={[styles.columnaAcciones, { alignItems: 'flex-end' }]}>
        <Text style={[styles.textoCabecera, { textAlign: 'right' }]}>Acciones</Text>
      </View>
    </View>
  );

  // --- FILA DE MEDICINA (rediseñada) ---
  const renderFilaMedicina = ({ item }) => {
    if (!item) return null;
    const tomadaHoy = Array.isArray(item.tomada_hoy) ? item.tomada_hoy : [];
    const todasTomadas = horariosPredefinidos.every(h => tomadaHoy.includes(h.id));

    return (
      <View style={styles.filaMedicina}>
        {/* Medicina: alineada a la izquierda */}
        <View style={[styles.columnaNombre, { alignItems: 'flex-start' }]}>
          <Text style={styles.textoMedicinaNombre} numberOfLines={2}>{item.nombre || 'Sin nombre'}</Text>
          {item.proposito && <Text style={styles.textoProposito} numberOfLines={1}>{item.proposito}</Text>}
        </View>

        {/* Dosis: centrada pero cerca de Medicina */}
        <View style={[styles.columnaDosis, { alignItems: 'center' }]}>
          <Text style={styles.textoDosis}>{item.dosis || '--'}</Text>
        </View>

        {/* Horarios: 4 recuadros con separación amplia */}
        <View style={[styles.columnaHorarios, { justifyContent: 'space-between' }]}>
          {horariosPredefinidos.map(horario => {
            const tieneEsteHorario = item.horarios && item.horarios.includes(horario.id);
            const yaTomadaHoy = tomadaHoy.includes(horario.id);

            return (
              <TouchableOpacity
                key={horario.id}
                style={[
                  styles.horarioItem,
                  tieneEsteHorario && styles.horarioItemActivo,
                  yaTomadaHoy && styles.horarioItemCompletado,
                ]}
                onPress={() => {
                  if (!item) return;
                  if (tieneEsteHorario) {
                    if (yaTomadaHoy) {
                      Alert.alert('Ya tomada', `${item.nombre} ya fue tomada en ${horario.nombre.toLowerCase()}`);
                    } else {
                      completarToma(item);
                    }
                  } else if (esAdministrador) {
                    const medicinasEdit = { ...item };
                    const nuevosHorarios = [...(medicinasEdit.horarios || []), horario.id];
                    abrirModalEditar({ ...medicinasEdit, horarios: nuevosHorarios });
                  }
                }}
              >
                <Icon
                  name={horario.icono}
                  size={18}
                  color={tieneEsteHorario ? (yaTomadaHoy ? COLORES.EXITO : horario.color) : COLORES.GRIS_MEDIO}
                />
                {tieneEsteHorario && yaTomadaHoy && (
                  <View style={styles.checkmarkOverlay}>
                    <Icon name="checkmark-circle" size={14} color={COLORES.BLANCO} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Acciones: botones pequeños, juntos y alineados a la derecha */}
        <View style={[styles.columnaAcciones, { alignItems: 'center', justifyContent: 'flex-end', flexDirection: 'row', gap: 4 }]}>
          {filtroPeriodo === 'hoy' && !todasTomadas && (
            <TouchableOpacity
              style={[styles.botonAccion, { backgroundColor: COLORES.EXITO + '20', padding: 4 }]}
              onPress={() => completarToma(item)}
            >
              <Icon name="checkmark-outline" size={16} color={COLORES.EXITO} />
            </TouchableOpacity>
          )}
          {filtroPeriodo === 'hoy' && todasTomadas && (
            <TouchableOpacity style={[styles.botonAccion, { opacity: 0.3, padding: 4 }]}>
              <Icon name="checkmark-done-outline" size={16} color={COLORES.GRIS_OSCURO} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.botonAccion, { padding: 4 }]} onPress={() => abrirModalEditar(item)}>
            <Icon name="create-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
          </TouchableOpacity>
          {esAdministrador && (
            <TouchableOpacity style={[styles.botonAccion, { padding: 4 }]} onPress={() => eliminarMedicina(item.id)}>
              <Icon name="trash-outline" size={16} color={COLORES.ERROR} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // --- Modal de estadísticas ---
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
        <View style={styles.modalFondo}>
          <View style={[styles.modalContenido, { maxHeight: '80%' }]}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>{titulo}</Text>
              <TouchableOpacity onPress={() => setModalEstadisticasVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={medicinasFiltradas}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={[styles.filaMedicina, { paddingVertical: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.textoMedicinaNombre}>{item.nombre}</Text>
                    <Text style={styles.textoProposito}>Dosis: {item.dosis}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 }}>
                    <TouchableOpacity onPress={() => actualizarStock(item.id, -1)} style={styles.botonStock}>
                      <Icon name="remove-outline" size={18} color={COLORES.ERROR} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.inputStock, { width: 45, textAlign: 'center', fontSize: 14 }]}
                      value={String(item.stock)}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (!isNaN(num) && num >= 0) {
                          actualizarStock(item.id, num - item.stock);
                        }
                      }}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => actualizarStock(item.id, 1)} style={styles.botonStock}>
                      <Icon name="add-outline" size={18} color={COLORES.EXITO} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity onPress={() => abrirModalEditar(item)} style={[styles.botonAccion, { padding: 4 }]}>
                      <Icon name="create-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => eliminarMedicina(item.id)} style={[styles.botonAccion, { padding: 4 }]}>
                      <Icon name="trash-outline" size={16} color={COLORES.ERROR} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.sinMedicinas}>
                  <Icon name="medkit-outline" size={60} color={COLORES.GRIS_MEDIO} />
                  <Text style={styles.textoSinMedicinas}>No hay medicinas en esta categoría</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // --- Render principal ---
  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando medicinas...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const medicinasMostrar = obtenerMedicinasPorPeriodo();

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Gestión de Medicinas</Text>
            <Text style={styles.subtituloPrincipal}>
              {medicinasMostrar.length} medicina(s) • {medicinasHoy.length} para hoy
            </Text>
          </View>
          <TouchableOpacity style={styles.botonRefrescar} onPress={onRefresh} disabled={refrescando}>
            <Icon name="refresh-outline" size={24} color={refrescando ? COLORES.GRIS_OSCURO : COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <View style={styles.filtrosContainer}>
          <TouchableOpacity
            style={[styles.filtroBoton, filtroPeriodo === 'hoy' && styles.filtroBotonActivo]}
            onPress={() => setFiltroPeriodo('hoy')}
          >
            <Text style={[styles.textoFiltro, filtroPeriodo === 'hoy' && styles.textoFiltroActivo]}>Hoy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtroBoton, filtroPeriodo === 'semana' && styles.filtroBotonActivo]}
            onPress={() => setFiltroPeriodo('semana')}
          >
            <Text style={[styles.textoFiltro, filtroPeriodo === 'semana' && styles.textoFiltroActivo]}>Semana</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filtroBoton, filtroPeriodo === 'mes' && styles.filtroBotonActivo]}
            onPress={() => setFiltroPeriodo('mes')}
          >
            <Text style={[styles.textoFiltro, filtroPeriodo === 'mes' && styles.textoFiltroActivo]}>Todas</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORES.AMARILLO_PLATANO]} />}
          contentContainerStyle={styles.contenedorScroll}
        >
          {/* Tabla principal */}
          <View style={styles.tablaContainer}>
            {renderCabeceraTabla()}
            {medicinasMostrar.length > 0 ? (
              <FlatList
                data={medicinasMostrar}
                renderItem={renderFilaMedicina}
                keyExtractor={item => (item && item.id) ? item.id.toString() : Math.random().toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.sinMedicinas}>
                <Icon name="medkit-outline" size={60} color={COLORES.GRIS_MEDIO} />
                <Text style={styles.textoSinMedicinas}>No hay medicinas para mostrar</Text>
                <Text style={styles.subtextoSinMedicinas}>
                  {filtroPeriodo === 'hoy' ? 'No hay tomas pendientes hoy' : 'Agrega una nueva medicina'}
                </Text>
              </View>
            )}
          </View>

          {/* Medicinas frecuentes */}
          {medicinasFrecuentes.length > 0 && (
            <View style={styles.seccion}>
              <Text style={styles.tituloSeccion}>Medicinas Frecuentes</Text>
              <View style={styles.contenedorFrecuentes}>
                {medicinasFrecuentes.map(med => (
                  <TouchableOpacity key={med.id} style={styles.tarjetaFrecuente} onPress={() => abrirModalEditar(med)}>
                    <View style={styles.encabezadoFrecuente}>
                      <Icon name="pills-outline" size={20} color={COLORES.EXITO} />
                      <Text style={styles.nombreFrecuente}>{med.nombre}</Text>
                    </View>
                    <Text style={styles.dosisFrecuente}>{med.dosis}</Text>
                    <Text style={styles.horariosFrecuente}>
                      {med.horarios?.map(h => horariosPredefinidos.find(hr => hr.id === h)?.nombre).join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Estadísticas interactivas */}
          <View style={styles.estadisticasContainer}>
            <TouchableOpacity
              style={[styles.botonEstadistica, { backgroundColor: COLORES.AZUL_CIELO }]}
              onPress={() => abrirModalEstadisticas('total')}
            >
              <Icon name="medkit-outline" size={18} color={COLORES.BLANCO} />
              <Text style={styles.textoBotonEstadistica}>Total: {medicinas.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonEstadistica, { backgroundColor: COLORES.AMARILLO_PLATANO }]}
              onPress={() => abrirModalEstadisticas('bajoStock')}
            >
              <Icon name="warning-outline" size={18} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoBotonEstadistica}>
                Bajo: {medicinas.filter(m => m && m.stock < m.stock_minimo && m.stock > 0).length}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonEstadistica, { backgroundColor: COLORES.ROJO_CLARO }]}
              onPress={() => abrirModalEstadisticas('sinStock')}
            >
              <Icon name="alert-circle-outline" size={18} color={COLORES.BLANCO} />
              <Text style={styles.textoBotonEstadistica}>
                Sin: {medicinas.filter(m => m && m.stock === 0).length}
              </Text>
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
      <Modal
        animationType="slide"
        transparent
        visible={modalAgregarVisible}
        onRequestClose={() => { setModalAgregarVisible(false); setMedicinaSeleccionada(null); }}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>{medicinaSeleccionada ? 'Editar Medicina' : 'Nueva Medicina'}</Text>
              <TouchableOpacity onPress={() => { setModalAgregarVisible(false); setMedicinaSeleccionada(null); }}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalFormulario}>
              <Text style={styles.modalLabel}>Nombre *</Text>
              <TextInput style={styles.input} value={nuevaMedicina.nombre} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, nombre: text })} placeholder="Ej: Paracetamol" />

              <Text style={styles.modalLabel}>Dosis *</Text>
              <TextInput style={styles.input} value={nuevaMedicina.dosis} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, dosis: text })} placeholder="Ej: 500mg" />

              <Text style={styles.modalLabel}>Horarios *</Text>
              <View style={styles.horariosContainer}>
                {horariosPredefinidos.map(horario => {
                  const seleccionado = nuevaMedicina.horarios.some(h => h.id === horario.id);
                  return (
                    <TouchableOpacity
                      key={horario.id}
                      style={[styles.opcionHorario, seleccionado && { backgroundColor: horario.color, borderColor: horario.color }]}
                      onPress={() => seleccionarHorario(horario.id)}
                    >
                      <Icon name={horario.icono} size={20} color={seleccionado ? COLORES.BLANCO : horario.color} />
                      <Text style={[styles.textoOpcionHorario, seleccionado && { color: COLORES.BLANCO, fontWeight: 'bold' }]}>
                        {horario.nombre}
                      </Text>
                      <Text style={[styles.horaOpcion, seleccionado && { color: COLORES.BLANCO }]}>{horario.hora}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>Frecuencia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.frecuenciasContainer}>
                {frecuencias.map(frec => (
                  <TouchableOpacity
                    key={frec.id}
                    style={[styles.opcionFrecuencia, nuevaMedicina.frecuencia === frec.id && styles.opcionFrecuenciaSeleccionada]}
                    onPress={() => setNuevaMedicina({ ...nuevaMedicina, frecuencia: frec.id })}
                  >
                    <Icon name={frec.icono} size={18} color={nuevaMedicina.frecuencia === frec.id ? COLORES.BLANCO : COLORES.GRIS_OSCURO} />
                    <Text style={[styles.textoOpcionFrecuencia, nuevaMedicina.frecuencia === frec.id && styles.textoOpcionFrecuenciaSeleccionada]}>
                      {frec.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.filaInputs}>
                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Stock actual</Text>
                  <TextInput style={styles.input} value={nuevaMedicina.stock} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, stock: text })} keyboardType="numeric" />
                </View>
                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Stock mínimo</Text>
                  <TextInput style={styles.input} value={nuevaMedicina.stock_minimo} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, stock_minimo: text })} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.modalLabel}>Duración (días)</Text>
              <TextInput style={styles.input} value={nuevaMedicina.duracion} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, duracion: text })} keyboardType="numeric" placeholder="Opcional" />

              <Text style={styles.modalLabel}>Propósito</Text>
              <TextInput style={styles.input} value={nuevaMedicina.proposito} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, proposito: text })} />

              <Text style={styles.modalLabel}>Instrucciones</Text>
              <TextInput style={[styles.input, styles.textArea]} value={nuevaMedicina.instrucciones} onChangeText={text => setNuevaMedicina({ ...nuevaMedicina, instrucciones: text })} multiline numberOfLines={3} />
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity style={styles.botonModalCancelar} onPress={() => { setModalAgregarVisible(false); setMedicinaSeleccionada(null); }}>
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              {medicinaSeleccionada && (
                <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]} onPress={() => eliminarMedicina(medicinaSeleccionada.id)}>
                  <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarMedicina}>
                <Text style={styles.textoBotonModalAccion}>{medicinaSeleccionada ? 'Actualizar' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de estadísticas */}
      {renderModalEstadisticas()}

      {/* Notificación */}
      {notificacion.visible && (
        <Animated.View
          style={[
            styles.notificacionContainer,
            {
              opacity: animNotificacion,
              transform: [{
                translateY: animNotificacion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.notificacionContenido}>
            <Icon name="checkmark-circle" size={20} color={COLORES.BLANCO} style={{ marginRight: 10 }} />
            <Text style={styles.notificacionTexto}>{notificacion.mensaje}</Text>
          </View>
        </Animated.View>
      )}
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

  filtrosContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORES.BLANCO,
  },
  filtroBoton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  filtroBotonActivo: { backgroundColor: COLORES.AZUL_CIELO },
  textoFiltro: { fontSize: 14, color: COLORES.GRIS_OSCURO },
  textoFiltroActivo: { color: COLORES.BLANCO, fontWeight: 'bold' },

  contenedorScroll: { padding: 15, paddingBottom: 80 },

  tablaContainer: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },

  // --- CABECERA Y FILAS REDISEÑADAS ---
  filaCabecera: {
    flexDirection: 'row',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  textoCabecera: { color: COLORES.BLANCO, fontSize: 12, fontWeight: 'bold' },

  columnaNombre: { flex: 1.6, paddingHorizontal: 4 },
  columnaDosis: { flex: 0.6, paddingHorizontal: 4 },
  columnaHorarios: { flex: 2.6, flexDirection: 'row', paddingHorizontal: 4 },
  columnaAcciones: { flex: 0.8, paddingHorizontal: 4 },

  horarioCabeceraItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCabeceraHorario: { fontWeight: 'bold', marginLeft: 2 },

  filaMedicina: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    minHeight: 55,
  },
  textoMedicinaNombre: { fontSize: 13, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 2 },
  textoProposito: { fontSize: 10, color: COLORES.GRIS_OSCURO, fontStyle: 'italic' },
  textoDosis: { fontSize: 12, color: COLORES.TEXTO_OSCURO, textAlign: 'center' },

  horarioItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 3,
    backgroundColor: COLORES.GRIS_CLARO,
    minHeight: 36,
    position: 'relative',
  },
  horarioItemActivo: {
    backgroundColor: COLORES.AZUL_CIELO + '30',
    borderWidth: 1,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  horarioItemCompletado: {
    backgroundColor: COLORES.EXITO + '30',
    borderColor: COLORES.EXITO,
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORES.BLANCO,
    borderRadius: 10,
  },

  botonAccion: { padding: 4, marginHorizontal: 1 },

  sinMedicinas: { padding: 30, alignItems: 'center' },
  textoSinMedicinas: { fontSize: 16, color: COLORES.GRIS_OSCURO, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  subtextoSinMedicinas: { fontSize: 12, color: COLORES.GRIS_MEDIO, textAlign: 'center' },

  seccion: { marginBottom: 25 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 15, paddingHorizontal: 5 },

  contenedorFrecuentes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tarjetaFrecuente: {
    width: '48%',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  encabezadoFrecuente: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  nombreFrecuente: { fontSize: 14, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginLeft: 6, flex: 1 },
  dosisFrecuente: { fontSize: 12, color: COLORES.AZUL_CIELO_OSCURO, fontWeight: '600', marginBottom: 4 },
  horariosFrecuente: { fontSize: 10, color: COLORES.GRIS_OSCURO, fontStyle: 'italic' },

  estadisticasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 20,
  },
  botonEstadistica: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  textoBotonEstadistica: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORES.BLANCO,
  },

  botonFlotante: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  // Modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: '90%' },
  modalEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  modalFormulario: { padding: 20, maxHeight: Dimensions.get('window').height * 0.7 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 10, padding: 12, fontSize: 14, color: COLORES.TEXTO_OSCURO },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  filaInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  inputMitad: { width: '48%' },

  horariosContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  opcionHorario: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginBottom: 8,
  },
  textoOpcionHorario: { fontSize: 12, color: COLORES.TEXTO_OSCURO, marginLeft: 6, flex: 1 },
  horaOpcion: { fontSize: 10, color: COLORES.GRIS_OSCURO },

  frecuenciasContainer: { flexDirection: 'row', marginBottom: 5 },
  opcionFrecuencia: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginRight: 8,
  },
  opcionFrecuenciaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO_OSCURO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoOpcionFrecuencia: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginLeft: 4 },
  textoOpcionFrecuenciaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  modalBotones: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonModalCancelar: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, alignItems: 'center', marginRight: 10 },
  textoBotonModalCancelar: { fontSize: 14, fontWeight: '600', color: COLORES.GRIS_OSCURO },
  botonModalAccion: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  textoBotonModalAccion: { fontSize: 14, fontWeight: '600', color: COLORES.BLANCO },

  // Estadísticas modal
  botonStock: { padding: 6, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 6 },
  inputStock: { backgroundColor: COLORES.BLANCO, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, borderRadius: 6, padding: 2, fontSize: 14 },

  // Notificación
  notificacionContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  notificacionContenido: { flexDirection: 'row', alignItems: 'center' },
  notificacionTexto: { color: COLORES.BLANCO, fontSize: 13, flex: 1 },
});