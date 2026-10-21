import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function BarberProfile({ route, navigation }: any) {
  const { barber } = route.params; 
  
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(barber.nota || "5.0");

  const [shopAddress, setShopAddress] = useState("Endereço não cadastrado");
  const [shopMapLink, setShopMapLink] = useState("");

  function showAlert(title: string, msg: string) {
      if (Platform.OS === 'web') alert(`${title}\n${msg}`);
      else Alert.alert(title, msg);
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const shopId = await AsyncStorage.getItem('@delp_shopId');

        if (!shopId) {
            setLoading(false);
            return;
        }

        const shopRef = doc(db, "barbearias", shopId);
        const shopSnap = await getDoc(shopRef);
        if (shopSnap.exists()) {
            const data = shopSnap.data();
            if (data.enderecoLoja) setShopAddress(data.enderecoLoja);
            if (data.linkMapsLoja) setShopMapLink(data.linkMapsLoja);
        }

        const qServicos = query(collection(db, "servicos"), where("shopId", "==", shopId));
        const snapServicos = await getDocs(qServicos);
        setServices(snapServicos.docs.map(d => ({ id: d.id, ...d.data() })));

        const qAvaliacoes = query(collection(db, "avaliacoes"), where("barbeiroId", "==", barber.id));
        const snapAvaliacoes = await getDocs(qAvaliacoes);
        const listaAvaliacoes = snapAvaliacoes.docs.map(d => d.data());
        
        listaAvaliacoes.sort((a, b) => new Date(b.dataAvaliacao).getTime() - new Date(a.dataAvaliacao).getTime());
        setReviews(listaAvaliacoes);

        if (listaAvaliacoes.length > 0) {
            const sum = listaAvaliacoes.reduce((acc, curr) => acc + curr.nota, 0);
            setAverageRating((sum / listaAvaliacoes.length).toFixed(1));
        }

      } catch (error) {
        console.log("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleService = (item: any) => {
    const isAlreadySelected = selectedServices.some(s => s.id === item.id);
    if (isAlreadySelected) setSelectedServices(selectedServices.filter(s => s.id !== item.id));
    else setSelectedServices([...selectedServices, item]);
  };

  function handleBooking() {
    if (selectedServices.length === 0) {
      showAlert("Ops!", "Selecione pelo menos um serviço para continuar.");
      return;
    }
    
    const totalPrice = selectedServices.reduce((sum, item) => sum + Number(item.preco), 0);
    const totalDuration = selectedServices.reduce((sum, item) => sum + Number(item.duracao), 0);
    const combinedNames = selectedServices.map(s => s.nome).join(' + ');

    navigation.navigate('Booking', { 
      barber: barber, 
      service: {
          id: combinedNames,
          nome: combinedNames,
          preco: totalPrice,
          duracao: totalDuration,
          originalList: selectedServices
      }
    });
  }

  const formatPrice = (value: any) => Number(value).toFixed(2).replace('.', ',');

  const totalCartPrice = selectedServices.reduce((sum, item) => sum + Number(item.preco), 0);
  const totalCartDuration = selectedServices.reduce((sum, item) => sum + Number(item.duracao), 0);

  const handleOpenMap = () => {
      if (shopMapLink) {
          Linking.openURL(shopMapLink).catch(() => showAlert("Erro", "Não foi possível abrir o link do mapa."));
      } else {
          showAlert("Aviso", "O barbeiro ainda não cadastrou o link do mapa.");
      }
  };

  const renderHeader = () => (
      <View>
          <View className="items-center pt-12 pb-6 bg-zinc-800 rounded-b-3xl shadow-lg">
            <Image source={{ uri: barber.foto }} className="w-32 h-32 rounded-full border-2 border-orange-500 mb-4" />
            <Text className="text-white text-2xl font-bold">{barber.nome}</Text>
            <Text className="text-zinc-400 text-lg">{barber.especialidade}</Text>
            
            <Text className="text-orange-500 text-sm font-bold mt-2 animate-pulse">
                👇 Toque nos serviços abaixo para agendar
            </Text>
            
            <Text className="text-orange-400 font-bold mt-2 text-lg">
                ⭐ {averageRating} <Text className="text-zinc-400 text-sm">({reviews.length} Avaliações)</Text>
            </Text>
          </View>

          <View className="px-6 mt-6 mb-2">
            <View className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                <View className="flex-row items-center mb-4">
                    <Text className="text-2xl mr-3">📍</Text>
                    <View className="flex-1">
                        <Text className="text-white font-bold">Localização</Text>
                        <Text className="text-zinc-400 text-sm mt-1">{shopAddress}</Text>
                    </View>
                </View>
                
                <TouchableOpacity onPress={handleOpenMap} className="bg-orange-500/20 border border-orange-500 p-3 rounded-lg flex-row justify-center items-center">
                    <Text className="text-orange-500 font-bold text-center">🗺️ Traçar Rota para a Barbearia</Text>
                </TouchableOpacity>
            </View>
          </View>

          <Text className="text-white text-xl font-bold px-6 mt-4 mb-4">Catálogo de Serviços</Text>
      </View>
  );

  const renderReviewsFooter = () => (
      <View className="mt-8 pb-4 px-6">
          <Text className="text-white text-xl font-bold mb-4">Avaliações dos Clientes ({reviews.length})</Text>
          
          {reviews.length === 0 ? (
              <Text className="text-zinc-500 text-sm">Este profissional ainda não possui avaliações.</Text>
          ) : (
              reviews.map((rev, index) => (
                  <View key={index} className="bg-zinc-800 p-4 rounded-xl mb-3 border border-zinc-700">
                      <View className="flex-row justify-between mb-1">
                          <Text className="text-white font-bold text-lg">{rev.clienteNome}</Text>
                          <Text className="text-orange-500 text-lg">
                              {"★".repeat(rev.nota)}<Text className="text-zinc-700">{"★".repeat(5 - rev.nota)}</Text>
                          </Text>
                      </View>
                      {rev.comentario ? <Text className="text-zinc-400 text-sm mb-2">{rev.comentario}</Text> : null}
                      <Text className="text-zinc-600 text-xs text-right mt-1">
                          {new Date(rev.dataAvaliacao).toLocaleDateString('pt-BR')}
                      </Text>
                  </View>
              ))
          )}
      </View>
  );

  return (
    <View className="flex-1 bg-zinc-900">
      
      {loading ? (
        <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={services}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader} 
          ListFooterComponent={renderReviewsFooter} 
          contentContainerStyle={{ paddingBottom: selectedServices.length > 0 ? 180 : 80 }}
          renderItem={({ item }) => {
            const isSelected = selectedServices.some(s => s.id === item.id);
            
            return (
              <TouchableOpacity onPress={() => toggleService(item)} className={`mx-6 p-4 rounded-xl mb-3 flex-row justify-between items-center border ${isSelected ? 'bg-zinc-700 border-orange-500' : 'bg-zinc-800 border-zinc-700'}`}>
                <View>
                  <Text className={`text-lg font-bold ${isSelected ? 'text-orange-500' : 'text-white'}`}>{item.nome}</Text>
                  <Text className="text-zinc-400 text-sm">🕒 {item.duracao} min</Text>
                </View>
                
                <View className="flex-row items-center">
                    <Text className="text-orange-500 text-lg font-bold mr-2">R$ {formatPrice(item.preco)}</Text>
                    {isSelected && <Text className="text-orange-500 text-lg">✅</Text>}
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={() => <Text className="text-zinc-500 text-center mt-4">Nenhum serviço disponível.</Text>}
        />
      )}
      
      {selectedServices.length > 0 && (
        <View className="p-6 absolute bottom-0 w-full bg-zinc-900/95 border-t border-zinc-800 z-50">
          <View className="flex-row justify-between mb-3 px-2">
              <Text className="text-white font-bold">Total ({selectedServices.length} itens)</Text>
              <Text className="text-orange-500 font-bold">R$ {formatPrice(totalCartPrice)} • {totalCartDuration} min</Text>
          </View>
          <TouchableOpacity onPress={handleBooking} className="bg-orange-500 p-4 rounded-xl items-center shadow-lg">
            <Text className="text-white font-bold text-lg">Escolher Horário ➝</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()} className="absolute top-10 left-4 bg-black/50 p-2 rounded-full z-50">
        <Text className="text-white font-bold px-2">⬅ Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}