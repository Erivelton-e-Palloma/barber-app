import { NativeWindStyleSheet } from "nativewind";

// --- O TRUQUE MÁGICO PARA WEB 🌐 ---
NativeWindStyleSheet.setOutput({
  default: "native",
});
import UserProfile from './src/screens/UserProfile';
import ManageProducts from './src/screens/ManageProducts';
import ManageStoreOrders from './src/screens/ManageStoreOrders';
import ManagePlans from './src/screens/ManagePlans';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  }),
});

// Importação das Telas
import AccessScreen from './src/screens/AccessScreen'; 
import Login from './src/screens/Login';
import Home from './src/screens/Home';
import AdminPanel from './src/screens/AdminPanel';
import AddBarber from './src/screens/AddBarber';
import AddService from './src/screens/AddService';
import ManageBarbers from './src/screens/ManageBarbers';
import ManageServices from './src/screens/ManageServices';
import BarberProfile from './src/screens/BarberProfile';
import Booking from './src/screens/Booking';
import MyAppointments from './src/screens/MyAppointments';
import FinancialScreen from './src/screens/FinancialScreen';
import CustomersList from './src/screens/CustomersList';
import SignUp from './src/screens/SignUp';
import SuperAdmin from './src/screens/SuperAdmin';
import ManageVIPs from './src/screens/ManageVIPs';

const Stack = createNativeStackNavigator();

// --- FUNÇÃO PARA GERAR O TOKEN DE NOTIFICAÇÃO ---
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Falha ao obter permissão para push notifications!');
      return;
    }
    
    try {
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;
        
        console.log("\n=========================================");
        console.log("🔔 SEU EXPO PUSH TOKEN É:");
        console.log(token);
        console.log("=========================================\n");
        
    } catch (e) {
        console.log("Erro ao gerar token:", e);
    }
  } else {
    console.log('\n⚠️ Você precisa usar um dispositivo físico para testar Push Notifications.\n');
  }

  return token;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeApp() {
      try {
        if (Platform.OS !== 'web') {
            await registerForPushNotificationsAsync();
        }
      } catch (error) {
        console.log("Erro inicial:", error);
      }

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false); 
      });

      return unsubscribe;
    }

    initializeApp();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-900 justify-center items-center">
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="AdminPanel" component={AdminPanel} />
            <Stack.Screen name="FinancialScreen" component={FinancialScreen} /> 
            <Stack.Screen name="AddBarber" component={AddBarber} />
            <Stack.Screen name="AddService" component={AddService} />
            <Stack.Screen name="ManageBarbers" component={ManageBarbers} />
            <Stack.Screen name="ManageServices" component={ManageServices} />
            <Stack.Screen name="BarberProfile" component={BarberProfile} />
            <Stack.Screen name="Booking" component={Booking} />
            <Stack.Screen name="MyAppointments" component={MyAppointments} />
            <Stack.Screen name="CustomersList" component={CustomersList} />
            <Stack.Screen name="ManageVIPs" component={ManageVIPs} />
            <Stack.Screen name="ManagePlans" component={ManagePlans} /> 
            <Stack.Screen name="ManageProducts" component={ManageProducts} />
            <Stack.Screen name="ManageStoreOrders" component={ManageStoreOrders} />
            <Stack.Screen name="UserProfile" component={UserProfile} />
          </>
        ) : (
          <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="AccessScreen" component={AccessScreen} />
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="SuperAdmin" component={SuperAdmin} />
              <Stack.Screen name="SignUp" component={SignUp} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}