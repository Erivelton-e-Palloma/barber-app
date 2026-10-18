import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth'; 
import { auth, db } from '../config/firebase'; 
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home({ navigation }: any) {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [shopName, setShopName] = useState('');
  const [isOwner, setIsOwner] = useState(false); 
  
  // Estados do Cartão Fidelidade
  const [pontos, setPontos] = useState(0);
  const [meta, setMeta] = useState(10);

  async function checkPermissionAndLoyalty() {
      const name = await AsyncStorage.getItem('@delp_shopName');
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      const ownerEmail = await AsyncStorage.getItem('@delp_ownerEmail');
      const currentUser = auth.currentUser;

      setShopName(name || "Barbearia");

      // Verifica se é dono
      if (currentUser?.email && ownerEmail && currentUser.email.toLowerCase() === ownerEmail.toLowerCase()) {
          setIsOwner(true); 
      } else {
          setIsOwner(false);
      }

      // Busca os dados da Fidelidade
      if (shopId && currentUser) {
          try {
              // 1. Puxa a meta da barbearia
              const shopSnap = await getDoc(doc(db, "barbearias", shopId));
              if (shopSnap.exists() && shopSnap.data().metaFidelidade) {
                  setMeta(shopSnap.data().metaFidelidade);
              }

              // 2. Puxa os pontos do cliente logado
              const userSnap = await getDoc(doc(db, "usuarios", currentUser.uid));
              if (userSnap.exists() && userSnap.data().pontosFidelidade) {
                  setPontos(userSnap.data().pontosFidelidade);
              }
          } catch (error) {
              console.log("Erro ao buscar dados de fidelidade:", error);
          }
      }
  }

  // useFocusEffect recarrega os dados toda vez que o cliente volta pra Home
  useFocusEffect(
    useCallback(() => {
        checkPermissionAndLoyalty();
    }, [])
  );

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
        if (window.confirm("Deseja realmente sair do sistema?")) performLogout();
    } else {
        Alert.alert("Sair", "Deseja sair da sua conta?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim, Sair", onPress: performLogout }
        ]);
    }
  }

  // Cálculo da barra de progresso
  const progresso = Math.min((pontos / meta) * 100, 100);

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

      {/* NOVO: CARTÃO FIDELIDADE DIGITAL */}
      <View className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-5 rounded-2xl mb-6 border border-orange-500/30 shadow-lg">
          <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">🎁</Text>
                  <Text className="text-white font-bold text-lg">Cartão Fidelidade</Text>
              </View>
              <Text className="text-orange-500 font-bold text-xl">{pontos}/{meta}</Text>
          </View>
          
          {/* Barra de Progresso */}
          <View className="h-3 bg-zinc-700 rounded-full w-full overflow-hidden mb-2">
              <View 
                  className="h-full bg-orange-500 rounded-full" 
                  style={{ width: `${progresso}%` }} 
              />
          </View>

          {pontos >= meta ? (
              <Text className="text-green-400 font-bold text-sm text-center mt-1">🎉 Parabéns! Você atingiu a meta e ganhou o prêmio!</Text>
          ) : (
              <Text className="text-zinc-400 text-sm">Faltam <Text className="text-white font-bold">{meta - pontos}</Text> cortes para o seu brinde.</Text>
          )}
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

      <View className="bg-zinc-800 p-4 rounded-xl mb-6 flex-row items-center border border-zinc-700">
        <Text className="text-2xl mr-3">📍</Text>
        <View>
            <Text className="text-white font-bold">Localização</Text>
            <Text className="text-zinc-400 text-sm mt-1">Av. Apolônio Sales, 1049 - Paulo Afonso</Text>
        </View>
      </View>

      <Text className="text-white text-xl font-bold mb-4">Nossos Barbeiros(as)</Text>

      <FlatList
        data={barbers}
        keyExtractor={(item) => item.id}
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