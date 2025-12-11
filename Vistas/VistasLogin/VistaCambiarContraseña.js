import React, { useState } from 'react';
import { 
  TextInput, 
  Alert, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { servicioAPI } from '../servicios/api';

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

const { width } = Dimensions.get('window');

export default function VistaCambiarContrasena({ navigation, route }) {
  const { correo, tipoRecuperacion } = route.params || {};
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasenaActual, setMostrarContrasenaActual] = useState(false);
  const [mostrarNuevaContrasena, setMostrarNuevaContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  // Determinar si es recuperación o cambio desde perfil
  const esRecuperacion = tipoRecuperacion === 'recuperar' || !contrasenaActual;
  
  const limpiarContrasenas = () => { 
    setContrasenaActual('');
    setNuevaContrasena('');
    setConfirmarContrasena('');
  };

  const validarFortalezaContrasena = (contrasena) => {
    const validaciones = [
      { 
        test: contrasena.length >= 6, 
        texto: 'Mínimo 6 caracteres', 
        color: COLORES.EXITO,
        esencial: true,
        icono: 'checkmark-circle'
      },
      { 
        test: /\d/.test(contrasena), 
        texto: 'Al menos un número', 
        color: COLORES.EXITO,
        esencial: true,
        icono: 'checkmark-circle'
      },
      { 
        test: /[A-Z]/.test(contrasena), 
        texto: 'Al menos una mayúscula', 
        color: COLORES.EXITO,
        esencial: false,
        icono: 'checkmark-circle'
      },
      { 
        test: /[a-z]/.test(contrasena), 
        texto: 'Al menos una minúscula', 
        color: COLORES.EXITO,
        esencial: false,
        icono: 'checkmark-circle'
      },
      { 
        test: /[!@#$%^&*(),.?":{}|<>]/.test(contrasena), 
        texto: 'Al menos un carácter especial', 
        color: COLORES.EXITO,
        esencial: false,
        icono: 'checkmark-circle'
      },
    ];

    // Aplicar colores según cumplimiento
    return validaciones.map(v => ({
      ...v,
      color: v.test ? COLORES.EXITO : COLORES.ERROR,
      icono: v.test ? 'checkmark-circle' : 'close-circle'
    }));
  };

  const cambiarContrasena = async () => {
    // Validaciones
    if (!esRecuperacion && !contrasenaActual) {
      Alert.alert('Contraseña actual requerida', 'Por favor, ingresa tu contraseña actual');
      return;
    }

    if (!nuevaContrasena || !confirmarContrasena) {
      Alert.alert('Campos incompletos', 'Por favor, completa todos los campos');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      Alert.alert('Contraseñas no coinciden', 'Las nuevas contraseñas no coinciden');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      return;
    }

    if (!esRecuperacion && contrasenaActual === nuevaContrasena) {
      Alert.alert('Misma contraseña', 'La nueva contraseña debe ser diferente a la actual');
      return;
    }

    // Validar criterios esenciales
    const validaciones = validarFortalezaContrasena(nuevaContrasena);
    const esenciales = validaciones.filter(v => v.esencial);
    const esencialesCumplidas = esenciales.filter(v => v.test).length;
    
    if (esencialesCumplidas < esenciales.length) {
      Alert.alert(
        'Contraseña no válida',
        'Debes cumplir con todos los criterios esenciales (mínimo 6 caracteres y al menos un número).',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // Validar fortaleza general
    const todasCumplidas = validaciones.filter(v => v.test).length;
    const total = validaciones.length;

    if (todasCumplidas < 3) {
      Alert.alert(
        'Contraseña débil',
        `Tu contraseña cumple ${todasCumplidas} de ${total} criterios de seguridad. Te recomendamos usar una contraseña más segura.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar igual', onPress: () => realizarCambio() }
        ]
      );
      return;
    }

    realizarCambio();
  };

  const realizarCambio = async () => {
    setCargando(true);

    try {
      let datos;
      
      if (esRecuperacion) {
        // Recuperación de contraseña (sin contraseña actual)
        datos = await servicioAPI.recuperarContrasena({
          email: correo,
          nuevaContrasena: nuevaContrasena
        });
      } else {
        // Cambio de contraseña normal
        datos = await servicioAPI.cambiarContrasena({
          contrasenaActual,
          nuevaContrasena
        });
      }

      if (datos.exito) {
        Alert.alert(
          '✅ Contraseña actualizada',
          'Tu contraseña ha sido cambiada exitosamente.',
          [
            { 
              text: 'Continuar', 
              onPress: () => {
                limpiarContrasenas();
                
                if (esRecuperacion) {
                  navigation.replace('VistaLogin');
                } else {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        let mensaje = datos.error || 'No se pudo cambiar la contraseña';
        
        if (datos.codigo === 'CONTRASENA_ACTUAL_INCORRECTA') {
          mensaje = 'La contraseña actual es incorrecta';
          setContrasenaActual('');
        } else if (datos.codigo === 'TOKEN_EXPIRADO') {
          mensaje = 'El enlace de recuperación ha expirado. Solicita uno nuevo.';
          navigation.replace('VistaLogin');
        }
        
        Alert.alert('❌ Error', mensaje);
      }
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      Alert.alert(
        '❌ Error de conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      );
    } finally {
      setCargando(false);
    }
  };

  const regresar = () => {
    if (contrasenaActual || nuevaContrasena || confirmarContrasena) {
      Alert.alert(
        '¿Descartar cambios?',
        'Tienes cambios sin guardar. ¿Seguro que quieres regresar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Regresar', 
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const fortalezaContrasena = validarFortalezaContrasena(nuevaContrasena);
  const porcentajeFortaleza = fortalezaContrasena.filter(v => v.test).length * 20;

  // Obtener color según fortaleza
  const obtenerColorFortaleza = () => {
    if (porcentajeFortaleza < 40) return COLORES.ERROR;
    if (porcentajeFortaleza < 80) return COLORES.AMARILLO_PLATANO;
    return COLORES.EXITO;
  };

  // Obtener texto según fortaleza
  const obtenerTextoFortaleza = () => {
    if (porcentajeFortaleza < 40) return 'Débil';
    if (porcentajeFortaleza < 80) return 'Media';
    return 'Fuerte';
  };

  return (
    <LinearGradient 
      colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]}
      style={styles.fondo}
    >
      <SafeAreaView style={styles.contenedorPrincipal}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Encabezado */}
            <View style={styles.encabezado}>
              <TouchableOpacity 
                style={styles.botonAtras}
                onPress={regresar}
                disabled={cargando}
              >
                <Icon 
                  name="arrow-back-outline" 
                  size={28} 
                  color={COLORES.TEXTO_OSCURO} 
                />
              </TouchableOpacity>
              
              <View style={styles.tituloContainer}>
                <View style={[styles.iconoTitulo, { backgroundColor: COLORES.ROJO_CLARO + '20' }]}>
                  <Icon 
                    name="key-outline" 
                    size={32} 
                    color={COLORES.ROJO_CLARO} 
                  />
                </View>
                
                <Text style={styles.titulo}>
                  {esRecuperacion ? 'Restablecer contraseña' : 'Cambiar contraseña'}
                </Text>
                
                {correo && (
                  <View style={styles.correoContainer}>
                    <Icon name="mail-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
                    <Text style={styles.correoTexto}>{correo}</Text>
                  </View>
                )}
                
                <Text style={styles.subtitulo}>
                  {esRecuperacion 
                    ? 'Crea una nueva contraseña segura para tu cuenta' 
                    : 'Por seguridad, actualiza tu contraseña regularmente'}
                </Text>
              </View>
            </View>

            {/* Contenedor de formulario */}
            <View style={styles.formularioContainer}>
              
              {/* Campo: Contraseña actual (solo si no es recuperación) */}
              {!esRecuperacion && (
                <View style={styles.campoContainer}>
                  <View style={styles.campoLabelContainer}>
                    <Icon name="lock-closed-outline" size={18} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.campoLabel}>CONTRASEÑA ACTUAL</Text>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ingresa tu contraseña actual"
                      placeholderTextColor={COLORES.GRIS_MEDIO}
                      value={contrasenaActual}
                      onChangeText={setContrasenaActual}
                      secureTextEntry={!mostrarContrasenaActual}
                      editable={!cargando}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.botonOjo}
                      onPress={() => setMostrarContrasenaActual(!mostrarContrasenaActual)}
                      disabled={cargando}
                    >
                      <Icon 
                        name={mostrarContrasenaActual ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={COLORES.GRIS_OSCURO} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Campo: Nueva contraseña */}
              <View style={styles.campoContainer}>
                <View style={styles.campoLabelContainer}>
                  <Icon name="lock-closed-outline" size={18} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.campoLabel}>NUEVA CONTRASEÑA</Text>
                </View>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Crea una nueva contraseña segura"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    value={nuevaContrasena}
                    onChangeText={setNuevaContrasena}
                    secureTextEntry={!mostrarNuevaContrasena}
                    editable={!cargando}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.botonOjo}
                    onPress={() => setMostrarNuevaContrasena(!mostrarNuevaContrasena)}
                    disabled={cargando}
                  >
                    <Icon 
                      name={mostrarNuevaContrasena ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={COLORES.GRIS_OSCURO} 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Medidor de fortaleza */}
                {nuevaContrasena.length > 0 && (
                  <View style={styles.fortalezaContainer}>
                    <View style={styles.barraFortaleza}>
                      <View 
                        style={[
                          styles.barraFortalezaFill,
                          { 
                            width: `${porcentajeFortaleza}%`,
                            backgroundColor: obtenerColorFortaleza()
                          }
                        ]} 
                      />
                    </View>
                    <View style={styles.textoFortalezaContainer}>
                      <Icon 
                        name="shield-outline" 
                        size={14} 
                        color={obtenerColorFortaleza()} 
                      />
                      <Text style={[styles.textoFortaleza, { color: obtenerColorFortaleza() }]}>
                        {obtenerTextoFortaleza()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Campo: Confirmar contraseña */}
              <View style={styles.campoContainer}>
                <View style={styles.campoLabelContainer}>
                  <Icon name="lock-closed-outline" size={18} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.campoLabel}>CONFIRMAR CONTRASEÑA</Text>
                </View>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      confirmarContrasena && nuevaContrasena !== confirmarContrasena && styles.inputError
                    ]}
                    placeholder="Confirma tu nueva contraseña"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    value={confirmarContrasena}
                    onChangeText={setConfirmarContrasena}
                    secureTextEntry={!mostrarConfirmarContrasena}
                    editable={!cargando}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.botonOjo}
                    onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
                    disabled={cargando}
                  >
                    <Icon 
                      name={mostrarConfirmarContrasena ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={COLORES.GRIS_OSCURO} 
                    />
                  </TouchableOpacity>
                </View>
                
                {confirmarContrasena && nuevaContrasena !== confirmarContrasena && (
                  <View style={styles.errorContainer}>
                    <Icon name="alert-circle-outline" size={16} color={COLORES.ERROR} />
                    <Text style={styles.textoError}>Las contraseñas no coinciden</Text>
                  </View>
                )}
              </View>

              {/* Criterios de seguridad */}
              <View style={styles.criteriosContainer}>
                <View style={styles.criteriosTituloContainer}>
                  <Icon name="shield-checkmark-outline" size={18} color={COLORES.AZUL_CIELO_OSCURO} />
                  <Text style={styles.criteriosTitulo}>CRITERIOS DE SEGURIDAD</Text>
                </View>
                
                <View style={styles.criteriosEsencialesContainer}>
                  <Text style={styles.criteriosSubtitulo}>Criterios esenciales:</Text>
                  {fortalezaContrasena
                    .filter(criterio => criterio.esencial)
                    .map((criterio, index) => (
                      <View key={`esencial-${index}`} style={styles.criterioItem}>
                        <Icon name={criterio.icono} size={16} color={criterio.color} />
                        <Text style={[styles.criterioTexto, { color: criterio.color }]}>
                          {criterio.texto}
                        </Text>
                      </View>
                    ))
                  }
                </View>
                
                <View style={styles.criteriosOpcionalesContainer}>
                  <Text style={styles.criteriosSubtitulo}>Criterios opcionales (recomendados):</Text>
                  {fortalezaContrasena
                    .filter(criterio => !criterio.esencial)
                    .map((criterio, index) => (
                      <View key={`opcional-${index}`} style={styles.criterioItem}>
                        <Icon name={criterio.icono} size={16} color={criterio.color} />
                        <Text style={[styles.criterioTexto, { color: criterio.color }]}>
                          {criterio.texto}
                        </Text>
                      </View>
                    ))
                  }
                </View>
              </View>

              {/* Botones de acción */}
              <View style={styles.contenedorBotones}>
                <TouchableOpacity
                  onPress={regresar}
                  style={styles.botonSecundario}
                  disabled={cargando}
                >
                  <Icon name="arrow-back-outline" size={18} color={COLORES.AZUL_CIELO_OSCURO} />
                  <Text style={styles.textoBotonSecundario}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={cambiarContrasena}
                  style={[
                    styles.botonPrincipal,
                    cargando && styles.botonDeshabilitado,
                    (!nuevaContrasena || !confirmarContrasena || (!esRecuperacion && !contrasenaActual)) && 
                      styles.botonDeshabilitado
                  ]}
                  disabled={
                    cargando || 
                    !nuevaContrasena || 
                    !confirmarContrasena || 
                    (!esRecuperacion && !contrasenaActual)
                  }
                >
                  {cargando ? (
                    <ActivityIndicator size="small" color={COLORES.BLANCO} />
                  ) : (
                    <View style={styles.botonPrincipalContenido}>
                      <Icon name="checkmark-circle-outline" size={20} color={COLORES.BLANCO} />
                      <Text style={styles.textoBotonPrincipal}>
                        {esRecuperacion ? 'Restablecer' : 'Cambiar contraseña'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Consejos de seguridad */}
              <View style={styles.consejosContainer}>
                <View style={styles.consejosTituloContainer}>
                  <Icon name="bulb-outline" size={18} color={COLORES.AMARILLO_OSCURO} />
                  <Text style={styles.consejosTitulo}>CONSEJOS DE SEGURIDAD</Text>
                </View>
                <View style={styles.consejosLista}>
                  <View style={styles.consejoItem}>
                    <Icon name="close-circle-outline" size={14} color={COLORES.ERROR} />
                    <Text style={styles.consejoTexto}>
                      No uses contraseñas que hayas usado antes
                    </Text>
                  </View>
                  <View style={styles.consejoItem}>
                    <Icon name="close-circle-outline" size={14} color={COLORES.ERROR} />
                    <Text style={styles.consejoTexto}>
                      Evita información personal como fechas o nombres
                    </Text>
                  </View>
                  <View style={styles.consejoItem}>
                    <Icon name="checkmark-circle-outline" size={14} color={COLORES.EXITO} />
                    <Text style={styles.consejoTexto}>
                      Usa una contraseña única para esta cuenta
                    </Text>
                  </View>
                  <View style={styles.consejoItem}>
                    <Icon name="checkmark-circle-outline" size={14} color={COLORES.EXITO} />
                    <Text style={styles.consejoTexto}>
                      Considera usar un gestor de contraseñas
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
  },
  contenedorPrincipal: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  
  // Encabezado
  encabezado: {
    marginBottom: 30,
  },
  botonAtras: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 15,
  },
  tituloContainer: {
    alignItems: 'center',
  },
  iconoTitulo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORES.GRIS_CLARO,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
    marginBottom: 15,
  },
  correoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    width: '100%',
    gap: 10,
  },
  correoTexto: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  subtitulo: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Formulario
  formularioContainer: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Campos
  campoContainer: {
    marginBottom: 25,
  },
  campoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  campoLabel: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: COLORES.ERROR,
  },
  botonOjo: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  textoError: {
    color: COLORES.ERROR,
    fontSize: 12,
  },
  
  // Fortaleza
  fortalezaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  barraFortaleza: {
    flex: 1,
    height: 6,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barraFortalezaFill: {
    height: '100%',
    borderRadius: 3,
  },
  textoFortalezaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  textoFortaleza: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Criterios
  criteriosContainer: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  criteriosTituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  criteriosTitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 14,
    fontWeight: 'bold',
  },
  criteriosSubtitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  criteriosEsencialesContainer: {
    marginBottom: 15,
  },
  criteriosOpcionalesContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_MEDIO,
  },
  criterioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  criterioTexto: {
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Botones
  contenedorBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    marginBottom: 30,
  },
  botonSecundario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    height: 52,
  },
  textoBotonSecundario: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 16,
    fontWeight: '600',
  },
  botonPrincipal: {
    flex: 1,
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.AZUL_CIELO,
    height: 52,
  },
  botonDeshabilitado: {
    backgroundColor: COLORES.GRIS_MEDIO,
    borderColor: COLORES.GRIS_OSCURO,
  },
  botonPrincipalContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textoBotonPrincipal: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Consejos
  consejosContainer: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  consejosTituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  consejosTitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 14,
    fontWeight: 'bold',
  },
  consejosLista: {
    gap: 10,
  },
  consejoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  consejoTexto: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});