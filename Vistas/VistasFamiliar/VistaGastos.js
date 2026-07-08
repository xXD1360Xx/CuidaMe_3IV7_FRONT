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
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
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
  TURQUESA: '#4DB6AC',
  NARANJA: '#FF9800',
  ROSA: '#F06292',
  INDIGO: '#7986CB',
  CELESTE: '#4FC3F7',
  LIMA: '#D4E157',
};

const { width } = Dimensions.get('window');

export default function VistaGastos({ navigation }) {
  const [gastosFuturos, setGastosFuturos] = useState([]);
  const [gastosPasados, setGastosPasados] = useState([]);
  const [familiares, setFamiliares] = useState([]);
  const [aportesFamiliares, setAportesFamiliares] = useState([]);
  const [distribucionSugerida, setDistribucionSugerida] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [mesActual, setMesActual] = useState('');
  const [anioActual, setAnioActual] = useState('');
  const [esAdministrador, setEsAdministrador] = useState(false);

  // Estados para modales
  const [modalTipo, setModalTipo] = useState(''); // 'agregar', 'editar', 'ver'
  const [gastoSeleccionado, setGastoSeleccionado] = useState(null);

  // Estados para formularios
  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    fecha: '',
    categoria: 'medicina',
    prioridad: 'media',
    estado: 'pendiente',
    notas: '',
    responsableId: '',
    compartido: true,
  });

  // Estados para configuración de porcentajes
  const [porcentajes, setPorcentajes] = useState({});
  const [totalPorcentaje, setTotalPorcentaje] = useState(0);

  // Fecha picker
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // Categorías de gastos
  const CATEGORIAS = [
    { id: 'medicina', nombre: 'Medicinas', icono: 'medkit-outline', color: COLORES.ROJO_CLARO },
    { id: 'cita_medica', nombre: 'Citas Médicas', icono: 'medical-outline', color: COLORES.EXITO },
    { id: 'alimentos', nombre: 'Alimentos', icono: 'restaurant-outline', color: COLORES.AMARILLO_PLATANO },
    { id: 'transporte', nombre: 'Transporte', icono: 'car-outline', color: COLORES.AZUL_CIELO },
    { id: 'cuidador', nombre: 'Cuidador', icono: 'person-outline', color: COLORES.MORADO },
    { id: 'equipamiento', nombre: 'Equipamiento', icono: 'cube-outline', color: COLORES.TURQUESA },
    { id: 'servicios', nombre: 'Servicios', icono: 'construct-outline', color: COLORES.GRIS_OSCURO },
    { id: 'otros', nombre: 'Otros', icono: 'ellipsis-horizontal-outline', color: COLORES.INDIGO },
  ];

  const PRIORIDADES = [
    { id: 'alta', nombre: 'Alta', color: COLORES.ERROR },
    { id: 'media', nombre: 'Media', color: COLORES.AMARILLO_PLATANO },
    { id: 'baja', nombre: 'Baja', color: COLORES.EXITO },
  ];

  // ============================================================
  // Carga de datos
  // ============================================================
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);

      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) {
        console.warn('No se encontró usuarioId');
        setCargando(false);
        return;
      }

      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioActual(usuario);
        setEsAdministrador(usuario.rol === 'familiar_admin');
      }

      const ahora = new Date();
      setMesActual(ahora.toLocaleString('es-ES', { month: 'long' }));
      setAnioActual(ahora.getFullYear().toString());

      const familiaresResponse = await servicioAPI.obtenerFamiliares(usuarioId);
      if (familiaresResponse.exito) {
        const lista = familiaresResponse.familiares || [];
        setFamiliares(lista);
        if (lista.length > 0) {
          const porcentajeEquitativo = (100 / lista.length).toFixed(2);
          const inicial = {};
          lista.forEach(f => { inicial[f.id] = porcentajeEquitativo; });
          setPorcentajes(inicial);
          setTotalPorcentaje(100);
        }
      }

      const gastosFuturosResponse = await servicioAPI.obtenerGastosFuturos(usuarioId);
      if (gastosFuturosResponse.exito) {
        setGastosFuturos(gastosFuturosResponse.gastos || []);
      }

      const gastosMesResponse = await servicioAPI.obtenerGastosMesActual(usuarioId);
      if (gastosMesResponse.exito) {
        setGastosPasados(gastosMesResponse.gastos || []);
      }

      const aportesResponse = await servicioAPI.obtenerAportesMesActual(usuarioId);
      if (aportesResponse.exito) {
        setAportesFamiliares(aportesResponse.aportes || []);
      }

      calcularDistribucionSugerida();
    } catch (error) {
      console.error('Error cargando datos de gastos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
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

  // ============================================================
  // Cálculos y utilidades
  // ============================================================
  const calcularDistribucionSugerida = useCallback(() => {
    const totalGastosFuturos = gastosFuturos.reduce((total, gasto) =>
      total + parseFloat(gasto.monto || 0), 0
    );

    const distribucion = familiares.map(familiar => {
      const porcentaje = parseFloat(porcentajes[familiar.id] || 0);
      const montoSugerido = (totalGastosFuturos * porcentaje) / 100;

      return {
        familiarId: familiar.id,
        nombre: familiar.nombre || 'Sin nombre',
        apellido: familiar.apellido || '',
        porcentaje: porcentaje,
        montoSugerido: parseFloat(montoSugerido.toFixed(2)),
        aportado: 0,
      };
    });

    setDistribucionSugerida(distribucion);
  }, [gastosFuturos, familiares, porcentajes]);

  const calcularTotalGastosFuturos = () => {
    return gastosFuturos.reduce((total, gasto) =>
      total + parseFloat(gasto.monto || 0), 0
    ).toFixed(2);
  };

  const calcularTotalAportado = () => {
    return aportesFamiliares.reduce((total, aporte) =>
      total + parseFloat(aporte.monto || 0), 0
    ).toFixed(2);
  };

  const calcularSaldoPendiente = () => {
    const totalAportado = parseFloat(calcularTotalAportado());
    const totalGastos = parseFloat(calcularTotalGastosFuturos());
    return (totalGastos - totalAportado).toFixed(2);
  };

  const calcularAportePorFamiliar = (familiarId) => {
    return aportesFamiliares
      .filter(aporte => aporte.familiarId === familiarId || aporte.usuario_id === familiarId)
      .reduce((total, aporte) => total + parseFloat(aporte.monto || 0), 0)
      .toFixed(2);
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Fecha no disponible';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha)) return 'Fecha inválida';
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatearMoneda = (monto) => {
    if (monto === undefined || monto === null || isNaN(monto)) return '$0.00';
    return `$${parseFloat(monto).toFixed(2)}`;
  };

  const obtenerColorGrafico = (index) => {
    const colores = [
      COLORES.ROJO_CLARO,
      COLORES.AMARILLO_PLATANO,
      COLORES.EXITO,
      COLORES.AZUL_CIELO,
      COLORES.MORADO,
      COLORES.TURQUESA,
      COLORES.INDIGO,
      COLORES.NARANJA,
      COLORES.ROSA,
      COLORES.LIMA,
    ];
    return colores[index % colores.length];
  };

  const prepararDatosGrafico = () => {
    const datos = familiares.map((familiar, index) => {
      const aporte = calcularAportePorFamiliar(familiar.id);
      return {
        nombre: familiar.nombre ? familiar.nombre.charAt(0) : '?',
        apellido: familiar.apellido || '',
        aporte: parseFloat(aporte),
        color: obtenerColorGrafico(index),
      };
    }).filter(item => item.aporte > 0);
    return datos;
  };

  // ============================================================
  // Gestión de modales
  // ============================================================
  const abrirModalGasto = (tipo, gasto = null) => {
    setModalTipo(tipo);
    setGastoSeleccionado(gasto);

    if (gasto) {
      setFormData({
        descripcion: gasto.descripcion || '',
        monto: gasto.monto?.toString() || '',
        fecha: gasto.fecha || '',
        categoria: gasto.categoria || 'medicina',
        prioridad: gasto.prioridad || 'media',
        estado: gasto.estado || 'pendiente',
        notas: gasto.notas || '',
        responsableId: gasto.responsableId || (gasto.responsable ? gasto.responsable.id : '') || '',
        compartido: gasto.compartido !== false,
      });
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      setFormData({
        descripcion: '',
        monto: '',
        fecha: hoy,
        categoria: 'medicina',
        prioridad: 'media',
        estado: 'pendiente',
        notas: '',
        responsableId: usuarioActual?.id || '',
        compartido: true,
      });
    }

    setModalVisible(true);
  };

  // ============================================================
  // Envío de notificaciones
  // ============================================================
  const enviarNotificacionGasto = async (usuarioId, mensaje, tipo = 'gasto') => {
    try {
      if (!usuarioId) return;
      // Asumimos que existe servicioAPI.enviarNotificacion
      // Si no existe, puedes usar servicioAPI.crearNotificacion o similar.
      // Aquí lo dejamos genérico.
      if (servicioAPI.enviarNotificacion) {
        await servicioAPI.enviarNotificacion(usuarioId, {
          mensaje,
          tipo,
          referencia: 'gasto',
        });
      } else {
        console.warn('No se encontró servicioAPI.enviarNotificacion');
      }
    } catch (error) {
      console.error('Error enviando notificación:', error);
    }
  };

  // ============================================================
  // CRUD de gastos
  // ============================================================
  const guardarGasto = async () => {
    try {
      if (!formData.descripcion.trim()) {
        Alert.alert('Error', 'Debes ingresar la descripción');
        return;
      }
      if (!formData.monto.trim() || parseFloat(formData.monto) <= 0) {
        Alert.alert('Error', 'Debes ingresar un monto válido');
        return;
      }
      if (!formData.fecha.trim()) {
        Alert.alert('Error', 'Debes ingresar la fecha');
        return;
      }

      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) {
        Alert.alert('Error', 'No se pudo identificar al usuario');
        return;
      }

      const datosGasto = {
        ...formData,
        monto: parseFloat(formData.monto),
        fecha: formData.fecha, // Ya en YYYY-MM-DD
        compartido: formData.compartido,
        responsableId: formData.compartido ? null : formData.responsableId,
      };

      let response;
      let esNuevo = false;
      if (gastoSeleccionado) {
        response = await servicioAPI.actualizarGasto(usuarioId, gastoSeleccionado.id, datosGasto);
      } else {
        response = await servicioAPI.crearGasto(usuarioId, datosGasto);
        esNuevo = true;
      }

      if (response.exito) {
        Alert.alert('Éxito', gastoSeleccionado ? 'Gasto actualizado' : 'Gasto agregado');
        setModalVisible(false);

        // Si el gasto no es compartido y tiene responsable, enviar notificación
        if (!formData.compartido && formData.responsableId) {
          const mensaje = `Se te ha asignado un gasto de "${formData.descripcion}" por ${formatearMoneda(formData.monto)}`;
          await enviarNotificacionGasto(formData.responsableId, mensaje);
        }

        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'Error guardando gasto');
      }
    } catch (error) {
      console.error('Error guardando gasto:', error);
      Alert.alert('Error', 'No se pudo guardar el gasto');
    }
  };

  const eliminarGasto = (gastoId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar este gasto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const usuarioId = await servicioAPI.obtenerUsuarioActualId();
              if (!usuarioId) return;
              const response = await servicioAPI.eliminarGasto(usuarioId, gastoId);
              if (response.exito) {
                Alert.alert('Éxito', 'Gasto eliminado');
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el gasto');
            }
          },
        },
      ]
    );
  };

  const marcarComoPagado = async (gastoId) => {
    try {
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) return;
      const response = await servicioAPI.marcarGastoPagado(usuarioId, gastoId);
      if (response.exito) {
        Alert.alert('Éxito', 'Gasto marcado como pagado');
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar como pagado');
    }
  };

  // ============================================================
  // Configuración de porcentajes
  // ============================================================
  const actualizarPorcentaje = (familiarId, valor) => {
    const nuevoValor = Math.max(0, Math.min(100, parseFloat(valor) || 0));
    const nuevosPorcentajes = { ...porcentajes };
    nuevosPorcentajes[familiarId] = nuevoValor.toFixed(2);
    setPorcentajes(nuevosPorcentajes);
    const total = Object.values(nuevosPorcentajes).reduce((sum, val) =>
      sum + parseFloat(val || 0), 0
    );
    setTotalPorcentaje(parseFloat(total.toFixed(2)));
  };

  const guardarPorcentajes = async () => {
    if (totalPorcentaje !== 100) {
      Alert.alert('Error', `La suma de porcentajes debe ser 100%. Actual: ${totalPorcentaje}%`);
      return;
    }
    try {
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) return;
      const response = await servicioAPI.guardarDistribucionPorcentajes(usuarioId, porcentajes);
      if (response.exito) {
        Alert.alert('Éxito', 'Distribución guardada');
        setModalConfigVisible(false);
        calcularDistribucionSugerida();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la distribución');
    }
  };

  const restablecerEquitativo = () => {
    if (familiares.length === 0) return;
    const porcentajeEquitativo = (100 / familiares.length).toFixed(2);
    const equitativos = {};
    familiares.forEach(f => { equitativos[f.id] = porcentajeEquitativo; });
    setPorcentajes(equitativos);
    setTotalPorcentaje(100);
  };

  // ============================================================
  // Renderización
  // ============================================================
  const renderTarjetaGasto = ({ item }) => {
    const categoria = CATEGORIAS.find(c => c.id === item.categoria);
    const prioridad = PRIORIDADES.find(p => p.id === item.prioridad);

    return (
      <TouchableOpacity
        style={styles.tarjetaGasto}
        onPress={() => abrirModalGasto('ver', item)}
        activeOpacity={0.7}
      >
        <View style={styles.encabezadoGasto}>
          <View style={[styles.iconoCategoria, { backgroundColor: `${categoria?.color || COLORES.GRIS_MEDIO}20` }]}>
            <Icon name={categoria?.icono || 'help-outline'} size={20} color={categoria?.color || COLORES.GRIS_MEDIO} />
          </View>
          <View style={styles.infoPrincipalGasto}>
            <Text style={styles.descripcionGasto}>{item.descripcion}</Text>
            <Text style={styles.fechaGasto}>{formatearFecha(item.fecha)}</Text>
          </View>
          <View style={styles.montoContainer}>
            <Text style={styles.montoGasto}>{formatearMoneda(item.monto)}</Text>
          </View>
        </View>

        <View style={styles.detallesGasto}>
          <View style={[styles.badgePrioridad, { backgroundColor: prioridad?.color || COLORES.GRIS_MEDIO }]}>
            <Text style={styles.textoBadgePrioridad}>{prioridad?.nombre || 'Media'}</Text>
          </View>
          <View style={[
            styles.badgeEstado,
            { backgroundColor: item.estado === 'pagado' ? COLORES.EXITO + '20' : COLORES.AMARILLO_PLATANO + '20' }
          ]}>
            <Text style={[
              styles.textoBadgeEstado,
              { color: item.estado === 'pagado' ? COLORES.EXITO : COLORES.AMARILLO_PLATANO }
            ]}>
              {item.estado === 'pagado' ? '✓ Pagado' : '⏳ Pendiente'}
            </Text>
          </View>
          {item.responsable && (
            <Text style={styles.textoResponsable}>Por: {item.responsable}</Text>
          )}
        </View>

        <View style={styles.accionesGasto}>
          {item.estado !== 'pagado' && esAdministrador && (
            <TouchableOpacity
              style={styles.botonAccionGasto}
              onPress={() => marcarComoPagado(item.id)}
            >
              <Icon name="checkmark-outline" size={16} color={COLORES.EXITO} />
              <Text style={styles.textoBotonAccionGasto}>Marcar pagado</Text>
            </TouchableOpacity>
          )}
          {esAdministrador && (
            <>
              <TouchableOpacity
                style={styles.botonAccionGasto}
                onPress={() => abrirModalGasto('editar', item)}
              >
                <Icon name="create-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.textoBotonAccionGasto}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botonAccionGasto}
                onPress={() => eliminarGasto(item.id)}
              >
                <Icon name="trash-outline" size={16} color={COLORES.ERROR} />
                <Text style={styles.textoBotonAccionGasto}>Eliminar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItemDistribucion = ({ item }) => {
    const aporte = parseFloat(calcularAportePorFamiliar(item.familiarId));
    const diferencia = item.montoSugerido - aporte;
    return (
      <View style={styles.itemDistribucion}>
        <View style={styles.infoFamiliar}>
          <Text style={styles.nombreFamiliar}>
            {item.nombre || 'Sin nombre'} {item.apellido || ''}
          </Text>
          <Text style={styles.porcentajeFamiliar}>
            {item.porcentaje}% del total
          </Text>
        </View>
        <View style={styles.montosFamiliar}>
          <Text style={styles.montoAportado}>
            Aportado: {formatearMoneda(aporte)}
          </Text>
          <Text style={styles.montoSugerido}>
            Sugerido: {formatearMoneda(item.montoSugerido)}
          </Text>
          <Text style={[
            styles.montoDiferencia,
            { color: diferencia >= 0 ? COLORES.EXITO : COLORES.ERROR }
          ]}>
            {diferencia >= 0 ? '✓ ' : '✗ '}
            {formatearMoneda(Math.abs(diferencia))}
            {diferencia >= 0 ? ' restante' : ' excedente'}
          </Text>
        </View>
      </View>
    );
  };

  const renderGrafico = () => {
    const datos = prepararDatosGrafico();
    if (datos.length === 0) {
      return (
        <View style={styles.sinDatosGrafico}>
          <Icon name="bar-chart-outline" size={40} color={COLORES.GRIS_MEDIO} />
          <Text style={styles.textoSinDatosGrafico}>No hay aportes para mostrar</Text>
        </View>
      );
    }

    const maxAporte = Math.max(...datos.map(d => d.aporte));
    const alturaMaxima = 150;

    return (
      <View style={styles.contenedorGrafico}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.barrasContainer}>
            {datos.map((item, index) => {
              const altura = maxAporte > 0 ? (item.aporte / maxAporte) * alturaMaxima : 0;
              return (
                <View key={index} style={styles.barraItem}>
                  <View style={[styles.barra, { height: Math.max(10, altura), backgroundColor: item.color }]} />
                  <Text style={styles.barraLabel}>{item.nombre}</Text>
                  <Text style={styles.barraMonto}>{formatearMoneda(item.aporte)}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando gastos...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const totalGastosFuturos = calcularTotalGastosFuturos();
  const totalAportado = calcularTotalAportado();
  const saldoPendiente = calcularSaldoPendiente();

  // ============================================================
  // Modal de fecha (DateTimePicker)
  // ============================================================
  const showDatePicker = () => setDatePickerVisible(true);
  const hideDatePicker = () => setDatePickerVisible(false);

  const handleConfirmDate = (date) => {
    hideDatePicker();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setFormData({ ...formData, fecha: `${year}-${month}-${day}` });
  };

  // ============================================================
  // Render principal
  // ============================================================
  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Gestión de Gastos</Text>
            <Text style={styles.subtituloPrincipal}>
              {mesActual} {anioActual} • {gastosFuturos.length} gasto(s)
            </Text>
          </View>
          <TouchableOpacity style={styles.botonRefrescar} onPress={onRefresh} disabled={refrescando}>
            <Icon name="refresh-outline" size={24} color={refrescando ? COLORES.GRIS_OSCURO : COLORES.TEXTO_OSCURO} />
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORES.AMARILLO_PLATANO]} />}
          contentContainerStyle={styles.contenedorScroll}
        >
          {/* Resumen Financiero */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Resumen Financiero</Text>
            <View style={styles.contenedorResumen}>
              <View style={styles.itemResumen}>
                <View style={[styles.iconoResumen, { backgroundColor: COLORES.ROJO_CLARO + '20' }]}>
                  <Icon name="trending-up-outline" size={24} color={COLORES.ROJO_CLARO} />
                </View>
                <Text style={styles.valorResumen}>{formatearMoneda(totalGastosFuturos)}</Text>
                <Text style={styles.labelResumen}>Gastos Futuros</Text>
              </View>
              <View style={styles.separadorResumen} />
              <View style={styles.itemResumen}>
                <View style={[styles.iconoResumen, { backgroundColor: COLORES.EXITO + '20' }]}>
                  <Icon name="wallet-outline" size={24} color={COLORES.EXITO} />
                </View>
                <Text style={styles.valorResumen}>{formatearMoneda(totalAportado)}</Text>
                <Text style={styles.labelResumen}>Aportado</Text>
              </View>
              <View style={styles.separadorResumen} />
              <View style={styles.itemResumen}>
                <View style={[styles.iconoResumen, { backgroundColor: parseFloat(saldoPendiente) >= 0 ? COLORES.AMARILLO_PLATANO + '20' : COLORES.EXITO + '20' }]}>
                  <Icon name={parseFloat(saldoPendiente) >= 0 ? "alert-outline" : "checkmark-outline"} size={24} color={parseFloat(saldoPendiente) >= 0 ? COLORES.AMARILLO_PLATANO : COLORES.EXITO} />
                </View>
                <Text style={[styles.valorResumen, { color: parseFloat(saldoPendiente) >= 0 ? COLORES.AMARILLO_PLATANO : COLORES.EXITO }]}>
                  {formatearMoneda(Math.abs(parseFloat(saldoPendiente)))}
                </Text>
                <Text style={styles.labelResumen}>
                  {parseFloat(saldoPendiente) >= 0 ? 'Pendiente' : 'Excedente'}
                </Text>
              </View>
            </View>
          </View>

          {/* Gráfico de Aportes */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="bar-chart-outline" size={24} color={COLORES.MORADO} />
              <Text style={styles.tituloSeccion}>Aportes por Familiar</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonConfig} onPress={() => setModalConfigVisible(true)}>
                  <Icon name="settings-outline" size={20} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            {renderGrafico()}
            <Text style={styles.textoAyudaGrafico}>
              💡 Comparativa de aportes este mes. Toca configurar para ajustar porcentajes.
            </Text>
          </View>

          {/* Distribución Sugerida */}
          {distribucionSugerida.length > 0 && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="calculator-outline" size={24} color={COLORES.TURQUESA} />
                <Text style={styles.tituloSeccion}>Distribución Sugerida</Text>
                <Text style={styles.totalSugerido}>
                  Total: {formatearMoneda(totalGastosFuturos)}
                </Text>
              </View>
              <View style={styles.contenedorDistribucion}>
                <FlatList
                  data={distribucionSugerida}
                  renderItem={renderItemDistribucion}
                  keyExtractor={item => item.familiarId.toString()}
                  scrollEnabled={false}
                />
              </View>
            </View>
          )}

          {/* Gastos Futuros */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="calendar-outline" size={24} color={COLORES.NARANJA} />
              <Text style={styles.tituloSeccion}>Gastos Futuros</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModalGasto('agregar')}>
                  <Icon name="add-outline" size={22} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            {gastosFuturos.length > 0 ? (
              <FlatList
                data={gastosFuturos}
                renderItem={renderTarjetaGasto}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.sinGastos}>
                <Icon name="calendar-outline" size={60} color={COLORES.GRIS_MEDIO} />
                <Text style={styles.textoSinGastos}>No hay gastos futuros</Text>
                <Text style={styles.subtextoSinGastos}>
                  {esAdministrador ? 'Agrega gastos programados' : 'El administrador debe agregar gastos'}
                </Text>
              </View>
            )}
          </View>

          {/* Historial de Gastos Recientes */}
          {gastosPasados.length > 0 && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="time-outline" size={24} color={COLORES.GRIS_OSCURO} />
                <Text style={styles.tituloSeccion}>Gastos Recientes</Text>
              </View>
              <View style={styles.contenedorHistorial}>
                {gastosPasados.slice(0, 3).map((gasto) => {
                  const categoria = CATEGORIAS.find(c => c.id === gasto.categoria);
                  return (
                    <TouchableOpacity
                      key={gasto.id}
                      style={styles.itemHistorial}
                      onPress={() => abrirModalGasto('ver', gasto)}
                    >
                      <View style={[styles.iconoHistorial, { backgroundColor: `${categoria?.color || COLORES.GRIS_MEDIO}20` }]}>
                        <Icon name={categoria?.icono || 'help-outline'} size={16} color={categoria?.color || COLORES.GRIS_MEDIO} />
                      </View>
                      <View style={styles.infoHistorial}>
                        <Text style={styles.descripcionHistorial}>{gasto.descripcion}</Text>
                        <Text style={styles.fechaHistorial}>{formatearFecha(gasto.fecha)}</Text>
                      </View>
                      <Text style={styles.montoHistorial}>{formatearMoneda(gasto.monto)}</Text>
                      <Icon name="chevron-forward-outline" size={18} color={COLORES.GRIS_MEDIO} />
                    </TouchableOpacity>
                  );
                })}
                {gastosPasados.length > 3 && (
                  <TouchableOpacity style={styles.botonVerMas}>
                    <Text style={styles.textoBotonVerMas}>Ver {gastosPasados.length - 3} más</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Acciones Rápidas */}
          {esAdministrador && (
            <View style={styles.seccion}>
              <View style={styles.contenedorAccionesRapidas}>
                <TouchableOpacity style={styles.accionRapida} onPress={() => abrirModalGasto('agregar')}>
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.EXITO + '20' }]}>
                    <Icon name="add-outline" size={24} color={COLORES.EXITO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Agregar gasto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.accionRapida} onPress={() => setModalConfigVisible(true)}>
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.AZUL_CIELO + '20' }]}>
                    <Icon name="settings-outline" size={24} color={COLORES.AZUL_CIELO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Configurar %</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Botón flotante */}
        {esAdministrador && (
          <TouchableOpacity style={styles.botonFlotante} onPress={() => abrirModalGasto('agregar')}>
            <Icon name="add-outline" size={30} color={COLORES.BLANCO} />
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* ============================================================
          MODAL DE GASTO (AGREGAR/EDITAR/VER)
      ============================================================ */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setGastoSeleccionado(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalFondo}
          activeOpacity={1}
          onPress={() => {
            setModalVisible(false);
            setGastoSeleccionado(null);
          }}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>
                  {modalTipo === 'ver' ? 'Detalles del Gasto' :
                    modalTipo === 'editar' ? 'Editar Gasto' : 'Nuevo Gasto'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setModalVisible(false);
                  setGastoSeleccionado(null);
                }}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalFormulario}>
                {modalTipo === 'ver' ? (
                  // ======= Vista de detalles =======
                  <View style={styles.vistaInformacion}>
                    <View style={styles.infoItemModal}>
                      <Text style={styles.labelModal}>Descripción:</Text>
                      <Text style={styles.valorModal}>{gastoSeleccionado?.descripcion}</Text>
                    </View>
                    <View style={styles.infoItemModal}>
                      <Text style={styles.labelModal}>Monto:</Text>
                      <Text style={styles.valorModal}>{formatearMoneda(gastoSeleccionado?.monto)}</Text>
                    </View>
                    <View style={styles.infoItemModal}>
                      <Text style={styles.labelModal}>Fecha:</Text>
                      <Text style={styles.valorModal}>{formatearFecha(gastoSeleccionado?.fecha)}</Text>
                    </View>
                    <View style={styles.infoItemModal}>
                      <Text style={styles.labelModal}>Categoría:</Text>
                      <Text style={styles.valorModal}>{CATEGORIAS.find(c => c.id === gastoSeleccionado?.categoria)?.nombre}</Text>
                    </View>
                    <View style={styles.infoItemModal}>
                      <Text style={styles.labelModal}>Prioridad:</Text>
                      <View style={[styles.badgeModal, { backgroundColor: PRIORIDADES.find(p => p.id === gastoSeleccionado?.prioridad)?.color + '20' }]}>
                        <Text style={[styles.textoBadgeModal, { color: PRIORIDADES.find(p => p.id === gastoSeleccionado?.prioridad)?.color }]}>
                          {PRIORIDADES.find(p => p.id === gastoSeleccionado?.prioridad)?.nombre?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoItemModal}>
                      <Text style={styles.labelModal}>Estado:</Text>
                      <View style={[styles.badgeModal, { backgroundColor: gastoSeleccionado?.estado === 'pagado' ? COLORES.EXITO + '20' : COLORES.AMARILLO_PLATANO + '20' }]}>
                        <Text style={[styles.textoBadgeModal, { color: gastoSeleccionado?.estado === 'pagado' ? COLORES.EXITO : COLORES.AMARILLO_PLATANO }]}>
                          {gastoSeleccionado?.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
                        </Text>
                      </View>
                    </View>
                    {gastoSeleccionado?.notas && (
                      <View style={styles.infoItemModal}>
                        <Text style={styles.labelModal}>Notas:</Text>
                        <Text style={styles.valorModal}>{gastoSeleccionado.notas}</Text>
                      </View>
                    )}
                    {gastoSeleccionado?.responsable && (
                      <View style={styles.infoItemModal}>
                        <Text style={styles.labelModal}>Responsable:</Text>
                        <Text style={styles.valorModal}>{gastoSeleccionado.responsable}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  // ======= Formulario =======
                  <>
                    <Text style={styles.modalLabel}>Descripción *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.descripcion}
                      onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                      placeholder="Ej: Medicina para la presión, Cita con cardiólogo..."
                      placeholderTextColor={COLORES.GRIS_MEDIO}
                    />

                    <Text style={styles.modalLabel}>Monto ($) *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.monto}
                      onChangeText={(text) => setFormData({ ...formData, monto: text })}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={COLORES.GRIS_MEDIO}
                    />

                    <Text style={styles.modalLabel}>Fecha</Text>
                    <TouchableOpacity style={styles.inputFecha} onPress={showDatePicker}>
                      <Text style={styles.textoInputFecha}>
                        {formData.fecha ? formatearFecha(formData.fecha) : 'Seleccionar fecha'}
                      </Text>
                      <Icon name="calendar-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    </TouchableOpacity>

                    <Text style={styles.modalLabel}>Categoría</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasContainer}>
                      {CATEGORIAS.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.opcionCategoria, formData.categoria === cat.id && styles.opcionCategoriaSeleccionada]}
                          onPress={() => setFormData({ ...formData, categoria: cat.id })}
                        >
                          <Icon name={cat.icono} size={18} color={formData.categoria === cat.id ? COLORES.BLANCO : cat.color} />
                          <Text style={[styles.textoOpcionCategoria, formData.categoria === cat.id && styles.textoOpcionCategoriaSeleccionada]}>
                            {cat.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.modalLabel}>Prioridad</Text>
                    <View style={styles.prioridadesContainer}>
                      {PRIORIDADES.map(pri => (
                        <TouchableOpacity
                          key={pri.id}
                          style={[styles.opcionPrioridad, formData.prioridad === pri.id && { backgroundColor: pri.color }]}
                          onPress={() => setFormData({ ...formData, prioridad: pri.id })}
                        >
                          <Text style={[styles.textoOpcionPrioridad, formData.prioridad === pri.id && styles.textoOpcionPrioridadSeleccionada]}>
                            {pri.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.modalLabel}>Estado</Text>
                    <View style={styles.estadosContainer}>
                      <TouchableOpacity
                        style={[styles.opcionEstado, formData.estado === 'pendiente' && { backgroundColor: COLORES.AMARILLO_PLATANO }]}
                        onPress={() => setFormData({ ...formData, estado: 'pendiente' })}
                      >
                        <Text style={[styles.textoOpcionEstado, formData.estado === 'pendiente' && styles.textoOpcionEstadoSeleccionada]}>
                          Pendiente
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.opcionEstado, formData.estado === 'pagado' && { backgroundColor: COLORES.EXITO }]}
                        onPress={() => setFormData({ ...formData, estado: 'pagado' })}
                      >
                        <Text style={[styles.textoOpcionEstado, formData.estado === 'pagado' && styles.textoOpcionEstadoSeleccionada]}>
                          Pagado
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.opcionCompartido}>
                      <TouchableOpacity
                        style={styles.botonCompartido}
                        onPress={() => setFormData({ ...formData, compartido: !formData.compartido })}
                      >
                        <Icon name={formData.compartido ? "checkmark-circle" : "ellipse-outline"} size={24} color={formData.compartido ? COLORES.EXITO : COLORES.GRIS_MEDIO} />
                        <Text style={styles.textoCompartido}>
                          {formData.compartido ? 'Sí, compartir gasto' : 'No, gasto individual'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Selector de responsable si no es compartido */}
                    {!formData.compartido && (
                      <>
                        <Text style={styles.modalLabel}>Responsable</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={formData.responsableId}
                            onValueChange={(value) => setFormData({ ...formData, responsableId: value })}
                            style={styles.picker}
                          >
                            {familiares.map((familiar) => (
                              <Picker.Item
                                key={familiar.id}
                                label={`${familiar.nombre || ''} ${familiar.apellido || ''}`}
                                value={familiar.id}
                              />
                            ))}
                          </Picker>
                        </View>
                      </>
                    )}

                    <Text style={styles.modalLabel}>Notas adicionales</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.notas}
                      onChangeText={(text) => setFormData({ ...formData, notas: text })}
                      placeholder="Detalles adicionales sobre este gasto..."
                      multiline
                      numberOfLines={4}
                      placeholderTextColor={COLORES.GRIS_MEDIO}
                    />
                  </>
                )}
              </ScrollView>

              <View style={styles.modalBotones}>
                {modalTipo === 'ver' ? (
                  <>
                    <TouchableOpacity style={styles.botonModalSecundario} onPress={() => setModalVisible(false)}>
                      <Text style={styles.textoBotonModalSecundario}>Cerrar</Text>
                    </TouchableOpacity>
                    {esAdministrador && (
                      <>
                        <TouchableOpacity style={styles.botonModalPrincipal} onPress={() => {
                          setModalVisible(false);
                          abrirModalGasto('editar', gastoSeleccionado);
                        }}>
                          <Text style={styles.textoBotonModalPrincipal}>Editar</Text>
                        </TouchableOpacity>
                        {gastoSeleccionado?.estado !== 'pagado' && (
                          <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={() => {
                            setModalVisible(false);
                            marcarComoPagado(gastoSeleccionado.id);
                          }}>
                            <Text style={styles.textoBotonModalAccion}>Marcar Pagado</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalVisible(false)}>
                      <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                    </TouchableOpacity>
                    {modalTipo === 'editar' && esAdministrador && (
                      <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]} onPress={() => {
                        setModalVisible(false);
                        eliminarGasto(gastoSeleccionado.id);
                      }}>
                        <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]} onPress={guardarGasto}>
                      <Text style={styles.textoBotonModalAccion}>
                        {modalTipo === 'editar' ? 'Actualizar' : 'Guardar'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          MODAL CONFIGURACIÓN DE PORCENTAJES
      ============================================================ */}
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
          <TouchableWithoutFeedback>
            <View style={styles.modalContenido}>
              <View style={styles.modalEncabezado}>
                <Text style={styles.modalTitulo}>Configurar Porcentajes</Text>
                <TouchableOpacity onPress={() => setModalConfigVisible(false)}>
                  <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalFormulario}>
                <View style={styles.infoConfiguracion}>
                  <Icon name="calculator-outline" size={40} color={COLORES.TURQUESA} />
                  <Text style={styles.textoInfoConfig}>
                    Distribuye el porcentaje que cada familiar aportará a los gastos compartidos
                  </Text>
                </View>

                <View style={styles.totalPorcentajeContainer}>
                  <Text style={styles.labelTotalPorcentaje}>Total:</Text>
                  <Text style={[styles.valorTotalPorcentaje, { color: totalPorcentaje === 100 ? COLORES.EXITO : COLORES.ERROR }]}>
                    {totalPorcentaje}%
                  </Text>
                  {totalPorcentaje !== 100 && (
                    <Text style={styles.errorTotalPorcentaje}>Debe sumar exactamente 100%</Text>
                  )}
                </View>

                {familiares.map((familiar, index) => (
                  <View key={familiar.id} style={styles.itemConfigPorcentaje}>
                    <View style={styles.infoFamiliarConfig}>
                      <View style={[styles.avatarFamiliar, { backgroundColor: obtenerColorGrafico(index) }]}>
                        <Text style={styles.textoAvatar}>
                          {familiar.nombre ? familiar.nombre.charAt(0) : '?'}{familiar.apellido ? familiar.apellido.charAt(0) : ''}
                        </Text>
                      </View>
                      <View style={styles.nombreFamiliarConfig}>
                        <Text style={styles.textoNombreFamiliar}>
                          {familiar.nombre || 'Sin nombre'} {familiar.apellido || ''}
                        </Text>
                        <Text style={styles.textoRolFamiliar}>
                          {familiar.rol === 'familiar_administrador' ? 'Administrador' : 'Familiar'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.controlPorcentaje}>
                      <TouchableOpacity style={styles.botonMenos} onPress={() => {
                        const actual = parseFloat(porcentajes[familiar.id] || 0);
                        actualizarPorcentaje(familiar.id, actual - 5);
                      }}>
                        <Icon name="remove-outline" size={18} color={COLORES.GRIS_OSCURO} />
                      </TouchableOpacity>
                      <View style={styles.inputPorcentajeContainer}>
                        <TextInput
                          style={styles.inputPorcentaje}
                          value={porcentajes[familiar.id]?.toString() || '0'}
                          onChangeText={(text) => actualizarPorcentaje(familiar.id, text)}
                          keyboardType="decimal-pad"
                          maxLength={5}
                        />
                        <Text style={styles.textoPorcentaje}>%</Text>
                      </View>
                      <TouchableOpacity style={styles.botonMas} onPress={() => {
                        const actual = parseFloat(porcentajes[familiar.id] || 0);
                        actualizarPorcentaje(familiar.id, actual + 5);
                      }}>
                        <Icon name="add-outline" size={18} color={COLORES.GRIS_OSCURO} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.montoCalculado}>
                      <Text style={styles.textoMontoCalculado}>
                        {formatearMoneda((parseFloat(totalGastosFuturos) * parseFloat(porcentajes[familiar.id] || 0)) / 100)}
                      </Text>
                      <Text style={styles.textoCalculadoLabel}>por mes</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.botonesConfig}>
                  <TouchableOpacity style={styles.botonRestablecer} onPress={restablecerEquitativo}>
                    <Icon name="refresh-outline" size={18} color={COLORES.AZUL_CIELO_OSCURO} />
                    <Text style={styles.textoBotonRestablecer}>Equitativo</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalBotones}>
                <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalConfigVisible(false)}>
                  <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botonModalAccion, { backgroundColor: totalPorcentaje === 100 ? COLORES.EXITO : COLORES.GRIS_MEDIO }]}
                  onPress={guardarPorcentajes}
                  disabled={totalPorcentaje !== 100}
                >
                  <Text style={styles.textoBotonModalAccion}>Guardar Distribución</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* ============================================================
          DATETIME PICKER
      ============================================================ */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
        date={formData.fecha ? new Date(formData.fecha) : new Date()}
        locale="es-ES"
      />
    </LinearGradient>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  fondo: { flex: 1 },
  contenedor: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCargando: { color: COLORES.TEXTO_OSCURO, marginTop: 20, fontSize: 16 },

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
  botonAtras: { padding: 8 },
  tituloContainer: { flex: 1, alignItems: 'center' },
  tituloPrincipal: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  subtituloPrincipal: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  botonRefrescar: { padding: 8 },

  // Contenido
  contenedorScroll: { padding: 20, paddingBottom: 80 },
  seccion: { marginBottom: 25 },
  encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginLeft: 10, flex: 1 },
  botonConfig: { padding: 8 },
  botonAgregar: { padding: 8 },
  totalSugerido: { fontSize: 14, color: COLORES.TEXTO_OSCURO, fontWeight: '600' },

  // Resumen
  contenedorResumen: {
    flexDirection: 'row',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemResumen: { flex: 1, alignItems: 'center' },
  iconoResumen: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  valorResumen: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  labelResumen: { fontSize: 12, color: COLORES.GRIS_OSCURO, textAlign: 'center' },
  separadorResumen: { width: 1, backgroundColor: COLORES.GRIS_CLARO, marginHorizontal: 10 },

  // Gráfico
  contenedorGrafico: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barrasContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 10 },
  barraItem: { alignItems: 'center', marginHorizontal: 12, width: 40 },
  barra: { width: 20, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barraLabel: { fontSize: 10, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginTop: 5, textAlign: 'center' },
  barraMonto: { fontSize: 9, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  textoAyudaGrafico: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginTop: 10, fontStyle: 'italic', textAlign: 'center' },
  sinDatosGrafico: { alignItems: 'center', paddingVertical: 30 },
  textoSinDatosGrafico: { color: COLORES.GRIS_OSCURO, fontSize: 14, marginTop: 10 },

  // Distribución
  contenedorDistribucion: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemDistribucion: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  infoFamiliar: { flex: 1 },
  nombreFamiliar: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  porcentajeFamiliar: { fontSize: 12, color: COLORES.GRIS_OSCURO },
  montosFamiliar: { alignItems: 'flex-end' },
  montoAportado: { fontSize: 12, color: COLORES.TEXTO_OSCURO, marginBottom: 2 },
  montoSugerido: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginBottom: 2 },
  montoDiferencia: { fontSize: 11, fontWeight: '600' },

  // Tarjeta de gasto
  tarjetaGasto: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  encabezadoGasto: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconoCategoria: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoPrincipalGasto: { flex: 1 },
  descripcionGasto: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  fechaGasto: { fontSize: 12, color: COLORES.GRIS_OSCURO },
  montoContainer: { marginLeft: 10 },
  montoGasto: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  detallesGasto: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badgePrioridad: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  textoBadgePrioridad: { fontSize: 10, color: COLORES.BLANCO, fontWeight: 'bold' },
  badgeEstado: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  textoBadgeEstado: { fontSize: 10, fontWeight: 'bold' },
  textoResponsable: { fontSize: 11, color: COLORES.GRIS_OSCURO, marginLeft: 'auto' },
  accionesGasto: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO, paddingTop: 12 },
  botonAccionGasto: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, marginLeft: 10 },
  textoBotonAccionGasto: { fontSize: 12, marginLeft: 6 },

  sinGastos: { backgroundColor: COLORES.BLANCO, borderRadius: 12, padding: 40, alignItems: 'center', justifyContent: 'center' },
  textoSinGastos: { fontSize: 16, color: COLORES.GRIS_OSCURO, fontWeight: '600', marginTop: 15, marginBottom: 8 },
  subtextoSinGastos: { fontSize: 12, color: COLORES.GRIS_MEDIO, textAlign: 'center' },

  // Historial
  contenedorHistorial: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHistorial: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  iconoHistorial: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoHistorial: { flex: 1 },
  descripcionHistorial: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  fechaHistorial: { fontSize: 12, color: COLORES.GRIS_OSCURO },
  montoHistorial: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginRight: 10 },
  botonVerMas: { paddingVertical: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO, marginTop: 5 },
  textoBotonVerMas: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 14, fontWeight: '500' },

  // Acciones rápidas
  contenedorAccionesRapidas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  accionRapida: {
    width: '48%',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconoAccion: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  textoAccionRapida: { fontSize: 12, color: COLORES.TEXTO_OSCURO, textAlign: 'center', fontWeight: '500' },

  // Botón flotante
  botonFlotante: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
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

  // Fecha
  inputFecha: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  textoInputFecha: { fontSize: 14, color: COLORES.TEXTO_OSCURO, flex: 1 },

  // Categorías
  categoriasContainer: { flexDirection: 'row', marginBottom: 5 },
  opcionCategoria: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, marginRight: 10 },
  opcionCategoriaSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
  textoOpcionCategoria: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginLeft: 6 },
  textoOpcionCategoriaSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  prioridadesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  opcionPrioridad: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, alignItems: 'center', backgroundColor: COLORES.GRIS_CLARO },
  textoOpcionPrioridad: { fontSize: 12, color: COLORES.GRIS_OSCURO, fontWeight: '500' },
  textoOpcionPrioridadSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  estadosContainer: { flexDirection: 'row', marginBottom: 15 },
  opcionEstado: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, alignItems: 'center', backgroundColor: COLORES.GRIS_CLARO },
  textoOpcionEstado: { fontSize: 12, color: COLORES.GRIS_OSCURO, fontWeight: '500' },
  textoOpcionEstadoSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

  opcionCompartido: { marginBottom: 15 },
  botonCompartido: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  textoCompartido: { fontSize: 14, color: COLORES.TEXTO_OSCURO, marginLeft: 10 },

  // Selector de responsable (Picker)
  pickerContainer: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    overflow: 'hidden',
    marginBottom: 10,
  },
  picker: { height: 50, width: '100%' },

  modalBotones: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonModalCancelar: { flex: 1, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, alignItems: 'center', marginRight: 10 },
  textoBotonModalCancelar: { fontSize: 14, fontWeight: '600', color: COLORES.GRIS_OSCURO },
  botonModalPrincipal: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: COLORES.AZUL_CIELO_OSCURO, alignItems: 'center', marginHorizontal: 5 },
  textoBotonModalPrincipal: { fontSize: 14, fontWeight: '600', color: COLORES.BLANCO },
  botonModalSecundario: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center' },
  textoBotonModalSecundario: { fontSize: 14, fontWeight: '600', color: COLORES.GRIS_OSCURO },
  botonModalAccion: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginLeft: 10 },
  textoBotonModalAccion: { fontSize: 14, fontWeight: '600', color: COLORES.BLANCO },

  vistaInformacion: { padding: 10 },
  infoItemModal: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  labelModal: { width: 100, fontSize: 14, fontWeight: '600', color: COLORES.GRIS_OSCURO },
  valorModal: { flex: 1, fontSize: 14, color: COLORES.TEXTO_OSCURO },
  badgeModal: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  textoBadgeModal: { fontSize: 12, fontWeight: 'bold' },

  // Configuración de porcentajes
  infoConfiguracion: { alignItems: 'center', marginBottom: 20 },
  textoInfoConfig: { fontSize: 14, color: COLORES.GRIS_OSCURO, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  totalPorcentajeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 15, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 10 },
  labelTotalPorcentaje: { fontSize: 16, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginRight: 10 },
  valorTotalPorcentaje: { fontSize: 20, fontWeight: 'bold', marginRight: 10 },
  errorTotalPorcentaje: { fontSize: 12, color: COLORES.ERROR, flex: 1, textAlign: 'right' },
  itemConfigPorcentaje: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  infoFamiliarConfig: { flexDirection: 'row', alignItems: 'center', flex: 2 },
  avatarFamiliar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textoAvatar: { fontSize: 14, fontWeight: 'bold', color: COLORES.BLANCO },
  nombreFamiliarConfig: { flex: 1 },
  textoNombreFamiliar: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 2 },
  textoRolFamiliar: { fontSize: 11, color: COLORES.GRIS_OSCURO },
  controlPorcentaje: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  botonMenos: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center', justifyContent: 'center' },
  inputPorcentajeContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  inputPorcentaje: { width: 50, height: 36, backgroundColor: COLORES.BLANCO, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, borderRadius: 8, paddingHorizontal: 8, fontSize: 14, color: COLORES.TEXTO_OSCURO, textAlign: 'center' },
  textoPorcentaje: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginLeft: 4 },
  botonMas: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center', justifyContent: 'center' },
  montoCalculado: { flex: 1, alignItems: 'flex-end' },
  textoMontoCalculado: { fontSize: 14, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  textoCalculadoLabel: { fontSize: 10, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  botonesConfig: { marginTop: 20, alignItems: 'center' },
  botonRestablecer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORES.GRIS_CLARO },
  textoBotonRestablecer: { fontSize: 14, color: COLORES.AZUL_CIELO_OSCURO, fontWeight: '600', marginLeft: 8 },
}); 