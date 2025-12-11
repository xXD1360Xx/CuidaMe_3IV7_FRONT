import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { servicioAPI } from '../../servicios/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

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
  VERDE_CLARO: '#81C784'
};

const { width } = Dimensions.get('window');

export default function PantallaPrincipal({ navigation }) {
  const [usuarioInfo, setUsuarioInfo] = useState(null);
  const [adultoMayorInfo, setAdultoMayorInfo] = useState(null);
  const [medicinasHoy, setMedicinasHoy] = useState([]);
  const [eventosSemana, setEventosSemana] = useState([]);
  const [gastosFuturos, setGastosFuturos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Cargar datos del usuario
  const cargarDatosUsuario = useCallback(async () => {
    try {
      const usuarioData = await AsyncStorage.getItem('usuarioInfo');
      if (usuarioData) {
        const usuario = JSON.parse(usuarioData);
        setUsuarioInfo(usuario);
        
        // Cargar el adulto mayor principal del usuario
        if (usuario.id) {
          const response = await servicioAPI.obtenerAdultoMayorPrincipal(usuario.id);
          if (response.exito && response.adultoMayor) {
            setAdultoMayorInfo(response.adultoMayor);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando datos usuario:', error);
    }
  }, []);

  // Cargar medicinas para hoy
  const cargarMedicinasHoy = useCallback(async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await servicioAPI.obtenerMedicinasPorFecha(hoy);
      if (response.exito) {
        setMedicinasHoy(response.medicinas || []);
      }
    } catch (error) {
      console.error('Error cargando medicinas:', error);
      setMedicinasHoy([]);
    }
  }, []);

  // Cargar eventos de la semana
  const cargarEventosSemana = useCallback(async () => {
    try {
      const hoy = new Date();
      const finSemana = new Date();
      finSemana.setDate(hoy.getDate() + 7);
      
      const response = await servicioAPI.obtenerEventosPorRango(
        hoy.toISOString().split('T')[0],
        finSemana.toISOString().split('T')[0]
      );
      
      if (response.exito) {
        setEventosSemana(response.eventos || []);
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setEventosSemana([]);
    }
  }, []);

  // Cargar gastos futuros
  const cargarGastosFuturos = useCallback(async () => {
    try {
      const hoy = new Date();
      const response = await servicioAPI.obtenerGastosFuturos(hoy.toISOString().split('T')[0]);
      if (response.exito) {
        setGastosFuturos(response.gastos || []);
      }
    } catch (error) {
      console.error('Error cargando gastos:', error);
      setGastosFuturos([]);
    }
  }, []);

  // Cargar todos los datos
  const cargarTodosDatos = useCallback(async () => {
    try {
      await Promise.all([
        cargarDatosUsuario(),
        cargarMedicinasHoy(),
        cargarEventosSemana(),
        cargarGastosFuturos()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [cargarDatosUsuario, cargarMedicinasHoy, cargarEventosSemana, cargarGastosFuturos]);

  // Cargar al montar
  useEffect(() => {
    cargarTodosDatos();
  }, []);

  // Refrescar cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      cargarTodosDatos();
    }, [cargarTodosDatos])
  );

  // Función para refrescar manualmente
  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarTodosDatos();
  }, [cargarTodosDatos]);

  // Navegación a otras pantallas
  const navegarA = (destino) => {
    setMenuAbierto(false);
    navigation.navigate(destino);
  };

  // Marcar medicina como tomada
  const marcarMedicinaTomada = async (medicinaId) => {
    try {
      const response = await servicioAPI.marcarMedicinaTomada(medicinaId);
      if (response.exito) {
        // Actualizar lista local
        setMedicinasHoy(prev => 
          prev.map(m => m.id === medicinaId ? { ...m, tomada: true } : m)
        );
      }
    } catch (error) {
      console.error('Error marcando medicina:', error);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Formatear hora
  const formatearHora = (horaStr) => {
    const [horas, minutos] = horaStr.split(':');
    return `${horas}:${minutos}`;
  };

  // Calcular total de gastos futuros
  const calcularTotalGastos = () => {
    return gastosFuturos.reduce((total, gasto) => total + parseFloat(gasto.monto || 0), 0);
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
          <Text style={styles.textoCargando}>Cargando información...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.contenedorPrincipal}>
      {/* Menú lateral */}
      <View style={[styles.menuLateral, menuAbierto && styles.menuLateralAbierto]}>
        <View style={styles.contenidoMenu}>
          <View style={styles.encabezadoMenu}>
            <Text style={styles.tituloMenu}>CuidaMe</Text>
            <Text style={styles.subtituloMenu}>Panel de Control</Text>
          </View>
          
          <ScrollView style={styles.listaMenu}>
            <TouchableOpacity 
              style={styles.itemMenu}
              onPress={() => navegarA('InformacionGeneral')}
            >
              <Icon name="person-outline" size={22} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoItemMenu}>Información General</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.itemMenu}
              onPress={() => navegarA('Medicinas')}
            >
              <Icon name="medical-outline" size={22} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoItemMenu}>Medicinas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.itemMenu}
              onPress={() => navegarA('Horario')}
            >
              <Icon name="time-outline" size={22} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoItemMenu}>Horario</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.itemMenu}
              onPress={() => navegarA('Calendario')}
            >
              <Icon name="calendar-outline" size={22} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoItemMenu}>Calendario</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.itemMenu}
              onPress={() => navegarA('Gastos')}
            >
              <Icon name="cash-outline" size={22} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoItemMenu}>Gastos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.itemMenu}
              onPress={() => navegarA('Familia')}
            >
              <Icon name="people-outline" size={22} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoItemMenu}>Familia</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.itemMenu}
              onPress={() => navegarA('Configuracion')}
            >
              <Icon name="settings-outline" size={22} color={COLORES.TEXTO_OSCURO} />
              <Text style={styles.textoItemMenu}>Configuración</Text>
            </TouchableOpacity>
          </ScrollView>
          
          <View style={styles.pieMenu}>
            <Text style={styles.version}>CuidaMe v1.0</Text>
            <Text style={styles.rolUsuario}>
              {usuarioInfo?.rol === 'familiar_admin' ? 'Administrador' : 'Familiar'}
            </Text>
          </View>
        </View>
        
        {/* Overlay para cerrar menú */}
        {menuAbierto && (
          <TouchableOpacity 
            style={styles.overlayMenu}
            onPress={() => setMenuAbierto(false)}
          />
        )}
      </View>

      {/* Contenido principal */}
      <LinearGradient 
        colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]}
        style={styles.fondo}
      >
        <SafeAreaView style={styles.contenedor}>
          {/* Encabezado */}
          <View style={styles.encabezado}>
            <TouchableOpacity 
              style={styles.botonMenu}
              onPress={() => setMenuAbierto(!menuAbierto)}
            >
              <Icon name={menuAbierto ? "close-outline" : "menu-outline"} size={28} color={COLORES.TEXTO_OSCURO} />
            </TouchableOpacity>
            
            <View style={styles.tituloContainer}>
              <Text style={styles.tituloPrincipal}>CuidaMe</Text>
              <Text style={styles.subtituloPrincipal}>Panel de Control Familiar</Text>
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
            {/* Información del adulto mayor */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="person-circle-outline" size={24} color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.tituloSeccion}>
                  {adultoMayorInfo?.nombre || 'Adulto Mayor'}
                </Text>
              </View>
              
              <View style={styles.contenedorTarjeta}>
                <View style={styles.filaInfo}>
                  <View style={styles.itemInfo}>
                    <Icon name="heart-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.labelInfo}>Salud:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.estadoSalud || 'Estable'}
                    </Text>
                  </View>
                  
                  <View style={styles.itemInfo}>
                    <Icon name="calendar-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.labelInfo}>Edad:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.edad || '--'} años
                    </Text>
                  </View>
                </View>
                
                <View style={styles.filaInfo}>
                  <View style={styles.itemInfo}>
                    <Icon name="medkit-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.labelInfo}>Condiciones:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.condiciones?.length || 0}
                    </Text>
                  </View>
                  
                  <View style={styles.itemInfo}>
                    <Icon name="call-outline" size={20} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.labelInfo}>Médico:</Text>
                    <Text style={styles.valorInfo}>
                      {adultoMayorInfo?.medicoPrincipal || 'No asignado'}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.botonVerDetalles}
                  onPress={() => navegarA('InformacionGeneral')}
                >
                  <Text style={styles.textoBotonVerDetalles}>Ver detalles completos →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Medicinas para hoy */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="medical-outline" size={24} color={COLORES.EXITO} />
                <Text style={styles.tituloSeccion}>Medicinas para hoy</Text>
                <Text style={styles.badge}>{medicinasHoy.length}</Text>
              </View>
              
              <View style={styles.contenedorTarjeta}>
                {medicinasHoy.length === 0 ? (
                  <Text style={styles.textoVacio}>No hay medicinas programadas para hoy</Text>
                ) : (
                  medicinasHoy.map((medicina) => (
                    <View key={medicina.id} style={styles.itemMedicina}>
                      <View style={styles.infoMedicina}>
                        <Text style={styles.nombreMedicina}>{medicina.nombre}</Text>
                        <Text style={styles.detalleMedicina}>
                          {medicina.dosis} • {formatearHora(medicina.hora)}
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        style={[
                          styles.botonTomar,
                          medicina.tomada && styles.botonTomado
                        ]}
                        onPress={() => !medicina.tomada && marcarMedicinaTomada(medicina.id)}
                        disabled={medicina.tomada}
                      >
                        <Text style={[
                          styles.textoBotonTomar,
                          medicina.tomada && styles.textoBotonTomado
                        ]}>
                          {medicina.tomada ? '✓ Tomada' : 'Marcar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
                
                {medicinasHoy.length > 0 && (
                  <TouchableOpacity 
                    style={styles.botonVerTodo}
                    onPress={() => navegarA('Medicinas')}
                  >
                    <Text style={styles.textoBotonVerTodo}>Ver todas las medicinas →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Eventos esta semana */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="calendar-outline" size={24} color={COLORES.AMARILLO_PLATANO} />
                <Text style={styles.tituloSeccion}>Eventos esta semana</Text>
              </View>
              
              <View style={styles.contenedorTarjeta}>
                {eventosSemana.length === 0 ? (
                  <Text style={styles.textoVacio}>No hay eventos programados</Text>
                ) : (
                  eventosSemana.slice(0, 3).map((evento) => (
                    <View key={evento.id} style={styles.itemEvento}>
                      <View style={[
                        styles.indicatorEvento,
                        { backgroundColor: evento.tipo === 'cita_medica' ? COLORES.ERROR : 
                                         evento.tipo === 'visita_familiar' ? COLORES.EXITO : 
                                         COLORES.AMARILLO_PLATANO }
                      ]} />
                      
                      <View style={styles.infoEvento}>
                        <Text style={styles.nombreEvento}>{evento.titulo}</Text>
                        <Text style={styles.detalleEvento}>
                          {formatearFecha(evento.fecha)} • {formatearHora(evento.hora)}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
                
                {eventosSemana.length > 0 && (
                  <TouchableOpacity 
                    style={styles.botonVerTodo}
                    onPress={() => navegarA('Calendario')}
                  >
                    <Text style={styles.textoBotonVerTodo}>Ver calendario completo →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Gastos futuros */}
            <View style={styles.seccion}>
              <View style={styles.encabezadoSeccion}>
                <Icon name="cash-outline" size={24} color={COLORES.VERDE_CLARO} />
                <Text style={styles.tituloSeccion}>Gastos próximos</Text>
                <Text style={styles.badge}>${calcularTotalGastos().toFixed(2)}</Text>
              </View>
              
              <View style={styles.contenedorTarjeta}>
                {gastosFuturos.length === 0 ? (
                  <Text style={styles.textoVacio}>No hay gastos programados</Text>
                ) : (
                  gastosFuturos.slice(0, 3).map((gasto) => (
                    <View key={gasto.id} style={styles.itemGasto}>
                      <View style={styles.infoGasto}>
                        <Text style={styles.descripcionGasto}>{gasto.descripcion}</Text>
                        <Text style={styles.fechaGasto}>
                          {formatearFecha(gasto.fecha_vencimiento)}
                        </Text>
                      </View>
                      
                      <Text style={styles.montoGasto}>
                        ${parseFloat(gasto.monto).toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
                
                {gastosFuturos.length > 0 && (
                  <TouchableOpacity 
                    style={styles.botonVerTodo}
                    onPress={() => navegarA('Gastos')}
                  >
                    <Text style={styles.textoBotonVerTodo}>Ver todos los gastos →</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Acciones rápidas */}
            <View style={styles.seccion}>
              <Text style={styles.tituloSeccion}>Acciones rápidas</Text>
              
              <View style={styles.contenedorAccionesRapidas}>
                <TouchableOpacity 
                  style={styles.accionRapida}
                  onPress={() => navegarA('AgregarMedicina')}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.EXITO + '20' }]}>
                    <Icon name="add-circle-outline" size={28} color={COLORES.EXITO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Agregar medicina</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.accionRapida}
                  onPress={() => navegarA('AgendarEvento')}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.AMARILLO_PLATANO + '20' }]}>
                    <Icon name="add-outline" size={28} color={COLORES.AMARILLO_PLATANO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Agendar evento</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.accionRapida}
                  onPress={() => navegarA('RegistrarGasto')}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.VERDE_CLARO + '20' }]}>
                    <Icon name="add-outline" size={28} color={COLORES.VERDE_CLARO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Registrar gasto</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.accionRapida}
                  onPress={() => navegarA('ContactarFamiliar')}
                >
                  <View style={[styles.iconoAccion, { backgroundColor: COLORES.AZUL_CIELO + '20' }]}>
                    <Icon name="chatbubble-outline" size={28} color={COLORES.AZUL_CIELO} />
                  </View>
                  <Text style={styles.textoAccionRapida}>Contactar familiar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Resumen */}
            <View style={styles.resumenContainer}>
              <Text style={styles.tituloResumen}>Resumen del día</Text>
              
              <View style={styles.filaResumen}>
                <View style={styles.itemResumen}>
                  <Text style={styles.numeroResumen}>{medicinasHoy.filter(m => !m.tomada).length}</Text>
                  <Text style={styles.textoResumen}>Medicinas pendientes</Text>
                </View>
                
                <View style={styles.separadorResumen} />
                
                <View style={styles.itemResumen}>
                  <Text style={styles.numeroResumen}>
                    {eventosSemana.filter(e => 
                      new Date(e.fecha).toDateString() === new Date().toDateString()
                    ).length}
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

const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
  },
  fondo: {
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
    transition: 'left 0.3s ease',
  },
  menuLateralAbierto: {
    left: 0,
  },
  contenidoMenu: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  encabezadoMenu: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  tituloMenu: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORES.AZUL_CIELO_OSCURO,
    marginBottom: 5,
  },
  subtituloMenu: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
  },
  listaMenu: {
    flex: 1,
  },
  itemMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  textoItemMenu: {
    marginLeft: 15,
    fontSize: 16,
    color: COLORES.TEXTO_OSCURO,
    fontWeight: '500',
  },
  pieMenu: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_CLARO,
  },
  version: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
  },
  rolUsuario: {
    fontSize: 12,
    color: COLORES.AZUL_CIELO_OSCURO,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '500',
  },
  overlayMenu: {
    position: 'absolute',
    top: 0,
    left: 300,
    right: -300,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  
  // Contenido principal
  contenedor: {
    flex: 1,
  },
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
  botonMenu: {
    padding: 8,
  },
  tituloContainer: {
    flex: 1,
    alignItems: 'center',
  },
  tituloPrincipal: {
    fontSize: 24,
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
  badge: {
    backgroundColor: COLORES.AMARILLO_PLATANO,
    color: COLORES.TEXTO_OSCURO,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
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
  
  // Información adulto mayor
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
  botonVerDetalles: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  textoBotonVerDetalles: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Medicinas
  itemMedicina: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoMedicina: {
    flex: 1,
  },
  nombreMedicina: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  detalleMedicina: {
    fontSize: 13,
    color: COLORES.GRIS_OSCURO,
  },
  botonTomar: {
    backgroundColor: COLORES.EXITO,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  botonTomado: {
    backgroundColor: COLORES.GRIS_MEDIO,
  },
  textoBotonTomar: {
    color: COLORES.BLANCO,
    fontSize: 13,
    fontWeight: '500',
  },
  textoBotonTomado: {
    color: COLORES.GRIS_OSCURO,
  },
  
  // Eventos
  itemEvento: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  indicatorEvento: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  infoEvento: {
    flex: 1,
  },
  nombreEvento: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  detalleEvento: {
    fontSize: 13,
    color: COLORES.GRIS_OSCURO,
  },
  
  // Gastos
  itemGasto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoGasto: {
    flex: 1,
  },
  descripcionGasto: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 4,
  },
  fechaGasto: {
    fontSize: 13,
    color: COLORES.GRIS_OSCURO,
  },
  montoGasto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.VERDE_CLARO,
  },
  
  // Botones ver todo
  botonVerTodo: {
    marginTop: 15,
    alignSelf: 'flex-end',
  },
  textoBotonVerTodo: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Acciones rápidas
  contenedorAccionesRapidas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
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
  
  // Resumen
  resumenContainer: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tituloResumen: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    marginBottom: 15,
    textAlign: 'center',
  },
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  itemResumen: {
    alignItems: 'center',
    flex: 1,
  },
  numeroResumen: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.AZUL_CIELO_OSCURO,
    marginBottom: 5,
  },
  textoResumen: {
    fontSize: 12,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
  },
  separadorResumen: {
    width: 1,
    backgroundColor: COLORES.GRIS_CLARO,
  },
  
  // Textos vacíos
  textoVacio: {
    textAlign: 'center',
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    paddingVertical: 20,
  },
});