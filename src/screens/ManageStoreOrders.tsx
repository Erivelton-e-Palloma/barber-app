import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { db } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, query, where, increment } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageStoreOrders({ navigation }: any) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPedidos() {
    setLoading(true);
    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      if (!shopId) return;

      const q = query(collection(db, "pedidos_lojinha"), where("shopId", "==", shopId));
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Ordena: pendentes primeiro, depois aprovados, depois os mais recentes
      lista.sort((a, b) => {
          if (a.status === 'aguardando_aprovacao' && b.status !== 'aguardando_aprovacao') return -1;
          if (a.status !== 'aguardando_aprovacao' && b.status === 'aguardando_aprovacao') return 1;
          return new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime();
      });

      setPedidos(lista);
    } catch (error) { console.log("Erro ao buscar pedidos", error); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchPedidos(); }, []);

  // APROVAR E DESCONTAR ESTOQUE
  async function handleAprovar(pedido: any) {
      try {
          // 1. Muda status para aprovado
          await updateDoc(doc(db, "pedidos_lojinha", pedido.id), { status: "aprovado" });
          
          // 2. Desconta o estoque de verdade!
          await updateDoc(doc(db, "produtos", pedido.produtoId), { estoque: increment(-1) });
          
          if (Platform.OS === 'web') alert("Pagamento aprovado! Estoque atualizado.");
          else Alert.alert("Sucesso", "Pagamento aprovado! O estoque foi reduzido em 1.");
          
          fetchPedidos();
      } catch (error) { console.log(error); }
  }

  // ENTREGAR PRODUTO AO CLIENTE
  async function handleEntregar(pedido: any) {
      try {
          await updateDoc(doc(db, "pedidos_lojinha", pedido.id), { status: "entregue" });
          fetchPedidos();
      } catch (error) { console.log(error); }
  }

  // CANCELAR PEDIDO
  async function handleCancelar(pedido: any) {
      const confirm = async () => {
          try {
              await updateDoc(doc(db, "pedidos_lojinha", pedido.id), { status: "cancelado" });
              fetchPedidos();
          } catch(e) { console.log(e); }
      };
      if (Platform.OS === 'web') { if (window.confirm("Cancelar pedido do cliente?")) confirm(); }
      else { Alert.alert("Cancelar", "Deseja cancelar o pedido?", [{text:"Não", style:"cancel"}, {text:"Sim", onPress:confirm, style:"destructive"}]); }
  }

  const formatDataHora = (isoStr: string) => {
      const d = new Date(isoStr);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold flex-1">Pedidos da Loja 📦</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" className="mt-10" />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
              <View className={`p-4 rounded-xl mb-4 border ${item.status === 'aguardando_aprovacao' ? 'bg-yellow-500/10 border-yellow-500' : 'bg-zinc-800 border-zinc-700'}`}>
                  <View className="flex-row justify-between mb-1">
                      <Text className="text-white font-bold text-lg flex-1">{item.clienteNome}</Text>
                      <Text className="text-orange-500 font-bold text-lg">R$ {item.precoPago?.toFixed(2)}</Text>
                  </View>
                  <Text className="text-zinc-400 text-sm mb-1">📱 {item.clienteTelefone}</Text>
                  <Text className="text-white font-bold text-sm mb-1">🛒 {item.produtoNome}</Text>
                  <Text className="text-zinc-500 text-xs mb-4">Pedido feito em: {formatDataHora(item.dataPedido)}</Text>

                  {item.status === 'aguardando_aprovacao' && (
                      <View className="flex-row justify-between gap-2">
                          <TouchableOpacity onPress={() => handleCancelar(item)} className="flex-1 bg-red-500/10 border border-red-500 p-3 rounded-lg items-center">
                              <Text className="text-red-500 font-bold text-xs">Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleAprovar(item)} className="flex-1 bg-green-600 p-3 rounded-lg items-center">
                              <Text className="text-white font-bold text-xs">Aprovar Pix ✅</Text>
                          </TouchableOpacity>
                      </View>
                  )}

                  {item.status === 'aprovado' && (
                      <View className="flex-row justify-between items-center">
                          <Text className="text-green-400 font-bold text-xs">✅ Pagamento Confirmado</Text>
                          <TouchableOpacity onPress={() => handleEntregar(item)} className="bg-blue-600 px-4 py-2 rounded-lg">
                              <Text className="text-white font-bold text-xs">Marcar Entregue</Text>
                          </TouchableOpacity>
                      </View>
                  )}

                  {item.status === 'entregue' && (
                      <Text className="text-zinc-500 font-bold text-xs text-center">📦 Produto já entregue ao cliente.</Text>
                  )}

                  {item.status === 'cancelado' && (
                      <Text className="text-red-500 font-bold text-xs text-center">❌ Venda cancelada.</Text>
                  )}
              </View>
          )}
          ListEmptyComponent={() => <Text className="text-zinc-500 text-center mt-10">Nenhum pedido recebido ainda.</Text>}
        />
      )}
    </View>
  );
}