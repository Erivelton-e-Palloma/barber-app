import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function AddBarber({ navigation, route }: any) {
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [foto, setFoto] = useState(''); 

  const [loading, setLoading] = useState(false);

  const barberToEdit = route.params?.barberToEdit;
  const isEditing = !!barberToEdit;

  const gradeHorarios = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", 
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
  ];

  useEffect(() => {
    if (isEditing) {
      navigation.setOptions({ title: 'Editar Profissional' });
      setNome(barberToEdit.nome);
      setEspecialidade(barberToEdit.especialidade);
      setChavePix(barberToEdit.chavePix || '');
      setFoto(barberToEdit.foto || '');
    }
  }, [barberToEdit]);

  async function handleSave() {
    if (nome === '' || especialidade === '') {
      Alert.alert("Erro", "Por favor, preencha o nome e a especialidade.");
      return;
    }

    setLoading(true);

    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      
      if (!shopId) {
        Alert.alert("Erro", "Barbearia não identificada. Faça login novamente.");
        setLoading(false);
        return;
      }

      const dataToSave = {
        nome: nome,
        especialidade: especialidade,
        foto: foto || "https://cdn-icons-png.flaticon.com/512/1995/1995515.png",
        chavePix: chavePix 
      };

      if (isEditing) {
         const barberRef = doc(db, "barbeiros", barberToEdit.id);
         await updateDoc(barberRef, { ...dataToSave, horarios: gradeHorarios });
         Alert.alert("Sucesso!", "Dados do barbeiro atualizados!");
      } else {
         await addDoc(collection(db, "barbeiros"), {
            ...dataToSave,
            shopId: shopId, 
            nota: 5.0,
            horarios: gradeHorarios 
         });
         Alert.alert("Sucesso!", "Barbeiro cadastrado!");
      }
      
      navigation.goBack();
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Não foi possível salvar o barbeiro.");
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
            {isEditing ? 'Editar Profissional' : 'Novo Barbeiro'}
        </Text>
      </View>

      <Text className="text-zinc-400 mb-2">Nome do Profissional</Text>
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="Ex: Pedro Santos"
        placeholderTextColor="#71717a"
        value={nome}
        onChangeText={setNome}
      />

      <Text className="text-zinc-400 mb-2">Especialidade</Text>
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="Ex: Cortes Degradê e Barba"
        placeholderTextColor="#71717a"
        value={especialidade}
        onChangeText={setEspecialidade}
      />

      <Text className="text-zinc-400 mb-2">Chave Pix do Barbeiro (Para receber 50%)</Text>
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700"
        placeholder="CPF, Email, Telefone ou Aleatória"
        placeholderTextColor="#71717a"
        value={chavePix}
        onChangeText={setChavePix}
      />

      <Text className="text-zinc-400 mb-2">Link da Foto (URL)</Text>
      <TextInput 
        className="bg-zinc-800 text-white p-4 rounded-xl mb-6 border border-zinc-700"
        placeholder="Cole o link da imagem aqui (opcional)"
        placeholderTextColor="#71717a"
        value={foto}
        onChangeText={setFoto}
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
             {isEditing ? '💾 Atualizar Barbeiro' : '💾 Salvar Barbeiro'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}