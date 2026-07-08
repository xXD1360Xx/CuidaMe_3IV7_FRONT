// AppNavegacion.js
import React, { useEffect, useState, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Importar todas las vistas (ya las tienes)
import VistaLogin from './Vistas/VistasLogin/VistaLogin';
import VistaRegistro from './Vistas/VistasLogin/VistaRegistro';
import VistaCambiarContrasena from './Vistas/VistasLogin/VistaCambiarContrasena';
import VistaVerificarCorreo from './Vistas/VistasLogin/VistaVerificarCorreo';
import VistaMandarCorreo from './Vistas/VistasLogin/VistaMandarCorreo';
import VistaPrincipal from './Vistas/VistasFamiliar/VistaPrincipal';
import VistaFamilia from './Vistas/VistasFamiliar/VistaFamilia';
import VistaGastos from './Vistas/VistasFamiliar/VistaGastos';
import VistaHorario from './Vistas/VistasFamiliar/VistaHorario';
import VistaMedicinas from './Vistas/VistasFamiliar/VistaMedicinas';
import VistaPreferencias from './Vistas/VistasFamiliar/VistaPreferencias';
import VistaInfoAnciano from './Vistas/VistasFamiliar/VistaInfoAnciano';
import VistaCalendario from './Vistas/VistasFamiliar/VistaCalendario';
import VistaNotificaciones from './Vistas/VistasFamiliar/VistaNotificaciones';
import VistaCrearAnciano from './Vistas/VistasLogin/VistaCrearAnciano';

// ❌ Las siguientes vistas NO EXISTEN, se mantienen comentadas
// import VistaPerfilAnciano from './Vistas/VistasAnciano/VistaPerfilAnciano';
// import VistaPerfilProfesional from './Vistas/VistasProfesional/VistaPerfilProfesional';
// import VistaPrincipalAnciano from './Vistas/VistasAnciano/VistaPrincipalAnciano';
// import VistaPrincipalProfesional from './Vistas/VistasProfesional/VistaPrincipalProfesional';

const Stack = createNativeStackNavigator();

// ========== CONTEXTO DE AUTENTICACIÓN ==========
export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// ========== PANTALLA DE CARGA ==========
const PantallaCarga = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#87CEEB' }}>
    <ActivityIndicator size="large" color="#FFE135" />
  </View>
);

// ========== COMPONENTE PRINCIPAL ==========
export default function AppNavegacion() {
  const [cargando, setCargando] = useState(true);
  const [usuarioToken, setUsuarioToken] = useState(null);
  const [usuarioInfo, setUsuarioInfo] = useState(null);
  const [tipoPerfil, setTipoPerfil] = useState(null);

  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const usuarioString = await AsyncStorage.getItem('usuarioInfo');
        const perfil = await AsyncStorage.getItem('tipoPerfil');

        if (token && usuarioString) {
          const usuario = JSON.parse(usuarioString);
          setUsuarioToken(token);
          setUsuarioInfo(usuario);
          setTipoPerfil(perfil);
        }
      } catch (error) {
        console.error('❌ Error cargando sesión:', error);
      } finally {
        setCargando(false);
      }
    };
    cargarSesion();
  }, []);

  const iniciarSesion = async (token, usuario, perfil = null) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('usuarioInfo', JSON.stringify(usuario));
    if (perfil) {
      await AsyncStorage.setItem('tipoPerfil', perfil);
      setTipoPerfil(perfil);
    }
    setUsuarioToken(token);
    setUsuarioInfo(usuario);
  };

  const cambiarPerfil = async (nuevoPerfil) => {
    await AsyncStorage.setItem('tipoPerfil', nuevoPerfil);
    setTipoPerfil(nuevoPerfil);
  };

  const cerrarSesion = async () => {
    await AsyncStorage.multiRemove(['token', 'usuarioInfo', 'tipoPerfil']);
    setUsuarioToken(null);
    setUsuarioInfo(null);
    setTipoPerfil(null);
  };

  const actualizarUsuario = async (nuevosDatos) => {
    const actualizado = { ...usuarioInfo, ...nuevosDatos };
    await AsyncStorage.setItem('usuarioInfo', JSON.stringify(actualizado));
    setUsuarioInfo(actualizado);
  };

  const authContext = {
    iniciarSesion,
    cambiarPerfil,
    cerrarSesion,
    actualizarUsuario,
    token: usuarioToken,
    usuario: usuarioInfo,
    perfil: tipoPerfil,
    estaAutenticado: !!usuarioToken,
  };

  if (cargando) {
    return <PantallaCarga />;
  }

  const pantallaInicial = authContext.estaAutenticado ? 'Principal' : 'Login';

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={pantallaInicial}
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          {/* RUTAS PÚBLICAS */}
          <Stack.Screen name="Login" component={VistaLogin} />
          <Stack.Screen name="Registro" component={VistaRegistro} />
          <Stack.Screen name="MandarCorreo" component={VistaMandarCorreo} />
          <Stack.Screen name="VerificarCorreo" component={VistaVerificarCorreo} />
          <Stack.Screen name="CambiarContrasena" component={VistaCambiarContrasena} />

          {/* RUTAS PROTEGIDAS */}
          <Stack.Screen name="Principal" component={VistaPrincipal} />
          <Stack.Screen name="Familia" component={VistaFamilia} />
          <Stack.Screen name="Gastos" component={VistaGastos} />
          <Stack.Screen name="Horario" component={VistaHorario} />
          <Stack.Screen name="Medicinas" component={VistaMedicinas} />
          <Stack.Screen name="Preferencias" component={VistaPreferencias} />
          <Stack.Screen name="InfoAnciano" component={VistaInfoAnciano} />
          <Stack.Screen name="Calendario" component={VistaCalendario} />
          <Stack.Screen name="Notificaciones" component={VistaNotificaciones} />
          <Stack.Screen name="CrearAnciano" component={VistaCrearAnciano} />

          {/* ❌ Vistas de perfiles específicos - COMENTADAS porque no existen */}
          {/* <Stack.Screen name="PerfilProfesional" component={VistaPerfilProfesional} /> */}
          {/* <Stack.Screen name="PerfilAnciano" component={VistaPerfilAnciano} /> */}
          {/* <Stack.Screen name="PrincipalAnciano" component={VistaPrincipalAnciano} /> */}
          {/* <Stack.Screen name="PrincipalProfesional" component={VistaPrincipalProfesional} /> */}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}