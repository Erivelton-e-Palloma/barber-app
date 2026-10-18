import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function SignUp({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- MÁSCARA DE NOME (Somente Letras) ---
  const handleNameChange = (text: string) => {
    const filtered = text.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
    setName(filtered);
  };

  // --- MÁSCARA DE TELEFONE (DD) 9XXXX-XXXX ---
  const handlePhoneChange = (text: string) => {
    let formatted = text.replace(/\D/g, ''); // Remove tudo que não é número
    
    if (formatted.length > 11) {
        formatted = formatted.substring(0, 11);
    }
    
    if (formatted.length > 2) {
        formatted = `(${formatted.substring(0, 2)}) ${formatted.substring(2)}`;
    }
    if (formatted.length > 10) {
        formatted = `${formatted.substring(0, 10)}-${formatted.substring(10)}`;
    }
    
    setPhone(formatted);
  };

  function showAlert(title: string, msg: string) {
      if (Platform.OS === 'web') alert(`${title}\n${msg}`);
      else Alert.alert(title, msg);
  }

  async function handleSignUp() {
    if (name.trim() === '' || phone === '' || email === '' || password === '' || confirmPassword === '') {
      showAlert("Atenção", "Preencha todos os campos.");
      return;
    }

    // Valida se o telefone tem todos os dígitos (DDD + 9 números)
    if (phone.replace(/\D/g, '').length < 11) {
      showAlert("Telefone Inválido", "Digite um WhatsApp válido com DDD.");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("Erro", "As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      showAlert("Erro", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      // 1. Cria o usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Atualiza o perfil nativo com o Nome
      await updateProfile(user, { displayName: name });

      // 3. Salva os dados completos na coleção 'usuarios' do Firestore (Para usarmos no Agendamento depois!)
      await setDoc(doc(db, "usuarios", user.uid), {
          nome: name,
          telefone: phone,
          email: email.trim(),
          createdAt: new Date().toISOString()
      });

      showAlert("Sucesso!", "Conta criada com sucesso.");
      // O App.tsx vai detectar o login automático e levar para a Home automaticamente

    } catch (error: any) {
      console.log(error);
      let msg = "Não foi possível criar a conta.";
      if (error.code === 'auth/email-already-in-use') msg = "Este email já está em uso.";
      if (error.code === 'auth/invalid-email') msg = "Email inválido.";
      showAlert("Erro", msg);
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-zinc-900 justify-center px-8">
      
      <View className="items-center mb-8">
        <Text className="text-white text-3xl font-bold">Crie sua Conta</Text>
        <Text className="text-zinc-400 mt-2">É rápido e gratuito.</Text>
      </View>

      {/* NOVO CAMPO: NOME COMPLETO */}
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="Nome Completo"
        placeholderTextColor="#71717a"
        autoCapitalize="words"
        value={name}
        onChangeText={handleNameChange}
      />

      {/* NOVO CAMPO: WHATSAPP */}
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="WhatsApp (ex: 11 99999-9999)"
        placeholderTextColor="#71717a"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={handlePhoneChange}
        maxLength={15}
      />

      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="Seu melhor Email"
        placeholderTextColor="#71717a"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View className="flex-row items-center bg-zinc-800 rounded-xl mb-4 border border-zinc-700">
        <TextInput 
          className="flex-1 text-white p-4" 
          placeholder="Crie uma Senha"
          placeholderTextColor="#71717a"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-4">
            <Text className="text-zinc-400 text-lg">{showPassword ? "🙈" : "👁️"}</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center bg-zinc-800 rounded-xl mb-8 border border-zinc-700">
        <TextInput 
          className="flex-1 text-white p-4" 
          placeholder="Confirme a Senha"
          placeholderTextColor="#71717a"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <TouchableOpacity 
        className="bg-orange-500 p-4 rounded-xl items-center mb-6"
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">CADASTRAR E ENTRAR</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text className="text-zinc-500 text-center">
            Já tem conta? <Text className="text-orange-500 font-bold">Faça Login</Text>
        </Text>
      </TouchableOpacity>

    </View>
  );
}