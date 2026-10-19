import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform, SectionList } from 'react-native';
import { db, auth } from '../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function MyAppointments({ navigation }: any) {
  // NOVO: Agora guardamos as seções agrupadas (Ex: [{ title: '18/10', data: [...] }])
  const [appointmentSections, setAppointmentSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

      let userIsAdmin = false;
      const shopRef = doc(db, "barbearias", shopId);
      const shopSnap = await getDoc(shopRef);

      if (shopSnap.exists()) {
          const shopData = shopSnap.data();
          if (user.email === shopData.emailDono) userIsAdmin = true;
      }
      setIsSuperAdmin(userIsAdmin);

      let q;
      if (userIsAdmin) {
          q = query(collection(db, "agendamentos"), where("shopId", "==", shopId));
      } else {
          q = query(collection(db, "agendamentos"), where("shopId", "==", shopId), where("clienteId", "==", user.uid));
      }

      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordena por data e depois por horário
      list.sort((a: any, b: any) => {
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return a.horario.localeCompare(b.horario);
      });

      // NOVO: Agrupa os agendamentos pela Data
      const groupedData = list.reduce((acc: any, curr: any) => {
          if (!acc[curr.data]) acc[curr.data] = [];
          acc[curr.data].push(curr);
          return acc;
      }, {});

      // Transforma o objeto num array que o SectionList entende
      const sections = Object.keys(groupedData).map(dateKey => {
          const [year, month, day] = dateKey.split('-');
          return {
              title: `${day}/${month}/${year}`,
              data: groupedData[dateKey]
          };
      });

      setAppointmentSections(sections);
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
          
          // Remove da lista agrupada dinamicamente
          setAppointmentSections(prev => 
              prev.map(section => ({
                  ...section,
                  data: section.data.filter((item: any) => item.id !== id)
              })).filter(section => section.data.length > 0) // Remove a seção se ficar vazia
          );
          
          if (Platform.OS === 'web') alert("✅ Agendamento cancelado!");
          else Alert.alert("Sucesso", "Agendamento cancelado!");
      } catch (error) {
          if (Platform.OS === 'web') alert("Erro ao cancelar agendamento.");
          else Alert.alert("Erro", "Não foi possível cancelar.");
      }
  }

  function handleCancel(id: string) {
    if (Platform.OS === 'web') {
        if (window.confirm("Deseja realmente cancelar este agendamento?")) confirmAndCancel(id);
    } else {
        Alert.alert("Cancelar", "Deseja cancelar este agendamento?", [
            { text: "Não", style: "cancel" },
            { text: "Sim, Cancelar", style: "destructive", onPress: () => confirmAndCancel(id) }
        ]);
    }
  }

  async function handleCompleteService(agendamentoId: string, clienteId: string) {
    try {
        await updateDoc(doc(db, "agendamentos", agendamentoId), { status: "concluido" });

        if (clienteId) {
            await updateDoc(doc(db, "usuarios", clienteId), {
                pontosFidelidade: increment(1)
            });
        }

        // Atualiza o status visualmente na SectionList
        setAppointmentSections(prev => prev.map(section => ({
            ...section,
            data: section.data.map((item: any) => 
                item.id === agendamentoId ? { ...item, status: "concluido" } : item
            )
        })));

        if (Platform.OS === 'web') alert("Serviço concluído! O cliente ganhou +1 ponto.");
        else Alert.alert("Sucesso", "Serviço concluído! O cliente ganhou +1 ponto.");
    } catch (error) {
        console.log("Erro ao concluir:", error);
        if (Platform.OS === 'web') alert("Erro ao concluir.");
        else Alert.alert("Erro", "Falha ao concluir o serviço.");
    }
  }

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
        <SectionList
          sections={appointmentSections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          
          // CABEÇALHO DIVISOR DE CADA DATA
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-orange-500/20 p-2 rounded-lg mb-3 mt-4 border border-orange-500/50">
                <Text className="text-orange-500 font-bold text-center text-lg">📅 {title}</Text>
            </View>
          )}

          renderItem={({ item }) => {
            const isConcluido = item.status === 'concluido';

            return (
              <View className={`p-4 rounded-xl mb-4 border ${isConcluido ? 'bg-zinc-900 border-green-500/50' : 'bg-zinc-800 border-zinc-700'}`}>
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className={`${isConcluido ? 'text-green-500' : 'text-orange-500'} font-bold text-lg`}>
                        {item.servicoNome} {isConcluido && "✅"}
                    </Text>
                    
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
                      {item.entradaPaga && !isConcluido && (
                          <Text className="text-green-500 font-bold text-xs mt-1">✅ 50% no Pix</Text>
                      )}
                  </View>
                </View>

                <View className="flex-row items-center mb-4 bg-zinc-900/50 p-2 rounded-lg self-start mt-2">
                  <Text className="text-white font-bold">⏰ {item.horario}</Text>
                </View>

                {!isConcluido ? (
                    <View className="flex-row justify-between gap-2">
                        <TouchableOpacity 
                            onPress={() => handleCancel(item.id)}
                            className="flex-1 bg-red-500/10 border border-red-500 p-3 rounded-lg items-center"
                        >
                            <Text className="text-red-500 font-bold">Cancelar</Text>
                        </TouchableOpacity>

                        {isSuperAdmin && (
                            <TouchableOpacity 
                                onPress={() => handleCompleteService(item.id, item.clienteId)}
                                className="flex-1 bg-green-600 p-3 rounded-lg items-center"
                            >
                                <Text className="text-white font-bold">Concluir ✅</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View className="bg-green-500/10 p-3 rounded-lg items-center border border-green-500/30">
                        <Text className="text-green-400 font-bold">Serviço Finalizado</Text>
                    </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <Text className="text-zinc-500 text-center mt-10">Nenhum agendamento encontrado.</Text>
          )}
        />
      )}
    </View>
  );
}