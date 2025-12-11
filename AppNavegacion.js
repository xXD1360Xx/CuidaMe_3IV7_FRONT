import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Vistas Login
import VistaLogin from './Vistas/VistasLogin/VistaLogin';
import VistaRegistro from './Vistas/VistasLogin/VistaRegistro';
import VistaCambiarContrasena from './Vistas/VistasLogin/VistaCambiarContrasena';
import VistaVerificarCorreo from './Vistas/VistasLogin/VistaVerificarCorreo';
import VistaMandarCorreo from './Vistas/VistasLogin/VistaMandarCorreo';
import VistaSeleccionPerfil from './Vistas/VistasLogin/VistaSeleccionPerfil';

// Vistas Familiar
import VistaFamilia from './Vistas/VistasFamiliar/VistaFamilia';
import VistaPrincipal from './Vistas/VistasFamiliar/VistaPrincipal';
import VistaGastos from './Vistas/VistasFamiliar/VistaGastos';
import VistaHorario from './Vistas/VistasFamiliar/VistaHorario';
import VistaMedicina from './Vistas/VistasFamiliar/VistaMedicina';
import VistaPreferencias from './Vistas/VistasFamiliar/VistaPreferencias';
import VistaInfoAnciano from './Vistas/VistasFamiliar/VistaInfoAnciano';
import VistaCalendario from './Vistas/VistasFamiliar/VistaCalendario';

const Stack = createNativeStackNavigator();

// Pantalla de carga
const PantallaCarga = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
    <ActivityIndicator size="large" color="#87CEEB" />
  </View>
);

// Contexto de autenticación
export const AuthContext = React.createContext();

