import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CustomersList({ navigation }: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const shopId = await AsyncStorage.getItem('@delp_shopId');
        if (!shopId) return;

        // Busca todos os agendamentos já feitos nesta barbearia
        const q = query(collection(db, "agendamentos"), where("shopId", "==", shopId));
        const querySnapshot = await getDocs(q);
        
        // Objeto temporário para contar e agrupar
        const customerMap: { [key: string]: { nome: string, telefone: string, totalCortes: number } } = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const email = data.clienteEmail || data.clienteNome; // Chave de agrupamento

            if (email) {
                if (!customerMap[email]) {
                    customerMap[email] = {
                        nome: data.clienteNome || 'Desconhecido',
                        telefone: data.clienteTelefone || 'Sem contato',
                        totalCortes: 0
                    };
                }
                customerMap[email].totalCortes += 1;
            }
        });

        // Transforma o objeto num array e ordena pelos clientes mais fiéis (maior totalCortes)
        const sortedCustomers = Object.values(customerMap).sort((a, b) => b.totalCortes - a.totalCortes);
        setCustomers(sortedCustomers);

      } catch (error) {
        console.log("Erro ao buscar clientes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Frequência de Clientes</Text>
      </View>

      <View className="bg-blue-600/10 p-4 rounded-xl mb-6 border border-blue-500">
        <Text className="text-blue-400 font-bold mb-1">ℹ️ Entendendo a Tabela</Text>
        <Text className="text-zinc-300 text-sm">
            Aqui você acompanha o volume de agendamentos por cliente. Os clientes no topo são os que mais geram receita para a barbearia.
        </Text>
      </View>

      {/* CABEÇALHO DA TABELA */}
      <View className="flex-row justify-between mb-2 px-2 border-b border-zinc-700 pb-2">
          <Text className="text-zinc-400 font-bold flex-1">Nome & Contato</Text>
          <Text className="text-zinc-400 font-bold text-right w-20">Agendados</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" className="mt-10" />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item, index }) => (
            <View className="flex-row justify-between items-center bg-zinc-800 p-4 rounded-xl mb-3 border border-zinc-700">
                <View className="flex-row items-center flex-1">
                    <Text className="text-zinc-500 font-bold w-6">{index + 1}º</Text>
                    <View>
                        <Text className="text-white font-bold text-lg">{item.nome}</Text>
                        <Text className="text-zinc-400 text-xs">{item.telefone}</Text>
                    </View>
                </View>
                <View className="bg-blue-500 w-10 h-10 rounded-full items-center justify-center">
                    <Text className="text-white font-bold">{item.totalCortes}</Text>
                </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text className="text-zinc-500 text-center mt-10">Nenhum cliente agendou ainda.</Text>
          )}
        />
      )}
    </View>
  );
}