import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Linking, Alert } from 'react-native';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FinancialScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [totals, setTotals] = useState({
    total: 0,
    pix: 0,
    dinheiro: 0,
    cartao: 0
  });

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const week = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
    return `${week}, ${day}/${month}`;
  };

  const changeDay = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const changeMonth = (months: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + months);
    setSelectedDate(newDate);
  };

  async function fetchFinancialData() {
    setLoading(true);
    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      const dateQuery = formatDateForDB(selectedDate); 

      if (!shopId) return;

      const q = query(
        collection(db, "agendamentos"), 
        where("shopId", "==", shopId),
        where("data", "==", dateQuery) 
      );

      const querySnapshot = await getDocs(q);
      
      let list: any[] = [];
      let sumTotal = 0;
      let sumPix = 0;
      let sumDinheiro = 0;
      let sumCartao = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data });

        const preco = Number(data.preco || 0);
        sumTotal += preco;

        if (data.metodoPagamento === 'pix') sumPix += preco;
        else if (data.metodoPagamento === 'dinheiro') sumDinheiro += preco;
        else if (data.metodoPagamento === 'cartao') sumCartao += preco;
      });

      list.sort((a, b) => a.horario.localeCompare(b.horario));

      setTransactions(list);
      setTotals({ total: sumTotal, pix: sumPix, dinheiro: sumDinheiro, cartao: sumCartao });

    } catch (error) {
      console.log("Erro financeiro:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFinancialData();
  }, [selectedDate]);

  const contactClient = async (phone: string, name: string, time: string) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) { cleanPhone = '55' + cleanPhone; }
    
    const message = `Olá ${name}! ✂️ Aqui é da barbearia. Tudo certo para seu horário de hoje às *${time}*?`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    try { await Linking.openURL(url); } 
    catch (err) { Alert.alert("Erro", "Não foi possível abrir o WhatsApp."); }
  };

  return (
    <View className="flex-1 bg-zinc-900 pt-12">
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View className="flex-row items-center mb-4">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
              </TouchableOpacity>
              <Text className="text-white text-2xl font-bold">Agenda & Caixa 💰</Text>
            </View>

            <View className="flex-row justify-between items-center bg-zinc-800 p-3 rounded-t-xl border border-zinc-700 border-b-0">
              <TouchableOpacity onPress={() => changeMonth(-1)} className="px-4 py-2">
                  <Text className="text-orange-500 font-bold text-lg">« Mês</Text>
              </TouchableOpacity>
              <Text className="text-white font-bold text-lg">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} className="px-4 py-2">
                  <Text className="text-orange-500 font-bold text-lg">Mês »</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center bg-zinc-800 p-2 rounded-b-xl mb-6 border border-zinc-700">
              <TouchableOpacity onPress={() => changeDay(-1)} className="p-3">
                  <Text className="text-orange-500 text-2xl font-bold">‹</Text>
              </TouchableOpacity>
              
              <View className="items-center">
                  <Text className="text-zinc-400 text-xs uppercase">Visualizando</Text>
                  <Text className="text-white text-xl font-bold">{formatDateForDisplay(selectedDate)}</Text>
              </View>

              <TouchableOpacity onPress={() => changeDay(1)} className="p-3">
                  <Text className="text-orange-500 text-2xl font-bold">›</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-orange-500 p-6 rounded-2xl mb-6 shadow-lg">
              <Text className="text-white font-bold text-lg opacity-80">Faturamento do Dia</Text>
              <Text className="text-white font-bold text-4xl mt-1">
                R$ {totals.total.toFixed(2).replace('.', ',')}
              </Text>
              <Text className="text-white mt-2 opacity-80 text-sm">
                {transactions.length} atendimentos agendados
              </Text>
            </View>

            <View className="flex-row justify-between mb-8">
              <View className="bg-zinc-800 p-3 rounded-xl flex-1 mr-2 border border-zinc-700 items-center">
                <Text className="text-zinc-400 text-xs font-bold">💵 DINHEIRO</Text>
                <Text className="text-white font-bold text-lg mt-1">R$ {totals.dinheiro.toFixed(0)}</Text>
              </View>
              <View className="bg-zinc-800 p-3 rounded-xl flex-1 mr-2 border border-zinc-700 items-center">
                <Text className="text-zinc-400 text-xs font-bold">💠 PIX</Text>
                <Text className="text-white font-bold text-lg mt-1">R$ {totals.pix.toFixed(0)}</Text>
              </View>
              <View className="bg-zinc-800 p-3 rounded-xl flex-1 border border-zinc-700 items-center">
                <Text className="text-zinc-400 text-xs font-bold">💳 CARTÃO</Text>
                <Text className="text-white font-bold text-lg mt-1">R$ {totals.cartao.toFixed(0)}</Text>
              </View>
            </View>

            <Text className="text-white text-lg font-bold mb-4">Agenda: {formatDateForDisplay(selectedDate)}</Text>

            {loading && <ActivityIndicator color="#f97316" size="large" />}
          </>
        }
        renderItem={({ item }) => (
          <View className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row justify-between items-center border border-zinc-700">
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                  {item.clienteNome ? item.clienteNome : "Cliente (sem nome)"}
              </Text>
              <Text className="text-zinc-400 text-sm">{item.servicoNome} • {item.horario}</Text>
              <Text className="text-zinc-500 text-xs mt-1">Prof: {item.barbeiroNome}</Text>
            </View>

            <View className="items-end">
              <Text className="text-orange-500 font-bold text-lg">
                R$ {Number(item.preco).toFixed(2).replace('.', ',')}
              </Text>
              
              {item.clienteTelefone && (
                  <TouchableOpacity 
                      onPress={() => contactClient(item.clienteTelefone, item.clienteNome, item.horario)}
                      className="bg-green-600 px-3 py-1 rounded-full mt-2 flex-row items-center"
                  >
                      <Text className="text-white text-xs font-bold">Chamar no Zap 💬</Text>
                  </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          !loading ? <Text className="text-zinc-500 text-center mt-4 mb-20">Nenhum agendamento para esta data.</Text> : null
        )}
      />
    </View>
  );
}