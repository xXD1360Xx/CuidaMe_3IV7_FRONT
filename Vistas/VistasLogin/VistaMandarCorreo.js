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
    StyleSheet
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

export default function VistaMandarCorreo({ navigation, route }) {
    const { modo, correo: correoParam, tipo, usuarioId, redirigirA, datosAnciano } = route.params || {};
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const [cargando, setCargando] = useState(false);
    const [correo, setCorreo] = useState(correoParam || '');
    const [error, setError] = useState('');

    const contexto = tipo || modo || 'verificacion';
    const esRecuperacion = contexto === 'recuperar';

    useEffect(() => {
        if (correoParam) setCorreo(correoParam);
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
            const esRecuperacion = contexto === 'recuperar';

            // Validar correo
            if (!correo || correo.trim() === '') {
                Alert.alert('Error', 'El correo no puede estar vacío.');
                setCargando(false);
                return;
            }

            // Llamar al backend para generar y enviar el código
            const resultado = await servicioAPI.solicitarRecuperacion(correo);

            if (resultado.exito) {
                const codigoCorrecto = resultado.codigo_demo || Math.floor(1000 + Math.random() * 9000).toString();

                if (!resultado.usuario_id) {
                    Alert.alert('Error', 'No se pudo identificar al usuario.');
                    setCargando(false);
                    return;
                }

                Alert.alert(
                    '✅ Código Enviado',
                    `Se ha enviado un código de verificación a:\n\n📧 ${correo}`,
                    [{
                        text: 'Continuar',
                        onPress: () => {
                            const contextoFinal = esRecuperacion ? 'recuperar' : 'crear_cuenta';
                            const redirigirFinal = esRecuperacion ? 'CambiarContrasena' : (redirigirA || 'CrearAnciano');

                            navigation.navigate('VerificarCorreo', {
                                correo: correo,
                                codigo: codigoCorrecto,
                                contexto: contextoFinal,
                                usuarioId: resultado.usuario_id,
                                redirigirA: redirigirFinal,
                                datosAnciano: datosAnciano || {},
                                codigoId: null
                            });
                        }
                    }],
                    { cancelable: false }
                );
            } else {
                Alert.alert('Error', resultado.error || 'No se pudo enviar el código');
            }
        } catch (error) {
            console.error('Error enviando correo:', error);
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
                    { text: 'Regresar', style: 'destructive', onPress: () => navigation.goBack() }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    return (
        <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
            <SafeAreaView style={styles.contenedorPrincipal}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.encabezado}>
                            <TouchableOpacity style={styles.botonAtras} onPress={regresar} disabled={cargando}>
                                <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
                            </TouchableOpacity>
                            <View style={styles.tituloContainer}>
                                <View style={[styles.iconoTitulo, { backgroundColor: esRecuperacion ? COLORES.ROJO_CLARO + '20' : COLORES.EXITO + '20' }]}>
                                    <Icon name={esRecuperacion ? "key-outline" : "mail-outline"} size={32} color={esRecuperacion ? COLORES.ROJO_CLARO : COLORES.EXITO} />
                                </View>
                                <Text style={styles.titulo}>{esRecuperacion ? 'Recuperar Contraseña' : 'Verificar Correo'}</Text>
                                <Text style={styles.subtitulo}>{esRecuperacion ? 'Ingresa tu correo para restablecer tu contraseña' : 'Te enviaremos un código de verificación'}</Text>
                            </View>
                        </View>

                        <View style={styles.formularioContainer}>
                            <View style={styles.campoContainer}>
                                <Text style={styles.campoLabel}>CORREO ELECTRÓNICO</Text>
                                <TextInput
                                    style={[styles.input, error && styles.inputError]}
                                    placeholder="ejemplo@dominio.com"
                                    placeholderTextColor={COLORES.GRIS_MEDIO}
                                    value={correo}
                                    onChangeText={(text) => { setCorreo(text); setError(''); }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!cargando}
                                    returnKeyType="send"
                                    onSubmitEditing={enviarCorreo}
                                />
                                {error ? <Text style={styles.textoError}>❌ {error}</Text> : <Text style={styles.textoAyuda}>📧 Ingresa un correo válido al que tengas acceso</Text>}
                            </View>

                            <View style={styles.infoContainer}>
                                <Text style={styles.infoTitulo}>{esRecuperacion ? '🔐 Recuperación' : '🆕 Creación'}</Text>
                                <Text style={styles.infoTexto}>
                                    {esRecuperacion
                                        ? '• Recibirás un código de 4 dígitos\n• El código es válido por 15 minutos\n• Verifica tu bandeja de spam'
                                        : '• Recibirás un código de 4 dígitos\n• Después podrás completar tu registro\n• Asegúrate de usar un correo que controles'}
                                </Text>
                            </View>

                            <View style={styles.contenedorBotones}>
                                <TouchableOpacity onPress={regresar} style={styles.botonSecundario} disabled={cargando}>
                                    <Text style={styles.textoBotonSecundario}>Regresar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={enviarCorreo} style={[styles.botonPrincipal, (cargando || !correo.trim()) && styles.botonDeshabilitado]} disabled={cargando || !correo.trim()}>
                                    {cargando ? <ActivityIndicator size="small" color={COLORES.BLANCO} /> : <Text style={styles.textoBotonPrincipal}>Enviar código</Text>}
                                </TouchableOpacity>
                            </View>

                            {__DEV__ && (
                                <View style={styles.debugContainer}>
                                    <Text style={styles.debugTitulo}>🐛 MODO DESARROLLO</Text>
                                    <Text style={styles.debugTexto}>• El código se mostrará en la siguiente pantalla</Text>
                                    <Text style={styles.debugTexto}>• Modo: {esRecuperacion ? 'Recuperar' : 'Crear cuenta'}</Text>
                                </View>
                            )}
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
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, justifyContent: 'center' },
    encabezado: { alignItems: 'center', marginBottom: 40 },
    botonAtras: { alignSelf: 'flex-start', padding: 8, marginBottom: 15 },
    tituloContainer: { alignItems: 'center' },
    iconoTitulo: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: COLORES.GRIS_CLARO },
    titulo: { fontSize: 24, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center', marginBottom: 8 },
    subtitulo: { fontSize: 16, color: COLORES.GRIS_OSCURO, textAlign: 'center' },
    formularioContainer: { backgroundColor: COLORES.BLANCO, borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    campoContainer: { marginBottom: 30 },
    campoLabel: { color: COLORES.GRIS_OSCURO, fontSize: 12, fontWeight: '600', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' },
    input: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, color: COLORES.TEXTO_OSCURO, fontSize: 16, paddingHorizontal: 20, paddingVertical: 16 },
    inputError: { borderColor: COLORES.ERROR },
    textoError: { color: COLORES.ERROR, fontSize: 12, marginTop: 8 },
    textoAyuda: { color: COLORES.GRIS_OSCURO, fontSize: 12, marginTop: 8 },
    infoContainer: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 15, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
    infoTitulo: { color: COLORES.TEXTO_OSCURO, fontSize: 16, fontWeight: '600', marginBottom: 10 },
    infoTexto: { color: COLORES.GRIS_OSCURO, fontSize: 13, lineHeight: 20 },
    contenedorBotones: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    botonSecundario: { flex: 1, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
    textoBotonSecundario: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 16, fontWeight: '600' },
    botonPrincipal: { flex: 1, backgroundColor: COLORES.AZUL_CIELO_OSCURO, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORES.AZUL_CIELO },
    botonDeshabilitado: { backgroundColor: COLORES.GRIS_MEDIO },
    textoBotonPrincipal: { color: COLORES.BLANCO, fontSize: 16, fontWeight: 'bold' },
    debugContainer: { backgroundColor: COLORES.AMARILLO_PLATANO + '20', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: COLORES.AMARILLO_PLATANO + '40', marginTop: 20 },
    debugTitulo: { color: COLORES.AMARILLO_OSCURO, fontSize: 12, fontWeight: 'bold' },
    debugTexto: { color: COLORES.GRIS_OSCURO, fontSize: 11, marginBottom: 4 }
});