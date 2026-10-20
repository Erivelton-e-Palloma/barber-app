import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageVIPs({ navigation }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [pedidosPendentes, setPedidosPendentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      if (!shopId) return;

      // 1. Busca Solicitações Pendentes
      const qPedidos = query(collection(db, "solicitacoes_vip"), where("shopId", "==", shopId), where("status", "==", "pendente"));
      const snapPedidos = await getDocs(qPedidos);
      setPedidosPendentes(snapPedidos.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Busca Todos os Usuários
      const snapUsers = await getDocs(collection(db, "usuarios"));
      const listaUsers = snapUsers.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordena VIPs ativos primeiro
      listaUsers.sort((a: any, b: any) => (b.isVIP === true ? 1 : 0) - (a.isVIP === true ? 1 : 0));
      setUsers(listaUsers);

    } catch (error) { console.log("Erro ao buscar dados", error); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  // FUNÇÃO: APROVAR PAGAMENTO E ATIVAR VIP
  async function aprovarPedidoVIP(pedido: any) {
      try {
          const d = new Date(); d.setDate(d.getDate() + 30);
          await updateDoc(doc(db, "usuarios", pedido.clienteId), { 
              isVIP: true,
              vipExpiration: d.toISOString(),
              vipPlanName: pedido.planoNome,
              vipPlanItens: pedido.planoItens || '', // Grava o que cobre
              vipLiberaTodos: pedido.planoLiberaTodos || false // Grava se é Super Assinatura
          });
          await deleteDoc(doc(db, "solicitacoes_vip", pedido.id));
          if (Platform.OS === 'web') alert("Pagamento aprovado! O cliente agora é VIP.");
          else Alert.alert("Sucesso", "Pagamento aprovado! Cliente ativado como VIP.");
          fetchData(); 
      } catch (error) { console.log(error); }
  }

  async function toggleVIPStatus(userId: string, currentStatus: boolean) {
    const novoStatus = !currentStatus;
    let dataVencimento = null;
    let nomePlano = '';

    if (novoStatus) {
        const d = new Date(); d.setDate(d.getDate() + 30);
        dataVencimento = d.toISOString();
        nomePlano = 'Ativação Manual';
    }

    try {
      await updateDoc(doc(db, "usuarios", userId), { 
          isVIP: novoStatus,
          vipExpiration: dataVencimento,
          vipPlanName: nomePlano,
          vipPlanItens: 'Todos',
          vipLiberaTodos: true // Ativação manual feita pelo dono sempre libera tudo
      });
      fetchData(); 
    } catch (error) { Alert.alert("Erro", "Não foi possível alterar o status VIP."); }
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

      {loading ? (
        <ActivityIndicator size="large" color="#eab308" className="mt-10" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          
          // CABEÇALHO DA LISTA: MOSTRA PEDIDOS PENDENTES PRIMEIRO
          ListHeaderComponent={
              <>
                  {pedidosPendentes.length > 0 && (
                      <View className="mb-6">
                          <Text className="text-yellow-500 font-bold mb-3 uppercase text-xs">Aguardando Aprovação ({pedidosPendentes.length})</Text>
                          {pedidosPendentes.map(pedido => (
                              <View key={pedido.id} className="bg-yellow-500/10 border border-yellow-500 p-4 rounded-xl mb-3 flex-row items-center justify-between">
                                  <View className="flex-1 pr-2">
                                      <Text className="text-white font-bold">{pedido.clienteNome}</Text>
                                      <Text className="text-yellow-500 text-xs mb-1">Plano: {pedido.planoNome} (R$ {pedido.planoPreco.toFixed(2)})</Text>
                                      <Text className="text-zinc-400 text-xs">Avisou que pagou o Pix.</Text>
                                  </View>
                                  <TouchableOpacity onPress={() => aprovarPedidoVIP(pedido)} className="bg-green-600 px-3 py-2 rounded-lg">
                                      <Text className="text-white font-bold text-xs">Aprovar ✅</Text>
                                  </TouchableOpacity>
                              </View>
                          ))}
                      </View>
                  )}
                  
                  <Text className="text-zinc-500 font-bold mb-3 uppercase text-xs">Todos os Clientes</Text>
              </>
          }

          renderItem={({ item }) => (
            <View className={`p-4 rounded-xl mb-4 border flex-row items-center justify-between ${item.isVIP ? 'bg-zinc-800 border-yellow-500' : 'bg-zinc-800 border-zinc-700'}`}>
              <View className="flex-1 pr-2">
                <Text className="text-white font-bold text-lg">{item.nome}</Text>
                <Text className="text-zinc-400 text-sm mb-1">{item.telefone}</Text>
                
                {item.isVIP && item.vipExpiration && (
                    <View>
                        <Text className="text-yellow-500 text-xs">Plano: {item.vipPlanName}</Text>
                        <Text className="text-yellow-500 font-bold text-xs mt-1">Vence em: {formatData(item.vipExpiration)}</Text>
                    </View>
                )}
              </View>

              <TouchableOpacity 
                  onPress={() => toggleVIPStatus(item.id, item.isVIP)}
                  className={`px-4 py-2 rounded-lg ${item.isVIP ? 'bg-red-500/20 border border-red-500' : 'bg-yellow-600'}`}
              >
                  <Text className={item.isVIP ? 'text-red-400 font-bold' : 'text-white font-bold'}>
                      {item.isVIP ? 'Remover VIP' : 'Ativar Manual'}
                  </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}