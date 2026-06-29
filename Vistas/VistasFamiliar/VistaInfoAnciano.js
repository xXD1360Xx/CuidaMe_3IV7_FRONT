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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
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
};

export default function VistaInfoAnciano({ navigation }) {
  const [adultoMayor, setAdultoMayor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [usuarioRol, setUsuarioRol] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState('');
  const [modalData, setModalData] = useState({});

  // Estados para formularios
  const [nuevaEnfermedad, setNuevaEnfermedad] = useState('');
  const [nuevaAlergia, setNuevaAlergia] = useState('');
  const [nuevoArticulo, setNuevoArticulo] = useState({ nombre: '', cantidad: '1', ubicacion: '' });
  const [nuevoHobby, setNuevoHobby] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (!usuarioData) {
        setCargando(false);
        return;
      }
      const usuario = JSON.parse(usuarioData);
      setUsuarioRol(usuario.rol);
      const id = usuario.id;
      setUsuarioId(id);

      const response = await servicioAPI.obtenerAdultoMayorPrincipal(id);
      if (response.exito && response.adultoMayor) {
        setAdultoMayor(response.adultoMayor);
      } else {
        setAdultoMayor(null);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatos();
  }, [cargarDatos]);

  const esAdministrador = usuarioRol === 'familiar_admin' || usuarioRol === 'familiar_principal';

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '--';
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento)) return '--';
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
    if (!fechaStr) return 'Fecha no disponible';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha)) return 'Fecha inválida';
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const abrirModal = (tipo, datos = {}) => {
    setModalTipo(tipo);
    setModalData(datos);
    setModalVisible(true);
    switch (tipo) {
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
          ubicacion: datos.ubicacion || '',
        });
        break;
      case 'hobby':
        setNuevoHobby(datos.nombre || '');
        break;
    }
  };

  const guardarModal = async () => {
    try {
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

      Alert.alert('Éxito', 'Información guardada correctamente');
      setModalVisible(false);
      setNuevaEnfermedad('');
      setNuevaAlergia('');
      setNuevoArticulo({ nombre: '', cantidad: '1', ubicacion: '' });
      setNuevoHobby('');
      cargarDatos();
    } catch (error) {
      console.error('Error guardando datos:', error);
      Alert.alert('Error', 'No se pudo guardar la información');
    }
  };

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
              Alert.alert('Éxito', `${tipo} eliminado correctamente`);
              cargarDatos();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const navegarA = (destino, params = {}) => {
    navigation.navigate(destino, params);
  };

  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando información...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!adultoMayor) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
        <SafeAreaView style={styles.contenedor}>
          <View style={styles.encabezado}>
            <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 24 }}>⬅️</Text>
            </TouchableOpacity>
            <View style={styles.tituloContainer}>
              <Text style={styles.tituloPrincipal}>Información del Adulto Mayor</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.sinAdultoContainer}>
            <Text style={styles.sinAdultoIcono}>👤</Text>
            <Text style={styles.sinAdultoTitulo}>No hay adulto mayor asignado</Text>
            <Text style={styles.sinAdultoSubtitulo}>
              Registra la información de la persona a quien vas a cuidar.
            </Text>

            <TouchableOpacity
              style={styles.botonAgregarAdulto}
              onPress={() => {
                navigation.replace('CrearAnciano', {
                  usuarioId: usuarioId,
                  codigoFamiliar: null,
                });
              }}
            >
              <Text style={styles.textoBotonAgregarAdulto}>➕ Agregar adulto mayor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonSaltarAdulto}
              onPress={() => navigation.replace('Principal')}
            >
              <Text style={styles.textoBotonSaltarAdulto}>Saltar por ahora</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Render principal cuando hay adulto mayor
  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24 }}>⬅️</Text>
          </TouchableOpacity>
          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>Información General</Text>
            <Text style={styles.subtituloPrincipal}>{adultoMayor?.nombre || 'Adulto Mayor'}</Text>
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
          {/* Tarjeta de información básica */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>ℹ️</Text>
              <Text style={styles.tituloSeccion}>Información Básica</Text>
              {esAdministrador && (
                <TouchableOpacity
                  style={styles.botonEditar}
                  onPress={() => navegarA('CrearAnciano', { usuarioId, codigoFamiliar: null })}
                >
                  <Text style={{ fontSize: 18 }}>📝</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contenedorTarjeta}>
              <View style={styles.filaInfo}>
                <View style={styles.itemInfo}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>📅</Text>
                  <Text style={styles.labelInfo}>Edad:</Text>
                  <Text style={styles.valorInfo}>
                    {calcularEdad(adultoMayor?.fecha_nacimiento)} años
                  </Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>🧬</Text>
                  <Text style={styles.labelInfo}>Género:</Text>
                  <Text style={styles.valorInfo}>
                    {adultoMayor?.genero === 'M' || adultoMayor?.genero === 'Masculino'
                      ? 'Masculino'
                      : adultoMayor?.genero === 'F' || adultoMayor?.genero === 'Femenino'
                        ? 'Femenino'
                        : 'No especificado'}
                  </Text>
                </View>
              </View>

              <View style={styles.filaInfo}>
                <View style={styles.itemInfo}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>❤️</Text>
                  <Text style={styles.labelInfo}>Estado de salud:</Text>
                  <View
                    style={[
                      styles.estadoSalud,
                      {
                        backgroundColor:
                          adultoMayor?.estado_salud === 'excelente'
                            ? COLORES.EXITO
                            : adultoMayor?.estado_salud === 'bueno'
                              ? COLORES.VERDE_CLARO
                              : adultoMayor?.estado_salud === 'regular'
                                ? COLORES.AMARILLO_PLATANO
                                : COLORES.ERROR,
                      },
                    ]}
                  >
                    <Text style={styles.textoEstadoSalud}>
                      {adultoMayor?.estado_salud?.toUpperCase() || 'NO ESPECIFICADO'}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>🛌</Text>
                  <Text style={styles.labelInfo}>Dependencia:</Text>
                  <Text style={styles.valorInfo}>
                    {adultoMayor?.nivel_dependencia === 'alta'
                      ? 'Alta'
                      : adultoMayor?.nivel_dependencia === 'media'
                        ? 'Media'
                        : adultoMayor?.nivel_dependencia === 'baja'
                          ? 'Baja'
                          : 'No especificada'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCompleta}>
                <Text style={styles.labelInfo}>Fecha de nacimiento:</Text>
                <Text style={styles.valorInfo}>
                  {formatearFecha(adultoMayor?.fecha_nacimiento)}
                </Text>
              </View>

              {adultoMayor?.contacto_emergencia && (
                <View style={styles.infoCompleta}>
                  <Text style={styles.labelInfo}>Contacto emergencia:</Text>
                  <Text style={styles.valorInfo}>{adultoMayor.contacto_emergencia}</Text>
                </View>
              )}

              {adultoMayor?.telefono_emergencia && (
                <View style={styles.infoCompleta}>
                  <Text style={styles.labelInfo}>Teléfono emergencia:</Text>
                  <Text style={[styles.valorInfo, { color: COLORES.ERROR }]}>
                    {adultoMayor.telefono_emergencia}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Enfermedades */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>🩺</Text>
              <Text style={styles.tituloSeccion}>Enfermedades y Condiciones</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('enfermedad')}>
                  <Text style={{ fontSize: 22 }}>➕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.enfermedades?.length > 0 ? (
                adultoMayor.enfermedades.map((enfermedad, index) => (
                  <View key={index} style={styles.itemLista}>
                    <View style={styles.infoItem}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>⚠️</Text>
                      <Text style={styles.textoItem}>{enfermedad.nombre}</Text>
                      {enfermedad.fecha_diagnostico && (
                        <Text style={styles.fechaItem}>
                          Diagnóstico: {formatearFecha(enfermedad.fecha_diagnostico)}
                        </Text>
                      )}
                      {enfermedad.tratamiento && (
                        <Text style={styles.detalleItem}>Tratamiento: {enfermedad.tratamiento}</Text>
                      )}
                    </View>
                    {esAdministrador && (
                      <TouchableOpacity
                        style={styles.botonEliminar}
                        onPress={() => eliminarElemento('enfermedad', enfermedad.id)}
                      >
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
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
              <Text style={{ fontSize: 24, marginRight: 8 }}>⚠️</Text>
              <Text style={styles.tituloSeccion}>Alergias</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('alergia')}>
                  <Text style={{ fontSize: 22 }}>➕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.alergias?.length > 0 ? (
                adultoMayor.alergias.map((alergia, index) => (
                  <View key={index} style={styles.itemLista}>
                    <View style={styles.infoItem}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>⚡</Text>
                      <Text style={styles.textoItem}>{alergia.nombre}</Text>
                      {alergia.severidad && (
                        <View
                          style={[
                            styles.badgeSeveridad,
                            {
                              backgroundColor:
                                alergia.severidad === 'alta'
                                  ? COLORES.ERROR
                                  : alergia.severidad === 'media'
                                    ? COLORES.AMARILLO_PLATANO
                                    : COLORES.VERDE_CLARO,
                            },
                          ]}
                        >
                          <Text style={styles.textoBadge}>{alergia.severidad.toUpperCase()}</Text>
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
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
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
              <Text style={{ fontSize: 24, marginRight: 8 }}>💊</Text>
              <Text style={styles.tituloSeccion}>Medicinas Habituales</Text>
              <TouchableOpacity style={styles.botonVerTodo} onPress={() => navegarA('Medicinas')}>
                <Text style={styles.textoBotonVerTodo}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.medicinas_habituales?.length > 0 ? (
                adultoMayor.medicinas_habituales.slice(0, 3).map((medicina, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemLista}
                    onPress={() => navegarA('Medicinas', { medicinaId: medicina.id })}
                  >
                    <View style={styles.infoItem}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>💊</Text>
                      <Text style={styles.textoItem}>{medicina.nombre}</Text>
                      <Text style={styles.detalleItem}>
                        {medicina.dosis} • {medicina.frecuencia}
                      </Text>
                      {medicina.proposito && (
                        <Text style={styles.detalleItem}>Para: {medicina.proposito}</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 16 }}>▶️</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay medicinas registradas</Text>
              )}
              {adultoMayor?.medicinas_habituales?.length > 3 && (
                <TouchableOpacity style={styles.botonVerMas} onPress={() => navegarA('Medicinas')}>
                  <Text style={styles.textoBotonVerMas}>
                    Ver {adultoMayor.medicinas_habituales.length - 3} medicinas más
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Artículos */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>📦</Text>
              <Text style={styles.tituloSeccion}>Artículos y Equipamiento</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('articulo')}>
                  <Text style={{ fontSize: 22 }}>➕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.articulos?.length > 0 ? (
                adultoMayor.articulos.map((articulo, index) => (
                  <View key={index} style={styles.itemLista}>
                    <View style={styles.infoItem}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>📦</Text>
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
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay artículos registrados</Text>
              )}
            </View>
          </View>

          {/* Hobbies */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>🌟</Text>
              <Text style={styles.tituloSeccion}>Hobbies y Actividades</Text>
              {esAdministrador && (
                <TouchableOpacity style={styles.botonAgregar} onPress={() => abrirModal('hobby')}>
                  <Text style={{ fontSize: 22 }}>➕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.hobbies?.length > 0 ? (
                <View style={styles.contenedorHobbies}>
                  {adultoMayor.hobbies.map((hobby, index) => (
                    <View key={index} style={styles.hobbyItem}>
                      <Text style={{ fontSize: 14, marginRight: 6 }}>⭐</Text>
                      <Text style={styles.textoHobby}>{hobby.nombre}</Text>
                      {esAdministrador && (
                        <TouchableOpacity
                          style={styles.botonEliminarHobby}
                          onPress={() => eliminarElemento('hobby', hobby.id)}
                        >
                          <Text style={{ fontSize: 14 }}>❌</Text>
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

          {/* Citas Rutinarias */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>📅</Text>
              <Text style={styles.tituloSeccion}>Citas Médicas Rutinarias</Text>
              <TouchableOpacity
                style={styles.botonVerTodo}
                onPress={() => navegarA('Calendario', { tipo: 'citas_medicas' })}
              >
                <Text style={styles.textoBotonVerTodo}>Ver calendario →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contenedorTarjeta}>
              {adultoMayor?.citas_rutinarias?.length > 0 ? (
                adultoMayor.citas_rutinarias.map((cita, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemLista}
                    onPress={() => navegarA('Calendario', { citaId: cita.id })}
                  >
                    <View style={styles.infoItem}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>🩺</Text>
                      <Text style={styles.textoItem}>{cita.especialista || cita.tipo}</Text>
                      <Text style={styles.detalleItem}>
                        Frecuencia: {cita.frecuencia} • Próxima: {formatearFecha(cita.proxima_cita)}
                      </Text>
                      {cita.ubicacion && (
                        <Text style={styles.detalleItem}>Lugar: {cita.ubicacion}</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 16 }}>▶️</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.textoVacioLista}>No hay citas rutinarias registradas</Text>
              )}
            </View>
          </View>

          {/* Notas */}
          {adultoMayor?.notas && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>📄</Text>
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
                onPress={() => navegarA('CrearAnciano', { usuarioId, codigoFamiliar: null })}
              >
                <Text style={{ fontSize: 18, marginRight: 6 }}>✏️</Text>
                <Text style={styles.textoBotonAccion}>Editar Información Completa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonAccion, { backgroundColor: COLORES.VERDE_CLARO }]}
                onPress={() => Alert.alert('Reporte', 'Funcionalidad en desarrollo')}
              >
                <Text style={{ fontSize: 18, marginRight: 6 }}>📥</Text>
                <Text style={styles.textoBotonAccion}>Generar Reporte</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal para agregar/editar */}
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
                {modalData.id ? 'Editar' : 'Agregar'}{' '}
                {modalTipo === 'enfermedad'
                  ? 'Enfermedad'
                  : modalTipo === 'alergia'
                    ? 'Alergia'
                    : modalTipo === 'articulo'
                      ? 'Artículo'
                      : 'Hobby'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 20 }}>❌</Text>
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
                    placeholder="Ej: Hipertensión, Diabetes"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  <Text style={styles.modalLabel}>Fecha de diagnóstico</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
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
                    placeholder="Ej: Penicilina, Polen"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  <Text style={styles.modalLabel}>Severidad</Text>
                  <View style={styles.opcionesSeveridad}>
                    <TouchableOpacity
                      style={[styles.opcionSeveridad, { backgroundColor: COLORES.VERDE_CLARO }]}
                      onPress={() => { }}
                    >
                      <Text style={styles.textoOpcionSeveridad}>BAJA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.opcionSeveridad, { backgroundColor: COLORES.AMARILLO_PLATANO }]}
                      onPress={() => { }}
                    >
                      <Text style={styles.textoOpcionSeveridad}>MEDIA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.opcionSeveridad, { backgroundColor: COLORES.ERROR }]}
                      onPress={() => { }}
                    >
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
                    onChangeText={(text) => setNuevoArticulo({ ...nuevoArticulo, nombre: text })}
                    placeholder="Ej: Bastón, Silla de ruedas"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  <Text style={styles.modalLabel}>Cantidad</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoArticulo.cantidad}
                    onChangeText={(text) => setNuevoArticulo({ ...nuevoArticulo, cantidad: text })}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                  />
                  <Text style={styles.modalLabel}>Ubicación</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoArticulo.ubicacion}
                    onChangeText={(text) => setNuevoArticulo({ ...nuevoArticulo, ubicacion: text })}
                    placeholder="Ej: Habitación principal"
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
                  <Text style={styles.modalLabel}>Nombre del hobby *</Text>
                  <TextInput
                    style={styles.input}
                    value={nuevoHobby}
                    onChangeText={setNuevoHobby}
                    placeholder="Ej: Lectura, Jardinería"
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
              <TouchableOpacity style={styles.botonModalCancelar} onPress={() => setModalVisible(false)}>
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonModalGuardar} onPress={guardarModal}>
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
  subtituloPrincipal: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  botonRefrescar: { padding: 8 },

  // Sin adulto
  sinAdultoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  sinAdultoIcono: { fontSize: 60, marginBottom: 20 },
  sinAdultoTitulo: { fontSize: 22, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center', marginBottom: 12 },
  sinAdultoSubtitulo: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  botonAgregarAdulto: {
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  textoBotonAgregarAdulto: { color: COLORES.BLANCO, fontSize: 18, fontWeight: 'bold' },
  botonSaltarAdulto: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    width: '100%',
    alignItems: 'center',
  },
  textoBotonSaltarAdulto: { color: COLORES.GRIS_OSCURO, fontSize: 16 },

  // Secciones
  seccion: { marginBottom: 25 },
  encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginLeft: 10, flex: 1 },
  botonEditar: { padding: 8 },
  botonAgregar: { padding: 8 },
  botonVerTodo: { padding: 8 },
  textoBotonVerTodo: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 14, fontWeight: '500' },

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

  // Info básica
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  itemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  labelInfo: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginLeft: 8, marginRight: 5 },
  valorInfo: { fontSize: 14, fontWeight: '500', color: COLORES.TEXTO_OSCURO },
  infoCompleta: { flexDirection: 'row', marginBottom: 12 },
  estadoSalud: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  textoEstadoSalud: { color: COLORES.BLANCO, fontSize: 11, fontWeight: 'bold' },

  // Listas
  itemLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoItem: { flex: 1 },
  textoItem: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  fechaItem: { fontSize: 12, color: COLORES.GRIS_OSCURO, fontStyle: 'italic', marginTop: 2 },
  detalleItem: { fontSize: 13, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  infoDetalle: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  botonEliminar: { padding: 8, marginLeft: 10 },
  badgeSeveridad: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginTop: 5 },
  textoBadge: { color: COLORES.BLANCO, fontSize: 10, fontWeight: 'bold' },

  contenedorHobbies: { flexDirection: 'row', flexWrap: 'wrap' },
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
  textoHobby: { fontSize: 14, color: COLORES.TEXTO_OSCURO, marginLeft: 6, marginRight: 8 },
  botonEliminarHobby: { padding: 2 },

  botonVerMas: { marginTop: 15, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  textoBotonVerMas: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 14, fontWeight: '500' },

  textoNotas: { fontSize: 14, color: COLORES.TEXTO_OSCURO, lineHeight: 22, fontStyle: 'italic' },
  textoVacioLista: { textAlign: 'center', color: COLORES.GRIS_OSCURO, fontSize: 14, paddingVertical: 20, fontStyle: 'italic' },

  // Acciones
  seccionAcciones: { marginTop: 10 },
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
  textoBotonAccion: { color: COLORES.BLANCO, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

  // Modal
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, maxHeight: '80%' },
  modalEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  modalFormulario: { maxHeight: 400 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 8, marginTop: 15 },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  opcionesSeveridad: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  opcionSeveridad: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, alignItems: 'center' },
  textoOpcionSeveridad: { color: COLORES.BLANCO, fontSize: 12, fontWeight: 'bold' },

  opcionesEstado: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  opcionEstado: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, alignItems: 'center' },
  textoOpcionEstado: { color: COLORES.BLANCO, fontSize: 12, fontWeight: 'bold' },

  opcionesFrecuencia: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  opcionFrecuencia: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, alignItems: 'center', backgroundColor: COLORES.GRIS_CLARO },
  textoOpcionFrecuencia: { color: COLORES.TEXTO_OSCURO, fontSize: 12, fontWeight: '500' },

  modalBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  botonModalCancelar: { flex: 1, paddingVertical: 14, marginRight: 10, borderRadius: 10, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center' },
  textoBotonModalCancelar: { color: COLORES.TEXTO_OSCURO, fontSize: 16, fontWeight: '600' },
  botonModalGuardar: { flex: 1, paddingVertical: 14, marginLeft: 10, borderRadius: 10, backgroundColor: COLORES.AZUL_CIELO_OSCURO, alignItems: 'center' },
  textoBotonModalGuardar: { color: COLORES.BLANCO, fontSize: 16, fontWeight: '600' },
});