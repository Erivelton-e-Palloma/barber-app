import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function BarberProfile({ route, navigation }: any) {
  const { barber } = route.params; 
  
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedService, setSelectedService] = useState<any>(null);

  function showAlert(title: string, msg: string) {
      if (Platform.OS === 'web') alert(`${title}\n${msg}`);
      else Alert.alert(title, msg);
  }

  useEffect(() => {
    async function fetchServices() {
      try {
        const shopId = await AsyncStorage.getItem('@delp_shopId');

        if (!shopId) {
            console.log("Loja não encontrada");
            setLoading(false);
            return;
        }

        const q = query(collection(db, "servicos"), where("shopId", "==", shopId));
        const querySnapshot = await getDocs(q);
        
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setServices(lista);
      } catch (error) {
        console.log("Erro ao buscar serviços:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  function handleBooking() {
    if (!selectedService) {
      showAlert("Ops!", "Selecione um serviço para continuar.");
      return;
    }
    
    navigation.navigate('Booking', { 
      barber: barber, 
      service: selectedService 
    });
  }

  const formatPrice = (value: any) => {
    return Number(value).toFixed(2).replace('.', ',');
  };

  return (
    <View className="flex-1 bg-zinc-900">
      {/* CABEÇALHO DO BARBEIRO ATUALIZADO */}
      <View className="items-center pt-12 pb-6 bg-zinc-800 rounded-b-3xl shadow-lg">
        <Image source={{ uri: barber.foto }} className="w-32 h-32 rounded-full border-2 border-orange-500 mb-4" />
        <Text className="text-white text-2xl font-bold">{barber.nome}</Text>
        <Text className="text-zinc-400 text-lg">{barber.especialidade}</Text>
        
        {/* MENSAGEM NOVA PARA INSTRUIR O CLIENTE */}
        <Text className="text-orange-500 text-sm font-bold mt-2 animate-pulse">
           👇 Toque em um serviço abaixo para agendar
        </Text>
        
        <Text className="text-orange-400 font-bold mt-2">⭐ {barber.nota || "5.0"} • 120 Avaliações</Text>
      </View>

      {/* BLOCO DO ENDEREÇO DA LOJA */}
      <View className="px-6 mt-6 mb-2">
        <View className="bg-zinc-800 p-4 rounded-xl flex-row items-center border border-zinc-700">
            <Text className="text-2xl mr-3">📍</Text>
            <View>
                <Text className="text-white font-bold">Localização</Text>
                {/* O Endereço fixo que depois puxaremos do banco */}
                <Text className="text-zinc-400 text-sm mt-1">Av. Apolônio Sales, 1049 - Paulo Afonso</Text>
            </View>
        </View>
      </View>

      <Text className="text-white text-xl font-bold px-6 mt-4 mb-2">Catálogo de Serviços</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" className="mt-10" />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          className="px-6"
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => {
            const isSelected = selectedService?.id === item.id;
            
            return (
              <TouchableOpacity 
                onPress={() => setSelectedService(item)}
                className={`p-4 rounded-xl mb-3 flex-row justify-between items-center border 
                  ${isSelected ? 'bg-zinc-700 border-orange-500' : 'bg-zinc-800 border-zinc-700'}`}
              >
                <View>
                  <Text className={`text-lg font-bold ${isSelected ? 'text-orange-500' : 'text-white'}`}>
                    {item.nome}
                  </Text>
                  <Text className="text-zinc-400 text-sm">🕒 {item.duracao} min</Text>
                </View>
                
                <Text className="text-orange-500 text-lg font-bold">R$ {formatPrice(item.preco)}</Text>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={() => (
             <Text className="text-zinc-500 text-center mt-4">
               Nenhum serviço disponível no momento.
             </Text>
          )}
        />
      )}
      
      {selectedService && (
        <View className="p-6 absolute bottom-0 w-full bg-zinc-900/95 border-t border-zinc-800">
          <TouchableOpacity 
            onPress={handleBooking}
            className="bg-orange-500 p-4 rounded-xl items-center shadow-lg"
          >
            <Text className="text-white font-bold text-lg">Escolher Horário ➝</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()} className="absolute top-10 left-4 bg-black/50 p-2 rounded-full">
        <Text className="text-white font-bold">⬅ Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}