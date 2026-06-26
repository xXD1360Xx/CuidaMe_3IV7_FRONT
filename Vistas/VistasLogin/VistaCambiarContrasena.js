import React, { useState } from 'react';
import {
  TextInput,
  Alert,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
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
  ROJO_CLARO: '#EF5350'
};

export default function VistaCambiarContrasena({ navigation, route }) {
  const { usuarioId, codigoId, tipoRecuperacion } = route.params || {};
  const esRecuperacion = tipoRecuperacion === 'recuperar' && usuarioId && codigoId;

  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasenaActual, setMostrarContrasenaActual] = useState(false);
  const [mostrarNuevaContrasena, setMostrarNuevaContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  const limpiarContrasenas = () => {
    setContrasenaActual('');
    setNuevaContrasena('');
    setConfirmarContrasena('');
  };

  const validarFortalezaContrasena = (contrasena) => {
    const validaciones = [
      { test: contrasena.length >= 6, texto: 'Mínimo 6 caracteres', esencial: true },
      { test: /\d/.test(contrasena), texto: 'Al menos un número', esencial: true },
      { test: /[A-Z]/.test(contrasena), texto: 'Al menos una mayúscula', esencial: false },
      { test: /[a-z]/.test(contrasena), texto: 'Al menos una minúscula', esencial: false },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(contrasena), texto: 'Al menos un carácter especial', esencial: false },
    ];
    return validaciones.map(v => ({
      ...v,
      color: v.test ? COLORES.EXITO : COLORES.ERROR,
      icono: v.test ? '✓' : '✗'
    }));
  };

  const cambiarContrasena = async () => {
    if (!esRecuperacion && !contrasenaActual) {
      Alert.alert('Contraseña actual requerida', 'Ingresa tu contraseña actual');
      return;
    }
    if (!nuevaContrasena || !confirmarContrasena) {
      Alert.alert('Campos incompletos', 'Completa todos los campos');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      Alert.alert('Contraseñas no coinciden', 'Las contraseñas no coinciden');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      return;
    }
    if (!esRecuperacion && contrasenaActual === nuevaContrasena) {
      Alert.alert('Misma contraseña', 'La nueva debe ser diferente');
      return;
    }

    const validaciones = validarFortalezaContrasena(nuevaContrasena);
    const esenciales = validaciones.filter(v => v.esencial);
    const esencialesCumplidas = esenciales.filter(v => v.test).length;
    if (esencialesCumplidas < esenciales.length) {
      Alert.alert('Contraseña no válida', 'Debe tener al menos 6 caracteres y un número');
      return;
    }

    setCargando(true);
    try {
      let respuesta;
      if (esRecuperacion) {
        respuesta = await servicioAPI.restablecerContrasena(usuarioId, codigoId, nuevaContrasena);
      } else {
        const usuarioData = await AsyncStorage.getItem('usuarioInfo');
        const usuario = usuarioData ? JSON.parse(usuarioData) : null;
        if (!usuario || !usuario.id) {
          Alert.alert('Error', 'No se pudo identificar al usuario');
          setCargando(false);
          return;
        }
        respuesta = await servicioAPI.cambiarContrasena(usuario.id, contrasenaActual, nuevaContrasena);
      }

      if (respuesta.exito) {
        Alert.alert('✅ Contraseña actualizada', 'Tu contraseña ha sido cambiada.', [
          {
            text: 'Continuar',
            onPress: () => {
              limpiarContrasenas();
              if (esRecuperacion) navigation.replace('Login');
              else navigation.goBack();
            }
          }
        ]);
      } else {
        Alert.alert('Error', respuesta.error || 'No se pudo cambiar la contraseña');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const regresar = () => {
    if (contrasenaActual || nuevaContrasena || confirmarContrasena) {
      Alert.alert('¿Descartar cambios?', 'Tienes cambios sin guardar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Regresar', style: 'destructive', onPress: () => navigation.goBack() }
      ]);
    } else {
      navigation.goBack();
    }
  };

  const fortalezaContrasena = validarFortalezaContrasena(nuevaContrasena);
  const porcentajeFortaleza = fortalezaContrasena.filter(v => v.test).length * 20;
  const obtenerColorFortaleza = () => {
    if (porcentajeFortaleza < 40) return COLORES.ERROR;
    if (porcentajeFortaleza < 80) return COLORES.AMARILLO_PLATANO;
    return COLORES.EXITO;
  };
  const obtenerTextoFortaleza = () => {
    if (porcentajeFortaleza < 40) return 'Débil';
    if (porcentajeFortaleza < 80) return 'Media';
    return 'Fuerte';
  };

  return (
    <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
      <SafeAreaView style={styles.contenedorPrincipal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Encabezado */}
            <View style={styles.encabezado}>
              <TouchableOpacity style={styles.botonAtras} onPress={regresar} disabled={cargando}>
                <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
              </TouchableOpacity>
              <View style={styles.tituloContainer}>
                <View style={[styles.iconoTitulo, { backgroundColor: COLORES.ROJO_CLARO + '20' }]}>
                  <Icon name="key-outline" size={32} color={COLORES.ROJO_CLARO} />
                </View>
                <Text style={styles.titulo}>{esRecuperacion ? 'Restablecer contraseña' : 'Cambiar contraseña'}</Text>
                <Text style={styles.subtitulo}>
                  {esRecuperacion
                    ? 'Crea una nueva contraseña segura'
                    : 'Actualiza tu contraseña regularmente'}
                </Text>
              </View>
            </View>

            {/* Formulario */}
            <View style={styles.formularioContainer}>
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
                    <TouchableOpacity style={styles.botonOjo} onPress={() => setMostrarContrasenaActual(!mostrarContrasenaActual)} disabled={cargando}>
                      <Icon name={mostrarContrasenaActual ? "eye-off-outline" : "eye-outline"} size={20} color={COLORES.GRIS_OSCURO} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

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
                  <TouchableOpacity style={styles.botonOjo} onPress={() => setMostrarNuevaContrasena(!mostrarNuevaContrasena)} disabled={cargando}>
                    <Icon name={mostrarNuevaContrasena ? "eye-off-outline" : "eye-outline"} size={20} color={COLORES.GRIS_OSCURO} />
                  </TouchableOpacity>
                </View>
                {nuevaContrasena.length > 0 && (
                  <View style={styles.fortalezaContainer}>
                    <View style={styles.barraFortaleza}>
                      <View style={[styles.barraFortalezaFill, { width: `${porcentajeFortaleza}%`, backgroundColor: obtenerColorFortaleza() }]} />
                    </View>
                    <Text style={[styles.textoFortaleza, { color: obtenerColorFortaleza() }]}>{obtenerTextoFortaleza()}</Text>
                  </View>
                )}
              </View>

              <View style={styles.campoContainer}>
                <View style={styles.campoLabelContainer}>
                  <Icon name="lock-closed-outline" size={18} color={COLORES.GRIS_OSCURO} />
                  <Text style={styles.campoLabel}>CONFIRMAR CONTRASEÑA</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, confirmarContrasena && nuevaContrasena !== confirmarContrasena && styles.inputError]}
                    placeholder="Confirma tu nueva contraseña"
                    placeholderTextColor={COLORES.GRIS_MEDIO}
                    value={confirmarContrasena}
                    onChangeText={setConfirmarContrasena}
                    secureTextEntry={!mostrarConfirmarContrasena}
                    editable={!cargando}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.botonOjo} onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)} disabled={cargando}>
                    <Icon name={mostrarConfirmarContrasena ? "eye-off-outline" : "eye-outline"} size={20} color={COLORES.GRIS_OSCURO} />
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
                <Text style={styles.criteriosTitulo}>CRITERIOS DE SEGURIDAD</Text>
                <View style={styles.criteriosEsencialesContainer}>
                  <Text style={styles.criteriosSubtitulo}>Esenciales:</Text>
                  {fortalezaContrasena.filter(v => v.esencial).map((c, i) => (
                    <Text key={`es-${i}`} style={[styles.criterioTexto, { color: c.color }]}>
                      {c.icono} {c.texto}
                    </Text>
                  ))}
                </View>
                <View style={styles.criteriosOpcionalesContainer}>
                  <Text style={styles.criteriosSubtitulo}>Recomendados:</Text>
                  {fortalezaContrasena.filter(v => !v.esencial).map((c, i) => (
                    <Text key={`op-${i}`} style={[styles.criterioTexto, { color: c.color }]}>
                      {c.icono} {c.texto}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Botones */}
              <View style={styles.contenedorBotones}>
                <TouchableOpacity onPress={regresar} style={styles.botonSecundario} disabled={cargando}>
                  <Text style={styles.textoBotonSecundario}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={cambiarContrasena}
                  style={[
                    styles.botonPrincipal,
                    (cargando || !nuevaContrasena || !confirmarContrasena || (!esRecuperacion && !contrasenaActual)) && styles.botonDeshabilitado
                  ]}
                  disabled={cargando || !nuevaContrasena || !confirmarContrasena || (!esRecuperacion && !contrasenaActual)}
                >
                  {cargando ? <ActivityIndicator size="small" color={COLORES.BLANCO} /> : <Text style={styles.textoBotonPrincipal}>{esRecuperacion ? 'Restablecer' : 'Cambiar'}</Text>}
                </TouchableOpacity>
              </View>
            </View>
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
  encabezado: { marginBottom: 30 },
  botonAtras: { alignSelf: 'flex-start', padding: 8, marginBottom: 15 },
  tituloContainer: { alignItems: 'center' },
  iconoTitulo: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 2, borderColor: COLORES.GRIS_CLARO },
  titulo: { fontSize: 24, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center', marginBottom: 8 },
  subtitulo: { fontSize: 14, color: COLORES.GRIS_OSCURO, textAlign: 'center', lineHeight: 20 },
  formularioContainer: { backgroundColor: COLORES.BLANCO, borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  campoContainer: { marginBottom: 25 },
  campoLabelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  campoLabel: { color: COLORES.GRIS_OSCURO, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, overflow: 'hidden' },
  input: { flex: 1, color: COLORES.TEXTO_OSCURO, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14 },
  inputError: { borderColor: COLORES.ERROR },
  botonOjo: { paddingHorizontal: 16, paddingVertical: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  textoError: { color: COLORES.ERROR, fontSize: 12 },
  fortalezaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  barraFortaleza: { flex: 1, height: 6, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 3, overflow: 'hidden' },
  barraFortalezaFill: { height: '100%', borderRadius: 3 },
  textoFortaleza: { fontSize: 12, fontWeight: '600' },
  criteriosContainer: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 15, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
  criteriosTitulo: { color: COLORES.TEXTO_OSCURO, fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  criteriosSubtitulo: { color: COLORES.TEXTO_OSCURO, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  criteriosEsencialesContainer: { marginBottom: 15 },
  criteriosOpcionalesContainer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORES.GRIS_MEDIO },
  criterioTexto: { fontSize: 12, marginBottom: 6, lineHeight: 16 },
  contenedorBotones: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginBottom: 30 },
  botonSecundario: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: COLORES.GRIS_CLARO, alignItems: 'center', borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, height: 52 },
  textoBotonSecundario: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 16, fontWeight: '600' },
  botonPrincipal: { flex: 1, backgroundColor: COLORES.AZUL_CIELO_OSCURO, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORES.AZUL_CIELO, height: 52 },
  botonDeshabilitado: { backgroundColor: COLORES.GRIS_MEDIO, borderColor: COLORES.GRIS_OSCURO },
  textoBotonPrincipal: { color: COLORES.BLANCO, fontSize: 16, fontWeight: 'bold' },
});