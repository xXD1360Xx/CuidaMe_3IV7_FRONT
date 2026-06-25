import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Alert,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  ROJO_CLARO: '#EF5350',
  MORADO: '#BA68C8',
  TURQUESA: '#4DB6AC'
};

const { width } = Dimensions.get('window');

export default function VistaMandarCorreo({ navigation, route }) {
  const { modo, correo: correoParam, tipo } = route.params || {};
  const regexCorreo = /^[A-Za-z0-9._%+-]{5,}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const [cargando, setCargando] = useState(false);
  const [correo, setCorreo] = useState(correoParam || "");
  const [error, setError] = useState('');

  // Determinar el contexto basado en el tipo
  const contexto = tipo || modo || 'verificacion';

  useEffect(() => {
    if (correoParam) {
      setCorreo(correoParam);
    }
  }, [correoParam]);

  const validarCorreo = (email) => {
    setError('');
    if (!email) return false;

    if (!regexCorreo.test(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return false;
    }

    return true;
  };

  const enviarCorreo = async () => {
    if (!validarCorreo(correo)) return;

    setCargando(true);

    try {
      let resultado;

      // Según el contexto, llamar al endpoint adecuado
      if (contexto === 'recuperar') {
        resultado = await servicioAPI.solicitarRecuperacion(correo);
        if (resultado.exito) {
          Alert.alert(
            '✅ Código enviado',
            `Se ha enviado un código de recuperación a:\n${correo}`,
            [
              {
                text: 'Continuar',
                onPress: () => {
                  // Navegar a verificación con el usuario_id y el código (el backend devuelve usuario_id y código en desarrollo)
                  navigation.navigate('VerificarCorreo', {
                    correo,
                    codigo: resultado.codigo_demo || '1234', // En producción no deberías pasar código
                    contexto: 'recuperar',
                    usuarioId: resultado.usuario_id
                  });
                }
              }
            ]
          );
        } else {
          Alert.alert('Error', resultado.error || 'No se pudo enviar el código');
        }
      } else {
        // Para otros contextos (verificación, invitación), no hay endpoint en el backend.
        // Podrías implementar un endpoint genérico o usar el de recuperación con un flag.
        Alert.alert('Información', 'Esta funcionalidad no está disponible aún. Usa la recuperación de contraseña.');
      }

    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const regresar = () => {
    if (correo.trim() !== '') {
      Alert.alert(
        '¿Descartar cambios?',
        'Si regresas, perderás el correo ingresado.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Regresar',
            style: 'destructive',
            onPress: () => {
              if (contexto === 'recuperar') {
                navigation.navigate('Login');
              } else if (contexto === 'invitacion_familiar') {
                navigation.navigate('VistaFamilia');
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );
    } else {
      if (contexto === 'recuperar') {
        navigation.navigate('Login');
      } else if (contexto === 'invitacion_familiar') {
        navigation.navigate('VistaFamilia');
      } else {
        navigation.goBack();
      }
    }
  };

  // Obtener información según el contexto
  const obtenerInfoContexto = () => {
    switch (contexto) {
      case 'recuperar':
        return {
          titulo: 'Recuperar Contraseña',
          subtitulo: 'Ingresa tu correo electrónico registrado',
          instruccion: 'Te enviaremos un código para restablecer tu contraseña',
          icono: 'key-outline',
          color: COLORES.ROJO_CLARO
        };
      case 'invitacion_familiar':
        return {
          titulo: 'Invitar Familiar',
          subtitulo: 'Ingresa el correo del familiar que quieres invitar',
          instruccion: 'Enviaremos un código de invitación para unirse a la familia',
          icono: 'people-outline',
          color: COLORES.MORADO
        };
      case 'crear_cuenta':
        return {
          titulo: 'Crear Cuenta',
          subtitulo: 'Ingresa tu correo electrónico',
          instruccion: 'Te enviaremos un código para verificar tu correo',
          icono: 'person-add-outline',
          color: COLORES.EXITO
        };
      default:
        return {
          titulo: 'Verificar Correo',
          subtitulo: 'Ingresa tu correo electrónico',
          instruccion: 'Te enviaremos un código de verificación',
          icono: 'mail-outline',
          color: COLORES.AZUL_CIELO_OSCURO
        };
    }
  };

  const infoContexto = obtenerInfoContexto();

  return (
    <LinearGradient
      colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]}
      style={styles.fondo}
    >
      <SafeAreaView style={styles.contenedor}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Encabezado con icono */}
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
                <View style={[styles.iconoTitulo, { backgroundColor: infoContexto.color + '20' }]}>
                  <Icon
                    name={infoContexto.icono}
                    size={32}
                    color={infoContexto.color}
                  />
                </View>

                <Text style={styles.titulo}>{infoContexto.titulo}</Text>
                <Text style={styles.subtitulo}>{infoContexto.subtitulo}</Text>
              </View>
            </View>

            {/* Tarjeta principal */}
            <View style={styles.contenedorTarjeta}>
              <View style={styles.seccionTarjeta}>
                <Text style={styles.instruccionPrincipal}>
                  <Icon name="information-circle-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
                  {' '}{infoContexto.instruccion}
                </Text>
              </View>

              {/* Campo de correo */}
              <View style={styles.seccionTarjeta}>
                <View style={styles.campoContainer}>
                  <View style={styles.labelContainer}>
                    <Icon name="mail-outline" size={18} color={COLORES.GRIS_OSCURO} />
                    <Text style={styles.campoLabel}>CORREO ELECTRÓNICO</Text>
                  </View>

                  <TextInput
                    style={[
                      styles.input,
                      error && styles.inputError
                    ]}
                    placeholder="ejemplo@dominio.com"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    value={correo}
                    onChangeText={(text) => {
                      setCorreo(text);
                      setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!cargando}
                    returnKeyType="send"
                    onSubmitEditing={enviarCorreo}
                  />

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Icon name="alert-circle-outline" size={16} color={COLORES.ERROR} />
                      <Text style={styles.textoError}>{error}</Text>
                    </View>
                  ) : (
                    <View style={styles.ayudaContainer}>
                      <Icon name="help-circle-outline" size={14} color={COLORES.GRIS_OSCURO} />
                      <Text style={styles.textoAyuda}>
                        Asegúrate de ingresar un correo válido al que tengas acceso
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Información adicional */}
              <View style={[styles.seccionTarjeta, styles.infoSeccion]}>
                <View style={styles.infoHeader}>
                  <Icon name="shield-checkmark-outline" size={20} color={COLORES.EXITO} />
                  <Text style={styles.infoTitulo}>Información Importante</Text>
                </View>

                <View style={styles.infoItems}>
                  <View style={styles.infoItem}>
                    <Icon name="time-outline" size={14} color={COLORES.AMARILLO_PLATANO} />
                    <Text style={styles.infoTexto}>El código es válido por 15 minutos</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="warning-outline" size={14} color={COLORES.ROJO_CLARO} />
                    <Text style={styles.infoTexto}>Verifica tu bandeja de spam si no lo encuentras</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Icon name="lock-closed-outline" size={14} color={COLORES.AZUL_CIELO_OSCURO} />
                    <Text style={styles.infoTexto}>Nunca compartas tu código con otras personas</Text>
                  </View>
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
                  <Text style={styles.textoBotonSecundario}>Regresar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={enviarCorreo}
                  style={[
                    styles.botonPrincipal,
                    (cargando || !correo.trim()) && styles.botonDeshabilitado
                  ]}
                  disabled={cargando || !correo.trim()}
                >
                  {cargando ? (
                    <>
                      <ActivityIndicator size="small" color={COLORES.BLANCO} />
                      <Text style={styles.textoBotonPrincipal}>Enviando...</Text>
                    </>
                  ) : (
                    <>
                      <Icon name="paper-plane-outline" size={18} color={COLORES.BLANCO} />
                      <Text style={styles.textoBotonPrincipal}>Enviar Código</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Indicador de estado */}
            {cargando && (
              <View style={styles.estadoContainer}>
                <ActivityIndicator size="small" color={infoContexto.color} />
                <Text style={styles.textoEstado}>
                  Enviando código de verificación...
                </Text>
              </View>
            )}

            {/* Modo desarrollo */}
            {__DEV__ && (
              <View style={styles.debugContainer}>
                <View style={styles.debugHeader}>
                  <Icon name="bug-outline" size={16} color={COLORES.AMARILLO_PLATANO} />
                  <Text style={styles.debugTitulo}>MODO DESARROLLO</Text>
                </View>
                <Text style={styles.debugTexto}>
                  • Contexto: {contexto}
                </Text>
                <Text style={styles.debugTexto}>
                  • Para pruebas: Cualquier correo con formato válido
                </Text>
                <Text style={styles.debugTexto}>
                  • Ejemplo: prueba@cuida.me
                </Text>
              </View>
            )}
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
  contenedor: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    color: COLORES.GRIS_OSCURO,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Tarjeta principal
  contenedorTarjeta: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  seccionTarjeta: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.GRIS_CLARO,
  },
  infoSeccion: {
    borderBottomWidth: 0,
  },

  // Instrucción principal
  instruccionPrincipal: {
    fontSize: 15,
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: COLORES.GRIS_CLARO,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },

  // Campo de entrada
  campoContainer: {
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.GRIS_OSCURO,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  inputError: {
    borderColor: COLORES.ERROR,
    backgroundColor: COLORES.ERROR + '10',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 10,
    backgroundColor: COLORES.ERROR + '10',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORES.ERROR,
  },
  textoError: {
    color: COLORES.ERROR,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  ayudaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 5,
  },
  textoAyuda: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
    flex: 1,
  },

  // Información adicional
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_OSCURO,
    marginLeft: 10,
  },
  infoItems: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTexto: {
    fontSize: 14,
    color: COLORES.GRIS_OSCURO,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },

  // Botones
  contenedorBotones: {
    flexDirection: 'row',
    gap: 15,
    padding: 20,
  },
  botonSecundario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textoBotonSecundario: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 16,
    fontWeight: '600',
  },
  botonPrincipal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  botonDeshabilitado: {
    backgroundColor: COLORES.GRIS_MEDIO,
  },
  textoBotonPrincipal: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Estado
  estadoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  textoEstado: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    fontStyle: 'italic',
  },

  // Debug
  debugContainer: {
    backgroundColor: COLORES.AMARILLO_PLATANO + '20',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORES.AMARILLO_PLATANO + '40',
    marginTop: 20,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  debugTitulo: {
    color: COLORES.AMARILLO_OSCURO,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  debugTexto: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 11,
    marginBottom: 4,
    lineHeight: 16,
  },
});