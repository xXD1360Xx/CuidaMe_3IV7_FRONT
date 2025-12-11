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
  Image
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
  ROJO_CLARO: '#EF5350'
};

export default function VistaInfoAnciano({ navigation, route }) {
  const [adultoMayor, setAdultoMayor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState(''); // 'enfermedad', 'alergia', 'articulo', 'hobby'
  const [modalData, setModalData] = useState({});
  const [usuarioRol, setUsuarioRol] = useState('');
  
  // Estados para formularios
  const [nuevaEnfermedad, setNuevaEnfermedad] = useState('');
  const [nuevaAlergia, setNuevaAlergia] = useState('');
  const [nuevoArticulo, setNuevoArticulo] = useState({ nombre: '', cantidad: '1', ubicacion: '' });
  const [nuevoHobby, setNuevoHobby] = useState('');

  // Cargar datos del adulto mayor
  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      
      // Obtener ID del usuario actual
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioRol(usuario.rol);
        
        // Cargar información del adulto mayor principal
        const response = await servicioAPI.obtenerAdultoMayorPrincipal(usuario.id);
        
        if (response.exito && response.adultoMayor) {
          setAdultoMayor(response.adultoMayor);
        } else {
          // Si no tiene adulto mayor asignado, mostrar pantalla de configuración
          Alert.alert(
            'Sin adulto mayor asignado',
            'Debes configurar primero la información del adulto mayor a cargo.',
            [
              {
                text: 'Configurar ahora',
                onPress: () => navigation.navigate('Configuracion', { seccion: 'adultoMayor' })
              },
              {
                text: 'Más tarde',
                style: 'cancel',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [navigation]);

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [cargando]);

  // Refrescar manualmente
  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatos();
  }, [cargando]);

  // Calcular edad a partir de fecha de nacimiento
  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '--';
    
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  };

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'No especificada';
    
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Abrir modal para agregar/editar
  const abrirModal = (tipo, datos = {}) => {
    setModalTipo(tipo);
    setModalData(datos);
    setModalVisible(true);
    
    // Resetear formularios según el tipo
    switch(tipo) {
      case 'enfermedad':
        setNuevaEnfermedad(datos.nombre || '');
        break;
      case 'alergia':
        setNuevaAlergia(datos.nombre || '');
        break;
      case 'articulo':
        setNuevoArticulo({
          nombre: datos.nombre || '',
          cantidad: datos.cantidad?.toString() || '1',
          ubicacion: datos.ubicacion || ''
        });
        break;
      case 'hobby':
        setNuevoHobby(datos.nombre || '');
        break;
    }
  };

  // Guardar datos del modal
  const guardarModal = async () => {
    try {
      // Validaciones básicas
      if (modalTipo === 'enfermedad' && !nuevaEnfermedad.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre de la enfermedad');
        return;
      }
      
      if (modalTipo === 'alergia' && !nuevaAlergia.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre de la alergia');
        return;
      }
      
      if (modalTipo === 'articulo' && !nuevoArticulo.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre del artículo');
        return;
      }
      
      if (modalTipo === 'hobby' && !nuevoHobby.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre del hobby');
        return;
      }

      // Aquí iría la llamada a la API para guardar los datos
      // Por ahora, solo actualizamos el estado local para demostración
      
      Alert.alert('Éxito', 'Información guardada correctamente');
      setModalVisible(false);
      
      // Limpiar formularios
      setNuevaEnfermedad('');
      setNuevaAlergia('');
      setNuevoArticulo({ nombre: '', cantidad: '1', ubicacion: '' });
      setNuevoHobby('');
      
      // Recargar datos
      onRefresh();
      
    } catch (error) {
      console.error('Error guardando datos:', error);
      Alert.alert('Error', 'No se pudo guardar la información');
    }
  };

  // Eliminar elemento
  const eliminarElemento = (tipo, id) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar este ${tipo}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Aquí iría la llamada a la API para eliminar
              Alert.alert('Éxito', `${tipo} eliminado correctamente`);
              onRefresh();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  // Navegar a otras pantallas
  const navegarA = (destino, params = {}) => {
    navigation.navigate(destino, params);
  };

  // Verificar si es administrador
  const esAdministrador = usuarioRol === 'familiar_admin';

  // Mostrar pantalla de carga
  if (cargando) {
    return (
      <LinearGradient 
        colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]}
        style={styles.fondo}
      >
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando información...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Si no hay adulto mayor
  if (!adultoMayor) {
    return (
      <LinearGradient 
        colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]}
        style={styles.fondo}
      >
        <SafeAreaView style={styles.centrado}>
          <Icon name="person-outline" size={80} color={COLORES.GRIS_OSCURO} />
          <Text style={styles.textoVacio}>No hay adulto mayor asignado</Text>
          <Text style={styles.textoVacioSub}>Configura la información en Configuración</Text>
          <TouchableOpacity 
            style={styles.botonPrincipal}
            onPress={() => navigation.navigate('Configuracion', { seccion: 'adultoMayor' })}
          >
            <Text style={styles.textoBotonPrincipal}>Ir a Configuración</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

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
            <Text style={styles.tituloPrincipal}>Información General</Text>
            <Text style={styles.subtituloPrincipal}>{adultoMayor.nombre || 'Adulto Mayor'}</Text>
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
          {/* Tarjeta de información básica */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="information-circle-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.tituloSeccion}>Información Básica</Text>
              
              {esAdministrador && (
                <TouchableOpacity 
                  style={styles.botonEditar}
                  onPress={() => navegarA('Configuracion', { seccion: 'adultoMayor' })}
                >
                  <Icon name="create-outline" size={20} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.contenedorTarjeta}>
              <View style={styles.filaInfo}>
                <View style={styles.itemInfo}>
                  <Icon name="calendar-outline" size={20} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Edad:</Text>
                  <Text style={styles.valorInfo}>
                    {calcularEdad(adultoMayor.fecha_nacimiento)} años
                  </Text>
                </View>
                
                <View style={styles.itemInfo}>
                  <Icon name="male-female-outline" size={20} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Género:</Text>
                  <Text style={styles.valorInfo}>
                    {adultoMayor.genero === 'M' ? 'Masculino' : 
                     adultoMayor.genero === 'F' ? 'Femenino' : 'No especificado'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.filaInfo}>
                <View style={styles.itemInfo}>
                  <Icon name="heart-outline" size={20} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Estado de salud:</Text>
                  <View style={[
                    styles.estadoSalud,
                    { backgroundColor: 
                      adultoMayor.estado_salud === 'excelente' ? COLORES.EXITO :
                      adultoMayor.estado_salud === 'bueno' ? COLORES.VERDE_CLARO :
                      adultoMayor.estado_salud === 'regular' ? COLORES.AMARILLO_PLATANO :
                      COLORES.ERROR
                    }
                  ]}>
                    <Text style={styles.textoEstadoSalud}>
                      {adultoMayor.estado_salud?.toUpperCase() || 'NO ESPECIFICADO'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.itemInfo}>
                  <Icon name="bed-outline" size={20} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.labelInfo}>Dependencia:</Text>
                  <Text style={styles.valorInfo}>
                    {adultoMayor.nivel_dependencia === 'alta' ? 'Alta' :
                     adultoMayor.nivel_dependencia === 'media' ? 'Media' :
                     adultoMayor.nivel_dependencia === 'baja' ? 'Baja' : 'No especificada'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoCompleta}>
                <Text style={styles.labelInfo}>Fecha de nacimiento:</Text>
                <Text style={styles.valorInfo}>
                  {formatearFecha(adultoMayor.fecha_nacimiento)}
                </Text>
              </View>
              
              {adultoMayor.contacto_emergencia && (
                <View style={styles.infoCompleta}>
                  <Text style={styles.labelInfo}>Contacto emergencia:</Text>
                  <Text style={styles.valorInfo}>{adultoMayor.contacto_emergencia}</Text>
                </View>
              )}
              
              {adultoMayor.telefono_emergencia && (
                <View style={styles.infoCompleta}>
                  <Text style={styles.labelInfo}>Teléfono emergencia:</Text>
                  <Text style={[styles.valorInfo, { color: COLORES.ERROR }]}>
                    {adultoMayor.telefono_emergencia}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Enfermedades y Condiciones */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="medical-outline" size={24} color={COLORES.ROJO_CLARO} />
              <Text style={styles.tituloSeccion}>Enfermedades y Condiciones</Text>
              
              {esAdministrador && (
                <TouchableOpacity 
                  style={styles.botonAgregar}
                  onPress={() => abrirModal('enfermedad')}
                >
                  <Icon name="add-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.contenedorTarjeta}>
              {adultoMayor.enfermedades?.length > 0 ? (
                adultoMayor.enfermedades.map((enfermedad, index) => (
                  <View key={index} style={styles.itemLista}>
                    <View style={styles.infoItem}>
                      <Icon name="warning-outline" size={18} color={COLORES.ROJO_CLARO} />
                      <Text style={styles.textoItem}>{enfermedad.nombre}</Text>
                      {enfermedad.diagnosticada_en && (
                        <Text style={styles.fechaItem}>
                          Diagnóstico: {formatearFecha(enfermedad.diagnosticada_en)}
                        </Text>
                      )}
                      {enfermedad.tratamiento && (
                        <Text style={styles.detalleItem}>
                          Tratamiento: {enfermedad.tratamiento}
                        </Text>
                      )}
                    </View>
                    
                    {esAdministrador && (
                      <TouchableOpacity 
                        style={styles.botonEliminar}
                        onPress={() => eliminarElemento('enfermedad', enfermedad.id)}
                      >
                        <Icon name="trash-outline" size={18} color={COLORES.ERROR} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay enfermedades registradas</Text>
              )}
            </View>
          </View>

          {/* Alergias */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="alert-circle-outline" size={24} color={COLORES.AMARILLO_PLATANO} />
              <Text style={styles.tituloSeccion}>Alergias</Text>
              
              {esAdministrador && (
                <TouchableOpacity 
                  style={styles.botonAgregar}
                  onPress={() => abrirModal('alergia')}
                >
                  <Icon name="add-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.contenedorTarjeta}>
              {adultoMayor.alergias?.length > 0 ? (
                adultoMayor.alergias.map((alergia, index) => (
                  <View key={index} style={styles.itemLista}>
                    <View style={styles.infoItem}>
                      <Icon name="flash-outline" size={18} color={COLORES.AMARILLO_OSCURO} />
                      <Text style={styles.textoItem}>{alergia.nombre}</Text>
                      {alergia.severidad && (
                        <View style={[
                          styles.badgeSeveridad,
                          { backgroundColor: 
                            alergia.severidad === 'alta' ? COLORES.ERROR :
                            alergia.severidad === 'media' ? COLORES.AMARILLO_PLATANO :
                            COLORES.VERDE_CLARO
                          }
                        ]}>
                          <Text style={styles.textoBadge}>
                            {alergia.severidad.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {alergia.reaccion && (
                        <Text style={styles.detalleItem}>Reacción: {alergia.reaccion}</Text>
                      )}
                    </View>
                    
                    {esAdministrador && (
                      <TouchableOpacity 
                        style={styles.botonEliminar}
                        onPress={() => eliminarElemento('alergia', alergia.id)}
                      >
                        <Icon name="trash-outline" size={18} color={COLORES.ERROR} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay alergias registradas</Text>
              )}
            </View>
          </View>

          {/* Medicinas Habituales */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="medkit-outline" size={24} color={COLORES.EXITO} />
              <Text style={styles.tituloSeccion}>Medicinas Habituales</Text>
              
              <TouchableOpacity 
                style={styles.botonVerTodo}
                onPress={() => navegarA('Medicinas')}
              >
                <Text style={styles.textoBotonVerTodo}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.contenedorTarjeta}>
              {adultoMayor.medicinas_habituales?.length > 0 ? (
                adultoMayor.medicinas_habituales.slice(0, 3).map((medicina, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.itemLista}
                    onPress={() => navegarA('Medicinas', { medicinaId: medicina.id })}
                  >
                    <View style={styles.infoItem}>
                      <Icon name="pills-outline" size={18} color={COLORES.EXITO} />
                      <Text style={styles.textoItem}>{medicina.nombre}</Text>
                      <Text style={styles.detalleItem}>
                        {medicina.dosis} • {medicina.frecuencia}
                      </Text>
                      {medicina.proposito && (
                        <Text style={styles.detalleItem}>Para: {medicina.proposito}</Text>
                      )}
                    </View>
                    
                    <Icon name="chevron-forward-outline" size={20} color={COLORES.GRIS_MEDIO} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay medicinas registradas</Text>
              )}
              
              {adultoMayor.medicinas_habituales?.length > 3 && (
                <TouchableOpacity 
                  style={styles.botonVerMas}
                  onPress={() => navegarA('Medicinas')}
                >
                  <Text style={styles.textoBotonVerMas}>
                    Ver {adultoMayor.medicinas_habituales.length - 3} medicinas más
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Artículos y Equipamiento */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="cube-outline" size={24} color={COLORES.AZUL_CIELO} />
              <Text style={styles.tituloSeccion}>Artículos y Equipamiento</Text>
              
              {esAdministrador && (
                <TouchableOpacity 
                  style={styles.botonAgregar}
                  onPress={() => abrirModal('articulo')}
                >
                  <Icon name="add-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.contenedorTarjeta}>
              {adultoMayor.articulos?.length > 0 ? (
                adultoMayor.articulos.map((articulo, index) => (
                  <View key={index} style={styles.itemLista}>
                    <View style={styles.infoItem}>
                      <Icon name="cube-outline" size={18} color={COLORES.AZUL_CIELO} />
                      <Text style={styles.textoItem}>{articulo.nombre}</Text>
                      <View style={styles.infoDetalle}>
                        <Text style={styles.detalleItem}>Cantidad: {articulo.cantidad}</Text>
                        {articulo.ubicacion && (
                          <Text style={styles.detalleItem}>Ubicación: {articulo.ubicacion}</Text>
                        )}
                      </View>
                    </View>
                    
                    {esAdministrador && (
                      <TouchableOpacity 
                        style={styles.botonEliminar}
                        onPress={() => eliminarElemento('artículo', articulo.id)}
                      >
                        <Icon name="trash-outline" size={18} color={COLORES.ERROR} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay artículos registrados</Text>
              )}
            </View>
          </View>

          {/* Hobbies y Actividades */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="happy-outline" size={24} color={COLORES.VERDE_CLARO} />
              <Text style={styles.tituloSeccion}>Hobbies y Actividades</Text>
              
              {esAdministrador && (
                <TouchableOpacity 
                  style={styles.botonAgregar}
                  onPress={() => abrirModal('hobby')}
                >
                  <Icon name="add-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.contenedorTarjeta}>
              {adultoMayor.hobbies?.length > 0 ? (
                <View style={styles.contenedorHobbies}>
                  {adultoMayor.hobbies.map((hobby, index) => (
                    <View key={index} style={styles.hobbyItem}>
                      <Icon name="star-outline" size={16} color={COLORES.AMARILLO_PLATANO} />
                      <Text style={styles.textoHobby}>{hobby.nombre}</Text>
                      
                      {esAdministrador && (
                        <TouchableOpacity 
                          style={styles.botonEliminarHobby}
                          onPress={() => eliminarElemento('hobby', hobby.id)}
                        >
                          <Icon name="close-outline" size={16} color={COLORES.GRIS_OSCURO} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.textoVacioLista}>No hay hobbies registrados</Text>
              )}
            </View>
          </View>

          {/* Citas Médicas Rutinarias */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Icon name="calendar-outline" size={24} color={COLORES.AMARILLO_OSCURO} />
              <Text style={styles.tituloSeccion}>Citas Médicas Rutinarias</Text>
              
              <TouchableOpacity 
                style={styles.botonVerTodo}
                onPress={() => navegarA('Calendario', { tipo: 'citas_medicas' })}
              >
                <Text style={styles.textoBotonVerTodo}>Ver calendario →</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.contenedorTarjeta}>
              {adultoMayor.citas_rutinarias?.length > 0 ? (
                adultoMayor.citas_rutinarias.map((cita, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.itemLista}
                    onPress={() => navegarA('Calendario', { citaId: cita.id })}
                  >
                    <View style={styles.infoItem}>
                      <Icon name="medical-outline" size={18} color={COLORES.EXITO} />
                      <Text style={styles.textoItem}>{cita.especialista || cita.tipo}</Text>
                      <Text style={styles.detalleItem}>
                        Frecuencia: {cita.frecuencia} • Próxima: {formatearFecha(cita.proxima_cita)}
                      </Text>
                      {cita.ubicacion && (
                        <Text style={styles.detalleItem}>Lugar: {cita.ubicacion}</Text>
                      )}
                    </View>
                    
                    <Icon name="chevron-forward-outline" size={20} color={COLORES.GRIS_MEDIO} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay citas rutinarias registradas</Text>
              )}
            </View>
          </View>

          {/* Notas Adicionales */}
          {adultoMayor.notas && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="document-text-outline" size={24} color={COLORES.GRIS_OSCURO} />
                <Text style={styles.tituloSeccion}>Notas Adicionales</Text>
              </View>
              
              <View style={styles.contenedorTarjeta}>
                <Text style={styles.textoNotas}>{adultoMayor.notas}</Text>
              </View>
            </View>
          )}

          {/* Botones de acción */}
          {esAdministrador && (
            <View style={styles.seccionAcciones}>
              <TouchableOpacity 
                style={styles.botonAccion}
                onPress={() => navegarA('Configuracion', { seccion: 'adultoMayor' })}
              >
                <Icon name="settings-outline" size={22} color={COLORES.BLANCO} />
                <Text style={styles.textoBotonAccion}>Editar Información Completa</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.botonAccion, { backgroundColor: COLORES.VERDE_CLARO }]}
                onPress={() => navigation.navigate('GenerarReporte')}
              >
                <Icon name="download-outline" size={22} color={COLORES.BLANCO} />
                <Text style={styles.textoBotonAccion}>Generar Reporte</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal para agregar/editar información */}
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
                {modalData.id ? 'Editar' : 'Agregar'} {
                  modalTipo === 'enfermedad' ? 'Enfermedad' :
                  modalTipo === 'alergia' ? 'Alergia' :
                  modalTipo === 'articulo' ? 'Artículo' : 'Hobby'
                }
              </Text>
              
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close-outline" size={24} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalFormulario}>
              {modalTipo === 'enfermedad' && (
                <>
                  <Text style={styles.modalLabel}>Nombre de la enfermedad *</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaEnfermedad}
                    onChangeText={setNuevaEnfermedad}
                    placeholder="Ej: Hipertensión, Diabetes, etc."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  
                  <Text style={styles.modalLabel}>Fecha de diagnóstico</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  
                  <Text style={styles.modalLabel}>Tratamiento</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe el tratamiento..."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </>
              )}
              
              {modalTipo === 'alergia' && (
                <>
                  <Text style={styles.modalLabel}>Nombre de la alergia *</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevaAlergia}
                    onChangeText={setNuevaAlergia}
                    placeholder="Ej: Penicilina, Frutos secos, etc."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  
                  <Text style={styles.modalLabel}>Severidad</Text>
                  <View style={styles.opcionesSeveridad}>
                    <TouchableOpacity style={[styles.opcionSeveridad, { backgroundColor: COLORES.VERDE_CLARO }]}>
                      <Text style={styles.textoOpcionSeveridad}>BAJA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.opcionSeveridad, { backgroundColor: COLORES.AMARILLO_PLATANO }]}>
                      <Text style={styles.textoOpcionSeveridad}>MEDIA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.opcionSeveridad, { backgroundColor: COLORES.ERROR }]}>
                      <Text style={styles.textoOpcionSeveridad}>ALTA</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.modalLabel}>Reacción</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe la reacción..."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </>
              )}
              
              {modalTipo === 'articulo' && (
                <>
                  <Text style={styles.modalLabel}>Nombre del artículo *</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoArticulo.nombre}
                    onChangeText={(text) => setNuevoArticulo({...nuevoArticulo, nombre: text})}
                    placeholder="Ej: Bastón, Silla de ruedas, Andador, etc."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  
                  <Text style={styles.modalLabel}>Cantidad</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoArticulo.cantidad}
                    onChangeText={(text) => setNuevoArticulo({...nuevoArticulo, cantidad: text})}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  
                  <Text style={styles.modalLabel}>Ubicación</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoArticulo.ubicacion}
                    onChangeText={(text) => setNuevoArticulo({...nuevoArticulo, ubicacion: text})}
                    placeholder="Ej: Habitación principal, Baño, etc."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  
                  <Text style={styles.modalLabel}>Estado</Text>
                  <View style={styles.opcionesEstado}>
                    <TouchableOpacity style={[styles.opcionEstado, { backgroundColor: COLORES.EXITO }]}>
                      <Text style={styles.textoOpcionEstado}>ÓPTIMO</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.opcionEstado, { backgroundColor: COLORES.AMARILLO_PLATANO }]}>
                      <Text style={styles.textoOpcionEstado}>REGULAR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.opcionEstado, { backgroundColor: COLORES.ERROR }]}>
                      <Text style={styles.textoOpcionEstado}>REPARAR</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              {modalTipo === 'hobby' && (
                <>
                  <Text style={styles.modalLabel}>Nombre del hobby/actividad *</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoHobby}
                    onChangeText={setNuevoHobby}
                    placeholder="Ej: Lectura, Jardinería, Tejer, etc."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  
                  <Text style={styles.modalLabel}>Frecuencia</Text>
                  <View style={styles.opcionesFrecuencia}>
                    <TouchableOpacity style={styles.opcionFrecuencia}>
                      <Text style={styles.textoOpcionFrecuencia}>Diario</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.opcionFrecuencia}>
                      <Text style={styles.textoOpcionFrecuencia}>Semanal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.opcionFrecuencia}>
                      <Text style={styles.textoOpcionFrecuencia}>Ocasional</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.modalLabel}>Notas adicionales</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    placeholder="Detalles adicionales..."
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                </>
              )}
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
                onPress={guardarModal}
              >
                <Text style={styles.textoBotonModalGuardar}>Guardar</Text>
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
  textoVacio: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  textoVacioSub: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
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
  
  // Contenido principal
  contenedorScroll: {
    padding: 20,
    paddingBottom: 40,
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
  botonEditar: {
    padding: 8,
  },
  botonAgregar: {
    padding: 8,
  },
  botonVerTodo: {
    padding: 8,
  },
  textoBotonVerTodo: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Tarjetas
  contenedorTarjeta: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Información básica
  filaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelInfo: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 8,
    marginRight: 5,
  },
  valorInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORES.TEXTO_OSCURO,
  },
  infoCompleta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  estadoSalud: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  textoEstadoSalud: {
    color: COLORES.BLANCO,
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Listas
  itemLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoItem: {
    flex: 1,
  },
  textoItem: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  fechaItem: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    fontStyle: 'italic',
    marginTop: 2,
  },
  detalleItem: {
    fontSize: 13,
    color: COLORES.GRIS_OSCURO,
    marginTop: 2,
  },
  infoDetalle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  botonEliminar: {
    padding: 8,
    marginLeft: 10,
  },
  
  // Badges
  badgeSeveridad: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  textoBadge: {
    color: COLORES.BLANCO,
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Hobbies
  contenedorHobbies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hobbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  textoHobby: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 6,
    marginRight: 8,
  },
  botonEliminarHobby: {
    padding: 2,
  },
  
  // Ver más
  botonVerMas: {
    marginTop: 15,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  textoBotonVerMas: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Notas
  textoNotas: {
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  
  // Textos vacíos en listas
  textoVacioLista: {
    textAlign: 'center',
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  
  // Acciones
  seccionAcciones: {
    marginTop: 10,
  },
  botonAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  textoBotonAccion: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
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
    maxHeight: '80%',
  },
  modalEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  modalFormulario: {
    maxHeight: 400,
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
  
  // Opciones de selección
  opcionesSeveridad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  opcionSeveridad: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoOpcionSeveridad: {
    color: COLORES.BLANCO,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  opcionesEstado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  opcionEstado: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoOpcionEstado: {
    color: COLORES.BLANCO,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  opcionesFrecuencia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  opcionFrecuencia: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
  },
  textoOpcionFrecuencia: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 12,
    fontWeight: '500',
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
  
  // Botón principal
  botonPrincipal: {
    backgroundColor: COLORES.AMARILLO_PLATANO,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORES.AMARILLO_OSCURO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  textoBotonPrincipal: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 18,
    fontWeight: 'bold',
  },
});