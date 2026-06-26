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
// Removida importación de Icon de expo-vector-icons
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PieChart, BarChart } from 'react-native-chart-kit';

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
  LIMA: '#D4E157'
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
    compartido: true
  });

  // Estados para configuración de porcentajes
  const [porcentajes, setPorcentajes] = useState({});
  const [totalPorcentaje, setTotalPorcentaje] = useState(0);

  // Categorías de gastos
  const CATEGORIAS = [
    { id: 'medicina', nombre: 'Medicinas', icono: '💊', color: COLORES.ROJO_CLARO },
    { id: 'cita_medica', nombre: 'Citas Médicas', icono: '🩺', color: COLORES.EXITO },
    { id: 'alimentos', nombre: 'Alimentos', icono: '🍎', color: COLORES.AMARILLO_PLATANO },
    { id: 'transporte', nombre: 'Transporte', icono: '🚗', color: COLORES.AZUL_CIELO },
    { id: 'cuidador', nombre: 'Cuidador', icono: '👤', color: COLORES.MORADO },
    { id: 'equipamiento', nombre: 'Equipamiento', icono: '📦', color: COLORES.TURQUESA },
    { id: 'servicios', nombre: 'Servicios', icono: '🛠️', color: COLORES.GRIS_OSCURO },
    { id: 'otros', nombre: 'Otros', icono: '📌', color: COLORES.INDIGO }
  ];

  // Prioridades
  const PRIORIDADES = [
    { id: 'alta', nombre: 'Alta', color: COLORES.ERROR },
    { id: 'media', nombre: 'Media', color: COLORES.AMARILLO_PLATANO },
    { id: 'baja', nombre: 'Baja', color: COLORES.EXITO }
  ];

  // Cargar datos iniciales
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);

      // Obtener usuario actual
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioActual(usuario);
        setEsAdministrador(usuario.rol === 'familiar_admini');
      }

      // Obtener mes y año actual
      const ahora = new Date();
      setMesActual(ahora.toLocaleString('es-ES', { month: 'long' }));
      setAnioActual(ahora.getFullYear().toString());

      // Cargar familiares
      const familiaresResponse = await servicioAPI.obtenerFamiliares();
      if (familiaresResponse.exito) {
        setFamiliares(familiaresResponse.familiares || []);

        // Inicializar porcentajes equitativos
        const porcentajesIniciales = {};
        const porcentajeEquitativo = 100 / familiaresResponse.familiares.length;

        familiaresResponse.familiares.forEach(familiar => {
          porcentajesIniciales[familiar.id] = porcentajeEquitativo.toFixed(2);
        });

        setPorcentajes(porcentajesIniciales);
        setTotalPorcentaje(100);
      }

      // Cargar gastos futuros
      const gastosFuturosResponse = await servicioAPI.obtenerGastosFuturos();
      if (gastosFuturosResponse.exito) {
        setGastosFuturos(gastosFuturosResponse.gastos || []);
      }

      // Cargar gastos del mes actual
      const gastosMesResponse = await servicioAPI.obtenerGastosMesActual();
      if (gastosMesResponse.exito) {
        setGastosPasados(gastosMesResponse.gastos || []);
      }

      // Cargar aportes familiares del mes
      const aportesResponse = await servicioAPI.obtenerAportesMesActual();
      if (aportesResponse.exito) {
        setAportesFamiliares(aportesResponse.aportes || []);
      }

      // Calcular distribución sugerida
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

  // Calcular distribución sugerida basada en gastos futuros
  const calcularDistribucionSugerida = () => {
    const totalGastosFuturos = gastosFuturos.reduce((total, gasto) =>
      total + parseFloat(gasto.monto || 0), 0
    );

    const distribucion = familiares.map(familiar => {
      const porcentaje = parseFloat(porcentajes[familiar.id] || 0);
      const montoSugerido = (totalGastosFuturos * porcentaje) / 100;

      return {
        familiarId: familiar.id,
        nombre: familiar.nombre,
        apellido: familiar.apellido,
        porcentaje,
        montoSugerido: parseFloat(montoSugerido.toFixed(2)),
        aportado: 0 // Se calcularía luego
      };
    });

    setDistribucionSugerida(distribucion);
  };

  // Calcular total de gastos futuros
  const calcularTotalGastosFuturos = () => {
    return gastosFuturos.reduce((total, gasto) =>
      total + parseFloat(gasto.monto || 0), 0
    ).toFixed(2);
  };

  // Calcular total aportado este mes
  const calcularTotalAportado = () => {
    return aportesFamiliares.reduce((total, aporte) =>
      total + parseFloat(aporte.monto || 0), 0
    ).toFixed(2);
  };

  // Calcular saldo pendiente
  const calcularSaldoPendiente = () => {
    const totalAportado = parseFloat(calcularTotalAportado());
    const totalGastos = parseFloat(calcularTotalGastosFuturos());
    return (totalGastos - totalAportado).toFixed(2);
  };

  // Calcular aporte por familiar
  const calcularAportePorFamiliar = (familiarId) => {
    return aportesFamiliares
      .filter(aporte => aporte.familiarId === familiarId)
      .reduce((total, aporte) => total + parseFloat(aporte.monto || 0), 0)
      .toFixed(2);
  };

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Formatear moneda
  const formatearMoneda = (monto) => {
    return `$${parseFloat(monto).toFixed(2)}`;
  };

  // Obtener color para gráfico
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
      COLORES.LIMA
    ];
    return colores[index % colores.length];
  };

  // Preparar datos para gráfico de barras
  const prepararDatosGrafico = () => {
    const datos = familiares.map((familiar, index) => {
      const aporte = calcularAportePorFamiliar(familiar.id);
      return {
        nombre: familiar.nombre.charAt(0),
        apellido: familiar.apellido,
        aporte: parseFloat(aporte),
        color: obtenerColorGrafico(index)
      };
    }).filter(item => item.aporte > 0);

    return datos;
  };

  // Abrir modal para gasto
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
        responsableId: gasto.responsableId || '',
        compartido: gasto.compartido !== false
      });
    } else {
      // Fecha por defecto: hoy
      const hoy = new Date().toISOString().split('T')[0];
      setFormData({
        descripcion: '',
        monto: '',
        fecha: hoy,
        categoria: 'medicina',
        prioridad: 'media',
        estado: 'pendiente',
        notas: '',
        responsableId: '',
        compartido: true
      });
    }

    setModalVisible(true);
  };

  // Guardar gasto
  const guardarGasto = async () => {
    try {
      // Validaciones
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

      const datosGasto = {
        ...formData,
        monto: parseFloat(formData.monto),
        fecha: new Date(formData.fecha).toISOString().split('T')[0]
      };

      let response;
      if (gastoSeleccionado) {
        // Actualizar gasto
        response = await servicioAPI.actualizarGasto(gastoSeleccionado.id, datosGasto);
      } else {
        // Crear nuevo gasto
        response = await servicioAPI.crearGasto(datosGasto);
      }

      if (response.exito) {
        Alert.alert('Éxito', gastoSeleccionado ? 'Gasto actualizado' : 'Gasto agregado');
        setModalVisible(false);
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'Error guardando gasto');
      }

    } catch (error) {
      console.error('Error guardando gasto:', error);
      Alert.alert('Error', 'No se pudo guardar el gasto');
    }
  };

  // Eliminar gasto
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
              const response = await servicioAPI.eliminarGasto(gastoId);
              if (response.exito) {
                Alert.alert('Éxito', 'Gasto eliminado');
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el gasto');
            }
          }
        }
      ]
    );
  };

  // Marcar gasto como pagado
  const marcarComoPagado = async (gastoId) => {
    try {
      const response = await servicioAPI.marcarGastoPagado(gastoId);
      if (response.exito) {
        Alert.alert('Éxito', 'Gasto marcado como pagado');
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar como pagado');
    }
  };

  // Actualizar porcentaje
  const actualizarPorcentaje = (familiarId, valor) => {
    const nuevoValor = Math.max(0, Math.min(100, parseFloat(valor) || 0));

    const nuevosPorcentajes = { ...porcentajes };
    nuevosPorcentajes[familiarId] = nuevoValor.toFixed(2);

    setPorcentajes(nuevosPorcentajes);

    // Calcular nuevo total
    const total = Object.values(nuevosPorcentajes).reduce((sum, val) =>
      sum + parseFloat(val || 0), 0
    );
    setTotalPorcentaje(parseFloat(total.toFixed(2)));
  };

  // Guardar configuración de porcentajes
  const guardarPorcentajes = async () => {
    if (totalPorcentaje !== 100) {
      Alert.alert('Error', `La suma de porcentajes debe ser 100%. Actual: ${totalPorcentaje}%`);
      return;
    }

    try {
      const response = await servicioAPI.guardarDistribucionPorcentajes(porcentajes);
      if (response.exito) {
        Alert.alert('Éxito', 'Distribución guardada');
        setModalConfigVisible(false);
        calcularDistribucionSugerida();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la distribución');
    }
  };

  // Restablecer porcentajes equitativos
  const restablecerEquitativo = () => {
    const porcentajesEquitativos = {};
    const porcentajeEquitativo = (100 / familiares.length).toFixed(2);

    familiares.forEach(familiar => {
      porcentajesEquitativos[familiar.id] = porcentajeEquitativo;
    });

    setPorcentajes(porcentajesEquitativos);
    setTotalPorcentaje(100);
  };

  // Renderizar tarjeta de gasto
  const renderTarjetaGasto = ({ item }) => {
    const categoria = CATEGORIAS.find(c => c.id === item.categoria);
    const prioridad = PRIORIDADES.find(p => p.id === item.prioridad);

    return (
      <TouchableOpacity
        style={styles.tarjetaGasto}
        onPress={() => abrirModalGasto('ver', item)}
      >
        <View style={styles.encabezadoGasto}>
          <View style={[styles.iconoCategoria, { backgroundColor: `${categoria?.color}20` }]}>
            <Text style={{ fontSize: 20 }}>{categoria?.icono || '📌'}</Text>
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
          <View style={[styles.badgePrioridad, { backgroundColor: prioridad?.color }]}>
            <Text style={styles.textoBadgePrioridad}>{prioridad?.nombre}</Text>
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
              onPress={(e) => {
                e.stopPropagation();
                marcarComoPagado(item.id);
              }}
            >
              <Text style={{ fontSize: 16 }}>✓</Text>
              <Text style={styles.textoBotonAccionGasto}>Marcar pagado</Text>
            </TouchableOpacity>
          )}

          {esAdministrador && (
            <>
              <TouchableOpacity
                style={styles.botonAccionGasto}
                onPress={(e) => {
                  e.stopPropagation();
                  abrirModalGasto('editar', item);
                }}
              >
                <Text style={{ fontSize: 14 }}>📝</Text>
                <Text style={styles.textoBotonAccionGasto}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonAccionGasto}
                onPress={(e) => {
                  e.stopPropagation();
                  eliminarGasto(item.id);
                }}
              >
                <Text style={{ fontSize: 14 }}>🗑️</Text>
                <Text style={styles.textoBotonAccionGasto}>Eliminar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar ítem de distribución
  const renderItemDistribucion = ({ item }) => {
    const aporte = calcularAportePorFamiliar(item.familiarId);
    const diferencia = item.montoSugerido - parseFloat(aporte);

    return (
      <View style={styles.itemDistribucion}>
        <View style={styles.infoFamiliar}>
          <Text style={styles.nombreFamiliar}>
            {item.nombre} {item.apellido}
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

  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando información de gastos...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const datosGrafico = prepararDatosGrafico();
  const totalGastosFuturos = calcularTotalGastosFuturos();
  const totalAportado = calcularTotalAportado();
  const saldoPendiente = calcularSaldoPendiente();

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24 }}>⬅️</Text>
          </TouchableOpacity>

          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Gestión de Gastos</Text>
            <Text style={styles.subtituloPrincipal}>
              {mesActual} {anioActual} • {gastosFuturos.length} gasto(s)
            </Text>
          </View>

          <TouchableOpacity style={styles.botonRefrescar} onPress={onRefresh} disabled={refrescando}>
            <Text style={{ fontSize: 22, opacity: refrescando ? 0.5 : 1 }}>🔄</Text>
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
          {/* Resumen Financiero */}
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Resumen Financiero</Text>

            <View style={styles.contenedorResumen}>
              <View style={styles.itemResumen}>
                <View style={[styles.iconoResumen, { backgroundColor: COLORES.ROJO_CLARO + '20' }]}>
                  <Text style={{ fontSize: 24 }}>📈</Text>
                </View>
                <Text style={styles.valorResumen}>{formatearMoneda(totalGastosFuturos)}</Text>
                <Text style={styles.labelResumen}>Gastos Futuros</Text>
              </View>

              <View style={styles.separadorResumen} />

              <View style={styles.itemResumen}>
                <View style={[styles.iconoResumen, { backgroundColor: COLORES.EXITO + '20' }]}>
                  <Text style={{ fontSize: 24 }}>💳</Text>
                </View>
                <Text style={styles.valorResumen}>{formatearMoneda(totalAportado)}</Text>
                <Text style={styles.labelResumen}>Aportado</Text>
              </View>

              <View style={styles.separadorResumen} />

              <View style={styles.itemResumen}>
                <View style={[styles.iconoResumen, {
                  backgroundColor:
                    parseFloat(saldoPendiente) >= 0 ? COLORES.AMARILLO_PLATANO + '20' : COLORES.EXITO + '20'
                }]}>
                  <Text style={{ fontSize: 24 }}>
                    {parseFloat(saldoPendiente) >= 0 ? '⚠️' : '✓'}
                  </Text>
                </View>
                <Text style={[
                  styles.valorResumen,
                  { color: parseFloat(saldoPendiente) >= 0 ? COLORES.AMARILLO_PLATANO : COLORES.EXITO }
                ]}>
                  {formatearMoneda(Math.abs(saldoPendiente))}
                </Text>
                <Text style={styles.labelResumen}>
                  {parseFloat(saldoPendiente) >= 0 ? 'Pendiente' : 'Excedente'}
                </Text>
              </View>
            </View>
          </View>

          {/* Gráfico de Aportes */}
          {datosGrafico.length > 0 && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>📊</Text>
                <Text style={styles.tituloSeccion}>Aportes por Familiar</Text>

                {esAdministrador && (
                  <TouchableOpacity
                    style={styles.botonConfig}
                    onPress={() => setModalConfigVisible(true)}
                  >
                    <Text style={{ fontSize: 18 }}>⚙️</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.contenedorGrafico}>
                {/* Eje Y - Montos */}
                <View style={styles.ejeY}>
                  {[800, 600, 400, 200, 0].map((monto, index) => (
                    <Text key={index} style={styles.textoEjeY}>
                      ${monto}
                    </Text>
                  ))}
                </View>

                {/* Barras */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.contenedorBarras}>
                    {datosGrafico.map((item, index) => {
                      const alturaMaxima = 200;
                      const altura = (item.aporte / 800) * alturaMaxima;

                      return (
                        <View key={index} style={styles.barraContainer}>
                          <View style={[styles.barra, {
                            height: Math.max(10, altura),
                            backgroundColor: item.color
                          }]} />

                          <View style={styles.etiquetaBarra}>
                            <Text style={styles.nombreBarra} numberOfLines={2}>
                              {item.nombre}. {item.apellido}
                            </Text>
                            <Text style={styles.montoBarra}>
                              {formatearMoneda(item.aporte)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <Text style={styles.textoAyudaGrafico}>
                💡 Comparativa de aportes este mes. Toca configurar para ajustar porcentajes.
              </Text>
            </View>
          )}

          {/* Distribución Sugerida */}
          {distribucionSugerida.length > 0 && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>🧮</Text>
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
              <Text style={{ fontSize: 24, marginRight: 8 }}>📅</Text>
              <Text style={styles.tituloSeccion}>Gastos Futuros</Text>

              {esAdministrador && (
                <TouchableOpacity
                  style={styles.botonAgregar}
                  onPress={() => abrirModalGasto('agregar')}
                >
                  <Text style={{ fontSize: 22 }}>➕</Text>
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
                <Text style={{ fontSize: 60, marginBottom: 10 }}>📅</Text>
                <Text style={styles.textoSinGastos}>No hay gastos futuros</Text>
                <Text style={styles.subtextoSinGastos}>
                  {esAdministrador
                    ? 'Agrega gastos programados'
                    : 'El administrador debe agregar gastos'}
                </Text>
              </View>
            )}
          </View>

          {/* Historial de Gastos Recientes */}
          {gastosPasados.length > 0 && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>🕒</Text>
                <Text style={styles.tituloSeccion}>Gastos Recientes</Text>
              </View>

              <View style={styles.contenedorHistorial}>
                {gastosPasados.slice(0, 3).map((gasto, index) => {
                  const categoria = CATEGORIAS.find(c => c.id === gasto.categoria);

                  return (
                    <TouchableOpacity
                      key={gasto.id}
                      style={styles.itemHistorial}
                      onPress={() => abrirModalGasto('ver', gasto)}
                    >
                      <View style={[styles.iconoHistorial, { backgroundColor: `${categoria?.color}20` }]}>
                        <Text style={{ fontSize: 16 }}>{categoria?.icono || '📌'}</Text>
                      </View>

                      <View style={styles.infoHistorial}>
                        <Text style={styles.descripcionHistorial}>{gasto.descripcion}</Text>
                        <Text style={styles.fechaHistorial}>{formatearFecha(gasto.fecha)}</Text>
                      </View>

                      <Text style={styles.montoHistorial}>{formatearMoneda(gasto.monto)}</Text>

                      <Text style={{ fontSize: 16 }}>▶️</Text>
                    </TouchableOpacity>
                  );
                })}

                {gastosPasados.length > 3 && (
                  <TouchableOpacity
                    style={styles.botonVerMas}
                    onPress={() => navigation.navigate('HistorialGastos')}
                  >
                    <Text style={styles.textoBotonVerMas}>
                      Ver {gastosPasados.length - 3} más
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Acciones Rápidas */}
          {esAdministrador && (
            <View style={styles.seccion}>
              <View style={styles.contenedorAccionesRapidas}>
                <TouchableOpacity
                  style={styles.accionRapida}
                  onPress={() => abrirModalGasto('agregar')}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.EXITO + '20' }]}>
                    <Text style={{ fontSize: 24 }}>➕</Text>
                  </View>
                  <Text style={styles.textoAccionRapida}>Agregar gasto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.accionRapida}
                  onPress={() => setModalConfigVisible(true)}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.AZUL_CIELO + '20' }]}>
                    <Text style={{ fontSize: 24 }}>⚙️</Text>
                  </View>
                  <Text style={styles.textoAccionRapida}>Configurar %</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.accionRapida}
                  onPress={() => navigation.navigate('HistorialGastos')}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.MORADO + '20' }]}>
                    <Text style={{ fontSize: 24 }}>🕒</Text>
                  </View>
                  <Text style={styles.textoAccionRapida}>Ver historial</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.accionRapida}
                  onPress={() => navigation.navigate('GenerarReporteGastos')}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.TURQUESA + '20' }]}>
                    <Text style={{ fontSize: 24 }}>📄</Text>
                  </View>
                  <Text style={styles.textoAccionRapida}>Generar reporte</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Botón flotante para agregar gasto */}
        {esAdministrador && (
          <TouchableOpacity style={styles.botonFlotante} onPress={() => abrirModalGasto('agregar')}>
            <Text style={{ fontSize: 28, color: COLORES.BLANCO }}>➕</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Modal para gasto */}
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
                {modalTipo === 'ver' ? 'Detalles del Gasto' :
                  modalTipo === 'editar' ? 'Editar Gasto' : 'Nuevo Gasto'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 20 }}>❌</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              {modalTipo === 'ver' ? (
                // Vista de información
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
                    <Text style={styles.valorModal}>
                      {CATEGORIAS.find(c => c.id === gastoSeleccionado?.categoria)?.nombre}
                    </Text>
                  </View>

                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Prioridad:</Text>
                    <View style={[
                      styles.badgeModal,
                      { backgroundColor: PRIORIDADES.find(p => p.id === gastoSeleccionado?.prioridad)?.color + '20' }
                    ]}>
                      <Text style={[
                        styles.textoBadgeModal,
                        { color: PRIORIDADES.find(p => p.id === gastoSeleccionado?.prioridad)?.color }
                      ]}>
                        {PRIORIDADES.find(p => p.id === gastoSeleccionado?.prioridad)?.nombre?.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Estado:</Text>
                    <View style={[
                      styles.badgeModal,
                      { backgroundColor: gastoSeleccionado?.estado === 'pagado' ? COLORES.EXITO + '20' : COLORES.AMARILLO_PLATANO + '20' }
                    ]}>
                      <Text style={[
                        styles.textoBadgeModal,
                        { color: gastoSeleccionado?.estado === 'pagado' ? COLORES.EXITO : COLORES.AMARILLO_PLATANO }
                      ]}>
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
                // Formulario para agregar/editar
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
                  <TextInput
                    style={styles.input}
                    value={formData.fecha}
                    onChangeText={(text) => setFormData({ ...formData, fecha: text })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />

                  <Text style={styles.modalLabel}>Categoría</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasContainer}>
                    {CATEGORIAS.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.opcionCategoria,
                          formData.categoria === cat.id && styles.opcionCategoriaSeleccionada
                        ]}
                        onPress={() => setFormData({ ...formData, categoria: cat.id })}
                      >
                        <Text style={{ fontSize: 18, marginRight: 4 }}>
                          {cat.icono}
                        </Text>
                        <Text style={[
                          styles.textoOpcionCategoria,
                          formData.categoria === cat.id && styles.textoOpcionCategoriaSeleccionada
                        ]}>
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
                        style={[
                          styles.opcionPrioridad,
                          formData.prioridad === pri.id && { backgroundColor: pri.color }
                        ]}
                        onPress={() => setFormData({ ...formData, prioridad: pri.id })}
                      >
                        <Text style={[
                          styles.textoOpcionPrioridad,
                          formData.prioridad === pri.id && styles.textoOpcionPrioridadSeleccionada
                        ]}>
                          {pri.nombre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalLabel}>Estado</Text>
                  <View style={styles.estadosContainer}>
                    <TouchableOpacity
                      style={[
                        styles.opcionEstado,
                        formData.estado === 'pendiente' && { backgroundColor: COLORES.AMARILLO_PLATANO }
                      ]}
                      onPress={() => setFormData({ ...formData, estado: 'pendiente' })}
                    >
                      <Text style={[
                        styles.textoOpcionEstado,
                        formData.estado === 'pendiente' && styles.textoOpcionEstadoSeleccionada
                      ]}>
                        Pendiente
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.opcionEstado,
                        formData.estado === 'pagado' && { backgroundColor: COLORES.EXITO }
                      ]}
                      onPress={() => setFormData({ ...formData, estado: 'pagado' })}
                    >
                      <Text style={[
                        styles.textoOpcionEstado,
                        formData.estado === 'pagado' && styles.textoOpcionEstadoSeleccionada
                      ]}>
                        Pagado
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalLabel}>Compartido entre familiares</Text>
                  <View style={styles.opcionCompartido}>
                    <TouchableOpacity
                      style={styles.botonCompartido}
                      onPress={() => setFormData({ ...formData, compartido: !formData.compartido })}
                    >
                      <Text style={{ fontSize: 24, marginRight: 6 }}>
                        {formData.compartido ? '✅' : '⚪'}
                      </Text>
                      <Text style={styles.textoCompartido}>
                        {formData.compartido ? 'Sí, compartir gasto' : 'No, gasto individual'}
                      </Text>
                    </TouchableOpacity>
                  </View>

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
                  <TouchableOpacity
                    style={styles.botonModalSecundario}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.textoBotonModalSecundario}>Cerrar</Text>
                  </TouchableOpacity>

                  {esAdministrador && (
                    <>
                      <TouchableOpacity
                        style={styles.botonModalPrincipal}
                        onPress={() => {
                          setModalVisible(false);
                          abrirModalGasto('editar', gastoSeleccionado);
                        }}
                      >
                        <Text style={styles.textoBotonModalPrincipal}>Editar</Text>
                      </TouchableOpacity>

                      {gastoSeleccionado?.estado !== 'pagado' && (
                        <TouchableOpacity
                          style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                          onPress={() => {
                            setModalVisible(false);
                            marcarComoPagado(gastoSeleccionado.id);
                          }}
                        >
                          <Text style={styles.textoBotonModalAccion}>Marcar Pagado</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.botonModalCancelar}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
                  </TouchableOpacity>

                  {modalTipo === 'editar' && esAdministrador && (
                    <TouchableOpacity
                      style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]}
                      onPress={() => {
                        setModalVisible(false);
                        eliminarGasto(gastoSeleccionado.id);
                      }}
                    >
                      <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                    onPress={guardarGasto}
                  >
                    <Text style={styles.textoBotonModalAccion}>
                      {modalTipo === 'editar' ? 'Actualizar' : 'Guardar'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para configuración de porcentajes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalConfigVisible}
        onRequestClose={() => setModalConfigVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Configurar Porcentajes</Text>
              <TouchableOpacity onPress={() => setModalConfigVisible(false)}>
                <Text style={{ fontSize: 20 }}>❌</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <View style={styles.infoConfiguracion}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>🧮</Text>
                <Text style={styles.textoInfoConfig}>
                  Distribuye el porcentaje que cada familiar aportará a los gastos compartidos
                </Text>
              </View>

              <View style={styles.totalPorcentajeContainer}>
                <Text style={styles.labelTotalPorcentaje}>Total:</Text>
                <Text style={[
                  styles.valorTotalPorcentaje,
                  { color: totalPorcentaje === 100 ? COLORES.EXITO : COLORES.ERROR }
                ]}>
                  {totalPorcentaje}%
                </Text>
                {totalPorcentaje !== 100 && (
                  <Text style={styles.errorTotalPorcentaje}>
                    Debe sumar exactamente 100%
                  </Text>
                )}
              </View>

              {familiares.map((familiar, index) => (
                <View key={familiar.id} style={styles.itemConfigPorcentaje}>
                  <View style={styles.infoFamiliarConfig}>
                    <View style={[styles.avatarFamiliar, { backgroundColor: obtenerColorGrafico(index) }]}>
                      <Text style={styles.textoAvatar}>
                        {familiar.nombre.charAt(0)}{familiar.apellido.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.nombreFamiliarConfig}>
                      <Text style={styles.textoNombreFamiliar}>
                        {familiar.nombre} {familiar.apellido}
                      </Text>
                      <Text style={styles.textoRolFamiliar}>
                        {familiar.rol === 'familiar_administrador' ? 'Administrador' : 'Familiar'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.controlPorcentaje}>
                    <TouchableOpacity
                      style={styles.botonMenos}
                      onPress={() => {
                        const actual = parseFloat(porcentajes[familiar.id] || 0);
                        actualizarPorcentaje(familiar.id, actual - 5);
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>➖</Text>
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

                    <TouchableOpacity
                      style={styles.botonMas}
                      onPress={() => {
                        const actual = parseFloat(porcentajes[familiar.id] || 0);
                        actualizarPorcentaje(familiar.id, actual + 5);
                      }}
                    >
                      <Text style={{ fontSize: 18 }}>➕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.montoCalculado}>
                    <Text style={styles.textoMontoCalculado}>
                      {formatearMoneda((parseFloat(calcularTotalGastosFuturos()) * parseFloat(porcentajes[familiar.id] || 0)) / 100)}
                    </Text>
                    <Text style={styles.textoCalculadoLabel}>por mes</Text>
                  </View>
                </View>
              ))}

              <View style={styles.botonesConfig}>
                <TouchableOpacity
                  style={styles.botonRestablecer}
                  onPress={restablecerEquitativo}
                >
                  <Text style={{ fontSize: 18, marginRight: 6 }}>🔄</Text>
                  <Text style={styles.textoBotonRestablecer}>Equitativo</Text>
                </TouchableOpacity>
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
                style={[styles.botonModalAccion, {
                  backgroundColor: totalPorcentaje === 100 ? COLORES.EXITO : COLORES.GRIS_MEDIO
                }]}
                onPress={guardarPorcentajes}
                disabled={totalPorcentaje !== 100}
              >
                <Text style={styles.textoBotonModalAccion}>Guardar Distribución</Text>
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
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginTop: 2,
  },
  botonRefrescar: {
    padding: 8,
  },

  // Contenido
  contenedorScroll: {
    padding: 20,
    paddingBottom: 80,
  },

  // Secciones
  seccion: {
    marginBottom: 25,
  },
  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
    flex: 1,
  },
  botonConfig: {
    padding: 8,
  },
  botonAgregar: {
    padding: 8,
  },

  // Resumen Financiero
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
  itemResumen: {
    flex: 1,
    alignItems: 'center',
  },
  iconoResumen: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  valorResumen: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  labelResumen: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
  },
  separadorResumen: {
    width: 1,
    backgroundColor: COLORES.GRIS_CLARO,
    marginHorizontal: 10,
  },

  // Gráfico de Aportes
  contenedorGrafico: {
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
  ejeY: {
    justifyContent: 'space-between',
    marginRight: 10,
    paddingVertical: 20,
  },
  textoEjeY: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'right',
    height: 40,
  },
  contenedorBarras: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 240,
    paddingVertical: 20,
  },
  barraContainer: {
    alignItems: 'center',
    marginHorizontal: 12,
    width: 60,
  },
  barra: {
    width: 30,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  etiquetaBarra: {
    alignItems: 'center',
    marginTop: 8,
  },
  nombreBarra: {
    fontSize: 10,
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
    fontWeight: '600',
    height: 30,
  },
  montoBarra: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
    marginTop: 4,
  },
  textoAyudaGrafico: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  totalSugerido: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    fontWeight: '600',
  },

  // Distribución Sugerida
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
  itemDistribucion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoFamiliar: {
    flex: 1,
  },
  nombreFamiliar: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  porcentajeFamiliar: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  montosFamiliar: {
    alignItems: 'flex-end',
  },
  montoAportado: {
    fontSize: 12,
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 2,
  },
  montoSugerido: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 2,
  },
  montoDiferencia: {
    fontSize: 11,
    fontWeight: '600',
  },

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
  encabezadoGasto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconoCategoria: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoPrincipalGasto: {
    flex: 1,
  },
  descripcionGasto: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  fechaGasto: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  montoContainer: {
    marginLeft: 10,
  },
  montoGasto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  detallesGasto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgePrioridad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  textoBadgePrioridad: {
    fontSize: 10,
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },
  badgeEstado: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoBadgeEstado: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  textoResponsable: {
    fontSize: 11,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 'auto',
  },
  accionesGasto: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
    paddingTop: 12,
  },
  botonAccionGasto: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  textoBotonAccionGasto: {
    fontSize: 12,
    marginLeft: 6,
  },

  // Sin gastos
  sinGastos: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSinGastos: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  subtextoSinGastos: {
    fontSize: 12,
    color: COLORES.GRIS_MEDIO,
    textAlign: 'center',
  },

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
  itemHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  iconoHistorial: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoHistorial: {
    flex: 1,
  },
  descripcionHistorial: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  fechaHistorial: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  montoHistorial: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginRight: 10,
  },
  botonVerMas: {
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
    marginTop: 5,
  },
  textoBotonVerMas: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '500',
  },

  // Acciones rápidas
  contenedorAccionesRapidas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
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
  iconoAccion: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  textoAccionRapida: {
    fontSize: 12,
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
    fontWeight: '500',
  },

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
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContenido: {
    backgroundColor: COLORES.BLANCO,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
  },
  modalEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  modalFormulario: {
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.6,
  },

  // Vista información en modal
  vistaInformacion: {
    padding: 10,
  },
  infoItemModal: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  labelModal: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.GRIS_OSCURO,
  },
  valorModal: {
    flex: 1,
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
  },
  badgeModal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  textoBadgeModal: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Formulario modal
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
    padding: 12,
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Opciones de categoría
  categoriasContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  opcionCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginRight: 10,
  },
  opcionCategoriaSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionCategoria: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 6,
  },
  textoOpcionCategoriaSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Opciones de prioridad
  prioridadesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  opcionPrioridad: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
  },
  textoOpcionPrioridad: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    fontWeight: '500',
  },
  textoOpcionPrioridadSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Opciones de estado
  estadosContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  opcionEstado: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
  },
  textoOpcionEstado: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    fontWeight: '500',
  },
  textoOpcionEstadoSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Opción compartido
  opcionCompartido: {
    marginBottom: 15,
  },
  botonCompartido: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  textoCompartido: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
  },

  // Botones del modal
  modalBotones: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  botonModalCancelar: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    alignItems: 'center',
    marginRight: 10,
  },
  textoBotonModalCancelar: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.GRIS_OSCURO,
  },
  botonModalPrincipal: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  textoBotonModalPrincipal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.BLANCO,
  },
  botonModalSecundario: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
  },
  textoBotonModalSecundario: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.GRIS_OSCURO,
  },
  botonModalAccion: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 10,
  },
  textoBotonModalAccion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.BLANCO,
  },

  // Configuración de porcentajes
  infoConfiguracion: {
    alignItems: 'center',
    marginBottom: 20,
  },
  textoInfoConfig: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  totalPorcentajeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 10,
  },
  labelTotalPorcentaje: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginRight: 10,
  },
  valorTotalPorcentaje: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 10,
  },
  errorTotalPorcentaje: {
    fontSize: 12,
    color: COLORES.ERROR,
    flex: 1,
    textAlign: 'right',
  },

  // Item de configuración de porcentaje
  itemConfigPorcentaje: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoFamiliarConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  avatarFamiliar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textoAvatar: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.BLANCO,
  },
  nombreFamiliarConfig: {
    flex: 1,
  },
  textoNombreFamiliar: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 2,
  },
  textoRolFamiliar: {
    fontSize: 11,
    color: COLORES.GRIS_OSCURO,
  },
  controlPorcentaje: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  botonMenos: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputPorcentajeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  inputPorcentaje: {
    width: 50,
    height: 36,
    backgroundColor: COLORES.BLANCO,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
  },
  textoPorcentaje: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 4,
  },
  botonMas: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  montoCalculado: {
    flex: 1,
    alignItems: 'flex-end',
  },
  textoMontoCalculado: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  textoCalculadoLabel: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
    marginTop: 2,
  },

  // Botones configuración
  botonesConfig: {
    marginTop: 20,
    alignItems: 'center',
  },
  botonRestablecer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  textoBotonRestablecer: {
    fontSize: 14,
    color: COLORES.AZUL_CIELO_OSCURO,
    fontWeight: '600',
    marginLeft: 8,
  },
});