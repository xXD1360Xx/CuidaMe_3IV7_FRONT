import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Image,
  Alert,
  Text,
  View,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Modal
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { servicioAPI } from '../servicios/api';
import { useAuth } from '../../AppNavegacion';


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
  VERDE: '#4CAF50',
  NARANJA: '#FF9800'
};

// Configurar para web
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export default function VistaLogin({ navigation }) {
  const [identificador, setIdentificador] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [codigoFamiliarNormal, setCodigoFamiliarNormal] = useState('');
  const [cargando, setCargando] = useState(false);
  const auth = useAuth();
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [errorIdentificador, setErrorIdentificador] = useState('');
  const [errorContrasena, setErrorContrasena] = useState('');
  const [errorCodigoFamiliar, setErrorCodigoFamiliar] = useState('');
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [modoIngreso, setModoIngreso] = useState('normal'); // 'normal', 'codigoPersonalizado'
  const [codigoPersonalizado, setCodigoPersonalizado] = useState('');
  const [errorCodigoPersonalizado, setErrorCodigoPersonalizado] = useState('');
  const [modalCodigoVisible, setModalCodigoVisible] = useState(false);

  // Generar formato de código (ej: ABC-123)
  const generarFormatoCodigo = () => {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numeros = '0123456789';

    let codigo = '';
    // 3 letras
    for (let i = 0; i < 3; i++) {
      codigo += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    codigo += '-';
    // 3 números
    for (let i = 0; i < 3; i++) {
      codigo += numeros.charAt(Math.floor(Math.random() * numeros.length));
    }

    return codigo;
  };

  // Formatear código mientras se escribe (ABC-123)
  const formatearCodigo = (text, esCodigoNormal = false) => {
    // Remover todo lo que no sea letra o número
    let limpio = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Limitar a 6 caracteres
    if (limpio.length > 6) {
      limpio = limpio.substring(0, 6);
    }

    // Insertar guión después de 3 caracteres
    let formateado = '';
    for (let i = 0; i < limpio.length; i++) {
      if (i === 3) formateado += '-';
      formateado += limpio[i];
    }

    if (esCodigoNormal) {
      setCodigoFamiliarNormal(formateado);
      setErrorCodigoFamiliar('');
    } else {
      setCodigoPersonalizado(formateado);
      setErrorCodigoPersonalizado('');
    }
  };

  // Validar campos según modo
  const validarCampos = () => {
    let valido = true;

    if (modoIngreso === 'normal') {
      // Validar email/contraseña
      if (!identificador.trim()) {
        setErrorIdentificador('Por favor ingresa tu correo');
        valido = false;
      } else if (!identificador.includes('@')) {
        setErrorIdentificador('Ingresa un correo electrónico válido');
        valido = false;
      } else {
        setErrorIdentificador('');
      }

      if (!contrasena.trim()) {
        setErrorContrasena('Por favor ingresa tu contraseña');
        valido = false;
      } else {
        setErrorContrasena('');
      }

      // Validar código familiar (opcional)
      if (codigoFamiliarNormal.trim()) {
        const codigoLimpio = codigoFamiliarNormal.replace(/-/g, '');
        if (codigoLimpio.length !== 6) {
          setErrorCodigoFamiliar('El código debe tener 6 caracteres');
          valido = false;
        } else {
          setErrorCodigoFamiliar('');
        }
      }
    }
    else if (modoIngreso === 'codigoPersonalizado') {
      // Validar código personalizado
      const codigoLimpio = codigoPersonalizado.replace(/-/g, '');
      if (codigoLimpio.length !== 6) {
        setErrorCodigoPersonalizado('El código debe tener 6 caracteres');
        valido = false;
      } else {
        setErrorCodigoPersonalizado('');
      }
    }

    return valido;
  };

  const manejarLoginManual = async () => {
    if (!validarCampos()) return;

    setCargando(true);

    try {
      let respuesta;
      const codigoLimpio = codigoFamiliarNormal.replace(/-/g, '');

      if (modoIngreso === 'normal') {
        if (codigoLimpio) {
          respuesta = await servicioAPI.iniciarSesionConCodigoFamiliar(
            identificador,
            contrasena,
            codigoLimpio
          );
        } else {
          respuesta = await servicioAPI.iniciarSesion(identificador, contrasena);
        }
      } else {
        const codigoLimpioPersonal = codigoPersonalizado.replace(/-/g, '');
        respuesta = await servicioAPI.iniciarSesionConCodigoPersonalizado(codigoLimpioPersonal);
      }

      if (respuesta.exito && respuesta.token) {
        // Guardar sesión usando el contexto
        await auth.iniciarSesion(respuesta.token, respuesta.usuario, respuesta.usuario.rol || 'familiar');

        // Redirigir según perfil
        const perfil = respuesta.usuario.rol || 'familiar';
        if (perfil === 'familiar') {
          navigation.replace('Principal');
        } else if (perfil === 'adulto_mayor') {
          navigation.replace('InfoAnciano'); // o la ruta que corresponda
        } else {
          navigation.replace('Principal'); // fallback
        }
      } else {
        Alert.alert('Error', respuesta.error || 'Credenciales incorrectas');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const manejarInfoCodigo = () => {
    setModalCodigoVisible(true);
    // Generar un código de ejemplo para mostrar
    const codigoEjemplo = generarFormatoCodigo();
    setCodigoPersonalizado(codigoEjemplo);
  };

  const cambiarModoIngreso = (nuevoModo) => {
    setModoIngreso(nuevoModo);
    // Limpiar campos al cambiar modo
    if (nuevoModo === 'normal') {
      setCodigoPersonalizado('');
      setErrorCodigoPersonalizado('');
    } else {
      setIdentificador('');
      setContrasena('');
      setCodigoFamiliarNormal('');
      setErrorIdentificador('');
      setErrorContrasena('');
      setErrorCodigoFamiliar('');
    }
  };

  const manejarRecuperarContrasena = () => {
    navigation.navigate('MandarCorreo', { modo: 'recuperar' });
  };

  const manejarCrearCuenta = () => {
    navigation.navigate('SeleccionPerfil');
  };

  const manejarLoginGoogle = async () => {
    setCargandoGoogle(true);

    try {
      const TUNNEL_URL = 'https://veifibi-divinablasfemia-8081.exp.direct';
      const REDIRECT_URI = `${TUNNEL_URL}/--/auth/callback`;
      const CLIENT_ID = '875101074375-t8ghd22q0e7dler6qt1h31dbn5ltvutp.apps.googleusercontent.com';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=token&` +
        `scope=email%20profile&` +
        `prompt=consent`;

      await WebBrowser.openBrowserAsync(authUrl);

      setTimeout(async () => {
        // En una implementación real, manejarías el deep link aquí
        console.log('Google login iniciado');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión con Google');
    } finally {
      setCargandoGoogle(false);
    }
  };

  useEffect(() => {
    const verificarSesionActiva = async () => {
      try {
        const sesionActiva = await AsyncStorage.getItem('sesionActiva');
        const usuarioInfo = await AsyncStorage.getItem('usuarioInfo');

        if (sesionActiva === 'true' && usuarioInfo) {
          const token = await AsyncStorage.getItem('token');

          if (token) {
            try {
              const verificado = await servicioAPI.verificarToken();
              if (verificado.exito) {
                navigation.replace('MenuPrincipal');
                return;
              }
            } catch (error) {
              console.log('Token inválido, cerrando sesión');
              await AsyncStorage.multiRemove(['sesionActiva', 'usuarioInfo', 'token', 'rol']);
            }
          }
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
      }
    };

    verificarSesionActiva();
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CuidaMe | Cuidado de Adultos Mayores';
    }
  }, []);

  return (
    <LinearGradient
      colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]}
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
              <View style={styles.logoContainer}>
                <Text style={styles.titulo}>CuidaMe</Text>
                <Text style={styles.subtituloLogo}>Cuidado y organización para adultos mayores</Text>
              </View>

              <Text style={styles.subtitulo}>
                {modoIngreso === 'normal'
                  ? 'Ingresa con tu correo y contraseña'
                  : 'Ingresa con tu código familiar personalizado'}
              </Text>
            </View>

            {/* Selector de modo de ingreso */}
            <View style={styles.selectorModoContainer}>
              <TouchableOpacity
                style={[
                  styles.botonModo,
                  modoIngreso === 'normal' && styles.botonModoActivo
                ]}
                onPress={() => cambiarModoIngreso('normal')}
              >
                <Text style={[
                  styles.textoBotonModo,
                  modoIngreso === 'normal' && styles.textoBotonModoActivo
                ]}>
                  📧 Correo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonModo,
                  modoIngreso === 'codigoPersonalizado' && styles.botonModoActivo
                ]}
                onPress={() => cambiarModoIngreso('codigoPersonalizado')}
              >
                <Text style={[
                  styles.textoBotonModo,
                  modoIngreso === 'codigoPersonalizado' && styles.textoBotonModoActivo
                ]}>
                  🔑 Código Personal
                </Text>
              </TouchableOpacity>
            </View>

            {/* Formulario Normal (Email + Contraseña + Código Familiar) */}
            {modoIngreso === 'normal' && (
              <>
                {/* Campo de email */}
                <View style={styles.campoContainer}>
                  <Text style={styles.campoLabel}>CORREO ELECTRÓNICO *</Text>

                  <TextInput
                    style={[
                      styles.input,
                      errorIdentificador && styles.inputError
                    ]}
                    placeholder="tucorreo@ejemplo.com"
                    placeholderTextColor={COLORES.GRIS_OSCURO}
                    value={identificador}
                    onChangeText={(text) => {
                      setIdentificador(text);
                      setErrorIdentificador('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!cargando}
                    returnKeyType="next"
                  />

                  {errorIdentificador ? (
                    <Text style={styles.textoError}>❌ {errorIdentificador}</Text>
                  ) : (
                    <Text style={styles.textoAyuda}>
                      📧 Usa el correo con el que te registraste
                    </Text>
                  )}
                </View>

                {/* Campo de contraseña */}
                <View style={styles.campoContainer}>
                  <Text style={styles.campoLabel}>CONTRASEÑA *</Text>

                  <View style={styles.inputPasswordContainer}>
                    <TextInput
                      style={[
                        styles.inputPassword,
                        errorContrasena && styles.inputError
                      ]}
                      placeholder="Ingresa tu contraseña"
                      placeholderTextColor={COLORES.GRIS_OSCURO}
                      value={contrasena}
                      onChangeText={(text) => {
                        setContrasena(text);
                        setErrorContrasena('');
                      }}
                      secureTextEntry={!mostrarContrasena}
                      editable={!cargando}
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                    <TouchableOpacity
                      style={styles.botonOjo}
                      onPress={() => setMostrarContrasena(!mostrarContrasena)}
                      disabled={cargando}
                    >
                      <Text style={styles.textoOjo}>
                        {mostrarContrasena ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {errorContrasena ? (
                    <Text style={styles.textoError}>❌ {errorContrasena}</Text>
                  ) : (
                    <Text style={styles.textoAyuda}>
                      🔒 Tu contraseña es segura y privada
                    </Text>
                  )}
                </View>

                {/* Campo de código familiar (opcional) */}
                <View style={styles.campoContainer}>
                  <Text style={styles.campoLabel}>CÓDIGO FAMILIAR (OPCIONAL)</Text>

                  <TextInput
                    style={[
                      styles.inputCodigo,
                      errorCodigoFamiliar && styles.inputError
                    ]}
                    placeholder="ABC-123"
                    placeholderTextColor={COLORES.GRIS_OSCURO}
                    value={codigoFamiliarNormal}
                    onChangeText={(text) => formatearCodigo(text, true)}
                    keyboardType="default"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!cargando}
                    maxLength={7}
                  />

                  {errorCodigoFamiliar ? (
                    <Text style={styles.textoError}>❌ {errorCodigoFamiliar}</Text>
                  ) : (
                    <Text style={styles.textoAyuda}>
                      🔗 Vincula tu cuenta con un grupo familiar
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* Formulario Código Personalizado */}
            {modoIngreso === 'codigoPersonalizado' && (
              <View style={styles.campoContainer}>
                <Text style={styles.campoLabel}>CÓDIGO PERSONALIZADO *</Text>

                <TextInput
                  style={[
                    styles.inputCodigoGrande,
                    errorCodigoPersonalizado && styles.inputError
                  ]}
                  placeholder="ABC-123"
                  placeholderTextColor={COLORES.GRIS_OSCURO}
                  value={codigoPersonalizado}
                  onChangeText={(text) => formatearCodigo(text, false)}
                  keyboardType="default"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!cargando}
                  maxLength={7}
                />

                {errorCodigoPersonalizado ? (
                  <Text style={styles.textoError}>❌ {errorCodigoPersonalizado}</Text>
                ) : (
                  <Text style={styles.textoAyuda}>
                    🔑 Usa el código personalizado que te compartió el administrador
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.botonInfoCodigo}
                  onPress={manejarInfoCodigo}
                  disabled={cargando}
                >
                  <Text style={styles.textoBotonInfoCodigo}>
                    ¿Qué es un código personalizado?
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botón principal de login */}
            <TouchableOpacity
              onPress={manejarLoginManual}
              style={[
                styles.botonPrincipal,
                cargando && styles.botonDeshabilitado
              ]}
              disabled={cargando ||
                (modoIngreso === 'normal' && (!identificador.trim() || !contrasena.trim())) ||
                (modoIngreso === 'codigoPersonalizado' && codigoPersonalizado.replace(/-/g, '').length !== 6)
              }
            >
              {cargando ? (
                <ActivityIndicator size="small" color={COLORES.BLANCO} />
              ) : (
                <Text style={styles.textoBotonPrincipal}>
                  {modoIngreso === 'normal' ? 'Iniciar sesión' : 'Acceder con código'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Enlaces para modo normal */}
            {modoIngreso === 'normal' && (
              <View style={styles.contenedorEnlaces}>
                <TouchableOpacity
                  onPress={manejarCrearCuenta}
                  disabled={cargando}
                >
                  <Text style={styles.enlace}>Crear nueva cuenta</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={manejarRecuperarContrasena}
                  disabled={cargando}
                >
                  <Text style={styles.enlace}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Separador para login social */}
            {modoIngreso === 'normal' && (
              <View style={styles.separadorContainer}>
                <View style={styles.separadorLinea} />
                <Text style={styles.separadorTexto}>O continúa con</Text>
                <View style={styles.separadorLinea} />
              </View>
            )}

            {/* Botón Google (solo modo normal) */}
            {modoIngreso === 'normal' && (
              <TouchableOpacity
                style={[
                  styles.botonGoogle,
                  (cargando || cargandoGoogle) && styles.botonDeshabilitado
                ]}
                onPress={manejarLoginGoogle}
                disabled={cargando || cargandoGoogle}
              >
                {cargandoGoogle ? (
                  <ActivityIndicator size="small" color={COLORES.TEXTO_OSCURO} />
                ) : (
                  <>
                    <Image
                      source={require('../recursos/img/google.png')}
                      style={styles.iconoGoogle}
                    />
                    <Text style={styles.textoBotonGoogle}>Google</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.textoFooter}>© 2025 CuidaMe - Cuidado de Adultos Mayores</Text>
              <Text style={styles.version}>Versión Familiar v1.0</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal de información del código personalizado */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalCodigoVisible}
        onRequestClose={() => setModalCodigoVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <Text style={styles.modalTitulo}>🔑 Código Personalizado</Text>

            <View style={styles.modalEjemploContainer}>
              <Text style={styles.modalEjemploLabel}>Ejemplo:</Text>
              <View style={styles.codigoEjemploContainer}>
                <Text style={styles.codigoEjemplo}>{codigoPersonalizado || "ABC-123"}</Text>
              </View>
            </View>

            <Text style={styles.modalTexto}>
              Hay <Text style={styles.textoDestacado}>dos tipos de códigos</Text> en CuidaMe:
            </Text>

            <View style={styles.modalLista}>
              <Text style={styles.modalSubtitulo}>1. Código Familiar Normal:</Text>
              <Text style={styles.modalItem}>• Se usa AL CREAR la cuenta</Text>
              <Text style={styles.modalItem}>• Vincula tu cuenta a un grupo familiar</Text>
              <Text style={styles.modalItem}>• Opcional en el login</Text>

              <Text style={[styles.modalSubtitulo, { marginTop: 15 }]}>2. Código Personalizado:</Text>
              <Text style={styles.modalItem}>• Se usa PARA ACCEDER sin email/contraseña</Text>
              <Text style={styles.modalItem}>• Único para cada familiar/adulto mayor</Text>
              <Text style={styles.modalItem}>• Siempre es el mismo para esa persona</Text>
              <Text style={styles.modalItem}>• Lo genera el familiar administrador</Text>
            </View>

            <Text style={styles.modalNota}>
              💡 <Text style={styles.textoDestacado}>Consejo:</Text> Si no tienes código personalizado,
              pídeselo al familiar administrador de tu grupo.
            </Text>

            <TouchableOpacity
              style={styles.botonModalCerrar}
              onPress={() => setModalCodigoVisible(false)}
            >
              <Text style={styles.textoBotonModalCerrar}>Entendido</Text>
            </TouchableOpacity>
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
  contenedorPrincipal: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 25,
    justifyContent: 'center',
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  titulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtituloLogo: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  subtitulo: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  selectorModoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 25,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 25,
    padding: 5,
  },
  botonModo: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  botonModoActivo: {
    backgroundColor: COLORES.AMARILLO_PLATANO,
  },
  textoBotonModo: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    fontWeight: '600',
  },
  textoBotonModoActivo: {
    color: COLORES.TEXTO_OSCURO,
    fontWeight: 'bold',
  },
  campoContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  campoLabel: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: COLORES.AZUL_CIELO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputCodigo: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORES.VERDE,
    color: COLORES.TEXTO_OSCURO,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputCodigoGrande: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORES.NARANJA,
    color: COLORES.TEXTO_OSCURO,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginVertical: 10,
  },
  inputPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    overflow: 'hidden',
    shadowColor: COLORES.AZUL_CIELO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputPassword: {
    flex: 1,
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: COLORES.ERROR,
    borderWidth: 2,
  },
  botonOjo: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoOjo: {
    fontSize: 20,
    color: COLORES.GRIS_OSCURO,
  },
  textoError: {
    color: COLORES.ERROR,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 5,
  },
  textoAyuda: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 5,
  },
  botonInfoCodigo: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 5,
  },
  textoBotonInfoCodigo: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  botonPrincipal: {
    backgroundColor: COLORES.AMARILLO_PLATANO,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.AMARILLO_OSCURO,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: COLORES.AMARILLO_OSCURO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  botonDeshabilitado: {
    backgroundColor: COLORES.GRIS_MEDIO,
    borderColor: COLORES.GRIS_OSCURO,
    shadowOpacity: 0.1,
  },
  textoBotonPrincipal: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 18,
    fontWeight: 'bold',
  },
  contenedorEnlaces: {
    alignItems: 'center',
    marginBottom: 25,
  },
  enlace: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  separadorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  separadorLinea: {
    flex: 1,
    height: 1,
    backgroundColor: COLORES.GRIS_MEDIO,
  },
  separadorTexto: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 13,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  botonGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.BLANCO,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
    marginBottom: 8,
    shadowColor: COLORES.GRIS_OSCURO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconoGoogle: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  textoBotonGoogle: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.GRIS_MEDIO,
  },
  textoFooter: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 12,
  },
  version: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 10,
    marginTop: 5,
    fontStyle: 'italic',
  },
  // Estilos del Modal
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContenido: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalEjemploContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalEjemploLabel: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    marginBottom: 8,
  },
  codigoEjemploContainer: {
    backgroundColor: COLORES.NARANJA,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: COLORES.TEXTO_OSCURO,
  },
  codigoEjemplo: {
    color: COLORES.BLANCO,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  modalTexto: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  textoDestacado: {
    color: COLORES.NARANJA,
    fontWeight: 'bold',
  },
  modalLista: {
    marginLeft: 5,
    marginBottom: 20,
  },
  modalSubtitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  modalItem: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 5,
    marginLeft: 10,
  },
  modalNota: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 15,
  },
  botonModalCerrar: {
    backgroundColor: COLORES.NARANJA,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotonModalCerrar: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: 'bold',
  },
});