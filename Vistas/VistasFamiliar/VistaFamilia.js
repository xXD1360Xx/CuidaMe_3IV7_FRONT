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
  Clipboard,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  ROSA: '#F06292'
};

export default function VistaFamilia({ navigation }) {
  const [familiares, setFamiliares] = useState([]);
  const [codigoFamiliar, setCodigoFamiliar] = useState('');
  const [codigosPersonalizados, setCodigosPersonalizados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [apellidoFamilia, setApellidoFamilia] = useState('');
  const [esAdministrador, setEsAdministrador] = useState(false);

  // Estados para modales
  const [modalTipo, setModalTipo] = useState(''); // 'agregar', 'editar', 'ver', 'personalizar'
  const [familiarSeleccionado, setFamiliarSeleccionado] = useState(null);

  // Estados para formularios
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    parentesco: '',
    rol: 'familiar',
    relacionAdultoMayor: ''
  });

  // Estados para código personalizado
  const [codigoPersonalizadoData, setCodigoPersonalizadoData] = useState({
    nombre: '',
    apellido: '',
    rol: 'familiar',
    parentesco: ''
  });

  // Parentescos disponibles
  const PARENTESCOS = [
    'Hijo/a', 'Hijo/a político/a', 'Nieto/a', 'Hermano/a',
    'Esposo/a', 'Sobrino/a', 'Primo/a', 'Amigo/a',
    'Cuidador/a', 'Médico', 'Enfermero/a', 'Otro'
  ];

  // Roles disponibles
  const ROLES = [
    { label: 'Familiar', value: 'familiar' },
    { label: 'Familiar Administrador', value: 'familiar_administrador' },
    { label: 'Adulto Mayor', value: 'adulto_mayor' },
    { label: 'Cuidador', value: 'cuidador' },
    { label: 'Médico', value: 'medico' },
    { label: 'Enfermero/a', value: 'enfermero' },
  ];

  // Cargar datos iniciales
  const cargarDatos = useCallback(async () => {
    const usuarioId = await servicioAPI.obtenerUsuarioActualId();
    if (usuarioId) {
      try {
        setCargando(true);

        // Obtener usuario actual
        const usuarioData = await AsyncStorage.getItem('usuarioInfo');
        if (usuarioData) {
          const usuario = JSON.parse(usuarioData);
          setUsuarioActual(usuario);
          setEsAdministrador(usuario.rol === 'familiar_administrador');

          // Obtener apellido para el título
          if (usuario.apellido) {
            setApellidoFamilia(`Familia ${usuario.apellido}`);
          }
        }

        // Cargar familiares
        const familiaresResponse = await servicioAPI.obtenerFamiliares();
        if (familiaresResponse.exito) {
          setFamiliares(familiaresResponse.familiares || []);
        }

        // Cargar código familiar
        const codigoResponse = await servicioAPI.obtenerCodigoFamiliar();
        if (codigoResponse.exito) {
          setCodigoFamiliar(codigoResponse.codigo || '');
        }

        // Cargar códigos personalizados
        const codigosResponse = await servicioAPI.obtenerCodigosPersonalizados();
        if (codigosResponse.exito) {
          setCodigosPersonalizados(codigosResponse.codigos || []);
        }

      } catch (error) {
        console.error('Error cargando datos familia:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos');
      } finally {
        setCargando(false);
        setRefrescando(false);
      }

    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarDatos();
  }, [cargando]);

  // Formatear código para mostrar
  const formatearCodigo = (codigo) => {
    if (!codigo) return '';
    if (codigo.length === 6) {
      return `${codigo.substring(0, 3)}-${codigo.substring(3)}`;
    }
    return codigo;
  };

  // Generar nuevo código familiar
  const generarNuevoCodigoFamiliar = async () => {
    Alert.alert(
      'Regenerar Código Familiar',
      '¿Estás seguro de regenerar el código familiar? El código actual dejará de funcionar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Regenerar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.regenerarCodigoFamiliar();
              if (response.exito) {
                setCodigoFamiliar(response.codigo);
                Alert.alert('Éxito', 'Código familiar regenerado');
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo regenerar el código');
            }
          }
        }
      ]
    );
  };

  // Copiar al portapapeles
  const copiarAlPortapapeles = (texto) => {
    Clipboard.setString(texto);
    Alert.alert('Copiado', 'Código copiado al portapapeles');
  };

  // Abrir modal para familiar
  const abrirModalFamiliar = (tipo, familiar = null) => {
    setModalTipo(tipo);
    setFamiliarSeleccionado(familiar);

    if (familiar) {
      setFormData({
        nombre: familiar.nombre || '',
        apellido: familiar.apellido || '',
        email: familiar.email || '',
        telefono: familiar.telefono || '',
        fechaNacimiento: familiar.fechaNacimiento || '',
        parentesco: familiar.parentesco || '',
        rol: familiar.rol || 'familiar',
        relacionAdultoMayor: familiar.relacionAdultoMayor || ''
      });
    } else {
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        fechaNacimiento: '',
        parentesco: '',
        rol: 'familiar',
        relacionAdultoMayor: ''
      });
    }

    setModalVisible(true);
  };

  // Abrir modal para código personalizado
  const abrirModalCodigoPersonalizado = () => {
    setCodigoPersonalizadoData({
      nombre: '',
      apellido: '',
      rol: 'familiar',
      parentesco: ''
    });
    setModalCodigoVisible(true);
  };

  // Guardar familiar
  const guardarFamiliar = async () => {
    try {
      // Validaciones básicas
      if (!formData.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre');
        return;
      }

      if (!formData.apellido.trim()) {
        Alert.alert('Error', 'Debes ingresar el apellido');
        return;
      }

      if (!formData.email.trim()) {
        Alert.alert('Error', 'Debes ingresar el email');
        return;
      }

      if (!formData.telefono.trim()) {
        Alert.alert('Error', 'Debes ingresar el teléfono');
        return;
      }

      let response;
      if (familiarSeleccionado) {
        // Actualizar familiar
        response = await servicioAPI.actualizarFamiliar(familiarSeleccionado.id, formData);
      } else {
        // Crear nuevo familiar
        response = await servicioAPI.crearFamiliar(formData);
      }

      if (response.exito) {
        Alert.alert('Éxito', familiarSeleccionado ? 'Familiar actualizado' : 'Familiar agregado');
        setModalVisible(false);
        onRefresh();
      } else {
        Alert.alert('Error', response.error || 'Error guardando familiar');
      }

    } catch (error) {
      console.error('Error guardando familiar:', error);
      Alert.alert('Error', 'No se pudo guardar el familiar');
    }
  };

  // Eliminar familiar
  const eliminarFamiliar = (familiarId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar este familiar? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarFamiliar(familiarId);
              if (response.exito) {
                Alert.alert('Éxito', 'Familiar eliminado');
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el familiar');
            }
          }
        }
      ]
    );
  };

  // Generar código personalizado
  const generarCodigoPersonalizado = async () => {
    try {
      if (!codigoPersonalizadoData.nombre.trim()) {
        Alert.alert('Error', 'Debes ingresar el nombre');
        return;
      }

      if (!codigoPersonalizadoData.apellido.trim()) {
        Alert.alert('Error', 'Debes ingresar el apellido');
        return;
      }

      const response = await servicioAPI.crearCodigoPersonalizado(codigoPersonalizadoData);

      if (response.exito) {
        Alert.alert(
          'Código Personalizado Generado',
          `Código: ${response.codigo}`,
          [
            {
              text: 'Copiar',
              onPress: () => copiarAlPortapapeles(response.codigo)
            },
            {
              text: 'Aceptar',
              onPress: () => {
                setModalCodigoVisible(false);
                onRefresh();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Error generando código');
      }

    } catch (error) {
      console.error('Error generando código:', error);
      Alert.alert('Error', 'No se pudo generar el código');
    }
  };

  // Eliminar código personalizado
  const eliminarCodigoPersonalizado = (codigoId) => {
    Alert.alert(
      'Eliminar Código Personalizado',
      '¿Estás seguro de eliminar este código? No podrá ser usado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await servicioAPI.eliminarCodigoPersonalizado(codigoId);
              if (response.exito) {
                Alert.alert('Éxito', 'Código eliminado');
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el código');
            }
          }
        }
      ]
    );
  };

  // Obtener icono según rol
  const obtenerIconoRol = (rol) => {
    switch (rol) {
      case 'familiar_administrador':
        return { emoji: '👑', color: COLORES.AMARILLO_PLATANO };
      case 'adulto_mayor':
        return { emoji: '👴', color: COLORES.AZUL_CIELO_OSCURO };
      case 'cuidador':
        return { emoji: '🤝', color: COLORES.EXITO };
      case 'medico':
        return { emoji: '👨‍⚕️', color: COLORES.ERROR };
      case 'enfermero':
        return { emoji: '🩺', color: COLORES.ROSA };
      default:
        return { emoji: '👥', color: COLORES.AZUL_CIELO };
    }
  };

  // Obtener color según estado
  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'activo':
        return COLORES.EXITO;
      case 'pendiente':
        return COLORES.AMARILLO_PLATANO;
      case 'inactivo':
        return COLORES.GRIS_OSCURO;
      case 'usado':
        return COLORES.ERROR;
      default:
        return COLORES.GRIS_MEDIO;
    }
  };

  // Renderizar tarjeta de familiar
  const renderTarjetaFamiliar = ({ item }) => {
    const iconoRol = obtenerIconoRol(item.rol);

    return (
      <TouchableOpacity
        style={styles.tarjetaFamiliar}
        onPress={() => abrirModalFamiliar('ver', item)}
      >
        <View style={styles.encabezadoTarjeta}>
          <View style={[styles.iconoRolContainer, { backgroundColor: `${iconoRol.color}20` }]}>
            <Text style={{ fontSize: 22 }}>{iconoRol.emoji}</Text>
          </View>

          <View style={styles.infoPrincipal}>
            <Text style={styles.nombreFamiliar}>
              {item.nombre} {item.apellido}
            </Text>
            <Text style={styles.rolFamiliar}>
              {ROLES.find(r => r.value === item.rol)?.label || 'Familiar'}
            </Text>
          </View>

          <View style={styles.accionesTarjeta}>
            <TouchableOpacity
              style={styles.botonAccionTarjeta}
              onPress={(e) => {
                e.stopPropagation();
                abrirModalFamiliar('editar', item);
              }}
            >
              <Text style={{ fontSize: 18 }}>📝</Text>
            </TouchableOpacity>

            {esAdministrador && item.rol !== 'familiar_administrador' && (
              <TouchableOpacity
                style={styles.botonAccionTarjeta}
                onPress={(e) => {
                  e.stopPropagation();
                  eliminarFamiliar(item.id);
                }}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.detallesTarjeta}>
          <View style={styles.detalleItem}>
            <Text style={{ fontSize: 14, marginRight: 4 }}>📞</Text>
            <Text style={styles.textoDetalle}>{item.telefono}</Text>
          </View>

          <View style={styles.detalleItem}>
            <Text style={{ fontSize: 14, marginRight: 4 }}>📧</Text>
            <Text style={styles.textoDetalle}>{item.email}</Text>
          </View>

          {item.parentesco && (
            <View style={styles.detalleItem}>
              <Text style={{ fontSize: 14, marginRight: 4 }}>❤️</Text>
              <Text style={styles.textoDetalle}>{item.parentesco}</Text>
            </View>
          )}
        </View>

        <View style={[
          styles.badgeEstado,
          { backgroundColor: obtenerColorEstado(item.estado) + '20' }
        ]}>
          <Text style={[styles.textoBadgeEstado, { color: obtenerColorEstado(item.estado) }]}>
            {item.estado?.toUpperCase() || 'ACTIVO'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar tarjeta de código personalizado
  const renderTarjetaCodigo = ({ item }) => {
    const formateado = formatearCodigo(item.codigo);
    const usado = item.estado === 'usado';

    return (
      <TouchableOpacity
        style={[
          styles.tarjetaCodigo,
          usado && styles.tarjetaCodigoUsado
        ]}
        onPress={() => copiarAlPortapapeles(item.codigo)}
      >
        <View style={styles.encabezadoCodigo}>
          <View style={styles.codigoPrincipal}>
            <Text style={{ fontSize: 20, marginRight: 6 }}>🔑</Text>
            <Text style={[
              styles.textoCodigo,
              usado && styles.textoCodigoUsado
            ]}>
              {formateado}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.botonCopiarCodigo}
            onPress={(e) => {
              e.stopPropagation();
              copiarAlPortapapeles(item.codigo);
            }}
          >
            <Text style={{ fontSize: 18 }}>📋</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCodigo}>
          <Text style={[
            styles.nombreCodigo,
            usado && styles.textoUsado
          ]}>
            {item.nombre} {item.apellido}
          </Text>

          <View style={styles.detallesCodigo}>
            <View style={styles.badgeCodigo}>
              <Text style={styles.textoBadgeCodigo}>
                {ROLES.find(r => r.value === item.rol)?.label || 'Familiar'}
              </Text>
            </View>

            {item.parentesco && (
              <View style={styles.badgeCodigo}>
                <Text style={styles.textoBadgeCodigo}>{item.parentesco}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.pieCodigo}>
          <Text style={[
            styles.estadoCodigo,
            { color: obtenerColorEstado(item.estado) }
          ]}>
            {item.estado === 'usado' ? '✓ Usado' : '⏳ Pendiente'}
          </Text>

          {esAdministrador && !usado && (
            <TouchableOpacity
              style={styles.botonEliminarCodigo}
              onPress={(e) => {
                e.stopPropagation();
                eliminarCodigoPersonalizado(item.id);
              }}
            >
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (cargando) {
    return (
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]} style={styles.fondo}>
        <SafeAreaView style={styles.centrado}>
          <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
          <Text style={styles.textoCargando}>Cargando información familiar...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedor}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24 }}>⬅️</Text>
          </TouchableOpacity>

          <View style={styles.tituloContainer}>
            <Text style={styles.tituloPrincipal}>
              {apellidoFamilia || 'Mi Familia'}
            </Text>
            <Text style={styles.subtituloPrincipal}>
              {familiares.length} miembro(s) • {codigosPersonalizados.length} código(s) activo(s)
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
          {/* Sección de Código Familiar */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>🔑</Text>
              <Text style={styles.tituloSeccion}>Código Familiar</Text>
            </View>

            <View style={styles.contenedorCodigoFamiliar}>
              <View style={styles.infoCodigoFamiliar}>
                <Text style={styles.etiquetaCodigo}>Código compartido para la familia:</Text>
                <TouchableOpacity
                  style={styles.codigoDisplay}
                  onPress={() => copiarAlPortapapeles(codigoFamiliar)}
                >
                  <Text style={styles.codigoTexto}>
                    {formatearCodigo(codigoFamiliar) || 'No disponible'}
                  </Text>
                  <Text style={{ fontSize: 18 }}>📋</Text>
                </TouchableOpacity>
                <Text style={styles.ayudaCodigo}>
                  Comparte este código con otros familiares para que se unan
                </Text>
              </View>

              {esAdministrador && (
                <TouchableOpacity
                  style={styles.botonRegenerar}
                  onPress={generarNuevoCodigoFamiliar}
                >
                  <Text style={{ fontSize: 18, marginRight: 6 }}>🔄</Text>
                  <Text style={styles.textoBotonRegenerar}>Regenerar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sección de Códigos Personalizados */}
          {codigosPersonalizados.length > 0 && (
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Text style={{ fontSize: 24, marginRight: 8 }}>✨</Text>
                <Text style={styles.tituloSeccion}>Códigos Personalizados</Text>

                {esAdministrador && (
                  <TouchableOpacity
                    style={styles.botonAgregarSeccion}
                    onPress={abrirModalCodigoPersonalizado}
                  >
                    <Text style={{ fontSize: 22 }}>➕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={codigosPersonalizados}
                renderItem={renderTarjetaCodigo}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listaCodigos}
              />
            </View>
          )}

          {/* Sección de Miembros de la Familia */}
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>👥</Text>
              <Text style={styles.tituloSeccion}>Miembros de la Familia</Text>

              {esAdministrador && (
                <TouchableOpacity
                  style={styles.botonAgregarSeccion}
                  onPress={() => abrirModalFamiliar('agregar')}
                >
                  <Text style={{ fontSize: 22 }}>➕</Text>
                </TouchableOpacity>
              )}
            </View>

            {familiares.length > 0 ? (
              <FlatList
                data={familiares}
                renderItem={renderTarjetaFamiliar}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.sinMiembros}>
                <Text style={{ fontSize: 60, marginBottom: 10 }}>👥</Text>
                <Text style={styles.textoSinMiembros}>No hay miembros registrados</Text>
                <Text style={styles.subtextoSinMiembros}>
                  {esAdministrador
                    ? 'Toca el botón + para agregar familiares'
                    : 'El administrador debe agregar miembros'}
                </Text>
              </View>
            )}

            {/* Tarjeta para agregar nuevo familiar */}
            {esAdministrador && (
              <TouchableOpacity
                style={styles.tarjetaAgregar}
                onPress={() => abrirModalFamiliar('agregar')}
              >
                <View style={styles.contenidoTarjetaAgregar}>
                  <View style={styles.iconoAgregarContainer}>
                    <Text style={{ fontSize: 32 }}>➕</Text>
                  </View>
                  <Text style={styles.textoTarjetaAgregar}>Agregar nuevo familiar</Text>
                  <Text style={styles.subtextoTarjetaAgregar}>
                    Invita a alguien a unirse a la familia
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Sección para generar código personalizado */}
          {esAdministrador && (
            <View style={styles.seccion}>
              <TouchableOpacity
                style={styles.botonPersonalizarCodigo}
                onPress={abrirModalCodigoPersonalizado}
              >
                <View style={styles.contenidoBotonPersonalizar}>
                  <Text style={{ fontSize: 24, marginRight: 8 }}>✨</Text>
                  <Text style={styles.textoBotonPersonalizar}>
                    Personalizar Código
                  </Text>
                  <Text style={styles.subtextoBotonPersonalizar}>
                    Crea un código con datos predefinidos
                  </Text>
                </View>
                <Text style={{ fontSize: 24 }}>➡️</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Información adicional */}
          <View style={styles.seccion}>
            <View style={styles.infoAdicional}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>ℹ️</Text>
              <View style={styles.textosInfo}>
                <Text style={styles.tituloInfo}>Cómo funciona:</Text>
                <Text style={styles.textoInfo}>
                  • <Text style={styles.textoDestacado}>Código Familiar:</Text> Para familiares que completarán su perfil al ingresar
                </Text>
                <Text style={styles.textoInfo}>
                  • <Text style={styles.textoDestacado}>Código Personalizado:</Text> Datos precargados, se elimina tras el uso
                </Text>
                <Text style={styles.textoInfo}>
                  • Los administradores pueden gestionar toda la información
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal para familiar */}
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
                {modalTipo === 'ver' ? 'Información del Familiar' :
                  modalTipo === 'editar' ? 'Editar Familiar' : 'Agregar Familiar'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 24 }}>❌</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              {modalTipo === 'ver' ? (
                // Vista de información
                <View style={styles.vistaInformacion}>
                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Nombre:</Text>
                    <Text style={styles.valorModal}>
                      {familiarSeleccionado?.nombre} {familiarSeleccionado?.apellido}
                    </Text>
                  </View>

                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Email:</Text>
                    <Text style={styles.valorModal}>{familiarSeleccionado?.email}</Text>
                  </View>

                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Teléfono:</Text>
                    <Text style={styles.valorModal}>{familiarSeleccionado?.telefono}</Text>
                  </View>

                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Rol:</Text>
                    <Text style={styles.valorModal}>
                      {ROLES.find(r => r.value === familiarSeleccionado?.rol)?.label}
                    </Text>
                  </View>

                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Parentesco:</Text>
                    <Text style={styles.valorModal}>{familiarSeleccionado?.parentesco}</Text>
                  </View>

                  <View style={styles.infoItemModal}>
                    <Text style={styles.labelModal}>Estado:</Text>
                    <View style={[
                      styles.badgeEstadoModal,
                      { backgroundColor: obtenerColorEstado(familiarSeleccionado?.estado) + '20' }
                    ]}>
                      <Text style={[
                        styles.textoBadgeEstadoModal,
                        { color: obtenerColorEstado(familiarSeleccionado?.estado) }
                      ]}>
                        {familiarSeleccionado?.estado?.toUpperCase() || 'ACTIVO'}
                      </Text>
                    </View>
                  </View>

                  {familiarSeleccionado?.fechaNacimiento && (
                    <View style={styles.infoItemModal}>
                      <Text style={styles.labelModal}>Fecha Nacimiento:</Text>
                      <Text style={styles.valorModal}>{familiarSeleccionado.fechaNacimiento}</Text>
                    </View>
                  )}
                </View>
              ) : (
                // Formulario para agregar/editar
                <>
                  <Text style={styles.modalLabel}>Nombre *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.nombre}
                    onChangeText={(text) => setFormData({ ...formData, nombre: text })}
                    placeholder="Nombre del familiar"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    editable={modalTipo !== 'ver'}
                  />

                  <Text style={styles.modalLabel}>Apellido *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.apellido}
                    onChangeText={(text) => setFormData({ ...formData, apellido: text })}
                    placeholder="Apellido del familiar"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    editable={modalTipo !== 'ver'}
                  />

                  <Text style={styles.modalLabel}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="correo@ejemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    editable={modalTipo !== 'ver'}
                  />

                  <Text style={styles.modalLabel}>Teléfono *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.telefono}
                    onChangeText={(text) => setFormData({ ...formData, telefono: text })}
                    placeholder="Número de teléfono"
                    keyboardType="phone-pad"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    editable={modalTipo !== 'ver'}
                  />

                  <Text style={styles.modalLabel}>Rol</Text>
                  <View style={styles.opcionesRol}>
                    {ROLES.map(rol => (
                      <TouchableOpacity
                        key={rol.value}
                        style={[
                          styles.opcionRol,
                          formData.rol === rol.value && styles.opcionRolSeleccionada
                        ]}
                        onPress={() => setFormData({ ...formData, rol: rol.value })}
                        disabled={modalTipo === 'ver'}
                      >
                        <Text style={[
                          styles.textoOpcionRol,
                          formData.rol === rol.value && styles.textoOpcionRolSeleccionada
                        ]}>
                          {rol.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.modalLabel}>Parentesco</Text>
                  <View style={styles.pickerContainer}>
                    <FlatList
                      data={PARENTESCOS}
                      keyExtractor={(item, index) => index.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.opcionParentesco,
                            formData.parentesco === item && styles.opcionParentescoSeleccionada
                          ]}
                          onPress={() => setFormData({ ...formData, parentesco: item })}
                          disabled={modalTipo === 'ver'}
                        >
                          <Text style={[
                            styles.textoOpcionParentesco,
                            formData.parentesco === item && styles.textoOpcionParentescoSeleccionada
                          ]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                      numColumns={2}
                      scrollEnabled={false}
                    />
                  </View>

                  <Text style={styles.modalLabel}>Fecha de Nacimiento</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.fechaNacimiento}
                    onChangeText={(text) => setFormData({ ...formData, fechaNacimiento: text })}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    editable={modalTipo !== 'ver'}
                  />

                  <Text style={styles.modalLabel}>Relación con Adulto Mayor</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.relacionAdultoMayor}
                    onChangeText={(text) => setFormData({ ...formData, relacionAdultoMayor: text })}
                    placeholder="Describe la relación principal..."
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    editable={modalTipo !== 'ver'}
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

                  {esAdministrador && familiarSeleccionado?.rol !== 'familiar_administrador' && (
                    <>
                      <TouchableOpacity
                        style={styles.botonModalPrincipal}
                        onPress={() => {
                          setModalVisible(false);
                          abrirModalFamiliar('editar', familiarSeleccionado);
                        }}
                      >
                        <Text style={styles.textoBotonModalPrincipal}>Editar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]}
                        onPress={() => {
                          setModalVisible(false);
                          eliminarFamiliar(familiarSeleccionado.id);
                        }}
                      >
                        <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                      </TouchableOpacity>
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

                  {modalTipo === 'editar' && esAdministrador && familiarSeleccionado?.rol !== 'familiar_administrador' && (
                    <TouchableOpacity
                      style={[styles.botonModalAccion, { backgroundColor: COLORES.ERROR }]}
                      onPress={() => {
                        setModalVisible(false);
                        eliminarFamiliar(familiarSeleccionado.id);
                      }}
                    >
                      <Text style={styles.textoBotonModalAccion}>Eliminar</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.botonModalAccion, { backgroundColor: COLORES.EXITO }]}
                    onPress={guardarFamiliar}
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

      {/* Modal para código personalizado */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalCodigoVisible}
        onRequestClose={() => setModalCodigoVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <Text style={styles.modalTitulo}>Personalizar Código</Text>
              <TouchableOpacity onPress={() => setModalCodigoVisible(false)}>
                <Text style={{ fontSize: 24 }}>❌</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormulario}>
              <View style={styles.infoCodigoPersonalizado}>
                <Text style={[styles.iconoCodigoPersonalizado, { fontSize: 40 }]}>✨</Text>
                <Text style={styles.textoInfoCodigo}>
                  Este código incluirá la información básica del usuario. Solo podrá usarse una vez.
                </Text>
              </View>

              <Text style={styles.modalLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={codigoPersonalizadoData.nombre}
                onChangeText={(text) => setCodigoPersonalizadoData({ ...codigoPersonalizadoData, nombre: text })}
                placeholder="Nombre del usuario"
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Apellido *</Text>
              <TextInput
                style={styles.input}
                value={codigoPersonalizadoData.apellido}
                onChangeText={(text) => setCodigoPersonalizadoData({ ...codigoPersonalizadoData, apellido: text })}
                placeholder="Apellido del usuario"
                placeholderTextColor={COLORES.GRIS_MEDIO}
              />

              <Text style={styles.modalLabel}>Rol</Text>
              <View style={styles.opcionesRol}>
                {ROLES.map(rol => (
                  <TouchableOpacity
                    key={rol.value}
                    style={[
                      styles.opcionRol,
                      codigoPersonalizadoData.rol === rol.value && styles.opcionRolSeleccionada
                    ]}
                    onPress={() => setCodigoPersonalizadoData({ ...codigoPersonalizadoData, rol: rol.value })}
                  >
                    <Text style={[
                      styles.textoOpcionRol,
                      codigoPersonalizadoData.rol === rol.value && styles.textoOpcionRolSeleccionada
                    ]}>
                      {rol.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Parentesco</Text>
              <View style={styles.pickerContainer}>
                <FlatList
                  data={PARENTESCOS}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.opcionParentesco,
                        codigoPersonalizadoData.parentesco === item && styles.opcionParentescoSeleccionada
                      ]}
                      onPress={() => setCodigoPersonalizadoData({ ...codigoPersonalizadoData, parentesco: item })}
                    >
                      <Text style={[
                        styles.textoOpcionParentesco,
                        codigoPersonalizadoData.parentesco === item && styles.textoOpcionParentescoSeleccionada
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  numColumns={2}
                  scrollEnabled={false}
                />
              </View>
            </ScrollView>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => setModalCodigoVisible(false)}
              >
                <Text style={styles.textoBotonModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonModalAccion, { backgroundColor: COLORES.MORADO }]}
                onPress={generarCodigoPersonalizado}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>✨</Text>
                <Text style={styles.textoBotonModalAccion}>Generar Código</Text>
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
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.AZUL_CIELO_OSCURO,
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
  botonAgregarSeccion: {
    padding: 8,
  },

  // Código Familiar
  contenedorCodigoFamiliar: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCodigoFamiliar: {
    flex: 1,
  },
  etiquetaCodigo: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 8,
  },
  codigoDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  codigoTexto: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    letterSpacing: 1,
  },
  ayudaCodigo: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    fontStyle: 'italic',
  },
  botonRegenerar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.AMARILLO_PLATANO,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 15,
  },
  textoBotonRegenerar: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Lista de códigos personalizados
  listaCodigos: {
    paddingVertical: 5,
  },

  // Tarjeta de código personalizado
  tarjetaCodigo: {
    width: 200,
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tarjetaCodigoUsado: {
    opacity: 0.7,
  },
  encabezadoCodigo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codigoPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoCodigo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 8,
    letterSpacing: 1,
  },
  textoCodigoUsado: {
    color: COLORES.GRIS_OSCURO,
    textDecorationLine: 'line-through',
  },
  botonCopiarCodigo: {
    padding: 6,
  },
  infoCodigo: {
    marginBottom: 12,
  },
  nombreCodigo: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 8,
  },
  detallesCodigo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeCodigo: {
    backgroundColor: COLORES.GRIS_CLARO,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  textoBadgeCodigo: {
    fontSize: 10,
    color: COLORES.GRIS_OSCURO,
  },
  pieCodigo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
    paddingTop: 12,
  },
  estadoCodigo: {
    fontSize: 12,
    fontWeight: '600',
  },
  botonEliminarCodigo: {
    padding: 4,
  },
  textoUsado: {
    color: COLORES.GRIS_OSCURO,
    textDecorationLine: 'line-through',
  },

  // Tarjeta de familiar
  tarjetaFamiliar: {
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
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconoRolContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoPrincipal: {
    flex: 1,
  },
  nombreFamiliar: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  rolFamiliar: {
    fontSize: 13,
    color: COLORES.GRIS_OSCURO,
  },
  accionesTarjeta: {
    flexDirection: 'row',
  },
  botonAccionTarjeta: {
    padding: 8,
  },
  detallesTarjeta: {
    marginBottom: 12,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  textoDetalle: {
    fontSize: 13,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 8,
  },
  badgeEstado: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoBadgeEstado: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Sin miembros
  sinMiembros: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  textoSinMiembros: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  subtextoSinMiembros: {
    fontSize: 12,
    color: COLORES.GRIS_MEDIO,
    textAlign: 'center',
  },

  // Tarjeta agregar
  tarjetaAgregar: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORES.GRIS_CLARO,
    borderStyle: 'dashed',
  },
  contenidoTarjetaAgregar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoAgregarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORES.AZUL_CIELO + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  textoTarjetaAgregar: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.AZUL_CIELO_OSCURO,
    marginBottom: 6,
  },
  subtextoTarjetaAgregar: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
  },

  // Botón personalizar código
  botonPersonalizarCodigo: {
    backgroundColor: COLORES.MORADO,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  contenidoBotonPersonalizar: {
    flex: 1,
  },
  textoBotonPersonalizar: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.BLANCO,
    marginTop: 8,
  },
  subtextoBotonPersonalizar: {
    fontSize: 12,
    color: COLORES.BLANCO,
    opacity: 0.8,
    marginTop: 4,
  },

  // Información adicional
  infoAdicional: {
    flexDirection: 'row',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textosInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tituloInfo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 8,
  },
  textoInfo: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    marginBottom: 6,
    lineHeight: 18,
  },
  textoDestacado: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontWeight: '600',
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
    width: 120,
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.GRIS_OSCURO,
  },
  valorModal: {
    flex: 1,
    fontSize: 14,
    color: COLORES.TEXTO_OSCURO,
  },
  badgeEstadoModal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  textoBadgeEstadoModal: {
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
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Opciones de rol
  opcionesRol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  opcionRol: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginRight: 8,
    marginBottom: 8,
  },
  opcionRolSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionRol: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
  },
  textoOpcionRolSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Opciones de parentesco
  pickerContainer: {
    marginBottom: 10,
  },
  opcionParentesco: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginBottom: 8,
    marginRight: '4%',
  },
  opcionParentescoSeleccionada: {
    backgroundColor: COLORES.AZUL_CIELO,
    borderColor: COLORES.AZUL_CIELO_OSCURO,
  },
  textoOpcionParentesco: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
  },
  textoOpcionParentescoSeleccionada: {
    color: COLORES.BLANCO,
    fontWeight: 'bold',
  },

  // Información código personalizado
  infoCodigoPersonalizado: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconoCodigoPersonalizado: {
    marginBottom: 12,
  },
  textoInfoCodigo: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
    lineHeight: 20,
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  textoBotonModalAccion: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.BLANCO,
  },
});