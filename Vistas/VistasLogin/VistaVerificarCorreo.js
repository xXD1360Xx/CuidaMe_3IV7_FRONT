import React, { useState, useEffect, useRef } from 'react';
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
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import { servicioAPI } from '../../servicios/api';

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

const TOTAL_DIGITS = 4;
const TIEMPO_LIMITE = 180; // 3 minutos

export default function VistaVerificarCorreo({ navigation, route }) {
  const { correo, codigo, contexto, usuarioId, redirigirA, datosAnciano } = route.params || {};
  const [caracteres, setCaracteres] = useState(Array(TOTAL_DIGITS).fill(''));
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_LIMITE);
  const [puedeReenviar, setPuedeReenviar] = useState(false);

  const inputRefs = useRef([]);
  const animacionProgresso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!correo || !codigo) {
      Alert.alert('Error', 'Faltan datos necesarios');
      navigation.replace('Login');
    }
  }, []);

  useEffect(() => {
    let intervalo;
    if (tiempoRestante > 0 && !puedeReenviar) {
      Animated.timing(animacionProgresso, {
        toValue: tiempoRestante / TIEMPO_LIMITE,
        duration: 1000,
        useNativeDriver: false,
      }).start();

      intervalo = setInterval(() => {
        setTiempoRestante(prev => {
          if (prev <= 1) {
            clearInterval(intervalo);
            setPuedeReenviar(true);
            Animated.timing(animacionProgresso, { toValue: 0, duration: 500, useNativeDriver: false }).start();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [tiempoRestante, puedeReenviar]);

  const reiniciarTimer = () => {
    setTiempoRestante(TIEMPO_LIMITE);
    setPuedeReenviar(false);
    animacionProgresso.setValue(1);
  };

  const radioAnimado = animacionProgresso.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [COLORES.ERROR, COLORES.AMARILLO_PLATANO, COLORES.EXITO]
  });

  const handleCodigoChange = (text, index) => {
    const textoLimpio = text.replace(/[^0-9]/g, '');
    const newCaracteres = [...caracteres];
    newCaracteres[index] = textoLimpio;
    setCaracteres(newCaracteres);
    setCodigoIngresado(newCaracteres.join(''));
    if (textoLimpio && index < TOTAL_DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !caracteres[index] && index > 0) {
      const newCaracteres = [...caracteres];
      newCaracteres[index - 1] = '';
      setCaracteres(newCaracteres);
      setCodigoIngresado(newCaracteres.join(''));
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verificarCodigo = async () => {
    if (codigoIngresado.length !== TOTAL_DIGITS) {
      Alert.alert('Código incompleto', `Ingresa los ${TOTAL_DIGITS} dígitos`);
      return;
    }

    setVerificando(true);

    try {
      const codigoCorrecto = codigo || '';
      const esValido = codigoIngresado === codigoCorrecto;

      if (esValido) {
        if (contexto === 'recuperar') {
          // Para recuperación, verificar código con el backend
          const resultado = await servicioAPI.verificarCodigoRecuperacion(usuarioId, codigoIngresado);
          if (resultado.exito) {
            navigation.navigate('CambiarContrasena', {
              usuarioId,
              codigoId: resultado.codigo_id,
              tipoRecuperacion: 'recuperar'
            });
          } else {
            Alert.alert('Error', resultado.error || 'Código inválido');
          }
        } else {
          // Creación de cuenta: ir a CrearAnciano
          navigation.replace(redirigirA || 'CrearAnciano', datosAnciano || {});
        }
      } else {
        Alert.alert('Código incorrecto', 'El código ingresado no coincide. Verifica e intenta nuevamente.');
        setCaracteres(Array(TOTAL_DIGITS).fill(''));
        setCodigoIngresado('');
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo verificar el código');
    } finally {
      setVerificando(false);
    }
  };

  const reenviarCodigo = async () => {
    if (!puedeReenviar || reenviando) return;
    setReenviando(true);

    try {
      const resultado = await servicioAPI.solicitarRecuperacion(correo);
      if (resultado.exito) {
        Alert.alert('✅ Código reenviado', 'Se ha enviado un nuevo código a tu correo.');
        const nuevoCodigo = resultado.codigo_demo || Math.floor(1000 + Math.random() * 9000).toString();
        // Actualizar el código (pasado por referencia)
        // Esto es un truco, pero funciona para este caso
        route.params.codigo = nuevoCodigo;
        reiniciarTimer();
        setCaracteres(Array(TOTAL_DIGITS).fill(''));
        setCodigoIngresado('');
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', resultado.error || 'No se pudo reenviar el código');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setReenviando(false);
    }
  };

  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedorPrincipal}>
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoidingView}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Encabezado */}
            <View style={styles.encabezado}>
              <View style={styles.iconoTitulo}>
                <Icon name="mail-outline" size={40} color={COLORES.AZUL_CIELO_OSCURO} />
              </View>
              <Text style={styles.titulo}>Verificar Correo</Text>
              <Text style={styles.subtitulo}>Ingresa el código de 4 dígitos enviado a:</Text>
              <View style={styles.correoContainer}>
                <Icon name="mail-outline" size={16} color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.correoTexto}>{correo}</Text>
              </View>
            </View>

            {/* Código de 4 dígitos */}
            <View style={styles.codigoContainer}>
              <Text style={styles.codigoLabel}>CÓDIGO DE VERIFICACIÓN</Text>
              <View style={styles.inputsContainer}>
                {Array.from({ length: TOTAL_DIGITS }).map((_, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[styles.inputCodigo, caracteres[index] && styles.inputCodigoLleno]}
                    placeholder="0"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    value={caracteres[index]}
                    onChangeText={(text) => handleCodigoChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    editable={!verificando && !reenviando}
                  />
                ))}
              </View>
            </View>

            {/* Timer y reenviar */}
            <View style={styles.accionesContainer}>
              <View style={styles.timerContainer}>
                <View style={styles.timerCircularContainer}>
                  <Animated.View style={[styles.timerCircularProgress, { borderColor: radioAnimado, transform: [{ rotate: animacionProgresso.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} />
                  <View style={styles.timerCircularCentro}>
                    <Text style={styles.timerTexto}>{formatearTiempo(tiempoRestante)}</Text>
                  </View>
                </View>
              </View>
              {puedeReenviar ? (
                <TouchableOpacity style={styles.botonReenviar} onPress={reenviarCodigo} disabled={reenviando}>
                  <Text style={styles.textoReenviar}>{reenviando ? 'Enviando...' : 'Reenviar código'}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.textoEspera}>Espera para reenviar</Text>
              )}
            </View>

            {/* Botones */}
            <View style={styles.botonesContainer}>
              <TouchableOpacity style={styles.botonSecundario} onPress={() => navigation.goBack()} disabled={verificando || reenviando}>
                <Text style={styles.textoBotonSecundario}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonPrincipal, (verificando || reenviando || codigoIngresado.length !== TOTAL_DIGITS) && styles.botonDeshabilitado]}
                onPress={verificarCodigo}
                disabled={verificando || reenviando || codigoIngresado.length !== TOTAL_DIGITS}
              >
                {verificando ? <ActivityIndicator size="small" color={COLORES.BLANCO} /> : <Text style={styles.textoBotonPrincipal}>Verificar</Text>}
              </TouchableOpacity>
            </View>

            {/* Debug en desarrollo */}
            {__DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTexto}>🔑 Código correcto: <Text style={styles.debugCodigo}>{codigo}</Text></Text>
                <Text style={styles.debugTexto}>Contexto: {contexto || 'crear_cuenta'}</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1 },
  contenedorPrincipal: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30 },
  encabezado: { alignItems: 'center', marginBottom: 30 },
  iconoTitulo: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORES.AZUL_CIELO + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center', marginBottom: 8 },
  subtitulo: { fontSize: 16, color: COLORES.GRIS_OSCURO, textAlign: 'center', marginBottom: 15 },
  correoContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  correoTexto: { color: COLORES.AZUL_CIELO_OSCURO, fontWeight: 'bold', marginLeft: 8, flex: 1, textAlign: 'center' },
  codigoContainer: { alignItems: 'center', marginBottom: 30 },
  codigoLabel: { color: COLORES.GRIS_OSCURO, fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 15, textTransform: 'uppercase' },
  inputsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  inputCodigo: { width: 55, height: 65, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, borderWidth: 2, borderColor: COLORES.GRIS_MEDIO, fontSize: 28, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 0 },
  inputCodigoLleno: { borderColor: COLORES.AZUL_CIELO_OSCURO, backgroundColor: COLORES.AZUL_CIELO + '20', color: COLORES.AZUL_CIELO_OSCURO },
  accionesContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, paddingHorizontal: 10 },
  timerContainer: { flexDirection: 'row', alignItems: 'center' },
  timerCircularContainer: { width: 55, height: 55, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  timerCircularProgress: { position: 'absolute', width: 55, height: 55, borderRadius: 27.5, borderWidth: 3, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' },
  timerCircularCentro: { width: 47, height: 47, borderRadius: 23.5, backgroundColor: COLORES.GRIS_CLARO, justifyContent: 'center', alignItems: 'center' },
  timerTexto: { color: COLORES.GRIS_OSCURO, fontSize: 14, fontWeight: 'bold' },
  botonReenviar: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: COLORES.EXITO, borderRadius: 8 },
  textoReenviar: { color: COLORES.BLANCO, fontWeight: 'bold', fontSize: 14 },
  textoEspera: { color: COLORES.GRIS_OSCURO, fontSize: 14, fontStyle: 'italic' },
  botonesContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  botonSecundario: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center', borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  textoBotonSecundario: { color: COLORES.GRIS_OSCURO, fontWeight: 'bold', fontSize: 16 },
  botonPrincipal: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORES.AZUL_CIELO_OSCURO, alignItems: 'center' },
  botonDeshabilitado: { backgroundColor: COLORES.GRIS_MEDIO },
  textoBotonPrincipal: { color: COLORES.BLANCO, fontWeight: 'bold', fontSize: 16 },
  debugContainer: { marginTop: 20, backgroundColor: COLORES.GRIS_CLARO, padding: 12, borderRadius: 8, alignItems: 'center' },
  debugTexto: { fontSize: 14, color: COLORES.GRIS_OSCURO },
  debugCodigo: { color: COLORES.ROJO_CLARO, fontWeight: 'bold', fontSize: 16 }
});