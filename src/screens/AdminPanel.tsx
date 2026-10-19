import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminPanel() {
  const navigation = useNavigation<any>();
  const [metaFidelidade, setMetaFidelidade] = useState(10);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      const id = await AsyncStorage.getItem('@delp_shopId');
      setShopId(id);
      if (id) {
        const shopRef = doc(db, "barbearias", id);
        const shopSnap = await getDoc(shopRef);
        if (shopSnap.exists()) {
          const data = shopSnap.data();
          if (data.metaFidelidade) setMetaFidelidade(data.metaFidelidade);
          if (data.fidelidadeAtiva !== undefined) setFidelidadeAtiva(data.fidelidadeAtiva);
        }
      }
    }
    loadConfig();
  }, []);

  async function saveLoyaltyConfig() {
    if (!shopId) return;
    setLoadingConfig(true);
    try {
      const shopRef = doc(db, "barbearias", shopId);
      await updateDoc(shopRef, { metaFidelidade: metaFidelidade, fidelidadeAtiva: fidelidadeAtiva });
      if (Platform.OS === 'web') alert("Configurações atualizadas!");
      else Alert.alert("Sucesso", "Configurações atualizadas!");
    } catch (error) {
      if (Platform.OS === 'web') alert("Erro ao salvar.");
      else Alert.alert("Erro", "Não foi possível salvar a configuração.");
    } finally {
      setLoadingConfig(false);
    }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="mb-8">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-3xl font-bold mt-4">Painel Admin ⚙️</Text>
        <Text className="text-zinc-400">Gerencie sua barbearia por aqui.</Text>
      </View>

      <View className="bg-orange-500/10 p-4 rounded-xl mb-4 border border-orange-500">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Text className="text-2xl mr-2">🎁</Text>
            <Text className="text-white font-bold text-lg">Programa de Brindes</Text>
          </View>
          <Switch value={fidelidadeAtiva} onValueChange={setFidelidadeAtiva} trackColor={{ false: '#3f3f46', true: '#f97316' }} />
        </View>
        
        {fidelidadeAtiva && (
            <>
                <Text className="text-zinc-300 text-sm mb-4">Cortes para ganhar brinde:</Text>
                <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity onPress={() => setMetaFidelidade(prev => prev > 1 ? prev - 1 : 1)} className="bg-zinc-800 w-12 h-12 rounded-lg items-center justify-center border border-zinc-700"><Text className="text-white text-2xl font-bold">-</Text></TouchableOpacity>
                <Text className="text-white text-3xl font-bold">{metaFidelidade}</Text>
                <TouchableOpacity onPress={() => setMetaFidelidade(prev => prev + 1)} className="bg-zinc-800 w-12 h-12 rounded-lg items-center justify-center border border-zinc-700"><Text className="text-white text-2xl font-bold">+</Text></TouchableOpacity>
                </View>
            </>
        )}

        <TouchableOpacity onPress={saveLoyaltyConfig} disabled={loadingConfig} className="bg-orange-500 py-3 rounded-lg items-center">
          {loadingConfig ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Salvar Configuração</Text>}
        </TouchableOpacity>
      </View>

      {/* BLOCO DE RELATÓRIOS E VIP */}
      <View className="flex-row justify-between mb-3 gap-2">
          <TouchableOpacity className="flex-1 bg-green-600 p-4 rounded-xl items-center justify-center border border-green-400" onPress={() => navigation.navigate('FinancialScreen')}>
            <Text className="text-3xl mb-1">💰</Text>
            <Text className="text-white font-bold">Financeiro</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 bg-blue-600 p-4 rounded-xl items-center justify-center border border-blue-400" onPress={() => navigation.navigate('CustomersList')}>
            <Text className="text-3xl mb-1">👥</Text>
            <Text className="text-white font-bold">Frequência</Text>
          </TouchableOpacity>
      </View>

      <TouchableOpacity 
        className="bg-yellow-600 p-4 rounded-xl mb-6 items-center flex-row justify-center border border-yellow-400" 
        onPress={() => navigation.navigate('ManageVIPs')}
      >
          <Text className="text-2xl mr-2">👑</Text>
          <Text className="text-white font-bold text-lg">Gerenciar Clientes VIP</Text>
      </TouchableOpacity>

      <Text className="text-zinc-500 font-bold mb-2 uppercase text-xs">Cadastros</Text>

      <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-700" onPress={() => navigation.navigate('ManageBarbers')}>
        <Text className="text-2xl mr-4">✂️</Text>
        <View>
          <Text className="text-white font-bold text-lg">Equipe</Text>
          <Text className="text-zinc-400 text-sm">Adicionar ou remover barbeiros</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-700" onPress={() => navigation.navigate('ManageServices')}>
        <Text className="text-2xl mr-4">🏷️</Text>
        <View>
          <Text className="text-white font-bold text-lg">Serviços</Text>
          <Text className="text-zinc-400 text-sm">Preços e tipos de corte</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}