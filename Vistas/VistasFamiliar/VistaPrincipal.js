import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../AppNavegacion';

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

const { width } = Dimensions.get('window');

export default function PantallaPrincipal({ navigation }) {
  const [usuarioInfo, setUsuarioInfo] = useState(null);
  const [adultoMayorInfo, setAdultoMayorInfo] = useState(null);
  const [medicinasHoy, setMedicinasHoy] = useState([]);
  const auth = useAuth();

  const [eventosSemana, setEventosSemana] = useState([]);
  const [gastosFuturos, setGastosFuturos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [usuarioId, setUsuarioId] = useState(null);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);

  // ---------- CARGA DE DATOS ----------
  const cargarUsuarioId = useCallback(async () => {
    try {
      const id = await servicioAPI.obtenerUsuarioActualId();
      setUsuarioId(id);
      return id;
    } catch (error) {
      console.error('Error obteniendo usuario ID:', error);
      return null;
    }
  }, []);

  const cargarDatosUsuario = useCallback(async (id) => {
    try {
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioInfo(usuario);
        if (usuario.rol === 'familiar_admin') {
          setNotificacionesNoLeidas(3); // Simulación
        }
      }
      if (id) {
        const response = await servicioAPI.obtenerAdultoMayorPrincipal(id);
        if (response.exito && response.adultoMayor) {
          setAdultoMayorInfo(response.adultoMayor);
        }
      }
    } catch (error) {
      console.error('Error cargando datos usuario:', error);
    }
  }, []);

  const cargarMedicinasHoy = useCallback(async (id) => {
    if (!id) return;
    try {
      const response = await servicioAPI.obtenerMedicinasHoy(id);
      if (response.exito) {
        setMedicinasHoy(response.medicinas || []);
      } else {
        setMedicinasHoy([]);
      }
    } catch (error) {
      console.error('Error cargando medicinas:', error);
      setMedicinasHoy([]);
    }
  }, []);

  const cargarEventosSemana = useCallback(async (id) => {
    if (!id) return;
    try {
      const response = await servicioAPI.obtenerEventosProximos(id, 10);
      if (response.exito) {
        setEventosSemana(response.eventos || []);
      } else {
        setEventosSemana([]);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setEventosSemana([]);
    }
  }, []);

  const cargarGastosFuturos = useCallback(async (id) => {
    if (!id) return;
    try {
      const response = await servicioAPI.obtenerGastosFuturos(id);
      if (response.exito) {
        setGastosFuturos(response.gastos || []);
      } else {
        setGastosFuturos([]);
      }
    } catch (error) {
      console.error('Error cargando gastos:', error);
      setGastosFuturos([]);
    }
  }, []);

  const cargarTodosDatos = useCallback(async () => {
    try {
      setCargando(true);
      const id = await cargarUsuarioId();
      if (!id) {
        setCargando(false);
        return;
      }
      await Promise.all([
        cargarDatosUsuario(id),
        cargarMedicinasHoy(id),
        cargarEventosSemana(id),
        cargarGastosFuturos(id),
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [cargarUsuarioId, cargarDatosUsuario, cargarMedicinasHoy, cargarEventosSemana, cargarGastosFuturos]);

  useEffect(() => {
    cargarTodosDatos();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarTodosDatos();
    }, [cargarTodosDatos])
  );

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarTodosDatos();
  }, [cargarTodosDatos]);

  // ---------- MARCAR MEDICINA ----------
  const marcarMedicinaTomada = async (medicina) => {
    if (!medicina) return;
    try {
      const usuarioId = await servicioAPI.obtenerUsuarioActualId();
      if (!usuarioId) {
        Alert.alert('Error', 'Usuario no identificado');
        return;
      }
      // Buscar el primer horario válido (no 'otra' ni custom)
      const horarios = Array.isArray(medicina.horarios) ? medicina.horarios : [];
      const horariosValidos = horarios.filter(h => h && typeof h === 'string' && h !== 'otra' && !h.startsWith('custom_'));
      if (horariosValidos.length === 0) {
        Alert.alert('Error', 'No hay horarios definidos para esta medicina');
        return;
      }
      const primerHorario = horariosValidos[0];
      const hoy = new Date().toISOString().split('T')[0];
      const response = await servicioAPI.marcarMedicinaTomada(usuarioId, medicina.id, hoy, primerHorario);
      if (response.exito) {
        // Actualizar estado local
        setMedicinasHoy(prev =>
          prev.map(m =>
            m.id === medicina.id
              ? { ...m, tomada_hoy: Array.isArray(m.tomada_hoy) ? [...m.tomada_hoy, primerHorario] : [primerHorario] }
              : m
          )
        );
        // Actualizar stock
        const nuevoStock = Math.max(0, (medicina.stock || 0) - 1);
        await servicioAPI.actualizarStockMedicina(usuarioId, medicina.id, nuevoStock);
        Alert.alert('Éxito', `Toma de ${medicina.nombre} registrada`);
      } else {
        Alert.alert('Error', response.error || 'No se pudo marcar la toma');
      }
    } catch (error) {
      console.error('Error marcando medicina:', error);
      Alert.alert('Error', 'Error de conexión');
    }
  };

  // ---------- NAVEGACIÓN ----------
  const navegarA = (destino) => {
    setMenuAbierto(false);
    navigation.navigate(destino);
  };

  const cerrarSesion = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await auth.cerrarSesion();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const irANotificaciones = () => {
    setNotificacionesNoLeidas(0);
    navegarA('Notificaciones');
  };

  // ---------- UTILIDADES ----------
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Fecha no disponible';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha)) return 'Fecha inválida';
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatearHora = (horaStr) => {
    if (!horaStr) return '';
    const partes = horaStr.split(':');
    if (partes.length < 2) return '';
    return `${partes[0]}:${partes[1]}`;
  };

  const calcularTotalGastos = () => {
    return gastosFuturos.reduce((total, gasto) => total + parseFloat(gasto.monto || 0), 0);
  };

  const estaTomadaHoy = (medicina) => {
    const tomadas = Array.isArray(medicina.tomada_hoy) ? medicina.tomada_hoy : [];
    const horarios = Array.isArray(medicina.horarios) ? medicina.horarios : [];
    const horariosValidos = horarios.filter(h => h && typeof h === 'string' && h !== 'otra' && !h.startsWith('custom_'));
    if (horariosValidos.length === 0) return false;
    return horariosValidos.every(h => tomadas.includes(h));
  };

  // ---------- RENDER ----------
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

  return (
    <View style={styles.contenedorPrincipal}>
      {/* ===== MENÚ LATERAL ===== */}
      <View style={[styles.menuLateral, menuAbierto && styles.menuLateralAbierto]}>
        <View style={styles.contenidoMenu}>
          <View style={styles.encabezadoMenu}>
            <Text style={styles.tituloMenu}>CuidaMe</Text>
            <Text style={styles.subtituloMenu}>Panel de Control</Text>
          </View>

          <ScrollView style={styles.listaMenu} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.itemMenu} onPress={() => navegarA('InfoAnciano')}>
              <Icon name="person-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.textoItemMenu}>Información General</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={() => navegarA('Medicinas')}>
              <Icon name="medkit-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.textoItemMenu}>Medicinas</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={() => navegarA('Horario')}>
              <Icon name="time-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.textoItemMenu}>Horario</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={() => navegarA('Calendario')}>
              <Icon name="calendar-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.textoItemMenu}>Calendario</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={() => navegarA('Gastos')}>
              <Icon name="cash-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.textoItemMenu}>Gastos</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={() => navegarA('Familia')}>
              <Icon name="people-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.textoItemMenu}>Familia</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={() => navegarA('Preferencias')}>
              <Icon name="settings-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
              <Text style={styles.textoItemMenu}>Preferencias</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={cerrarSesion}>
              <Icon name="log-out-outline" size={24} color={COLORES.ERROR} />
              <Text style={[styles.textoItemMenu, { color: COLORES.ERROR }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.pieMenu}>
            <Text style={styles.version}>CuidaMe v1.0</Text>
            <Text style={styles.rolUsuario}>
              {usuarioInfo?.rol === 'familiar_admin' ? 'Administrador' : 'Familiar'}
            </Text>
          </View>
        </View>

        {menuAbierto && (
          <TouchableOpacity style={styles.overlayMenu} onPress={() => setMenuAbierto(false)} activeOpacity={1} />
        )}
      </View>

      {/* ===== CONTENIDO PRINCIPAL ===== */}
      <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
        <SafeAreaView style={styles.contenedor}>
          {/* Encabezado */}
          <View style={styles.encabezado}>
            <TouchableOpacity style={styles.botonMenu} onPress={() => setMenuAbierto(!menuAbierto)}>
              <Icon name={menuAbierto ? 'close-outline' : 'menu-outline'} size={28} color={COLORES.TEXTO_OSCURO} />
            </TouchableOpacity>

            <View style={styles.tituloContainer}>
              <Text style={styles.tituloPrincipal}>CuidaMe</Text>
              <Text style={styles.subtituloPrincipal}>Panel de Control Familiar</Text>
            </View>

            <TouchableOpacity style={styles.botonNotificaciones} onPress={irANotificaciones}>
              <Icon name="notifications-outline" size={28} color={COLORES.TEXTO_OSCURO} />
              {notificacionesNoLeidas > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeTexto}>{notificacionesNoLeidas}</Text>
                </View>
              )}
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
            {/* ===== INFORMACIÓN DEL ADULTO MAYOR ===== */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="person-circle-outline" size={28} color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.tituloSeccion}>
                  {adultoMayorInfo?.nombre || 'Adulto Mayor'}
                </Text>
              </View>

              <View style={styles.contenedorTarjeta}>
                <View style={styles.filaInfo}>
                  <View style={styles.itemInfo}>
                    <Icon name="heart-outline" size={20} color={COLORES.ROJO_CLARO} />
                    <Text style={styles.labelInfo}>Salud:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.estadoSalud || 'Estable'}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Icon name="calendar-outline" size={20} color={COLORES.AZUL_CIELO_OSCURO} />
                    <Text style={styles.labelInfo}>Edad:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.edad || '--'} años
                    </Text>
                  </View>
                </View>

                <View style={styles.filaInfo}>
                  <View style={styles.itemInfo}>
                    <Icon name="medical-outline" size={20} color={COLORES.MORADO} />
                    <Text style={styles.labelInfo}>Condiciones:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.condiciones?.length || 0}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Icon name="call-outline" size={20} color={COLORES.EXITO} />
                    <Text style={styles.labelInfo}>Médico:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.medicoPrincipal || 'No asignado'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.botonVerDetalles} onPress={() => navegarA('InfoAnciano')}>
                  <Text style={styles.textoBotonVerDetalles}>Ver detalles completos →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ===== MEDICINAS PARA HOY ===== */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="medkit-outline" size={28} color={COLORES.ROJO_CLARO} />
                <Text style={styles.tituloSeccion}>Medicinas para hoy</Text>
                <View style={styles.badge}>{medicinasHoy.length}</View>
              </View>

              <View style={styles.contenedorTarjeta}>
                {medicinasHoy.length === 0 ? (
                  <Text style={styles.textoVacio}>No hay medicinas programadas para hoy</Text>
                ) : (
                  medicinasHoy.map((medicina) => {
                    const tomada = estaTomadaHoy(medicina);
                    return (
                      <View key={medicina.id} style={styles.itemMedicina}>
                        <View style={styles.infoMedicina}>
                          <Text style={styles.nombreMedicina}>{medicina.nombre}</Text>
                          <Text style={styles.detalleMedicina}>
                            {medicina.dosis} • {formatearHora(medicina.hora_inicio || '08:00')}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.botonTomar, tomada && styles.botonTomado]}
                          onPress={() => !tomada && marcarMedicinaTomada(medicina)}
                          disabled={tomada}
                        >
                          <Text style={[styles.textoBotonTomar, tomada && styles.textoBotonTomado]}>
                            {tomada ? '✓ Tomada' : 'Marcar'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}

                {medicinasHoy.length > 0 && (
                  <TouchableOpacity style={styles.botonVerTodo} onPress={() => navegarA('Medicinas')}>
                    <Text style={styles.textoBotonVerTodo}>Ver todas las medicinas →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ===== EVENTOS ESTA SEMANA ===== */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="calendar-outline" size={28} color={COLORES.MORADO} />
                <Text style={styles.tituloSeccion}>Eventos esta semana</Text>
              </View>

              <View style={styles.contenedorTarjeta}>
                {eventosSemana.length === 0 ? (
                  <Text style={styles.textoVacio}>No hay eventos programados</Text>
                ) : (
                  eventosSemana.slice(0, 3).map((evento) => (
                    <View key={evento.id} style={styles.itemEvento}>
                      <View
                        style={[
                          styles.indicatorEvento,
                          {
                            backgroundColor:
                              evento.tipo_evento === 'cita_medica'
                                ? COLORES.ROJO_CLARO
                                : evento.tipo_evento === 'visita'
                                  ? COLORES.EXITO
                                  : COLORES.AMARILLO_PLATANO,
                          },
                        ]}
                      />
                      <View style={styles.infoEvento}>
                        <Text style={styles.nombreEvento}>{evento.titulo}</Text>
                        <Text style={styles.detalleEvento}>
                          {formatearFecha(evento.fecha_inicio)} • {formatearHora(evento.hora_inicio)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                {eventosSemana.length > 0 && (
                  <TouchableOpacity style={styles.botonVerTodo} onPress={() => navegarA('Calendario')}>
                    <Text style={styles.textoBotonVerTodo}>Ver calendario completo →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ===== GASTOS PRÓXIMOS ===== */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="cash-outline" size={28} color={COLORES.NARANJA} />
                <Text style={styles.tituloSeccion}>Gastos próximos</Text>
                <View style={styles.badge}>${calcularTotalGastos().toFixed(2)}</View>
              </View>

              <View style={styles.contenedorTarjeta}>
                {gastosFuturos.length === 0 ? (
                  <Text style={styles.textoVacio}>No hay gastos programados</Text>
                ) : (
                  gastosFuturos.slice(0, 3).map((gasto) => (
                    <View key={gasto.id} style={styles.itemGasto}>
                      <View style={styles.infoGasto}>
                        <Text style={styles.descripcionGasto}>{gasto.descripcion}</Text>
                        <Text style={styles.fechaGasto}>{formatearFecha(gasto.fecha)}</Text>
                      </View>
                      <Text style={styles.montoGasto}>${parseFloat(gasto.monto).toFixed(2)}</Text>
                    </View>
                  ))
                )}

                {gastosFuturos.length > 0 && (
                  <TouchableOpacity style={styles.botonVerTodo} onPress={() => navegarA('Gastos')}>
                    <Text style={styles.textoBotonVerTodo}>Ver todos los gastos →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ===== ACCIONES RÁPIDAS ===== */}
            <View style={styles.seccion}>
              <Text style={styles.tituloSeccion}>Acciones rápidas</Text>

              <View style={styles.contenedorAccionesRapidas}>
                <TouchableOpacity style={styles.accionRapida} onPress={() => navegarA('Medicinas')}>
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.EXITO + '20' }]}>
                    <Icon name="add-outline" size={28} color={COLORES.EXITO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Agregar medicina</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.accionRapida} onPress={() => navegarA('Calendario')}>
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.AMARILLO_PLATANO + '20' }]}>
                    <Icon name="add-outline" size={28} color={COLORES.AMARILLO_OSCURO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Agendar evento</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.accionRapida} onPress={() => navegarA('Gastos')}>
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.VERDE_CLARO + '20' }]}>
                    <Icon name="add-outline" size={28} color={COLORES.VERDE_CLARO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Registrar gasto</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.accionRapida} onPress={() => navegarA('Familia')}>
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.AZUL_CIELO + '20' }]}>
                    <Icon name="chatbubbles-outline" size={28} color={COLORES.AZUL_CIELO_OSCURO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Contactar familiar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ===== RESUMEN ===== */}
            <View style={styles.resumenContainer}>
              <Text style={styles.tituloResumen}>Resumen del día</Text>

              <View style={styles.filaResumen}>
                <View style={styles.itemResumen}>
                  <Text style={styles.numeroResumen}>
                    {medicinasHoy.filter(m => !estaTomadaHoy(m)).length}
                  </Text>
                  <Text style={styles.textoResumen}>Medicinas pendientes</Text>
                </View>

                <View style={styles.separadorResumen} />

                <View style={styles.itemResumen}>
                  <Text style={styles.numeroResumen}>
                    {eventosSemana.filter(e => {
                      const hoy = new Date();
                      const fechaEvento = new Date(e.fecha_inicio);
                      return (
                        fechaEvento.getDate() === hoy.getDate() &&
                        fechaEvento.getMonth() === hoy.getMonth() &&
                        fechaEvento.getFullYear() === hoy.getFullYear()
                      );
                    }).length}
                  </Text>
                  <Text style={styles.textoResumen}>Eventos hoy</Text>
                </View>

                <View style={styles.separadorResumen} />

                <View style={styles.itemResumen}>
                  <Text style={styles.numeroResumen}>{gastosFuturos.length}</Text>
                  <Text style={styles.textoResumen}>Gastos próximos</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  contenedorPrincipal: { flex: 1 },
  fondo: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCargando: { color: COLORES.TEXTO_OSCURO, marginTop: 20, fontSize: 16 },

  // Menú lateral
  menuLateral: {
    position: 'absolute',
    top: 0,
    left: -300,
    width: 300,
    height: '100%',
    backgroundColor: COLORES.BLANCO,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  menuLateralAbierto: { left: 0 },
  contenidoMenu: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  encabezadoMenu: { marginBottom: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  tituloMenu: { fontSize: 28, fontWeight: 'bold', color: COLORES.AZUL_CIELO_OSCURO, marginBottom: 5 },
  subtituloMenu: { fontSize: 14, color: COLORES.GRIS_OSCURO },
  listaMenu: { flex: 1 },
  itemMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 10, marginBottom: 5 },
  textoItemMenu: { marginLeft: 15, fontSize: 16, color: COLORES.TEXTO_OSCURO, fontWeight: '500' },
  pieMenu: { paddingVertical: 20, borderTopWidth: 1, borderTopColor: COLORES.GRIS_CLARO },
  version: { fontSize: 12, color: COLORES.GRIS_OSCURO, textAlign: 'center' },
  rolUsuario: { fontSize: 12, color: COLORES.AZUL_CIELO_OSCURO, textAlign: 'center', marginTop: 5, fontWeight: '500' },
  overlayMenu: {
    position: 'absolute',
    top: 0,
    left: 300,
    right: -300,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Contenido principal
  contenedor: { flex: 1, paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORES.BLANCO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  botonMenu: { padding: 6 },
  tituloContainer: { flex: 1, alignItems: 'center' },
  tituloPrincipal: { fontSize: 22, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO },
  subtituloPrincipal: { fontSize: 12, color: COLORES.GRIS_OSCURO, marginTop: 2 },
  botonNotificaciones: { padding: 6, position: 'relative' },
  badgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORES.ERROR,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeTexto: { color: COLORES.BLANCO, fontSize: 11, fontWeight: 'bold' },
  contenedorScroll: { padding: 16, paddingBottom: 40 },

  // Secciones
  seccion: { marginBottom: 24 },
  encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginLeft: 10, flex: 1 },
  badge: {
    backgroundColor: COLORES.AMARILLO_PLATANO,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
  },
  contenedorTarjeta: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  // Adulto mayor
  filaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  labelInfo: { fontSize: 14, color: COLORES.GRIS_OSCURO, marginLeft: 6, marginRight: 4 },
  valorInfo: { fontSize: 14, fontWeight: '500', color: COLORES.TEXTO_OSCURO },
  botonVerDetalles: { marginTop: 10, alignSelf: 'flex-end' },
  textoBotonVerDetalles: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 14, fontWeight: '500' },

  // Medicinas
  itemMedicina: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  infoMedicina: { flex: 1 },
  nombreMedicina: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  detalleMedicina: { fontSize: 13, color: COLORES.GRIS_OSCURO },
  botonTomar: { backgroundColor: COLORES.EXITO, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  botonTomado: { backgroundColor: COLORES.GRIS_MEDIO },
  textoBotonTomar: { color: COLORES.BLANCO, fontSize: 13, fontWeight: '500' },
  textoBotonTomado: { color: COLORES.GRIS_OSCURO },

  // Eventos
  itemEvento: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  indicatorEvento: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  infoEvento: { flex: 1 },
  nombreEvento: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  detalleEvento: { fontSize: 13, color: COLORES.GRIS_OSCURO },

  // Gastos
  itemGasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORES.GRIS_CLARO },
  infoGasto: { flex: 1 },
  descripcionGasto: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 4 },
  fechaGasto: { fontSize: 13, color: COLORES.GRIS_OSCURO },
  montoGasto: { fontSize: 18, fontWeight: 'bold', color: COLORES.VERDE_CLARO },

  // Botones ver todo
  botonVerTodo: { marginTop: 14, alignSelf: 'flex-end' },
  textoBotonVerTodo: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 14, fontWeight: '500' },

  // Acciones rápidas
  contenedorAccionesRapidas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  accionRapida: {
    width: '48%',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  iconoAccion: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  textoAccionRapida: { fontSize: 12, color: COLORES.TEXTO_OSCURO, textAlign: 'center', fontWeight: '500' },

  // Resumen
  resumenContainer: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tituloResumen: { fontSize: 18, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, marginBottom: 14, textAlign: 'center' },
  filaResumen: { flexDirection: 'row', justifyContent: 'space-around' },
  itemResumen: { alignItems: 'center', flex: 1 },
  numeroResumen: { fontSize: 24, fontWeight: 'bold', color: COLORES.AZUL_CIELO_OSCURO, marginBottom: 4 },
  textoResumen: { fontSize: 12, color: COLORES.GRIS_OSCURO, textAlign: 'center' },
  separadorResumen: { width: 1, backgroundColor: COLORES.GRIS_CLARO },

  // Textos vacíos
  textoVacio: { textAlign: 'center', color: COLORES.GRIS_OSCURO, fontSize: 14, paddingVertical: 16 },
});