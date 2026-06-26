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
    EXITO: '#4CAF50'
};

export default function VistaMandarCorreo({ navigation, route }) {
    const { correo: correoParam, modo, tipo, usuarioId, redirigirA, datosAnciano } = route.params || {};
    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const [cargando, setCargando] = useState(false);
    const [correo, setCorreo] = useState(correoParam || '');
    const [error, setError] = useState('');

    const esRecuperacion = modo === 'recuperar';
    const esCreacionCuenta = modo === 'verificacion' || tipo === 'crear_cuenta';
    const contexto = tipo || modo || 'verificacion';

    useEffect(() => {
        if (correoParam) setCorreo(correoParam);
    }, [correoParam]);

    const validarCorreo = (email) => {
        setError('');
        if (!email) {
            setError('El correo electrónico es requerido');
            return false;
        }
        if (!regexCorreo.test(email)) {
            setError('Ingresa un correo electrónico válido');
            return false;
        }
        return true;
    };

    const enviarCorreo = async () => {
        if (!validarCorreo(correo)) return;

        setCargando(true);

        try {
            // Usamos el mismo endpoint para recuperación y verificación
            const resultado = await servicioAPI.solicitarRecuperacion(correo);

            if (resultado.exito) {
                const codigoGenerado = resultado.codigo_demo || Math.floor(1000 + Math.random() * 9000).toString();

                Alert.alert(
                    '✅ Código Enviado',
                    `Se ha enviado un código de verificación a:\n\n📧 ${correo}`,
                    [{
                        text: 'Continuar',
                        onPress: () => {
                            // Navegar a verificación con todos los parámetros
                            navigation.navigate('VerificarCorreo', {
                                correo,
                                codigo: codigoGenerado,
                                contexto: esRecuperacion ? 'recuperar' : 'crear_cuenta',
                                usuarioId: usuarioId,
                                redirigirA: redirigirA || 'CrearAnciano',
                                datosAnciano: datosAnciano || {}
                            });
                        }
                    }],
                    { cancelable: false }
                );
            } else {
                Alert.alert('❌ Error', resultado.error || 'No se pudo enviar el código');
            }
        } catch (error) {
            console.error('Error enviando correo:', error);
            Alert.alert('❌ Error de conexión', 'No se pudo conectar con el servidor');
        } finally {
            setCargando(false);
        }
    };

    const regresar = () => {
        if (correo.trim()) {
            Alert.alert(
                '¿Descartar cambios?',
                'Perderás el correo ingresado.',
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
                <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoidingView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        {/* Encabezado */}
                        <View style={styles.encabezado}>
                            <View style={styles.iconoTitulo}>
                                <Icon name={esRecuperacion ? "key-outline" : "mail-outline"} size={40} color={COLORES.AZUL_CIELO_OSCURO} />
                            </View>
                            <Text style={styles.titulo}>
                                {esRecuperacion ? 'Recuperar Contraseña' : 'Verificar Correo'}
                            </Text>
                            <Text style={styles.subtitulo}>
                                {esRecuperacion
                                    ? 'Ingresa tu correo para recuperar tu contraseña'
                                    : 'Ingresa tu correo para crear una nueva cuenta'
                                }
                            </Text>
                            <Text style={styles.instruccion}>
                                Te enviaremos un código de 4 dígitos para verificar tu identidad
                            </Text>
                        </View>

                        {/* Campo de correo */}
                        <View style={styles.campoContainer}>
                            <Text style={styles.campoLabel}>CORREO ELECTRÓNICO</Text>
                            <TextInput
                                style={[styles.input, error && styles.inputError]}
                                placeholder="ejemplo@correo.com"
                                placeholderTextColor={COLORES.GRIS_MEDIO}
                                value={correo}
                                onChangeText={(text) => { setCorreo(text); setError(''); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!cargando}
                                returnKeyType="send"
                                onSubmitEditing={enviarCorreo}
                            />
                            {error ? (
                                <Text style={styles.textoError}>❌ {error}</Text>
                            ) : (
                                <Text style={styles.textoAyuda}>📧 Usa el correo con el que te registraste</Text>
                            )}
                        </View>

                        {/* Botones */}
                        <View style={styles.contenedorBotones}>
                            <TouchableOpacity onPress={regresar} style={styles.botonSecundario} disabled={cargando}>
                                <Text style={styles.textoBotonSecundario}>Regresar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={enviarCorreo}
                                style={[styles.botonPrincipal, (cargando || !correo.trim()) && styles.botonDeshabilitado]}
                                disabled={cargando || !correo.trim()}
                            >
                                {cargando ? (
                                    <ActivityIndicator size="small" color={COLORES.BLANCO} />
                                ) : (
                                    <Text style={styles.textoBotonPrincipal}>Enviar código</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {cargando && (
                            <View style={styles.cargandoContainer}>
                                <ActivityIndicator size="small" color={COLORES.AZUL_CIELO_OSCURO} />
                                <Text style={styles.textoCargando}>Enviando código...</Text>
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
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30, justifyContent: 'center' },
    encabezado: { alignItems: 'center', marginBottom: 40 },
    iconoTitulo: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORES.AZUL_CIELO + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    titulo: { fontSize: 28, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center', marginBottom: 10 },
    subtitulo: { fontSize: 16, color: COLORES.GRIS_OSCURO, textAlign: 'center', marginBottom: 8 },
    instruccion: { fontSize: 14, color: COLORES.GRIS_OSCURO, textAlign: 'center', fontStyle: 'italic' },
    campoContainer: { marginBottom: 30 },
    campoLabel: { fontSize: 12, fontWeight: '600', color: COLORES.GRIS_OSCURO, marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
    input: { backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, borderWidth: 1, borderColor: COLORES.GRIS_MEDIO, color: COLORES.TEXTO_OSCURO, fontSize: 16, paddingHorizontal: 20, paddingVertical: 16 },
    inputError: { borderColor: COLORES.ERROR },
    textoError: { color: COLORES.ERROR, fontSize: 12, marginTop: 8 },
    textoAyuda: { color: COLORES.GRIS_OSCURO, fontSize: 12, marginTop: 8 },
    contenedorBotones: { flexDirection: 'row', gap: 15 },
    botonSecundario: { flex: 1, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORES.GRIS_MEDIO },
    textoBotonSecundario: { color: COLORES.AZUL_CIELO_OSCURO, fontSize: 16, fontWeight: '600' },
    botonPrincipal: { flex: 1, backgroundColor: COLORES.AZUL_CIELO_OSCURO, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    botonDeshabilitado: { backgroundColor: COLORES.GRIS_MEDIO },
    textoBotonPrincipal: { color: COLORES.BLANCO, fontSize: 16, fontWeight: 'bold' },
    cargandoContainer: { alignItems: 'center', marginTop: 20, padding: 15, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12 },
    textoCargando: { color: COLORES.GRIS_OSCURO, fontSize: 12, marginTop: 10 }
});