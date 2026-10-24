import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Login({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function showAlert(title: string, message: string) {
      if (Platform.OS === 'web') {
          alert(`${title}\n\n${message}`);
      } else {
          Alert.alert(title, message);
      }
  }

  async function handleLogin() {
    if (email === '' || password === '') {
      showAlert("Atenção", "Preencha email e senha");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.log(error);
      let msg = "Não foi possível entrar.";
      
      if (error.code === 'auth/invalid-email') msg = "Email inválido.";
      if (error.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
      if (error.code === 'auth/wrong-password') msg = "Senha incorreta.";
      if (error.code === 'auth/invalid-credential') msg = "Credenciais inválidas (Email ou Senha).";
      if (error.code === 'auth/too-many-requests') msg = "Muitas tentativas. Tente mais tarde.";

      showAlert("Erro", msg);
      setLoading(false); 
    }
  }

  // NOVA FUNÇÃO: Força o reset da pilha de navegação
  async function handleTrocarBarbearia() {
      try {
          await AsyncStorage.removeItem('@delp_shopId');
          await AsyncStorage.removeItem('@delp_shopName');
          await AsyncStorage.removeItem('@delp_ownerEmail');
          
          navigation.reset({
              index: 0,
              routes: [{ name: 'AccessScreen' }],
          });
          
      } catch (error) {
          console.log("Erro ao limpar dados:", error);
      }
  }

  return (
    <View className="flex-1 bg-zinc-900 justify-center px-8">
      
      <View className="items-center mb-10">
        <Text className="text-white text-3xl font-bold">
            <Text className="text-white">Elite</Text>
            <Text className="text-orange-500">Barber</Text>
        </Text>
        <Text className="text-zinc-400 mt-2">Seu estilo, no seu tempo.</Text>
      </View>

      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="Email"
        placeholderTextColor="#71717a"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View className="flex-row items-center bg-zinc-800 rounded-xl mb-6 border border-zinc-700">
        <TextInput 
          className="flex-1 text-white p-4" 
          placeholder="Senha"
          placeholderTextColor="#71717a"
          secureTextEntry={!showPassword} 
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            className="p-4"
        >
            <Text className="text-zinc-400 text-lg">
                {showPassword ? "🙈" : "👁️"}
            </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        className="bg-orange-500 p-4 rounded-xl items-center mb-6"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">ENTRAR</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text className="text-zinc-500 text-center">
            Não tem conta? <Text className="text-orange-500 font-bold">Cadastre-se</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleTrocarBarbearia} className="mt-8">
        <Text className="text-zinc-600 text-center text-xs underline">
            Trocar de Barbearia (Código)
        </Text>
      </TouchableOpacity>

    </View>
  );
}