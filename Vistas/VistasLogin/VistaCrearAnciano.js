import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    TextInput,
    Alert,
    Switch,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    ROJO_CLARO: '#EF5350',
    MORADO: '#BA68C8',
    NARANJA: '#FF9800',
    TURQUESA: '#4DB6AC'
};

export default function VistaCrearAnciano({ navigation, route }) {
    const { usuarioId, codigoFamiliar } = route.params || {};
    const [cargando, setCargando] = useState(false);
    const [idUsuario, setIdUsuario] = useState(usuarioId);

    // Información del adulto mayor
    const [nombre, setNombre] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [genero, setGenero] = useState('');
    const [estadoSalud, setEstadoSalud] = useState('bueno');
    const [medicoPrincipal, setMedicoPrincipal] = useState('');
    const [telefonoEmergencia, setTelefonoEmergencia] = useState('');
    const [alergias, setAlergias] = useState('');
    const [medicamentosCronicos, setMedicamentosCronicos] = useState('');

    // Código personalizado
    const [crearCodigoPersonalizado, setCrearCodigoPersonalizado] = useState(false);
    const [codigoPersonalizado, setCodigoPersonalizado] = useState('');
    const [codigoGenerado, setCodigoGenerado] = useState('');

    // Obtener usuarioId desde AsyncStorage si no viene en params
    useEffect(() => {
        const obtenerUsuarioId = async () => {
            if (!idUsuario) {
                const usuarioData = await AsyncStorage.getItem('usuarioInfo');
                if (usuarioData) {
                    const usuario = JSON.parse(usuarioData);
                    if (usuario.id) {
                        setIdUsuario(usuario.id);
                    }
                }
            }
        };
        obtenerUsuarioId();
    }, [idUsuario]);

    const generarCodigo = () => {
        const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const numeros = '23456789';
        let codigo = '';
        for (let i = 0; i < 3; i++) {
            codigo += letras.charAt(Math.floor(Math.random() * letras.length));
        }
        codigo += '-';
        for (let i = 0; i < 3; i++) {
            codigo += numeros.charAt(Math.floor(Math.random() * numeros.length));
        }
        return codigo;
    };

    const handleCrearCodigo = () => {
        const codigo = generarCodigo();
        setCodigoGenerado(codigo);
        setCodigoPersonalizado(codigo);
    };

    const guardarAdultoMayor = async () => {
        if (!nombre.trim()) {
            Alert.alert('Error', 'El nombre del adulto mayor es requerido');
            return;
        }

        if (!fechaNacimiento.trim()) {
            Alert.alert('Error', 'La fecha de nacimiento es requerida');
            return;
        }

        if (!idUsuario) {
            Alert.alert('Error', 'No se pudo identificar al usuario. Intenta cerrar sesión y volver a entrar.');
            return;
        }

        setCargando(true);

        try {
            // 1. Crear/actualizar adulto mayor
            const datosAdulto = {
                nombre: nombre.trim(),
                fecha_nacimiento: fechaNacimiento.trim(),
                genero: genero || null,
                estado_salud: estadoSalud || null,
                medico_principal: medicoPrincipal.trim() || null,
                telefono_emergencia: telefonoEmergencia.trim() || null,
                alergias: alergias.trim() || null,
                medicamentos_cronicos: medicamentosCronicos.trim() || null
            };

            const response = await servicioAPI.actualizarAdultoMayorGrupo(idUsuario, datosAdulto);

            if (!response.exito) {
                Alert.alert('Error', response.error || 'No se pudo guardar la información');
                setCargando(false);
                return;
            }

            // 2. Si quiere crear código personalizado
            if (crearCodigoPersonalizado && codigoPersonalizado) {
                const codigoData = {
                    nombre: nombre.trim(),
                    apellido: '',
                    parentesco: 'Adulto Mayor',
                    rol_asignado: 'adulto_mayor',
                    max_usos: 1,
                    descripcion: `Código para ${nombre.trim()}`
                };

                const codigoResponse = await servicioAPI.crearCodigoPersonalizado(idUsuario, codigoData);

                if (codigoResponse.exito) {
                    Alert.alert(
                        '✅ Código personalizado creado',
                        `Código: ${codigoResponse.codigo.codigo || codigoGenerado}\n\nGuarda este código para que el adulto mayor pueda acceder sin correo.`
                    );
                }
            }

            // 3. Guardar usuarioId en AsyncStorage (por si no está)
            await AsyncStorage.setItem('usuarioId', idUsuario.toString());

            // 4. Navegar a Principal
            navigation.replace('Principal');

        } catch (error) {
            console.error('Error guardando adulto mayor:', error);
            Alert.alert('Error', 'No se pudo completar el registro');
        } finally {
            setCargando(false);
        }
    };

    const saltarPorAhora = async () => {
        Alert.alert(
            '¿Saltar por ahora?',
            'Puedes completar la información del adulto mayor después desde Configuración.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Saltar',
                    onPress: async () => {
                        await AsyncStorage.setItem('usuarioId', idUsuario.toString());
                        navigation.replace('Principal');
                    }
                }
            ]
        );
    };

    if (cargando) {
        return (
            <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
                <SafeAreaView style={styles.centrado}>
                    <ActivityIndicator size="large" color={COLORES.AMARILLO_PLATANO} />
                    <Text style={styles.textoCargando}>Guardando información...</Text>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={[COLORES.AZUL_CIELO, COLORES.BLANCO]} style={styles.fondo}>
            <SafeAreaView style={styles.contenedor}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Encabezado */}
                        <View style={styles.encabezado}>
                            <View style={styles.iconoContainer}>
                                <Icon name="person-circle-outline" size={60} color={COLORES.AZUL_CIELO_OSCURO} />
                            </View>
                            <Text style={styles.titulo}>Información del Adulto Mayor</Text>
                            <Text style={styles.subtitulo}>
                                Cuéntanos sobre la persona a quien vas a cuidar
                            </Text>
                        </View>

                        {/* Formulario */}
                        <View style={styles.formulario}>
                            <Text style={styles.campoLabel}>Nombre completo *</Text>
                            <TextInput
                                style={styles.input}
                                value={nombre}
                                onChangeText={setNombre}
                                placeholder="Ej: María González"
                                placeholderTextColor={COLORES.GRIS_MEDIO}
                            />

                            <Text style={styles.campoLabel}>Fecha de nacimiento *</Text>
                            <TextInput
                                style={styles.input}
                                value={fechaNacimiento}
                                onChangeText={setFechaNacimiento}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={COLORES.GRIS_MEDIO}
                            />

                            <Text style={styles.campoLabel}>Género</Text>
                            <View style={styles.opcionesGenero}>
                                {['Masculino', 'Femenino', 'Otro'].map(opcion => (
                                    <TouchableOpacity
                                        key={opcion}
                                        style={[
                                            styles.opcionGenero,
                                            genero === opcion && styles.opcionGeneroSeleccionada
                                        ]}
                                        onPress={() => setGenero(opcion)}
                                    >
                                        <Text style={[
                                            styles.textoOpcionGenero,
                                            genero === opcion && styles.textoOpcionGeneroSeleccionada
                                        ]}>
                                            {opcion}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.campoLabel}>Estado de salud</Text>
                            <View style={styles.opcionesSalud}>
                                {['Excelente', 'Bueno', 'Regular', 'Delicado'].map(opcion => (
                                    <TouchableOpacity
                                        key={opcion}
                                        style={[
                                            styles.opcionSalud,
                                            estadoSalud === opcion.toLowerCase() && styles.opcionSaludSeleccionada
                                        ]}
                                        onPress={() => setEstadoSalud(opcion.toLowerCase())}
                                    >
                                        <Text style={[
                                            styles.textoOpcionSalud,
                                            estadoSalud === opcion.toLowerCase() && styles.textoOpcionSaludSeleccionada
                                        ]}>
                                            {opcion}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.campoLabel}>Médico principal</Text>
                            <TextInput
                                style={styles.input}
                                value={medicoPrincipal}
                                onChangeText={setMedicoPrincipal}
                                placeholder="Ej: Dr. Juan Pérez"
                                placeholderTextColor={COLORES.GRIS_MEDIO}
                            />

                            <Text style={styles.campoLabel}>Teléfono de emergencia</Text>
                            <TextInput
                                style={styles.input}
                                value={telefonoEmergencia}
                                onChangeText={setTelefonoEmergencia}
                                placeholder="Ej: 555-123-4567"
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORES.GRIS_MEDIO}
                            />

                            <Text style={styles.campoLabel}>Alergias</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={alergias}
                                onChangeText={setAlergias}
                                placeholder="Ej: Penicilina, Frutos secos..."
                                multiline
                                numberOfLines={2}
                                placeholderTextColor={COLORES.GRIS_MEDIO}
                            />

                            <Text style={styles.campoLabel}>Medicamentos crónicos</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={medicamentosCronicos}
                                onChangeText={setMedicamentosCronicos}
                                placeholder="Ej: Enalapril 10mg, Metformina 850mg..."
                                multiline
                                numberOfLines={2}
                                placeholderTextColor={COLORES.GRIS_MEDIO}
                            />

                            {/* Código personalizado */}
                            <View style={styles.seccionCodigo}>
                                <View style={styles.switchContainer}>
                                    <Text style={styles.switchLabel}>
                                        Crear código personalizado
                                    </Text>
                                    <Switch
                                        value={crearCodigoPersonalizado}
                                        onValueChange={setCrearCodigoPersonalizado}
                                        trackColor={{ false: COLORES.GRIS_MEDIO, true: COLORES.EXITO }}
                                        thumbColor={COLORES.BLANCO}
                                    />
                                </View>

                                {crearCodigoPersonalizado && (
                                    <View style={styles.infoCodigo}>
                                        <Text style={styles.textoInfoCodigo}>
                                            El adulto mayor podrá acceder con este código sin necesidad de correo o contraseña.
                                        </Text>
                                        {codigoGenerado ? (
                                            <View style={styles.codigoDisplay}>
                                                <Text style={styles.codigoTexto}>{codigoGenerado}</Text>
                                                <TouchableOpacity
                                                    style={styles.botonCopiar}
                                                    onPress={() => handleCrearCodigo()}
                                                >
                                                    <Icon name="refresh-outline" size={20} color={COLORES.AZUL_CIELO_OSCURO} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.botonGenerarCodigo}
                                                onPress={handleCrearCodigo}
                                            >
                                                <Text style={styles.textoBotonGenerarCodigo}>Generar código</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Botones */}
                            <View style={styles.contenedorBotones}>
                                <TouchableOpacity
                                    style={styles.botonSaltar}
                                    onPress={saltarPorAhora}
                                >
                                    <Text style={styles.textoBotonSaltar}>Omitir por ahora</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.botonGuardar}
                                    onPress={guardarAdultoMayor}
                                >
                                    <Icon name="checkmark-outline" size={20} color={COLORES.BLANCO} />
                                    <Text style={styles.textoBotonGuardar}>Guardar</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.textoAyuda}>
                                Puedes completar más detalles después desde Configuración
                            </Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    fondo: { flex: 1 },
    contenedor: { flex: 1 },
    keyboardAvoidingView: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 40 },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    textoCargando: { color: COLORES.TEXTO_OSCURO, marginTop: 20, fontSize: 16 },

    encabezado: { alignItems: 'center', marginBottom: 30 },
    iconoContainer: { marginBottom: 15 },
    titulo: { fontSize: 24, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, textAlign: 'center' },
    subtitulo: { fontSize: 14, color: COLORES.GRIS_OSCURO, textAlign: 'center', marginTop: 8, lineHeight: 20 },

    formulario: { marginBottom: 20 },
    campoLabel: { fontSize: 14, fontWeight: '600', color: COLORES.TEXTO_OSCURO, marginBottom: 8, marginTop: 15 },
    input: {
        backgroundColor: COLORES.GRIS_CLARO,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORES.TEXTO_OSCURO,
        borderWidth: 1,
        borderColor: COLORES.GRIS_MEDIO,
    },
    textArea: { minHeight: 60, textAlignVertical: 'top' },

    opcionesGenero: { flexDirection: 'row', gap: 10 },
    opcionGenero: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORES.GRIS_MEDIO,
        alignItems: 'center',
    },
    opcionGeneroSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
    textoOpcionGenero: { color: COLORES.GRIS_OSCURO, fontSize: 14 },
    textoOpcionGeneroSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

    opcionesSalud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    opcionSalud: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORES.GRIS_MEDIO,
    },
    opcionSaludSeleccionada: { backgroundColor: COLORES.AZUL_CIELO, borderColor: COLORES.AZUL_CIELO_OSCURO },
    textoOpcionSalud: { color: COLORES.GRIS_OSCURO, fontSize: 13 },
    textoOpcionSaludSeleccionada: { color: COLORES.BLANCO, fontWeight: 'bold' },

    seccionCodigo: { marginTop: 20, backgroundColor: COLORES.GRIS_CLARO, borderRadius: 12, padding: 16 },
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchLabel: { fontSize: 15, fontWeight: '600', color: COLORES.TEXTO_OSCURO, flex: 1 },
    infoCodigo: { marginTop: 12 },
    textoInfoCodigo: { fontSize: 13, color: COLORES.GRIS_OSCURO, marginBottom: 10, fontStyle: 'italic' },
    codigoDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORES.BLANCO,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: COLORES.EXITO,
    },
    codigoTexto: { flex: 1, fontSize: 20, fontWeight: 'bold', color: COLORES.TEXTO_OSCURO, letterSpacing: 2 },
    botonCopiar: { padding: 8 },
    botonGenerarCodigo: {
        backgroundColor: COLORES.MORADO,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    textoBotonGenerarCodigo: { color: COLORES.BLANCO, fontWeight: 'bold', fontSize: 16 },

    contenedorBotones: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, gap: 15 },
    botonSaltar: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORES.GRIS_MEDIO,
        alignItems: 'center',
    },
    textoBotonSaltar: { color: COLORES.GRIS_OSCURO, fontSize: 16, fontWeight: '600' },
    botonGuardar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORES.AZUL_CIELO_OSCURO,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    textoBotonGuardar: { color: COLORES.BLANCO, fontSize: 16, fontWeight: 'bold' },

    textoAyuda: { textAlign: 'center', color: COLORES.GRIS_OSCURO, fontSize: 12, marginTop: 15, fontStyle: 'italic' },
});