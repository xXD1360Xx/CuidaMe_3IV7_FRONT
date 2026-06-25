import React, { useState, useEffect, useRef } from 'react';
import {
  TextInput,
  Alert,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  StyleSheet,
  ScrollView,
  Animated
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
  ROJO_CLARO: '#EF5350',
  MORADO: '#BA68C8',
  TURQUESA: '#4DB6AC'
};

const { width } = Dimensions.get('window');

export default function VistaVerificarCorreo({ navigation, route }) {
  const { correo, codigo, contexto, tipoPerfil } = route.params || {};
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [caracteres, setCaracteres] = useState(['', '', '', '']);
  const [tiempoRestante, setTiempoRestante] = useState(180); // 3 minutos
  const [puedeReenviar, setPuedeReenviar] = useState(false);

  // Animación para el círculo del timer
  const animacionProgresso = useRef(new Animated.Value(1)).current;

  // Ref para los inputs
  const inputRefs = useRef([
    React.createRef(),
    React.createRef(),
    React.createRef(),
    React.createRef()
  ]);

  // Validar parámetros
  useEffect(() => {
    if (!correo || !codigo) {
      Alert.alert('Error', 'Faltan datos necesarios');
      navigation.goBack();
    }
  }, [correo, codigo, navigation]);

  // Timer para reenviar código con animación
  useEffect(() => {
    let intervalo;

    if (tiempoRestante > 0 && !puedeReenviar) {
      // Animación del círculo
      Animated.timing(animacionProgresso, {
        toValue: tiempoRestante / 180,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      intervalo = setInterval(() => {
        setTiempoRestante(prev => {
          if (prev <= 1) {
            setPuedeReenviar(true);
            Animated.timing(animacionProgresso, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }).start();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalo) clearInterval(intervalo);
    };
  }, [tiempoRestante, puedeReenviar]);

  const reiniciarTimer = () => {
    setTiempoRestante(180);
    setPuedeReenviar(false);
    animacionProgresso.setValue(1);
  };

  // Determinar información según el contexto
  const obtenerInfoContexto = () => {
    switch (contexto) {
      case 'recuperar':
        return {
          titulo: 'Recuperar Contraseña',
          subtitulo: 'Ingresa el código de 4 dígitos que enviamos a:',
          icono: 'key-outline',
          color: COLORES.ROJO_CLARO,
          siguientePantalla: 'ResetContrasena'
        };
      case 'invitacion_familiar':
        return {
          titulo: 'Unirse a Familia',
          subtitulo: 'Ingresa el código de invitación enviado a:',
          icono: 'people-outline',
          color: COLORES.MORADO,
          siguientePantalla: 'CompletarPerfilFamiliar'
        };
      case 'crear_cuenta':
        return {
          titulo: 'Verificar Correo',
          subtitulo: 'Ingresa el código de verificación enviado a:',
          icono: 'person-add-outline',
          color: COLORES.EXITO,
          siguientePantalla: 'Registro'
        };
      default:
        return {
          titulo: 'Verificar Correo',
          subtitulo: 'Ingresa el código de verificación enviado a:',
          icono: 'mail-outline',
          color: COLORES.AZUL_CIELO_OSCURO,
          siguientePantalla: 'Registro'
        };
    }
  };

  if (!correo || !codigo) {
    return null;
  }

  const infoContexto = obtenerInfoContexto();

  // Calcular el color del círculo del timer
  const radioAnimado = animacionProgresso.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [COLORES.ERROR, COLORES.AMARILLO_PLATANO, COLORES.EXITO]
  });

  // Manejar entrada del código con 4 campos separados
  const handleCodigoChange = (text, index) => {
    // Limitar a números
    const textoLimpio = text.replace(/[^0-9]/g, '');

    const newCaracteres = [...caracteres];
    newCaracteres[index] = textoLimpio;
    setCaracteres(newCaracteres);

    // Crear string del código ingresado
    const codigoCompleto = newCaracteres.join('');
    setCodigoIngresado(codigoCompleto);

    // Auto-avanzar al siguiente campo
    if (textoLimpio && index < 3) {
      setTimeout(() => {
        if (inputRefs.current[index + 1]?.current) {
          inputRefs.current[index + 1].current.focus();
        }
      }, 10);
    }
  };

  // Manejar borrado desde cualquier campo
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !caracteres[index] && index > 0) {
      // Si el campo actual está vacío y presionamos backspace, vamos al anterior
      const newCaracteres = [...caracteres];
      newCaracteres[index - 1] = '';
      setCaracteres(newCaracteres);
      setCodigoIngresado(newCaracteres.join(''));

      setTimeout(() => {
        if (inputRefs.current[index - 1]?.current) {
          inputRefs.current[index - 1].current.focus();
        }
      }, 10);
    }
  };

  const regresar = () => {
    Alert.alert(
      '¿Regresar?',
      'Si regresas, deberás solicitar un nuevo código de verificación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Regresar',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const verificarCodigo = async () => {
    const codigoUsuario = codigoIngresado.trim();

    if (codigoUsuario.length !== 4) {
      Alert.alert('Código incompleto', 'Ingresa los 4 dígitos');
      return;
    }

    setVerificando(true);

    try {
      // Obtener el usuarioId de los parámetros de ruta
      const usuarioId = route.params?.usuarioId;

      if (!usuarioId) {
        Alert.alert('Error', 'Falta información del usuario');
        setVerificando(false);
        return;
      }

      const resultado = await servicioAPI.verificarCodigoRecuperacion(usuarioId, codigoUsuario);

      if (resultado.exito) {
        // Navegar a cambio de contraseña con el codigo_id
        navigation.navigate('CambiarContrasena', {
          usuarioId: usuarioId,
          codigoId: resultado.codigo_id,
          tipoRecuperacion: 'recuperar'
        });
      } else {
        Alert.alert('Código incorrecto', resultado.error || 'El código no es válido o ha expirado');
      }

    } catch (error) {
      Alert.alert('Error', 'No se pudo verificar el código');
    } finally {
      setVerificando(false);
    }
  };

  const reenviarCodigo = async () => {
    if (!puedeReenviar) return;

    setReenviando(true);

    try {
      // Determinar el tipo de envío basado en el contexto
      let tipoEnvio = 'verificacion';
      if (contexto === 'recuperar') {
        tipoEnvio = 'recuperacion';
      } else if (contexto === 'invitacion_familiar') {
        tipoEnvio = 'invitacion_familiar';
      }

      const resultado = await servicioAPI.enviarCorreoVerificacion({
        email: correo,
        codigo: codigo,
        tipo: tipoEnvio,
        contexto: contexto
      });

      if (resultado.exito) {
        Alert.alert(
          '✅ Código reenviado',
          'Se ha enviado un nuevo código de verificación a tu correo electrónico.',
          [{ text: 'Aceptar' }]
        );

        // Reiniciar timer y limpiar campos
        reiniciarTimer();
        setCaracteres(['', '', '', '']);
        setCodigoIngresado('');
        if (inputRefs.current[0]?.current) {
          inputRefs.current[0].current.focus();
        }
      } else {
        Alert.alert(
          'Error',
          resultado.error || 'No se pudo reenviar el código. Intenta nuevamente.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      console.error("Error al reenviar código:", error);
      Alert.alert(
        'Error de conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
        [{ text: 'Aceptar' }]
      );
    } finally {
      setReenviando(false);
    }
  };

  // Formatear tiempo en minutos y segundos
  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
                disabled={verificando || reenviando}
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

              <View style={styles.correoContainer}>
                <Icon name="mail-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.correoTexto}>{correo}</Text>
              </View>

              <Text style={styles.instruccion}>
                Ingresa el código de 4 dígitos que recibiste
              </Text>
            </View>

            {/* Código de 4 dígitos */}
            <View style={styles.codigoContainer}>
              <View style={styles.codigoLabelContainer}>
                <Icon name="keypad-outline" size={18} color={COLORES.GRIS_OSCURO} />
                <Text style={styles.codigoLabel}>CÓDIGO DE VERIFICACIÓN</Text>
              </View>

              <View style={styles.inputsContainer}>
                {[0, 1, 2, 3].map((index) => (
                  <TextInput
                    key={index}
                    ref={inputRefs.current[index]}
                    style={[
                      styles.inputCodigo,
                      caracteres[index] && styles.inputCodigoLleno
                    ]}
                    placeholder="0"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    value={caracteres[index]}
                    onChangeText={(text) => handleCodigoChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    editable={!verificando && !reenviando}
                    selectTextOnFocus
                    contextMenuHidden={true}
                    caretHidden={false}
                  />
                ))}
              </View>

              <View style={styles.codigoAyudaContainer}>
                <Icon name="information-circle-outline" size={14} color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.codigoAyuda}>
                  Ingresa los 4 dígitos que recibiste en tu correo
                </Text>
              </View>
            </View>

            {/* Contenedor de reenviar con timer animado */}
            <View style={styles.reenviarContainer}>
              <View style={styles.timerCircularContainer}>
                <Animated.View
                  style={[
                    styles.timerCircularProgress,
                    {
                      borderColor: radioAnimado,
                      transform: [{
                        rotate: animacionProgresso.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }]
                    }
                  ]}
                />
                <View style={styles.timerCircularCentro}>
                  <Text style={[
                    styles.timerTexto,
                    tiempoRestante === 0 && styles.timerTextoActivo
                  ]}>
                    {formatearTiempo(tiempoRestante)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={reenviarCodigo}
                disabled={reenviando || !puedeReenviar}
                style={[
                  styles.botonReenviar,
                  (!puedeReenviar || reenviando) && styles.botonReenviarDeshabilitado
                ]}
              >
                {reenviando ? (
                  <ActivityIndicator size="small" color={COLORES.AZUL_CIELO_OSCURO} />
                ) : (
                  <View style={styles.reenviarContenido}>
                    <Icon
                      name="refresh-outline"
                      size={18}
                      color={puedeReenviar ? COLORES.AZUL_CIELO_OSCURO : COLORES.GRIS_MEDIO}
                    />
                    <Text style={[
                      styles.textoReenviar,
                      !puedeReenviar && styles.textoReenviarDeshabilitado
                    ]}>
                      Reenviar código
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Botones de acción */}
            <View style={styles.contenedorBotones}>
              <TouchableOpacity
                onPress={regresar}
                style={styles.botonSecundario}
                disabled={verificando || reenviando}
              >
                <Icon name="arrow-back-outline" size={18} color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.textoBotonSecundario}>
                  Regresar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={verificarCodigo}
                style={[
                  styles.botonPrincipal,
                  (verificando || reenviando) && styles.botonDeshabilitado
                ]}
                disabled={verificando || reenviando || codigoIngresado.length !== 4}
              >
                {verificando ? (
                  <ActivityIndicator size="small" color={COLORES.BLANCO} />
                ) : (
                  <View style={styles.botonPrincipalContenido}>
                    <Icon name="checkmark-circle-outline" size={20} color={COLORES.BLANCO} />
                    <Text style={styles.textoBotonPrincipal}>
                      Verificar
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Información adicional */}
            <View style={styles.infoContainer}>
              <View style={styles.infoHeader}>
                <Icon name="shield-checkmark-outline" size={20} color={COLORES.EXITO} />
                <Text style={styles.infoTitulo}>Información importante</Text>
              </View>

              <View style={styles.infoItems}>
                <View style={styles.infoItem}>
                  <Icon name="time-outline" size={14} color={COLORES.AMARILLO_PLATANO} />
                  <Text style={styles.infoTexto}>El código es válido por 3 minutos</Text>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="warning-outline" size={14} color={COLORES.ROJO_CLARO} />
                  <Text style={styles.infoTexto}>Verifica tu carpeta de spam si no lo encuentras</Text>
                </View>

                <View style={styles.infoItem}>
                  <Icon name="lock-closed-outline" size={14} color={COLORES.AZUL_CIELO_OSCURO} />
                  <Text style={styles.infoTexto}>Nunca compartas tu código con otras personas</Text>
                </View>
              </View>
            </View>

            {/* Debug en desarrollo */}
            {__DEV__ && (
              <View style={styles.debugContainer}>
                <View style={styles.debugHeader}>
                  <Icon name="bug-outline" size={16} color={COLORES.AMARILLO_PLATANO} />
                  <Text style={styles.debugTitulo}>MODO DESARROLLO</Text>
                </View>
                <Text style={styles.debugTexto}>
                  Código correcto: <Text style={styles.debugCodigo}>{codigo}</Text>
                </Text>
                <Text style={styles.debugTexto}>
                  Contexto: {contexto || 'verificacion'}
                </Text>
                <Text style={styles.debugAyuda}>
                  Para pruebas rápidas, puedes usar el código 8888
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
  contenedorPrincipal: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },

  // Encabezado
  encabezado: {
    alignItems: 'center',
    marginBottom: 40,
  },
  botonAtras: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 15,
  },
  tituloContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 28,
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
  correoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    width: '100%',
    gap: 10,
  },
  correoTexto: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  instruccion: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Código
  codigoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  codigoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  codigoLabel: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 15,
  },
  inputCodigo: {
    width: 70,
    height: 70,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORES.GRIS_MEDIO,
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORES.TEXTO_OSCURO,
    textAlign: 'center',
    paddingLeft: 0,
    paddingRight: 0,
  },
  inputCodigoLleno: {
    borderColor: COLORES.AZUL_CIELO_OSCURO,
    backgroundColor: COLORES.AZUL_CIELO + '20',
    color: COLORES.AZUL_CIELO_OSCURO,
  },
  codigoAyudaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8,
  },
  codigoAyuda: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Timer y reenviar
  reenviarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  timerCircularContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerCircularProgress: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  timerCircularCentro: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORES.GRIS_CLARO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTexto: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    fontWeight: '600',
  },
  timerTextoActivo: {
    color: COLORES.AZUL_CIELO_OSCURO,
  },
  botonReenviar: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonReenviarDeshabilitado: {
    opacity: 0.5,
  },
  reenviarContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textoReenviar: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '600',
  },
  textoReenviarDeshabilitado: {
    color: COLORES.GRIS_MEDIO,
  },

  // Botones
  contenedorBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 40,
  },
  botonSecundario: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 15,
    paddingVertical: 16,
    gap: 10,
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
    backgroundColor: COLORES.AZUL_CIELO_OSCURO,
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.AZUL_CIELO,
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
    textAlign: 'center',
  },

  // Información
  infoContainer: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  infoTitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    fontWeight: '600',
  },
  infoItems: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoTexto: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  // Debug
  debugContainer: {
    backgroundColor: COLORES.AMARILLO_PLATANO + '20',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORES.AMARILLO_PLATANO + '40',
    marginTop: 10,
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
  debugCodigo: {
    color: COLORES.AMARILLO_OSCURO,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
  },
  debugAyuda: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 5,
  },
});