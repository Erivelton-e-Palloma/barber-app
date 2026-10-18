import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { db, auth } from '../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function MyAppointments({ navigation }: any) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para sabermos se quem está logado é o Dono da Barbearia
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const shopId = await AsyncStorage.getItem('@delp_shopId'); 

      if (!user || !shopId) {
          setLoading(false);
          return;
      }

      // 1. A NOVA VERIFICAÇÃO INTELIGENTE (Pelo Painel de Super Admin)
      let userIsAdmin = false;
      
      // Busca os dados da Barbearia atual
      const shopRef = doc(db, "barbearias", shopId);
      const shopSnap = await getDoc(shopRef);

      if (shopSnap.exists()) {
          const shopData = shopSnap.data();
          // Verifica se o email logado é igual ao emailDono cadastrado no seu Painel Super Admin
          if (user.email === shopData.emailDono) {
              userIsAdmin = true;
          }
      }
      setIsSuperAdmin(userIsAdmin);

      // 2. MONTA A BUSCA BASEADA NA PERMISSÃO
      let q;
      if (userIsAdmin) {
          // VISAO DO DONO: Puxa TODOS os agendamentos da loja dele
          q = query(
            collection(db, "agendamentos"),
            where("shopId", "==", shopId) 
          );
      } else {
          // VISAO DO CLIENTE: Puxa APENAS os agendamentos que têm o ID dele
          q = query(
            collection(db, "agendamentos"),
            where("shopId", "==", shopId),
            where("clienteId", "==", user.uid)
          );
      }

      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordena por data e horário
      list.sort((a: any, b: any) => {
        if (a.data !== b.data) {
            return a.data.localeCompare(b.data);
        }
        return a.horario.localeCompare(b.horario);
      });

      setAppointments(list);
    } catch (error) {
      console.log("Erro ao buscar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function confirmAndCancel(id: string) {
      try {
          await deleteDoc(doc(db, "agendamentos", id));
          setAppointments(prev => prev.filter(item => item.id !== id));
          
          if (Platform.OS === 'web') {
              alert("✅ Agendamento cancelado com sucesso! O horário já está disponível novamente.");
          } else {
              Alert.alert("Sucesso", "Agendamento cancelado! O horário já está disponível novamente.");
          }
      } catch (error) {
          console.log("Erro ao cancelar:", error);
          if (Platform.OS === 'web') alert("Erro ao cancelar agendamento.");
          else Alert.alert("Erro", "Não foi possível cancelar.");
      }
  }

  function handleCancel(id: string) {
    if (Platform.OS === 'web') {
        const confirm = window.confirm("Deseja realmente cancelar este agendamento?");
        if (confirm) {
            confirmAndCancel(id);
        }
    } else {
        Alert.alert(
          "Cancelar",
          "Deseja cancelar este agendamento?",
          [
            { text: "Não", style: "cancel" },
            { 
              text: "Sim, Cancelar", 
              style: "destructive", 
              onPress: () => confirmAndCancel(id)
            }
          ]
        );
    }
  }

  const formatDate = (dateString: string) => {
    if(!dateString) return "";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">
            {isSuperAdmin ? 'Gestão da Barbearia' : 'Meus Agendamentos'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className="bg-zinc-800 p-4 rounded-xl mb-4 border border-zinc-700">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-2">
                  <Text className="text-orange-500 font-bold text-lg">{item.servicoNome}</Text>
                  
                  {/* SE FOR ADMIN, MOSTRA OS DADOS DO CLIENTE */}
                  {isSuperAdmin && (
                      <View className="mt-1 bg-zinc-900/50 p-2 rounded border border-zinc-700">
                          <Text className="text-white font-bold text-sm">Cliente: {item.clienteNome || 'Não informado'}</Text>
                          <Text className="text-zinc-400 text-xs">WhatsApp: {item.clienteTelefone || 'N/A'}</Text>
                      </View>
                  )}
                  
                  <Text className="text-zinc-400 text-xs mt-2">Profissional: {item.barbeiroNome}</Text>
                </View>
                <View className="items-end">
                    <Text className="text-white font-bold text-xl">
                    R$ {item.preco ? Number(item.preco).toFixed(2).replace('.', ',') : '0,00'}
                    </Text>
                    {item.entradaPaga && (
                        <Text className="text-green-500 font-bold text-xs mt-1">✅ 50% no Pix</Text>
                    )}
                </View>
              </View>

              <View className="flex-row items-center mb-4 bg-zinc-900/50 p-2 rounded-lg self-start mt-2">
                <Text className="text-white font-bold mr-2">📅 {formatDate(item.data)}</Text>
                <Text className="text-white font-bold">⏰ {item.horario}</Text>
              </View>

              <TouchableOpacity 
                onPress={() => handleCancel(item.id)}
                className="bg-red-500/10 border border-red-500 p-3 rounded-lg items-center"
              >
                <Text className="text-red-500 font-bold">Cancelar Agendamento 🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text className="text-zinc-500 text-center mt-10">Nenhum agendamento encontrado.</Text>
          )}
        />
      )}
    </View>
  );
}