import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Alert, Platform } from 'react-native';
import { signOut } from 'firebase/auth'; 
import { auth, db } from '../config/firebase'; 
import { collection, getDocs, query, where } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home({ navigation }: any) {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [shopName, setShopName] = useState('');
  const [isOwner, setIsOwner] = useState(false); 

  useEffect(() => {
    async function checkPermission() {
        const name = await AsyncStorage.getItem('@delp_shopName');
        const ownerEmail = await AsyncStorage.getItem('@delp_ownerEmail');
        const currentUserEmail = auth.currentUser?.email;

        setShopName(name || "Barbearia");

        if (currentUserEmail && ownerEmail && currentUserEmail.toLowerCase() === ownerEmail.toLowerCase()) {
            setIsOwner(true); 
        } else {
            setIsOwner(false);
        }
    }
    checkPermission();
  }, []);

  useEffect(() => {
    async function fetchBarbers() {
      try {
        const shopId = await AsyncStorage.getItem('@delp_shopId');
        if (!shopId) return;

        const q = query(collection(db, "barbeiros"), where("shopId", "==", shopId));
        const querySnapshot = await getDocs(q);
        
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBarbers(lista);
      } catch (error) {
        console.log(error);
      }
    }
    fetchBarbers();
  }, []);

  async function performLogout() {
      try {
        await signOut(auth);

        if (Platform.OS === 'web') {
            window.localStorage.clear();
            window.sessionStorage.clear();
            window.location.href = "/";
        }
      } catch (error) {
        console.log("Erro ao sair:", error);
        alert("Não foi possível sair no momento.");
      }
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
        const confirmou = window.confirm("Deseja realmente sair do sistema?");
        if (confirmou) {
            performLogout();
        }
    } else {
        Alert.alert("Sair", "Deseja sair da sua conta?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim, Sair", onPress: performLogout }
        ]);
    }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-zinc-400 text-sm">Olá, Bem-vindo</Text>
          <Text className="text-white text-3xl font-bold">{shopName}</Text>
        </View>
        <TouchableOpacity 
          onPress={handleLogout}
          className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700"
        >
          <Text className="text-red-400 font-bold">Sair</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-6">
        <TouchableOpacity 
          className="bg-orange-500 p-4 rounded-xl mb-3 items-center"
          onPress={() => navigation.navigate('MyAppointments')}
        >
          <Text className="text-white font-bold text-lg">📅 Meus Agendamentos</Text>
        </TouchableOpacity>

        {isOwner && (
            <TouchableOpacity 
            className="bg-zinc-800 p-4 rounded-xl items-center border border-zinc-700"
            onPress={() => navigation.navigate('AdminPanel')}
            >
            <Text className="text-orange-500 font-bold text-lg">⚙️ Painel Admin</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* NOVO: BLOCO DE ENDEREÇO DA BARBEARIA */}
      <View className="bg-zinc-800 p-4 rounded-xl mb-6 flex-row items-center border border-zinc-700">
        <Text className="text-2xl mr-3">📍</Text>
        <View>
            <Text className="text-white font-bold">Localização</Text>
            <Text className="text-zinc-400 text-sm mt-1">Av. Apolônio Sales, 1049 - Paulo Afonso</Text>
        </View>
      </View>

      {/* TÍTULO ATUALIZADO */}
      <Text className="text-white text-xl font-bold mb-4">Nossos Barbeiros(as)</Text>

      <FlatList
        data={barbers}
        keyExtractor={(item) => item.id}
        // Espaçamento extra no final para não colar no rodapé
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('BarberProfile', { barber: item })}
            className="bg-zinc-800 p-4 rounded-xl mb-4 flex-row items-center border border-zinc-700"
          >
            <Image 
              source={{ uri: item.foto }} 
              className="w-16 h-16 rounded-full mr-4 bg-zinc-700 border border-zinc-600" 
            />
            <View>
              <Text className="text-white font-bold text-lg">{item.nome}</Text>
              <Text className="text-zinc-400 text-sm">{item.especialidade}</Text>
              <Text className="text-orange-500 text-sm mt-1">⭐ {item.nota || "5.0"}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
            <Text className="text-zinc-500 mt-4 text-center">Nenhum barbeiro disponível.</Text>
        )}
      />
    </View>
  );
}