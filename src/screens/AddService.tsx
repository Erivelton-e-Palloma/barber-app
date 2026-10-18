import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <--- Import SaaS

export default function AddService({ navigation, route }: any) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('');
  const [loading, setLoading] = useState(false);

  // Verifica se veio algum serviço para editar
  const serviceToEdit = route.params?.serviceToEdit;
  const isEditing = !!serviceToEdit;

  useEffect(() => {
    if (isEditing) {
      navigation.setOptions({ title: 'Editar Serviço' });
      setNome(serviceToEdit.nome);
      setPreco(serviceToEdit.preco.toString());
      setDuracao(serviceToEdit.duracao.toString());
    }
  }, [serviceToEdit]);

  async function handleSave() {
    if (nome === '' || preco === '' || duracao === '') {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      // 1. SaaS: Busca o ID da barbearia na memória
      const shopId = await AsyncStorage.getItem('@delp_shopId');

      if (!shopId) {
        Alert.alert("Erro", "Barbearia não identificada. Faça login novamente.");
        setLoading(false);
        return;
      }

      const dataToSave = {
        nome: nome,
        preco: parseFloat(preco.replace(',', '.')),
        duracao: parseInt(duracao),
      };

      if (isEditing) {
        // MODO EDIÇÃO: Atualiza o documento (não muda o shopId)
        const serviceRef = doc(db, "servicos", serviceToEdit.id);
        await updateDoc(serviceRef, dataToSave);
        Alert.alert("Sucesso!", "Serviço atualizado com sucesso!");
      } else {
        // MODO CRIAÇÃO: Cria um novo com o carimbo da loja
        await addDoc(collection(db, "servicos"), {
            ...dataToSave,
            shopId: shopId // <--- A MÁGICA DO SAAS
        });
        Alert.alert("Sucesso!", "Serviço cadastrado na unidade!");
      }

      navigation.goBack(); 
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">
          {isEditing ? 'Editar Serviço' : 'Novo Serviço'}
        </Text>
      </View>

      <Text className="text-zinc-400 mb-2">Nome do Serviço</Text>
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="Ex: Corte Degradê"
        placeholderTextColor="#71717a"
        value={nome}
        onChangeText={setNome}
      />

      <Text className="text-zinc-400 mb-2">Preço (R$)</Text>
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="Ex: 35.00"
        placeholderTextColor="#71717a"
        keyboardType="numeric"
        value={preco}
        onChangeText={setPreco}
      />

      <Text className="text-zinc-400 mb-2">Duração (minutos)</Text>
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-6 border border-zinc-700"
        placeholder="Ex: 30"
        placeholderTextColor="#71717a"
        keyboardType="numeric"
        value={duracao}
        onChangeText={setDuracao}
      />

      <TouchableOpacity 
        className="bg-orange-500 p-4 rounded-xl items-center"
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg">
            {isEditing ? '💾 Atualizar Serviço' : '💾 Salvar'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}