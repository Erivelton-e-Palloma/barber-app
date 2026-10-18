import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { db } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageServices({ navigation }: any) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  async function fetchServices() {
    setLoading(true);
    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      if (!shopId) { setLoading(false); return; }

      const q = query(collection(db, "servicos"), where("shopId", "==", shopId));
      const querySnapshot = await getDocs(q);
      
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServices(lista);
    } catch (error) { console.log(error); } finally { setLoading(false); }
  }

  useEffect(() => { if (isFocused) fetchServices(); }, [isFocused]);

  // --- CORREÇÃO DO BOTÃO DE EXCLUIR (WEB/MOBILE) ---
  function confirmDelete(id: string, nome: string) {
    if (Platform.OS === 'web') {
        const confirm = window.confirm(`Remover o serviço "${nome}"?`);
        if (confirm) {
            handleDelete(id);
        }
    } else {
        Alert.alert("Excluir", `Remover "${nome}"?`, [
            { text: "Cancelar", style: "cancel" },
            { text: "Sim", style: "destructive", onPress: () => handleDelete(id) }
        ]);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoc(doc(db, "servicos", id));
      fetchServices();
    } catch (error) { Alert.alert("Erro ao excluir"); }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Serviços</Text>
      </View>

      <TouchableOpacity 
        className="bg-orange-500 p-4 rounded-xl mb-6 items-center flex-row justify-center"
        onPress={() => navigation.navigate('AddService')}
      >
        <Text className="text-white font-bold text-lg mr-2">+</Text>
        <Text className="text-white font-bold text-lg">Adicionar Novo Serviço</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center justify-between border border-zinc-700">
              <View>
                <Text className="text-white font-bold text-lg">{item.nome}</Text>
                <Text className="text-zinc-400 text-sm">R$ {item.preco?.toFixed(2)} • {item.duracao} min</Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity onPress={() => navigation.navigate('AddService', { serviceToEdit: item })} className="bg-blue-500/20 p-3 rounded-lg mr-2">
                  <Text>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item.id, item.nome)} className="bg-red-500/20 p-3 rounded-lg">
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}