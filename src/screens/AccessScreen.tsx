import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function AccessScreen({ navigation }: any) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkExisting() {
      const id = await AsyncStorage.getItem('@delp_shopId');
      if (id) {
        navigation.replace('Login');
      }
      setChecking(false);
    }
    checkExisting();
  }, []);

  async function handleAccess() {
    const cod = codigo.trim().toUpperCase();
    if (!cod) return;

    if (cod === 'DELPMASTER') {
      setCodigo('');
      navigation.navigate('SuperAdmin');
      return;
    }

    setLoading(true);
    try {
      const shopRef = doc(db, "barbearias", cod);
      const shopSnap = await getDoc(shopRef);

      if (shopSnap.exists()) {
        const data = shopSnap.data();
        
        await AsyncStorage.setItem('@delp_shopId', cod);
        await AsyncStorage.setItem('@delp_shopName', data.nome);
        if (data.ownerEmail) await AsyncStorage.setItem('@delp_ownerEmail', data.ownerEmail);

        setCodigo('');
        navigation.replace('Login'); // Ajustado para não acumular telas
      } else {
        if (Platform.OS === 'web') alert("Código não encontrado. Verifique se digitou corretamente.");
        else Alert.alert("Não Encontrado", "Código da barbearia inválido.");
      }
    } catch (error) {
      console.log(error);
      if (Platform.OS === 'web') alert("Erro ao acessar o sistema.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
      return <View className="flex-1 bg-[#1a1a1c] justify-center items-center"><ActivityIndicator color="#f97316" size="large" /></View>;
  }

  return (
    <View className="flex-1 bg-[#1a1a1c] justify-center items-center px-6">
      <View className="items-center mb-8 mt-10">
        {/* CORREÇÃO APLICADA AQUI: Espaçamento numérico nativo em vez de classes de texto */}
        <Text className="text-orange-500 text-6xl font-extrabold" style={{ letterSpacing: 2 }}>DELP</Text>
        <Text className="text-white text-xl font-semibold mt-1" style={{ letterSpacing: 4 }}>SYSTEM</Text>
      </View>

      <Text className="text-zinc-400 text-sm mb-6 text-center">
        Digite o código da sua barbearia para acessar
      </Text>

      <View className="w-full max-w-md">
        <TextInput
          value={codigo}
          onChangeText={setCodigo}
          placeholder="CÓDIGO"
          placeholderTextColor="#52525b"
          autoCapitalize="characters"
          className="bg-[#27272a] text-zinc-300 text-center font-bold text-lg p-4 rounded-xl mb-4 border border-[#3f3f46]"
        />

        <TouchableOpacity
          onPress={handleAccess}
          disabled={loading}
          className="bg-orange-500 p-4 rounded-xl items-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">ACESSAR 🚀</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text className="text-zinc-600 text-xs absolute bottom-8">v1.0.6 EriBrasil</Text>
    </View>
  );
}