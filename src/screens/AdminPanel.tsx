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
      await updateDoc(shopRef, { 
          metaFidelidade: metaFidelidade,
          fidelidadeAtiva: fidelidadeAtiva 
      });
      if (Platform.OS === 'web') alert("Configurações atualizadas com sucesso!");
      else Alert.alert("Sucesso", "Configurações atualizadas com sucesso!");
    } catch (error) {
      console.log(error);
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

      {/* CONTROLE DE FIDELIDADE COM SWITCH LIGA/DESLIGA */}
      <View className="bg-orange-500/10 p-4 rounded-xl mb-6 border border-orange-500">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Text className="text-2xl mr-2">🎁</Text>
            <Text className="text-white font-bold text-lg">Programa de Brindes</Text>
          </View>
          <Switch
            value={fidelidadeAtiva}
            onValueChange={setFidelidadeAtiva}
            trackColor={{ false: '#3f3f46', true: '#f97316' }}
            thumbColor={'#fff'}
          />
        </View>
        
        {fidelidadeAtiva ? (
            <>
                <Text className="text-zinc-300 text-sm mb-4">Quantos cortes o cliente precisa fazer para ganhar o prêmio/brinde?</Text>
                
                <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity 
                    onPress={() => setMetaFidelidade(prev => prev > 1 ? prev - 1 : 1)}
                    className="bg-zinc-800 w-12 h-12 rounded-lg items-center justify-center border border-zinc-700"
                >
                    <Text className="text-white text-2xl font-bold">-</Text>
                </TouchableOpacity>

                <Text className="text-white text-3xl font-bold">{metaFidelidade}</Text>

                <TouchableOpacity 
                    onPress={() => setMetaFidelidade(prev => prev + 1)}
                    className="bg-zinc-800 w-12 h-12 rounded-lg items-center justify-center border border-zinc-700"
                >
                    <Text className="text-white text-2xl font-bold">+</Text>
                </TouchableOpacity>
                </View>
            </>
        ) : (
            <Text className="text-zinc-400 text-sm mb-4 italic">O cartão de fidelidade está oculto para os clientes.</Text>
        )}

        <TouchableOpacity 
          onPress={saveLoyaltyConfig}
          disabled={loadingConfig}
          className="bg-orange-500 py-3 rounded-lg items-center"
        >
          {loadingConfig ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Salvar Configuração</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        className="bg-green-600 p-5 rounded-xl mb-4 flex-row items-center border border-green-400"
        onPress={() => navigation.navigate('FinancialScreen')}
      >
        <View className="bg-white/20 p-3 rounded-full mr-4">
          <Text className="text-2xl">💰</Text>
        </View>
        <View>
          <Text className="text-white font-bold text-xl">Financeiro & Caixa</Text>
          <Text className="text-green-100 text-sm">Ver faturamento do dia</Text>
        </View>
      </TouchableOpacity>

      <Text className="text-zinc-500 font-bold mb-2 mt-2 uppercase text-xs">Cadastros</Text>

      <TouchableOpacity 
        className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-700"
        onPress={() => navigation.navigate('ManageBarbers')}
      >
        <Text className="text-2xl mr-4">✂️</Text>
        <View>
          <Text className="text-white font-bold text-lg">Gerenciar Equipe</Text>
          <Text className="text-zinc-400 text-sm">Adicionar ou remover barbeiros</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-700"
        onPress={() => navigation.navigate('ManageServices')}
      >
        <Text className="text-2xl mr-4">🏷️</Text>
        <View>
          <Text className="text-white font-bold text-lg">Gerenciar Serviços</Text>
          <Text className="text-zinc-400 text-sm">Preços e tipos de corte</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}