import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { db } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

export default function SuperAdmin({ navigation }: any) {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newShopName, setNewShopName] = useState('');
  const [newShopCode, setNewShopCode] = useState('');
  const [newShopEmail, setNewShopEmail] = useState('');

  async function fetchShops() {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "barbearias"));
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setShops(list);
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Falha ao buscar lojas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchShops();
  }, []);

  async function handleCreateShop() {
    if (newShopName === '' || newShopCode === '' || newShopEmail === '') {
      Alert.alert("Erro", "Preencha Nome, Código e Email do Dono.");
      return;
    }

    try {
        const q = query(collection(db, "barbearias"), where("codigo", "==", newShopCode.toUpperCase()));
        const check = await getDocs(q);
        
        if (!check.empty) {
            Alert.alert("Erro", "Este código já está em uso!");
            return;
        }

        await addDoc(collection(db, "barbearias"), {
            nome: newShopName,
            codigo: newShopCode.toUpperCase(),
            emailDono: newShopEmail.toLowerCase().trim(),
            ativo: true,
            createdAt: new Date().toISOString()
        });

        Alert.alert("Sucesso", `Barbearia ${newShopName} criada!`);
        setNewShopName('');
        setNewShopCode('');
        setNewShopEmail('');
        fetchShops();

    } catch (error) {
        Alert.alert("Erro", "Não foi possível criar.");
    }
  }

  async function toggleShopStatus(id: string, currentStatus: boolean) {
      try {
          const shopRef = doc(db, "barbearias", id);
          await updateDoc(shopRef, { ativo: !currentStatus });
          const updatedShops = shops.map(shop => 
             shop.id === id ? {...shop, ativo: !currentStatus} : shop
          );
          setShops(updatedShops);
      } catch (error) { Alert.alert("Erro", "Falha ao atualizar."); }
  }

  // --- CORREÇÃO DO BOTÃO DE EXCLUIR (WEB/MOBILE) ---
  function confirmDelete(id: string, name: string) {
    if (Platform.OS === 'web') {
        const confirm = window.confirm(`Apagar "${name}" permanentemente?`);
        if (confirm) {
            handleDeleteShop(id);
        }
    } else {
        Alert.alert("Excluir", `Apagar "${name}" permanentemente?`, [
            { text: "Cancelar", style: "cancel" },
            { text: "Sim, Excluir", style: "destructive", onPress: () => handleDeleteShop(id) }
        ]);
    }
  }

  async function handleDeleteShop(id: string) {
    try {
      await deleteDoc(doc(db, "barbearias", id));
      setShops(prev => prev.filter(shop => shop.id !== id));
    } catch (error) { Alert.alert("Erro ao excluir."); }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center justify-between mb-8">
        <TouchableOpacity onPress={() => navigation.navigate('AccessScreen')}>
            <Text className="text-zinc-500 font-bold">Sair</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Painel Super Admin 👑</Text>
        <View className="w-8" /> 
      </View>

      <View className="bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-700">
        <Text className="text-white font-bold mb-3">🏭 Criar Nova Barbearia</Text>
        
        <TextInput 
            className="bg-zinc-900 text-white p-3 rounded-lg mb-3 border border-zinc-700"
            placeholder="Nome da Barbearia"
            placeholderTextColor="#71717a"
            value={newShopName}
            onChangeText={setNewShopName}
        />
        <TextInput 
            className="bg-zinc-900 text-white p-3 rounded-lg mb-3 border border-zinc-700"
            placeholder="Código (ex: NAVALHA)"
            placeholderTextColor="#71717a"
            autoCapitalize="characters"
            value={newShopCode}
            onChangeText={setNewShopCode}
        />
        <TextInput 
            className="bg-zinc-900 text-white p-3 rounded-lg mb-3 border border-zinc-700"
            placeholder="Email do Dono (Admin)"
            placeholderTextColor="#71717a"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newShopEmail}
            onChangeText={setNewShopEmail}
        />

        <TouchableOpacity 
            className="bg-green-600 p-3 rounded-lg items-center"
            onPress={handleCreateShop}
        >
            <Text className="text-white font-bold">Criar Sistema (+)</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-zinc-400 font-bold mb-2 uppercase text-xs">Sistemas Ativos</Text>

      {loading ? (
        <ActivityIndicator color="#f97316" />
      ) : (
        <FlatList 
            data={shops}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
                <View className="bg-zinc-800 p-4 rounded-xl mb-3 border border-zinc-700">
                    <View className="flex-row justify-between items-center mb-2">
                        <View>
                            <Text className="text-white font-bold text-lg">{item.nome}</Text>
                            <Text className="text-orange-500 font-bold">{item.codigo}</Text>
                        </View>
                        <Switch 
                            trackColor={{ false: "#767577", true: "#f97316" }}
                            thumbColor={item.ativo ? "#fff" : "#f4f3f4"}
                            onValueChange={() => toggleShopStatus(item.id, item.ativo)}
                            value={item.ativo}
                        />
                    </View>
                    
                    <View className="flex-row justify-between items-center border-t border-zinc-700 pt-2">
                        <Text className="text-zinc-500 text-xs">Admin: {item.emailDono}</Text>
                        <TouchableOpacity onPress={() => confirmDelete(item.id, item.nome)}>
                            <Text className="text-red-500 text-xs font-bold">Excluir 🗑️</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        />
      )}
    </View>
  );
}