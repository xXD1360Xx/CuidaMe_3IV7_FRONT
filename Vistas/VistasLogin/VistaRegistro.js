import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { servicioAPI } from '../../servicios/api';
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
  VERDE: '#4CAF50',
  NARANJA: '#FF9800',
  ERROR: '#FF5252',
  EXITO: '#4CAF50'
};

export default function VistaRegistro() {
  const auth = useAuth();

  const navigation = useNavigation();
  const route = useRoute();
  const { tipoPerfil } = route.params || { tipoPerfil: 'familiar' };

  // Estados comunes
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState({});
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  // Estados para profesional
  const [nombreProfesional, setNombreProfesional] = useState('');
  const [correoProfesional, setCorreoProfesional] = useState('');
  const [contrasenaProfesional, setContrasenaProfesional] = useState('');
  const [confirmarContrasenaProfesional, setConfirmarContrasenaProfesional] = useState('');
  const [celularProfesional, setCelularProfesional] = useState('');
  const [codigoFamiliarProfesional, setCodigoFamiliarProfesional] = useState('');

  // Estados para familiar
  const [nombreFamiliar, setNombreFamiliar] = useState('');
  const [correoFamiliar, setCorreoFamiliar] = useState('');
  const [contrasenaFamiliar, setContrasenaFamiliar] = useState('');
  const [confirmarContrasenaFamiliar, setConfirmarContrasenaFamiliar] = useState('');
  const [tieneCodigoPersonalizado, setTieneCodigoPersonalizado] = useState(false);
  const [codigoFamiliarPersonalizado, setCodigoFamiliarPersonalizado] = useState('');

  // Estados para adulto mayor
  const [codigoFamiliarAnciano, setCodigoFamiliarAnciano] = useState('');

  // Configurar título de la página para web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let titulo = 'CuidaMe | Registro';
      switch (tipoPerfil) {
        case 'adultoMayor': titulo += ' Adulto Mayor'; break;
        case 'familiar': titulo += ' Familiar'; break;
        case 'profesional': titulo += ' Profesional'; break;
      }
      document.title = titulo;
    }
  }, [tipoPerfil]);

  // Función para formatear código familiar
  const formatearCodigo = (text) => {
    let limpio = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (limpio.length > 6) limpio = limpio.substring(0, 6);

    let formateado = '';
    for (let i = 0; i < limpio.length; i++) {
      if (i === 3) formateado += '-';
      formateado += limpio[i];
    }

    return formateado;
  };

  // Validaciones específicas
  const validarCorreo = (correo) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
  };

  const validarContrasena = (contrasena) => {
    return contrasena.length >= 6 && /\d/.test(contrasena);
  };

  const validarNombre = (nombre) => {
    return nombre.trim().length >= 2;
  };

  const validarCodigoFamiliar = (codigo) => {
    const codigoLimpio = codigo.replace(/-/g, '');
    return codigoLimpio.length === 6;
  };

  // Validar formulario según tipo de perfil
  const validarFormulario = () => {
    const nuevosErrores = {};

    switch (tipoPerfil) {
      case 'profesional':
        if (!validarNombre(nombreProfesional)) {
          nuevosErrores.nombre = 'Nombre debe tener al menos 2 caracteres';
        }
        if (!validarCorreo(correoProfesional)) {
          nuevosErrores.correo = 'Correo electrónico inválido';
        }
        if (!validarContrasena(contrasenaProfesional)) {
          nuevosErrores.contrasena = 'Mínimo 6 caracteres con al menos un número';
        }
        if (contrasenaProfesional !== confirmarContrasenaProfesional) {
          nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden';
        }
        if (codigoFamiliarProfesional && !validarCodigoFamiliar(codigoFamiliarProfesional)) {
          nuevosErrores.codigoFamiliar = 'Código debe tener 6 caracteres (ej: ABC-123)';
        }
        break;

      case 'familiar':
        if (!tieneCodigoPersonalizado) {
          if (!validarNombre(nombreFamiliar)) {
            nuevosErrores.nombre = 'Nombre debe tener al menos 2 caracteres';
          }
          if (!validarCorreo(correoFamiliar)) {
            nuevosErrores.correo = 'Correo electrónico inválido';
          }
          if (!validarContrasena(contrasenaFamiliar)) {
            nuevosErrores.contrasena = 'Mínimo 6 caracteres con al menos un número';
          }
          if (contrasenaFamiliar !== confirmarContrasenaFamiliar) {
            nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden';
          }
        } else {
          if (!validarCodigoFamiliar(codigoFamiliarPersonalizado)) {
            nuevosErrores.codigoPersonalizado = 'Código debe tener 6 caracteres (ej: ABC-123)';
          }
        }
        break;

      case 'adultoMayor':
        if (!validarCodigoFamiliar(codigoFamiliarAnciano)) {
          nuevosErrores.codigoAnciano = 'Código debe tener 6 caracteres (ej: ABC-123)';
        }

    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // Manejar registro
  const manejarRegistro = async () => {
    // Validación del formulario
    if (!validarFormulario()) {
      Alert.alert('Error', 'Por favor corrige los errores en el formulario');
      return;
    }

    setCargando(true);

    try {
      let respuesta;
      let endpoint = '/registro';
      let datosRegistro = {};

      switch (tipoPerfil) {
        case 'profesional':
          datosRegistro = {
            nombre: nombreProfesional.trim(),
            email: correoProfesional.trim().toLowerCase(),
            password: contrasenaProfesional,
            rol: 'profesional',
            telefono: celularProfesional.trim() || null,
            codigo_familiar: codigoFamiliarProfesional.replace(/-/g, '') || null
          };
          break;

        case 'familiar':
          if (tieneCodigoPersonalizado) {
            const codigoLimpio = codigoFamiliarPersonalizado.replace(/-/g, '');
            respuesta = await servicioAPI.iniciarSesionConCodigoPersonalizado(codigoLimpio);
            if (respuesta.exito && respuesta.token) {
              await auth.iniciarSesion(respuesta.token, respuesta.usuario, respuesta.usuario.rol || 'familiar');
              navigation.replace('CrearAnciano', {
                usuarioId: respuesta.usuario.id,
                codigoFamiliar: codigoLimpio
              });
            } else {
              Alert.alert('Error', respuesta.error || 'Código inválido');
            }
            setCargando(false);
            return;
          } else {
            datosRegistro = {
              nombre: nombreFamiliar.trim(),
              email: correoFamiliar.trim().toLowerCase(),
              password: contrasenaFamiliar,
              rol: 'familiar_principal',
              parentesco: 'familiar'
            };
          }
          break;

        case 'adultoMayor':
          const codigoLimpioAnciano = codigoFamiliarAnciano.replace(/-/g, '');
          respuesta = await servicioAPI.iniciarSesionConCodigoPersonalizado(codigoLimpioAnciano);
          if (respuesta.exito && respuesta.token) {
            await auth.iniciarSesion(respuesta.token, respuesta.usuario, 'adulto_mayor');
            navigation.replace('PrincipalAnciano');
          } else {
            Alert.alert('Error', respuesta.error || 'Código inválido');
          }
          setCargando(false);
          return;
      }

      console.log('📤 Datos enviados al registro:', JSON.stringify(datosRegistro, null, 2));
      respuesta = await servicioAPI.registrarUsuario(datosRegistro, endpoint);
      console.log('📥 Respuesta del backend:', JSON.stringify(respuesta, null, 2));

      if (respuesta.exito && respuesta.token) {
        await auth.iniciarSesion(respuesta.token, respuesta.usuario, respuesta.usuario.rol || 'familiar');

        // Verificar que el correo existe antes de navegar
        const correoParaVerificar = datosRegistro.email;
        if (!correoParaVerificar) {
          Alert.alert('Error', 'No se pudo obtener el correo para verificación');
          setCargando(false);
          return;
        }

        navigation.replace('VerificarCorreo', {
          correo: correoParaVerificar,
          modo: 'verificacion',
          tipo: 'crear_cuenta',
          usuarioId: respuesta.usuario.id,
          redirigirA: 'CrearAnciano',
          datosAnciano: {
            usuarioId: respuesta.usuario.id,
            codigoFamiliar: codigoFamiliarPersonalizado || null
          }
        });
      } else {
        // Mostrar el error exacto del backend
        const mensajeError = respuesta.error || 'Error desconocido en el registro';
        Alert.alert('❌ Error al registrar', mensajeError, [
          { text: 'Entendido', style: 'default' }
        ]);
      }

    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert('❌ Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } finally {
      setCargando(false);
    }
  };

  // Volver a selección de perfil
  const volverASeleccion = () => {
    navigation.goBack();
  };

  // Obtener información del tipo de perfil
  const getInfoPerfil = () => {
    switch (tipoPerfil) {
      case 'adultoMayor':
        return {
          titulo: 'Registro de Adulto Mayor',
          subtitulo: 'Ingresa el código familiar proporcionado por tu familiar administrador',
          colorGradient: [COLORES.AZUL_CIELO_OSCURO, COLORES.AZUL_CIELO],
          version: 'Versión Adulto Mayor'
        };
      case 'familiar':
        return {
          titulo: 'Registro de Familiar',
          subtitulo: 'Crea tu cuenta para acompañar el cuidado de tu ser querido',
          colorGradient: [COLORES.VERDE, '#A5D6A7'],
          version: 'Versión Familiar'
        };
      case 'profesional':
        return {
          titulo: 'Registro de Profesional',
          subtitulo: 'Únete como profesional de la salud o cuidador',
          colorGradient: [COLORES.NARANJA, '#FFCC80'],
          version: 'Versión Profesional'
        };
      default:
        return {
          titulo: 'Registro',
          subtitulo: 'Crea tu cuenta en CuidaMe',
          colorGradient: [COLORES.AZUL_CIELO, COLORES.BLANCO],
          version: 'Versión General'
        };
    }
  };

  const infoPerfil = getInfoPerfil();

  // Renderizar formulario según tipo de perfil
  const renderFormulario = () => {
    switch (tipoPerfil) {
      case 'profesional':
        return (
          <>
            {/* Nombre */}
            <View style={styles.campoContainer}>
              <Text style={styles.campoLabel}>NOMBRE COMPLETO *</Text>
              <TextInput
                style={[styles.input, errores.nombre && styles.inputError]}
                placeholder="Ej: María González"
                placeholderTextColor={COLORES.GRIS_OSCURO}
                value={nombreProfesional}
                onChangeText={(text) => {
                  setNombreProfesional(text);
                  setErrores({ ...errores, nombre: '' });
                }}
                editable={!cargando}
              />
              {errores.nombre && <Text style={styles.textoError}>❌ {errores.nombre}</Text>}
            </View>

            {/* Correo */}
            <View style={styles.campoContainer}>
              <Text style={styles.campoLabel}>CORREO ELECTRÓNICO *</Text>
              <TextInput
                style={[styles.input, errores.correo && styles.inputError]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={COLORES.GRIS_OSCURO}
                value={correoProfesional}
                onChangeText={(text) => {
                  setCorreoProfesional(text);
                  setErrores({ ...errores, correo: '' });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!cargando}
              />
              {errores.correo && <Text style={styles.textoError}>❌ {errores.correo}</Text>}
            </View>

            {/* Contraseña */}
            <View style={styles.campoContainer}>
              <Text style={styles.campoLabel}>CONTRASEÑA *</Text>
              <View style={styles.inputPasswordContainer}>
                <TextInput
                  style={[styles.inputPassword, errores.contrasena && styles.inputError]}
                  placeholder="Mínimo 6 caracteres con un número"
                  placeholderTextColor={COLORES.GRIS_OSCURO}
                  value={contrasenaProfesional}
                  onChangeText={(text) => {
                    setContrasenaProfesional(text);
                    setErrores({ ...errores, contrasena: '' });
                  }}
                  secureTextEntry={!mostrarContrasena}
                  editable={!cargando}
                />
                <TouchableOpacity
                  style={styles.botonOjo}
                  onPress={() => setMostrarContrasena(!mostrarContrasena)}
                >
                  <Text style={styles.textoOjo}>{mostrarContrasena ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errores.contrasena && <Text style={styles.textoError}>❌ {errores.contrasena}</Text>}
            </View>

            {/* Confirmar Contraseña */}
            <View style={styles.campoContainer}>
              <Text style={styles.campoLabel}>CONFIRMAR CONTRASEÑA *</Text>
              <View style={styles.inputPasswordContainer}>
                <TextInput
                  style={[styles.inputPassword, errores.confirmarContrasena && styles.inputError]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={COLORES.GRIS_OSCURO}
                  value={confirmarContrasenaProfesional}
                  onChangeText={(text) => {
                    setConfirmarContrasenaProfesional(text);
                    setErrores({ ...errores, confirmarContrasena: '' });
                  }}
                  secureTextEntry={!mostrarConfirmarContrasena}
                  editable={!cargando}
                />
                <TouchableOpacity
                  style={styles.botonOjo}
                  onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
                >
                  <Text style={styles.textoOjo}>{mostrarConfirmarContrasena ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errores.confirmarContrasena && (
                <Text style={styles.textoError}>❌ {errores.confirmarContrasena}</Text>
              )}
            </View>

            {/* Celular */}
            <View style={styles.campoContainer}>
              <Text style={styles.campoLabel}>NÚMERO DE CELULAR (OPCIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 3001234567"
                placeholderTextColor={COLORES.GRIS_OSCURO}
                value={celularProfesional}
                onChangeText={setCelularProfesional}
                keyboardType="phone-pad"
                editable={!cargando}
              />
            </View>

            {/* Código Familiar */}
            <View style={styles.campoContainer}>
              <Text style={styles.campoLabel}>CÓDIGO FAMILIAR (OPCIONAL)</Text>
              <TextInput
                style={[styles.input, errores.codigoFamiliar && styles.inputError]}
                placeholder="ABC-123"
                placeholderTextColor={COLORES.GRIS_OSCURO}
                value={codigoFamiliarProfesional}
                onChangeText={(text) => {
                  const formateado = formatearCodigo(text);
                  setCodigoFamiliarProfesional(formateado);
                  setErrores({ ...errores, codigoFamiliar: '' });
                }}
                maxLength={7}
                editable={!cargando}
              />
              {errores.codigoFamiliar ? (
                <Text style={styles.textoError}>❌ {errores.codigoFamiliar}</Text>
              ) : (
                <Text style={styles.textoAyuda}>
                  🔗 Ingresa si ya tienes un código familiar para asociarte
                </Text>
              )}
            </View>
          </>
        );

      case 'familiar':
        return (
          <>
            {/* Switch para código personalizado */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>¿Tienes un código familiar personalizado?</Text>
              <Switch
                value={tieneCodigoPersonalizado}
                onValueChange={(valor) => {
                  setTieneCodigoPersonalizado(valor);
                  setErrores({});
                }}
                trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.VERDE }}
                thumbColor={COLORES.BLANCO}
                disabled={cargando}
              />
            </View>

            {tieneCodigoPersonalizado ? (
              /* Formulario solo con código */
              <View style={styles.campoContainer}>
                <Text style={styles.campoLabel}>CÓDIGO FAMILIAR PERSONALIZADO *</Text>
                <TextInput
                  style={[styles.inputCodigo, errores.codigoPersonalizado && styles.inputError]}
                  placeholder="ABC-123"
                  placeholderTextColor={COLORES.GRIS_OSCURO}
                  value={codigoFamiliarPersonalizado}
                  onChangeText={(text) => {
                    const formateado = formatearCodigo(text);
                    setCodigoFamiliarPersonalizado(formateado);
                    setErrores({ ...errores, codigoPersonalizado: '' });
                  }}
                  maxLength={7}
                  editable={!cargando}
                />
                {errores.codigoPersonalizado ? (
                  <Text style={styles.textoError}>❌ {errores.codigoPersonalizado}</Text>
                ) : (
                  <Text style={styles.textoAyuda}>
                    🔑 Pide el código al familiar administrador del adulto mayor
                  </Text>
                )}
              </View>
            ) : (
              /* Formulario completo para familiar */
              <>
                {/* Nombre */}
                <View style={styles.campoContainer}>
                  <Text style={styles.campoLabel}>NOMBRE COMPLETO *</Text>
                  <TextInput
                    style={[styles.input, errores.nombre && styles.inputError]}
                    placeholder="Ej: Carlos Rodríguez"
                    placeholderTextColor={COLORES.GRIS_OSCURO}
                    value={nombreFamiliar}
                    onChangeText={(text) => {
                      setNombreFamiliar(text);
                      setErrores({ ...errores, nombre: '' });
                    }}
                    editable={!cargando}
                  />
                  {errores.nombre && <Text style={styles.textoError}>❌ {errores.nombre}</Text>}
                </View>

                {/* Correo */}
                <View style={styles.campoContainer}>
                  <Text style={styles.campoLabel}>CORREO ELECTRÓNICO *</Text>
                  <TextInput
                    style={[styles.input, errores.correo && styles.inputError]}
                    placeholder="ejemplo@correo.com"
                    placeholderTextColor={COLORES.GRIS_OSCURO}
                    value={correoFamiliar}
                    onChangeText={(text) => {
                      setCorreoFamiliar(text);
                      setErrores({ ...errores, correo: '' });
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!cargando}
                  />
                  {errores.correo && <Text style={styles.textoError}>❌ {errores.correo}</Text>}
                </View>

                {/* Contraseña */}
                <View style={styles.campoContainer}>
                  <Text style={styles.campoLabel}>CONTRASEÑA *</Text>
                  <View style={styles.inputPasswordContainer}>
                    <TextInput
                      style={[styles.inputPassword, errores.contrasena && styles.inputError]}
                      placeholder="Mínimo 6 caracteres con un número"
                      placeholderTextColor={COLORES.GRIS_OSCURO}
                      value={contrasenaFamiliar}
                      onChangeText={(text) => {
                        setContrasenaFamiliar(text);
                        setErrores({ ...errores, contrasena: '' });
                      }}
                      secureTextEntry={!mostrarContrasena}
                      editable={!cargando}
                    />
                    <TouchableOpacity
                      style={styles.botonOjo}
                      onPress={() => setMostrarContrasena(!mostrarContrasena)}
                    >
                      <Text style={styles.textoOjo}>{mostrarContrasena ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  {errores.contrasena && <Text style={styles.textoError}>❌ {errores.contrasena}</Text>}
                </View>

                {/* Confirmar Contraseña */}
                <View style={styles.campoContainer}>
                  <Text style={styles.campoLabel}>CONFIRMAR CONTRASEÑA *</Text>
                  <View style={styles.inputPasswordContainer}>
                    <TextInput
                      style={[styles.inputPassword, errores.confirmarContrasena && styles.inputError]}
                      placeholder="Repite tu contraseña"
                      placeholderTextColor={COLORES.GRIS_OSCURO}
                      value={confirmarContrasenaFamiliar}
                      onChangeText={(text) => {
                        setConfirmarContrasenaFamiliar(text);
                        setErrores({ ...errores, confirmarContrasena: '' });
                      }}
                      secureTextEntry={!mostrarConfirmarContrasena}
                      editable={!cargando}
                    />
                    <TouchableOpacity
                      style={styles.botonOjo}
                      onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
                    >
                      <Text style={styles.textoOjo}>{mostrarConfirmarContrasena ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                  {errores.confirmarContrasena && (
                    <Text style={styles.textoError}>❌ {errores.confirmarContrasena}</Text>
                  )}
                </View>
              </>
            )}
          </>
        );

      case 'adultoMayor':
        return (
          <View style={styles.campoContainer}>
            <Text style={styles.campoLabel}>CÓDIGO FAMILIAR PERSONALIZADO *</Text>
            <TextInput
              style={[styles.inputCodigoGrande, errores.codigoAnciano && styles.inputError]}
              placeholder="ABC-123"
              placeholderTextColor={COLORES.GRIS_OSCURO}
              value={codigoFamiliarAnciano}
              onChangeText={(text) => {
                const formateado = formatearCodigo(text);
                setCodigoFamiliarAnciano(formateado);
                setErrores({ ...errores, codigoAnciano: '' });
              }}
              maxLength={7}
              editable={!cargando}
            />
            {errores.codigoAnciano ? (
              <Text style={styles.textoError}>❌ {errores.codigoAnciano}</Text>
            ) : (
              <>
                <Text style={styles.textoAyuda}>
                  🔑 Pide el código personalizado al familiar administrador que creó tu cuenta
                </Text>
                <Text style={styles.textoInfo}>
                  Con este código podrás acceder a tu perfil y recibir seguimiento de salud
                </Text>
              </>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={infoPerfil.colorGradient} style={styles.fondo}>
      <SafeAreaView style={styles.contenedorPrincipal}>
        <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoidingView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Encabezado */}
            <View style={styles.encabezado}>
              <TouchableOpacity style={styles.botonVolver} onPress={volverASeleccion}>
                <Text style={styles.textoBotonVolver}>← Volver</Text>
              </TouchableOpacity>

              <View style={styles.logoContainer}>
                <Text style={styles.titulo}>{infoPerfil.titulo}</Text>
                <Text style={styles.subtitulo}>{infoPerfil.subtitulo}</Text>
              </View>
            </View>

            {/* Formulario */}
            <View style={styles.formularioContainer}>
              {renderFormulario()}

              {/* Botón de registro */}
              <TouchableOpacity
                style={[styles.botonRegistro, cargando && styles.botonDeshabilitado]}
                onPress={manejarRegistro}
                disabled={cargando}
              >
                {cargando ? (
                  <ActivityIndicator size="small" color={COLORES.BLANCO} />
                ) : (
                  <Text style={styles.textoBotonRegistro}>
                    {tieneCodigoPersonalizado || tipoPerfil === 'adultoMayor'
                      ? 'Acceder con código'
                      : 'Crear cuenta'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Enlace a login */}
              <TouchableOpacity
                style={styles.botonLogin}
                onPress={() => navigation.navigate('VistaPrincipal')}
                disabled={cargando}
              >
                <Text style={styles.textoBotonLogin}>
                  ¿Ya tienes cuenta? <Text style={styles.textoLoginDestacado}>Inicia sesión</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.textoFooter}>© 2025 CuidaMe - Cuidado de Adultos Mayores</Text>
              <Text style={styles.version}>{infoPerfil.version}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

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
  encabezado: {
    marginBottom: 30,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textoBotonVolver: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 14,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
  },
  titulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
  },
  formularioContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    padding: 15,
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 12,
  },
  switchLabel: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 15,
  },
  campoContainer: {
    marginBottom: 20,
  },
  campoLabel: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderColor: COLORES.AZUL_CIELO,
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
    color: COLORES.GRIS_OSCURO,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 5,
    fontStyle: 'italic',
  },
  textoInfo: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  botonRegistro: {
    backgroundColor: COLORES.TEXTO_OSCURO,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  botonDeshabilitado: {
    backgroundColor: COLORES.GRIS_OSCURO,
    opacity: 0.7,
  },
  textoBotonRegistro: {
    color: COLORES.BLANCO,
    fontSize: 18,
    fontWeight: 'bold',
  },
  botonLogin: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  textoBotonLogin: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
  },
  textoLoginDestacado: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  textoFooter: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 12,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  version: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 10,
    marginTop: 5,
    fontStyle: 'italic',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});