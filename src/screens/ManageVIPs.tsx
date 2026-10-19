import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function ManageVIPs({ navigation }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchUsers() {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordena colocando os VIPs atuais primeiro
      lista.sort((a: any, b: any) => (b.isVIP === true ? 1 : 0) - (a.isVIP === true ? 1 : 0));
      setUsers(lista);
    } catch (error) {
      console.log("Erro ao buscar usuários", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function toggleVIPStatus(userId: string, currentStatus: boolean) {
    const novoStatus = !currentStatus;
    
    // Calcula o vencimento para daqui a 30 dias se estiver virando VIP
    let dataVencimento = null;
    if (novoStatus) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        dataVencimento = d.toISOString();
    }

    try {
      await updateDoc(doc(db, "usuarios", userId), { 
          isVIP: novoStatus,
          vipExpiration: dataVencimento
      });
      fetchUsers(); // Recarrega a lista
    } catch (error) {
      if (Platform.OS === 'web') alert("Erro ao alterar status VIP.");
      else Alert.alert("Erro", "Não foi possível alterar o status VIP.");
    }
  }

  const formatData = (isoString: string) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold flex-1">Clientes VIP 👑</Text>
      </View>

      <Text className="text-zinc-400 mb-6">Ao ativar o VIP, o cliente não precisa pagar a taxa do Pix para agendar pelos próximos 30 dias.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#eab308" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className={`p-4 rounded-xl mb-4 border flex-row items-center justify-between ${item.isVIP ? 'bg-yellow-500/10 border-yellow-500' : 'bg-zinc-800 border-zinc-700'}`}>
              <View className="flex-1 pr-2">
                <Text className="text-white font-bold text-lg">{item.nome}</Text>
                <Text className="text-zinc-400 text-sm mb-1">{item.telefone}</Text>
                
                {item.isVIP && item.vipExpiration && (
                    <Text className="text-yellow-500 font-bold text-xs mt-1">
                        Vence em: {formatData(item.vipExpiration)}
                    </Text>
                )}
              </View>

              <TouchableOpacity 
                  onPress={() => toggleVIPStatus(item.id, item.isVIP)}
                  className={`px-4 py-2 rounded-lg ${item.isVIP ? 'bg-red-500/20 border border-red-500' : 'bg-yellow-600'}`}
              >
                  <Text className={item.isVIP ? 'text-red-400 font-bold' : 'text-white font-bold'}>
                      {item.isVIP ? 'Remover VIP' : 'Ativar VIP'}
                  </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}