import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

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
  NARANJA: '#FF9800'
};

export default function VistaSeleccionPerfil() {
  const navigation = useNavigation();

  // Configurar título de la página para web
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'CuidaMe | Seleccionar Tipo de Perfil';
    }
  }, []);

  const seleccionarTipoPerfil = (tipo) => {
    // Navegar a la vista de registro con el tipo de perfil seleccionado
    navigation.navigate('Registro', { tipoPerfil: tipo });
  };

  const volverAlLogin = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[COLORES.AZUL_CIELO, COLORES.BLANCO, COLORES.AZUL_CIELO]}
      style={styles.fondo}
    >
      <SafeAreaView style={styles.contenedorPrincipal}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado */}
          <View style={styles.encabezado}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={volverAlLogin}
            >
              <Text style={styles.textoBotonVolver}>← Volver</Text>
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <Text style={styles.titulo}>CuidaMe</Text>
              <Text style={styles.subtituloLogo}>Cuidado y organización para adultos mayores</Text>
            </View>

            <Text style={styles.subtitulo}>
              Selecciona el tipo de perfil que deseas crear
            </Text>
            <Text style={styles.instruccion}>
              Esta elección determinará las opciones disponibles durante el registro
            </Text>
          </View>

          {/* Opciones de perfil */}
          <View style={styles.opcionesContainer}>

            {/* Adulto Mayor */}
            <TouchableOpacity
              style={styles.opcionCard}
              onPress={() => seleccionarTipoPerfil('adultoMayor')}
            >
              <LinearGradient
                colors={[COLORES.AZUL_CIELO_OSCURO, COLORES.AZUL_CIELO]}
                style={styles.cardGradient}
              >
                <View style={styles.iconoContainer}>
                  <Text style={styles.icono}>👴</Text>
                </View>
                <Text style={styles.opcionTitulo}>Adulto Mayor</Text>
                <Text style={styles.opcionDescripcion}>
                  Soy la persona que recibirá cuidados y seguimiento
                </Text>

                <View style={styles.caracteristicasContainer}>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Seguimiento de salud</Text>
                  </View>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Recordatorios de medicamentos</Text>
                  </View>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Comunicación con familiares</Text>
                  </View>
                </View>

                <View style={styles.badgeContainer}>
                  <Text style={styles.badge}>Versión AM</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Familiar */}
            <TouchableOpacity
              style={styles.opcionCard}
              onPress={() => seleccionarTipoPerfil('familiar')}
            >
              <LinearGradient
                colors={[COLORES.VERDE, '#A5D6A7']}
                style={styles.cardGradient}
              >
                <View style={styles.iconoContainer}>
                  <Text style={styles.icono}>👨‍👩‍👧‍👦</Text>
                </View>
                <Text style={styles.opcionTitulo}>Familiar</Text>
                <Text style={styles.opcionDescripcion}>
                  Soy familiar de un adulto mayor y quiero acompañar su cuidado
                </Text>

                <View style={styles.caracteristicasContainer}>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Seguimiento en tiempo real</Text>
                  </View>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Gestión de citas médicas</Text>
                  </View>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Compartir información</Text>
                  </View>
                </View>

                <View style={styles.badgeContainer}>
                  <Text style={styles.badge}>Versión Familiar</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Profesional/Cuidador */}
            <TouchableOpacity
              style={styles.opcionCard}
              onPress={() => seleccionarTipoPerfil('profesional')}
            >
              <LinearGradient
                colors={[COLORES.NARANJA, '#FFCC80']}
                style={styles.cardGradient}
              >
                <View style={styles.iconoContainer}>
                  <Text style={styles.icono}>👨‍⚕️</Text>
                </View>
                <Text style={styles.opcionTitulo}>Profesional / Cuidador</Text>
                <Text style={styles.opcionDescripcion}>
                  Soy profesional de la salud o cuidador que brinda servicios
                </Text>

                <View style={styles.caracteristicasContainer}>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Gestión de pacientes</Text>
                  </View>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Registro de atenciones</Text>
                  </View>
                  <View style={styles.caracteristicaItem}>
                    <Text style={styles.caracteristicaIcono}>✓</Text>
                    <Text style={styles.caracteristicaTexto}>Coordinación con familiares</Text>
                  </View>
                </View>

                <View style={styles.badgeContainer}>
                  <Text style={styles.badge}>Versión Profesional</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* Información adicional */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitulo}>¿No estás seguro?</Text>
            <Text style={styles.infoTexto}>
              Puedes cambiar algunas configuraciones después, pero el tipo de perfil principal no podrá modificarse.
              {'\n\n'}
              <Text style={styles.textoDestacado}>Adulto Mayor:</Text> Para personas mayores que recibirán cuidado.
              {'\n'}
              <Text style={styles.textoDestacado}>Familiar:</Text> Para familiares que supervisarán el cuidado.
              {'\n'}
              <Text style={styles.textoDestacado}>Profesional:</Text> Para cuidadores o profesionales de salud.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.textoFooter}>© 2025 CuidaMe - Cuidado de Adultos Mayores</Text>
            <Text style={styles.version}>Selección de Perfil</Text>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  encabezado: {
    alignItems: 'center',
    marginBottom: 30,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORES.GRIS_MEDIO,
  },
  textoBotonVolver: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontSize: 14,
    fontWeight: '600',
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
    color: COLORES.TEXTO_OSCURO,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  instruccion: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  opcionesContainer: {
    marginBottom: 30,
  },
  opcionCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    padding: 25,
    borderRadius: 20,
  },
  iconoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  icono: {
    fontSize: 50,
  },
  opcionTitulo: {
    color: COLORES.BLANCO,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  opcionDescripcion: {
    color: COLORES.BLANCO,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    opacity: 0.9,
  },
  caracteristicasContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  caracteristicaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  caracteristicaIcono: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    width: 20,
  },
  caracteristicaTexto: {
    color: COLORES.BLANCO,
    fontSize: 13,
    flex: 1,
    opacity: 0.9,
  },
  badgeContainer: {
    alignItems: 'center',
  },
  badge: {
    color: COLORES.BLANCO,
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    overflow: 'hidden',
  },
  infoContainer: {
    backgroundColor: COLORES.GRIS_CLARO,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  infoTitulo: {
    color: COLORES.TEXTO_OSCURO,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoTexto: {
    color: COLORES.GRIS_OSCURO,
    fontSize: 13,
    lineHeight: 20,
  },
  textoDestacado: {
    color: COLORES.AZUL_CIELO_OSCURO,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
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
});