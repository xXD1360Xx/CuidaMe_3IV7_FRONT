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
import { Ionicons as Icon } from '@expo/vector-icons';
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
  TURQUESA: '#4DB6AC'
};

export default function VistaMedicinas({ navigation, route }) {
  const [medicinas, setMedicinas] = useState([]);
  const [medicinasHoy, setMedicinasHoy] = useState([]);
  const [medicinasFrecuentes, setMedicinasFrecuentes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [medicinaSeleccionada, setMedicinaSeleccionada] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoy');

  // Estados para nueva medicina
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

  // Horarios predefinidos
  const horariosPredefinidos = [
    { id: 'manana', nombre: 'Mañana', hora: '08:00', icono: 'sunny-outline', color: '#FFD93D' }, // Amarillo claro
    { id: 'mediodia', nombre: 'Mediodía', hora: '12:00', icono: 'restaurant-outline', color: '#F9A825' }, // Naranja
    { id: 'tarde', nombre: 'Tarde', hora: '16:00', icono: 'partly-sunny-outline', color: '#42A5F5' }, // Azul claro
    { id: 'noche', nombre: 'Noche', hora: '20:00', icono: 'moon-outline', color: '#5C6BC0' } // Índigo
  ];

  // Frecuencias
  const frecuencias = [
    { id: 'diaria', nombre: 'Diaria', icono: 'calendar-outline' },
    { id: 'semanal', nombre: 'Semanal', icono: 'calendar-outline' },
    { id: 'mensual', nombre: 'Mensual', icono: 'calendar-outline' },
    { id: 'ocasional', nombre: 'Solo cuando es necesario', icono: 'medical-outline' }
  ];

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);

      // Obtener usuario
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioRol(usuario.rol);
      }

      // Cargar todas las medicinas
      const response = await servicioAPI.obtenerTodasMedicinas();
      if (response.exito) {
        setMedicinas(response.medicinas || []);

        // Filtrar medicinas para hoy
        const hoy = new Date().toISOString().split('T')[0];
        const medicinasHoyFiltradas = response.medicinas.filter(med => {
          // Lógica para determinar si se toma hoy
          return true; // Por ahora mostrar todas
        });
        setMedicinasHoy(medicinasHoyFiltradas);
      }

      // Cargar medicinas frecuentes
      const frecuentesResponse = await servicioAPI.obtenerMedicinasFrecuentes();
      if (frecuentesResponse.exito) {
        setMedicinasFrecuentes(frecuentesResponse.medicinas || []);
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

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Obtener medicinas por periodo
  const obtenerMedicinasPorPeriodo = () => {
    switch (filtroPeriodo) {
      case 'hoy':
        return medicinasHoy;
      case 'semana':
        return medicinas.filter(m => m.frecuencia === 'diaria' || m.frecuencia === 'semanal');
      case 'mes':
        return medicinas;
      default:
        return medicinas;
    }
  };

  // Seleccionar horario
  const seleccionarHorario = (horarioId) => {
    const horario = horariosPredefinidos.find(h => h.id === horarioId);
    if (!horario) return;

    const nuevosHorarios = [...nuevaMedicina.horarios];
    const index = nuevosHorarios.findIndex(h => h.id === horarioId);

    if (index === -1) {
      nuevosHorarios.push(horario);
    } else {
      nuevosHorarios.splice(index, 1);
    }

    setNuevaMedicina({ ...nuevaMedicina, horarios: nuevosHorarios });
  };

  // Abrir modal para agregar
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
    setModalAgregarVisible(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (medicina) => {
    setMedicinaSeleccionada(medicina);
    setNuevaMedicina({
      nombre: medicina.nombre,
      dosis: medicina.dosis,
      frecuencia: medicina.frecuencia,
      horarios: medicina.horarios || [],
      duracion: medicina.duracion?.toString() || '',
      proposito: medicina.proposito || '',
      instrucciones: medicina.instrucciones || '',
      stock: medicina.stock?.toString() || '30',
      stock_minimo: medicina.stock_minimo?.toString() || '10'
    });
    setModalAgregarVisible(true);
  };

  // Guardar medicina
  const guardarMedicina = async () => {
    try {
      // Validaciones
      if (!nuevaMedicina.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre de la medicina');
        return;
      }

      if (!nuevaMedicina.dosis.trim()) {
        Alert.alert('Error', 'Debes ingresar la dosis');
        return;
      }

      if (nuevaMedicina.horarios.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos un horario');
        return;
      }

      const datosMedicina = {
        ...nuevaMedicina,
        horarios: nuevaMedicina.horarios.map(h => h.id),
        duracion: nuevaMedicina.duracion ? parseInt(nuevaMedicina.duracion) : null,
        stock: parseInt(nuevaMedicina.stock),
        stock_minimo: parseInt(nuevaMedicina.stock_minimo)
      };

      // Obtener el ID del usuario actual
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();

      let response;
      if (medicinaSeleccionada) {
        // Actualizar
        response = await servicioAPI.actualizarMedicina(usuarioId, medicinaSeleccionada.id, datosMedicina);
      } else {
        // Crear nueva
        response = await servicioAPI.crearMedicina(usuarioId, datosMedicina);
      }

      if (response.exito) {
        Alert.alert('Éxito', medicinaSeleccionada ? 'Medicina actualizada' : 'Medicina agregada');
        setModalAgregarVisible(false);
        setMedicinaSeleccionada(null);
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'Error guardando medicina');
      }

    } catch (error) {
      console.error('Error guardando medicina:', error);
      Alert.alert('Error', 'No se pudo guardar la medicina');
    }
  };

  // Eliminar medicina
  const eliminarMedicina = (medicinaId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta medicina?',
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
              } else {
                Alert.alert('Error', response.error || 'Error eliminando');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  // Marcar como tomada
  const marcarComoTomada = async (medicinaId, horarioId) => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await servicioAPI.marcarMedicinaTomada(medicinaId, hoy, horarioId);

      if (response.exito) {
        Alert.alert('Éxito', 'Medicina marcada como tomada');
        onRefresh();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar como tomada');
    }
  };

  // Verificar si es administrador
  const esAdministrador = usuarioRol === 'familiar_admin';

  // Renderizar cabecera de tabla
  const renderCabeceraTabla = () => (
    <View style={styles.filaCabecera}>
      <View style={styles.columnaNombre}>
        <Text style={styles.textoCabecera}>Medicina</Text>
      </View>
      <View style={styles.columnaDosis}>
        <Text style={styles.textoCabecera}>Dosis</Text>
      </View>
      <View style={styles.columnaHorarios}>
        <View style={styles.horariosGrid}>
          {horariosPredefinidos.map(horario => (
            <View key={horario.id} style={styles.horarioCabeceraItem}>
              <Icon name={horario.icono} size={16} color={horario.color} />
              <Text style={[styles.textoCabeceraHorario, { color: horario.color }]}>
                {horario.nombre.substring(0, 3)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.columnaAcciones}>
        <Text style={styles.textoCabecera}>Acciones</Text>
      </View>
    </View>
  );

  // Renderizar fila de medicina
  const renderFilaMedicina = ({ item }) => (
    <View style={styles.filaMedicina}>
      <View style={styles.columnaNombre}>
        <Text style={styles.textoMedicinaNombre} numberOfLines={2}>{item.nombre}</Text>
        {item.proposito && (
          <Text style={styles.textoProposito} numberOfLines={1}>{item.proposito}</Text>
        )}
      </View>

      <View style={styles.columnaDosis}>
        <Text style={styles.textoDosis}>{item.dosis}</Text>
      </View>

      <View style={styles.columnaHorarios}>
        <View style={styles.horariosGrid}>
          {horariosPredefinidos.map(horario => {
            const tieneEsteHorario = item.horarios?.includes(horario.id);
            const yaTomadaHoy = item.tomada_hoy?.includes(horario.id);

            return (
              <TouchableOpacity
                key={horario.id}
                style={[
                  styles.horarioItem,
                  tieneEsteHorario && styles.horarioItemActivo,
                  yaTomadaHoy && styles.horarioItemCompletado,
                ]}
                onPress={() => {
                  if (tieneEsteHorario) {
                    if (yaTomadaHoy) {
                      Alert.alert(
                        'Ya tomada hoy',
                        `${item.nombre} ya fue tomada ${horario.nombre.toLowerCase()}`
                      );
                    } else {
                      marcarComoTomada(item.id, horario.id);
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
      </View>

      <View style={styles.columnaAcciones}>
        <TouchableOpacity
          style={styles.botonAccion}
          onPress={() => abrirModalEditar(item)}
        >
          <Icon name="create-outline" size={20} color={COLORES.AZUL_CIELO_OSCURO} />
        </TouchableOpacity>

        {esAdministrador && (
          <TouchableOpacity
            style={styles.botonAccion}
            onPress={() => eliminarMedicina(item.id)}
          >
            <Icon name="trash-outline" size={20} color={COLORES.ERROR} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]} style={styles.fondo}>
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
            <Text style={[styles.textoFiltro, filtroPeriodo === 'hoy' && styles.textoFiltroActivo]}>
              Hoy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBoton, filtroPeriodo === 'semana' && styles.filtroBotonActivo]}
            onPress={() => setFiltroPeriodo('semana')}
          >
            <Text style={[styles.textoFiltro, filtroPeriodo === 'semana' && styles.textoFiltroActivo]}>
              Semana
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filtroBoton, filtroPeriodo === 'mes' && styles.filtroBotonActivo]}
            onPress={() => setFiltroPeriodo('mes')}
          >
            <Text style={[styles.textoFiltro, filtroPeriodo === 'mes' && styles.textoFiltroActivo]}>
              Todas
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={[COLORES.AMARILLO_PLATANO]} />}
          contentContainerStyle={styles.contenedorScroll}
        >
          {/* Tabla de medicinas */}
          <View style={styles.tablaContainer}>
            {renderCabeceraTabla()}

            {medicinasMostrar.length > 0 ? (
              <FlatList
                data={medicinasMostrar}
                renderItem={renderFilaMedicina}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.sinMedicinas}>
                <Icon name="medkit-outline" size={60} color={COLORES.GRIS_MEDIO} />
                <Text style={styles.textoSinMedicinas}>No hay medicinas registradas</Text>
                <Text style={styles.subtextoSinMedicinas}>
                  Toca en un horario para agregar una medicina
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
                  <TouchableOpacity
                    key={med.id}
                    style={styles.tarjetaFrecuente}
                    onPress={() => abrirModalEditar(med)}
                  >
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

          {/* Resumen */}
          <View style={styles.resumenContainer}>
            <View style={styles.itemResumen}>
              <Icon name="medkit-outline" size={24} color={COLORES.EXITO} />
              <Text style={styles.numeroResumen}>{medicinas.length}</Text>
              <Text style={styles.textoResumen}>Total</Text>
            </View>

            <View style={styles.separadorResumen} />

            <View style={styles.itemResumen}>
              <Icon name="today-outline" size={24} color={COLORES.AMARILLO_PLATANO} />
              <Text style={styles.numeroResumen}>{medicinasHoy.length}</Text>
              <Text style={styles.textoResumen}>Hoy</Text>
            </View>

            <View style={styles.separadorResumen} />

            <View style={styles.itemResumen}>
              <Icon name="warning-outline" size={24} color={COLORES.ROJO_CLARO} />
              <Text style={styles.numeroResumen}>
                {medicinas.filter(m => m.stock <= m.stock_minimo).length}
              </Text>
              <Text style={styles.textoResumen}>Bajo stock</Text>
            </View>
          </View>
        </ScrollView>

        {/* Botón flotante */}
        {esAdministrador && (
          <TouchableOpacity style={styles.botonFlotante} onPress={() => abrirModalAgregar()}>
            <Icon name="add-outline" size={30} color={COLORES.BLANCO} />
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Modal para agregar/editar medicina */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalAgregarVisible}
        onRequestClose={() => {
          setModalAgregarVisible(false);
          setMedicinaSeleccionada(null);
        }}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>
                {medicinaSeleccionada ? 'Editar Medicina' : 'Nueva Medicina'}
              </Text>
              <TouchableOpacity onPress={() => {
                setModalAgregarVisible(false);
                setMedicinaSeleccionada(null);
              }}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <Text style={styles.modalLabel}>Nombre de la medicina *</Text>
              <TextInput
                style={styles.input}
                value={nuevaMedicina.nombre}
                onChangeText={(text) => setNuevaMedicina({ ...nuevaMedicina, nombre: text })}
                placeholder="Ej: Paracetamol, Enalapril..."
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Dosis *</Text>
              <TextInput
                style={styles.input}
                value={nuevaMedicina.dosis}
                onChangeText={(text) => setNuevaMedicina({ ...nuevaMedicina, dosis: text })}
                placeholder="Ej: 500mg, 1 tableta, 10ml..."
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Horarios *</Text>
              <View style={styles.horariosContainer}>
                {horariosPredefinidos.map(horario => {
                  const seleccionado = nuevaMedicina.horarios.some(h => h.id === horario.id);
                  return (
                    <TouchableOpacity
                      key={horario.id}
                      style={[
                        styles.opcionHorario,
                        seleccionado && { backgroundColor: horario.color, borderColor: horario.color }
                      ]}
                      onPress={() => seleccionarHorario(horario.id)}
                    >
                      <Icon
                        name={horario.icono}
                        size={20}
                        color={seleccionado ? COLORES.BLANCO : horario.color}
                      />
                      <Text style={[
                        styles.textoOpcionHorario,
                        seleccionado && { color: COLORES.BLANCO, fontWeight: 'bold' }
                      ]}>
                        {horario.nombre}
                      </Text>
                      <Text style={[
                        styles.horaOpcion,
                        seleccionado && { color: COLORES.BLANCO }
                      ]}>
                        {horario.hora}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalLabel}>Frecuencia</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.frecuenciasContainer}>
                {frecuencias.map(frec => (
                  <TouchableOpacity
                    key={frec.id}
                    style={[
                      styles.opcionFrecuencia,
                      nuevaMedicina.frecuencia === frec.id && styles.opcionFrecuenciaSeleccionada
                    ]}
                    onPress={() => setNuevaMedicina({ ...nuevaMedicina, frecuencia: frec.id })}
                  >
                    <Icon
                      name={frec.icono}
                      size={18}
                      color={nuevaMedicina.frecuencia === frec.id ? COLORES.BLANCO : COLORES.GRIS_OSCURO}
                    />
                    <Text style={[
                      styles.textoOpcionFrecuencia,
                      nuevaMedicina.frecuencia === frec.id && styles.textoOpcionFrecuenciaSeleccionada
                    ]}>
                      {frec.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.filaInputs}>
                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Stock actual</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaMedicina.stock}
                    onChangeText={(text) => setNuevaMedicina({ ...nuevaMedicina, stock: text })}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>

                <View style={styles.inputMitad}>
                  <Text style={styles.modalLabel}>Stock mínimo</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaMedicina.stock_minimo}
                    onChangeText={(text) => setNuevaMedicina({ ...nuevaMedicina, stock_minimo: text })}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>Duración (días)</Text>
              <TextInput
                style={styles.input}
                value={nuevaMedicina.duracion}
                onChangeText={(text) => setNuevaMedicina({ ...nuevaMedicina, duracion: text })}
                keyboardType="numeric"
                placeholder="Ej: 30 (dejar vacío si es permanente)"
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Propósito</Text>
              <TextInput
                style={styles.input}
                value={nuevaMedicina.proposito}
                onChangeText={(text) => setNuevaMedicina({ ...nuevaMedicina, proposito: text })}
                placeholder="¿Para qué se toma esta medicina?"
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Instrucciones especiales</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={nuevaMedicina.instrucciones}
                onChangeText={(text) => setNuevaMedicina({ ...nuevaMedicina, instrucciones: text })}
                multiline
                numberOfLines={3}
                placeholder="Ej: Tomar con alimentos, evitar alcohol..."
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => {
                  setModalAgregarVisible(false);
                  setMedicinaSeleccionada(null);
                }}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              {medicinaSeleccionada && (
                <TouchableOpacity
                  style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]}
                  onPress={() => eliminarMedicina(medicinaSeleccionada.id)}
                >
                  <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                onPress={guardarMedicina}
              >
                <Text style={styles.textoBotonModalAccion}>
                  {medicinaSeleccionada ? 'Actualizar' : 'Guardar'}
                </Text>
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

  // Filtros
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
  filtroBotonActivo: {
    backgroundColor: COLORES.AZUL_CIELO,
  },
  textoFiltro: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
  },
  textoFiltroActivo: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Contenido
  contenedorScroll: {
    padding: 15,
    paddingBottom: 80,
  },

  // Tabla
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

  // Cabecera de tabla
  filaCabecera: {
    flexDirection: 'row',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  textoCabecera: {
    color: COLORES.BLANCO,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  columnaNombre: {
    width: 100,
    paddingHorizontal: 5,
  },
  columnaDosis: {
    width: 60,
    paddingHorizontal: 5,
  },
  columnaHorario: {
    flex: 1,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnaAcciones: {
    width: 70,
    paddingHorizontal: 5,
  },
  horarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  horaCabecera: {
    color: COLORES.BLANCO,
    fontSize: 10,
    opacity: 0.8,
  },

  // Filas de medicinas
  filaMedicina: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
    minHeight: 70,
    alignItems: 'center',
  },
  textoMedicinaNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  textoProposito: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
    fontStyle: 'italic',
  },
  textoDosis: {
    fontSize: 12,
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
  },
  horarioMarcado: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonAccion: {
    padding: 6,
    marginHorizontal: 2,
  },

  sinMedicinas: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSinMedicinas: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  subtextoSinMedicinas: {
    fontSize: 12,
    color: COLORES.GRIS_MEDIO,
    textAlign: 'center',
  },

  // Medicinas frecuentes
  seccion: {
    marginBottom: 25,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  contenedorFrecuentes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tarjetaFrecuente: {
    width: '48%',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  encabezadoFrecuente: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nombreFrecuente: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 8,
    flex: 1,
  },
  dosisFrecuente: {
    fontSize: 12,
    color: COLORES.AZUL_CIELO_OSCURO,
    fontWeight: '600',
    marginBottom: 5,
  },
  horariosFrecuente: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
    fontStyle: 'italic',
  },

  // Resumen
  resumenContainer: {
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
  numeroResumen: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginVertical: 5,
  },
  textoResumen: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
  },
  separadorResumen: {
    width: 1,
    backgroundColor: COLORES.GRIS_CLARO,
    marginHorizontal: 10,
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
    maxHeight: Dimensions.get('window').height * 0.7,
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
    padding: 12,
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
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

  // Horarios
  horariosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  opcionHorario: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginBottom: 10,
  },
  textoOpcionHorario: {
    fontSize: 12,
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 8,
    flex: 1,
  },
  horaOpcion: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
  },

  // Frecuencias
  frecuenciasContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  opcionFrecuencia: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginRight: 10,
  },
  opcionFrecuenciaSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionFrecuencia: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 6,
  },
  textoOpcionFrecuenciaSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
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
  botonModalAccion: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBotonModalAccion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.BLANCO,
  },
  // Reemplaza o agrega estos estilos

  columnaHorarios: {
    flex: 2, // mayor espacio para horarios
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  horariosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  horarioCabeceraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  textoCabeceraHorario: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  horarioItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 2,
    backgroundColor: COLORES.GRIS_CLARO,
    minHeight: 40,
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
  // Ajusta columnas
  columnaNombre: {
    width: 90,
    paddingHorizontal: 4,
  },
  columnaDosis: {
    width: 55,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  columnaAcciones: {
    width: 60,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  filaCabecera: {
    flexDirection: 'row',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  filaMedicina: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
    alignItems: 'center',
    minHeight: 70,
  },
}); 