export default function AppNavegacion() {
  const [estaCargando, setEstaCargando] = useState(true);
  const [usuarioToken, setUsuarioToken] = useState(null);
  const [usuarioInfo, setUsuarioInfo] = useState(null);
  const [tipoPerfil, setTipoPerfil] = useState(null);

  // Función para cargar sesión al iniciar
  useEffect(() => {
    const cargarSesion = async () => {
      try {
        console.log('🔍 AppNavegacion: Cargando sesión...');
        
        // Intentar obtener token, usuario y tipo de perfil
        const token = await AsyncStorage.getItem('token');
        const usuarioString = await AsyncStorage.getItem('usuarioInfo');
        const perfil = await AsyncStorage.getItem('tipoPerfil');
        
        console.log('📱 Token encontrado:', token ? `Sí (${token.substring(0, 20)}...)` : 'No');
        console.log('👤 Usuario encontrado:', usuarioString ? 'Sí' : 'No');
        console.log('👥 Tipo de perfil:', perfil || 'No definido');
        
        if (token && usuarioString) {
          const usuario = JSON.parse(usuarioString);
          setUsuarioToken(token);
          setUsuarioInfo(usuario);
          setTipoPerfil(perfil);
          console.log(`✅ Sesión cargada para: ${usuario.email} (Perfil: ${perfil})`);
        } else {
          console.log('ℹ️ No hay sesión activa');
        }
      } catch (error) {
        console.error('❌ Error cargando sesión:', error);
      } finally {
        setEstaCargando(false);
      }
    };

    cargarSesion();
  }, []);

  // Determinar la pantalla principal según el tipo de perfil
  const obtenerPantallaPrincipal = () => {
    if (!tipoPerfil) return 'SeleccionPerfil';
    
    switch(tipoPerfil) {
      case 'familiar':
        return 'Principal';
      case 'anciano':
        return 'PrincipalAnciano';
      case 'profesional':
        return 'PrincipalProfesional';
      default:
        return 'Principal';
    }
  };

  // Configuración de autenticación para el contexto
  const contextoAuth = {
    iniciarSesion: async (token, usuario, perfil = null) => {
      try {
        console.log('🔐 Guardando sesión...');
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('usuarioInfo', JSON.stringify(usuario));
        
        if (perfil) {
          await AsyncStorage.setItem('tipoPerfil', perfil);
          setTipoPerfil(perfil);
        }
        
        setUsuarioToken(token);
        setUsuarioInfo(usuario);
        console.log(`✅ Sesión guardada para: ${usuario.email} (Perfil: ${perfil})`);
      } catch (error) {
        console.error('❌ Error guardando sesión:', error);
        throw error;
      }
    },
    
    cambiarPerfil: async (nuevoPerfil) => {
      try {
        await AsyncStorage.setItem('tipoPerfil', nuevoPerfil);
        setTipoPerfil(nuevoPerfil);
        console.log(`🔄 Perfil cambiado a: ${nuevoPerfil}`);
      } catch (error) {
        console.error('❌ Error cambiando perfil:', error);
      }
    },
    
    cerrarSesion: async () => {
      try {
        console.log('🚪 Cerrando sesión...');
        await AsyncStorage.multiRemove(['token', 'usuarioInfo', 'tipoPerfil']);
        
        setUsuarioToken(null);
        setUsuarioInfo(null);
        setTipoPerfil(null);
        console.log('✅ Sesión cerrada');
      } catch (error) {
        console.error('❌ Error cerrando sesión:', error);
      }
    },
    
    actualizarUsuario: async (nuevosDatos) => {
      try {
        const usuarioActualizado = { ...usuarioInfo, ...nuevosDatos };
        await AsyncStorage.setItem('usuarioInfo', JSON.stringify(usuarioActualizado));
        setUsuarioInfo(usuarioActualizado);
        console.log('🔄 Usuario actualizado');
      } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
      }
    },
    
    obtenerUsuario: () => usuarioInfo,
    obtenerPerfil: () => tipoPerfil,
    token: usuarioToken,
    usuario: usuarioInfo,
    perfil: tipoPerfil,
    estaAutenticado: !!usuarioToken
  };

  // Si está cargando, mostrar pantalla de carga
  if (estaCargando) {
    return <PantallaCarga />;
  }

  console.log('🚀 AppNavegacion renderizando. Usuario autenticado:', contextoAuth.estaAutenticado);
  console.log('👥 Tipo de perfil actual:', tipoPerfil);

  return (
    <AuthContext.Provider value={contextoAuth}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={usuarioToken ? obtenerPantallaPrincipal() : "Login"}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        >
          {/* RUTAS PÚBLICAS - Siempre accesibles */}
          <Stack.Screen 
            name="Login" 
            component={VistaLogin}
          />

          <Stack.Screen 
            name="Registro" 
            component={VistaRegistro}
          />

          <Stack.Screen
            name="CambiarContrasena"
            component={VistaCambiarContrasena}
          />

          <Stack.Screen
            name="VerificarCorreo"
            component={VistaVerificarCorreo}
          />

          <Stack.Screen
            name="MandarCorreo"
            component={VistaMandarCorreo}
          />

          <Stack.Screen
            name="SeleccionPerfil"
            component={VistaSeleccionPerfil}
          />

          {/* RUTAS PROTEGIDAS - Solo visibles si hay token */}
          
          {/* Rutas para Familiar */}
          <Stack.Screen
            name="Principal"
            component={VistaPrincipal}
          />

          <Stack.Screen
            name="Familia"
            component={VistaFamilia}
          />

          <Stack.Screen
            name="Gastos"
            component={VistaGastos}
          />

          <Stack.Screen
            name="Horario"
            component={VistaHorario}
          />

          <Stack.Screen
            name="Medicina"
            component={VistaMedicina}
          />

          <Stack.Screen
            name="Preferencias"
            component={VistaPreferencias}
          />

          {/* Rutas para Anciano */}
          <Stack.Screen
            name="Anciano"
            component={VistasAnciano}
          />

          <Stack.Screen
            name="InfoAnciano"
            component={VistaInfoAnciano}
          />

          {/* Rutas para Profesional */}
          <Stack.Screen
            name="Profesional"
            component={VistasProfesional}
          />

          {/* Rutas compartidas */}
          <Stack.Screen
            name="Calendario"
            component={VistaCalendario}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

