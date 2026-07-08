import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    Platform,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { servicioAPI } from '../../servicios/api';
import { useFocusEffect } from '@react-navigation/native';

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
};

export default function PantallaNotificaciones({ navigation }) {
    const [notificaciones, setNotificaciones] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [cargandoMas, setCargandoMas] = useState(false);

    // ---------- Cargar notificaciones ----------
    const cargarNotificaciones = useCallback(async (paginaActual = 1, refresh = false) => {
        try {
            if (refresh) setRefrescando(true);
            else if (paginaActual === 1) setCargando(true);

            const respuesta = await servicioAPI.obtenerNotificaciones(paginaActual, 20);

            if (respuesta && respuesta.exito) {
                const nuevas = respuesta.notificaciones || [];
                setNotificaciones(prev => refresh ? nuevas : [...prev, ...nuevas]);
                setTotalPaginas(respuesta.totalPaginas || 1);
            } else {
                console.warn('⚠️ No se pudieron cargar notificaciones');
                if (respuesta?.error) {
                    Alert.alert('Error', respuesta.error);
                }
            }
        } catch (error) {
            console.error('❌ Error cargando notificaciones:', error);
            Alert.alert('Error', 'No se pudieron cargar las notificaciones');
        } finally {
            setCargando(false);
            setRefrescando(false);
            setCargandoMas(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setPagina(1);
            cargarNotificaciones(1, true);
        }, [cargarNotificaciones])
    );

    // ---------- Cargar más ----------
    const cargarMas = async () => {
        if (pagina < totalPaginas && !cargandoMas) {
            setCargandoMas(true);
            const nextPage = pagina + 1;
            setPagina(nextPage);
            await cargarNotificaciones(nextPage, false);
        }
    };

    // ---------- Marcar como leída ----------
    const marcarLeida = async (id) => {
        try {
            const respuesta = await servicioAPI.marcarNotificacionLeida(id);
            if (respuesta && respuesta.exito) {
                setNotificaciones(prev =>
                    prev.map(n => n.id === id ? { ...n, read: true } : n)
                );
            } else {
                Alert.alert('Error', respuesta?.error || 'No se pudo marcar como leída');
            }
        } catch (error) {
            console.error('Error marcando leída:', error);
            Alert.alert('Error', 'Error de conexión');
        }
    };

    // ---------- Marcar todas como leídas ----------
    const marcarTodasLeidas = async () => {
        try {
            const respuesta = await servicioAPI.marcarTodasNotificacionesLeidas();
            if (respuesta && respuesta.exito) {
                setNotificaciones(prev => prev.map(n => ({ ...n, read: true })));
                Alert.alert('Éxito', respuesta.mensaje || 'Todas las notificaciones marcadas como leídas');
            } else {
                Alert.alert('Error', respuesta?.error || 'No se pudieron marcar todas');
            }
        } catch (error) {
            console.error('Error marcando todas:', error);
            Alert.alert('Error', 'Error de conexión');
        }
    };

    // ---------- Eliminar notificación ----------
    const eliminar = (id) => {
        Alert.alert(
            'Eliminar notificación',
            '¿Estás seguro de que deseas eliminar esta notificación?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const respuesta = await servicioAPI.eliminarNotificacion(id);
                            if (respuesta && respuesta.exito) {
                                setNotificaciones(prev => prev.filter(n => n.id !== id));
                            } else {
                                Alert.alert('Error', respuesta?.error || 'No se pudo eliminar');
                            }
                        } catch (error) {
                            console.error('Error eliminando:', error);
                            Alert.alert('Error', 'Error de conexión');
                        }
                    },
                },
            ]
        );
    };

    // ---------- Formatear fecha ----------
    const formatearFecha = (fechaISO) => {
        const fecha = new Date(fechaISO);
        const ahora = new Date();
        const diffMs = ahora - fecha;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Ahora';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        if (diffHoras < 24) return `Hace ${diffHoras} h`;
        if (diffDias === 1) return 'Ayer';
        return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // ---------- Render item ----------
    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificacionCard, !item.read && styles.noLeida]}
            onPress={() => !item.read && marcarLeida(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.notificacionHeader}>
                <View style={styles.tituloContainer}>
                    <Text style={styles.notificacionTitulo}>{item.titulo || item.title}</Text>
                    {!item.read && <View style={styles.puntoNoLeido} />}
                </View>
                <Text style={styles.notificacionFecha}>{formatearFecha(item.creado_en || item.createdAt)}</Text>
            </View>
            <Text style={styles.notificacionCuerpo}>{item.cuerpo || item.body}</Text>
            <View style={styles.acciones}>
                {!item.read && (
                    <TouchableOpacity onPress={() => marcarLeida(item.id)} style={styles.botonAccion}>
                        <Icon name="checkmark-circle-outline" size={20} color={COLORES.EXITO} />
                        <Text style={styles.botonAccionTexto}>Marcar leída</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => eliminar(item.id)} style={styles.botonAccion}>
                    <Icon name="trash-outline" size={20} color={COLORES.ERROR} />
                    <Text style={styles.botonAccionTexto}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    // ---------- Footer y empty ----------
    const renderFooter = () => {
        if (!cargandoMas) return null;
        return (
            <View style={styles.footerCarga}>
                <ActivityIndicator size="small" color={COLORES.AZUL_CIELO_OSCURO} />
                <Text style={styles.footerTexto}>Cargando más...</Text>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.vacioContainer}>
            <Icon name="notifications-off-outline" size={60} color={COLORES.GRIS_MEDIO} />
            <Text style={styles.vacioTexto}>No tienes notificaciones</Text>
        </View>
    );

    // ---------- Contar no leídas ----------
    const noLeidasCount = notificaciones.filter(n => !n.read).length;

    // ---------- Render ----------
    if (cargando && pagina === 1) {
        return (
            <View style={styles.fondo}>
                <SafeAreaView style={styles.centrado}>
                    <ActivityIndicator size="large" color={COLORES.AZUL_CIELO_OSCURO} />
                    <Text style={styles.textoCargando}>Cargando notificaciones...</Text>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.fondo}>
            <SafeAreaView style={styles.contenedor}>
                {/* Encabezado */}
                <View style={styles.encabezado}>
                    <TouchableOpacity style={styles.botonAtras} onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back-outline" size={28} color={COLORES.TEXTO_OSCURO} />
                    </TouchableOpacity>
                    <Text style={styles.titulo}>Notificaciones</Text>
                    <View style={styles.botonesDerecha}>
                        {noLeidasCount > 0 && (
                            <TouchableOpacity onPress={marcarTodasLeidas} style={styles.botonMarcarTodas}>
                                <Text style={styles.botonMarcarTodasTexto}>Marcar todas</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Preferencias')}
                            style={styles.botonConfig}
                        >
                            <Icon name="settings-outline" size={24} color={COLORES.TEXTO_OSCURO} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Lista */}
                <FlatList
                    data={notificaciones}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    contentContainerStyle={styles.lista}
                    refreshControl={
                        <RefreshControl
                            refreshing={refrescando}
                            onRefresh={() => {
                                setPagina(1);
                                cargarNotificaciones(1, true);
                            }}
                            colors={[COLORES.AMARILLO_PLATANO]}
                            tintColor={COLORES.AMARILLO_PLATANO}
                        />
                    }
                    onEndReached={cargarMas}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={renderEmpty}
                />
            </SafeAreaView>
        </View>
    );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
    fondo: {
        flex: 1,
        backgroundColor: COLORES.BLANCO,
    },
    contenedor: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10,
    },
    centrado: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textoCargando: {
        color: COLORES.GRIS_OSCURO,
        marginTop: 20,
        fontSize: 16,
    },

    encabezado: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORES.BLANCO,
        borderBottomWidth: 1,
        borderBottomColor: COLORES.GRIS_CLARO,
    },
    botonAtras: {
        padding: 6,
    },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORES.TEXTO_OSCURO,
    },
    botonesDerecha: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    botonMarcarTodas: {
        backgroundColor: COLORES.AZUL_CIELO + '20',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORES.AZUL_CIELO_OSCURO,
        marginRight: 8,
    },
    botonMarcarTodasTexto: {
        color: COLORES.AZUL_CIELO_OSCURO,
        fontSize: 12,
        fontWeight: '600',
    },
    botonConfig: {
        padding: 6,
    },

    lista: {
        padding: 16,
        paddingBottom: 30,
    },

    notificacionCard: {
        backgroundColor: COLORES.GRIS_CLARO,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORES.GRIS_MEDIO,
    },
    noLeida: {
        backgroundColor: COLORES.AZUL_CIELO + '20',
        borderColor: COLORES.AZUL_CIELO_OSCURO,
    },

    notificacionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tituloContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    notificacionTitulo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORES.TEXTO_OSCURO,
        flex: 1,
    },
    puntoNoLeido: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORES.AZUL_CIELO_OSCURO,
        marginLeft: 8,
    },
    notificacionFecha: {
        fontSize: 11,
        color: COLORES.GRIS_OSCURO,
        marginLeft: 8,
    },
    notificacionCuerpo: {
        fontSize: 14,
        color: COLORES.TEXTO_OSCURO,
        lineHeight: 20,
        marginBottom: 12,
    },

    acciones: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: COLORES.GRIS_MEDIO,
        paddingTop: 10,
    },
    botonAccion: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 20,
    },
    botonAccionTexto: {
        fontSize: 12,
        color: COLORES.GRIS_OSCURO,
        marginLeft: 4,
        fontWeight: '500',
    },

    footerCarga: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerTexto: {
        fontSize: 14,
        color: COLORES.GRIS_OSCURO,
        marginLeft: 10,
    },

    vacioContainer: {
        alignItems: 'center',
        paddingTop: 80,
    },
    vacioTexto: {
        fontSize: 16,
        color: COLORES.GRIS_OSCURO,
        marginTop: 16,
    },
});