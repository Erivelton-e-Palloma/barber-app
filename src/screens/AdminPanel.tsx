import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminPanel() {
  const navigation = useNavigation<any>();
  const [metaFidelidade, setMetaFidelidade] = useState(10);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);
  const [chavePixLoja, setChavePixLoja] = useState(''); 
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
          if (data.chavePixLoja) setChavePixLoja(data.chavePixLoja); 
        }
      }
    }
    loadConfig();
  }, []);

  // Função global que salva todas as configurações da loja
  async function saveShopConfig() {
    if (!shopId) return;
    setLoadingConfig(true);
    try {
      const shopRef = doc(db, "barbearias", shopId);
      await updateDoc(shopRef, { 
          metaFidelidade: metaFidelidade, 
          fidelidadeAtiva: fidelidadeAtiva,
          chavePixLoja: chavePixLoja 
      });
      if (Platform.OS === 'web') alert("Configurações atualizadas com sucesso!");
      else Alert.alert("Sucesso", "Configurações atualizadas com sucesso!");
    } catch (error) {
      if (Platform.OS === 'web') alert("Erro ao salvar.");
      else Alert.alert("Erro", "Não foi possível salvar a configuração.");
    } finally {
      setLoadingConfig(false);
    }
  }

  return (
    <ScrollView 
        className="flex-1 bg-zinc-900 px-6 pt-12" 
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
    >
      <View className="mb-8">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-3xl font-bold mt-4">Painel Admin ⚙️</Text>
        <Text className="text-zinc-400">Gerencie sua barbearia por aqui.</Text>
      </View>

      {/* BLOCO DA CHAVE PIX COM BOTÃO DE SALVAR */}
      <View className="bg-zinc-800 p-4 rounded-xl mb-4 border border-zinc-700">
        <Text className="text-white font-bold mb-2">Chave Pix da Barbearia</Text>
        <Text className="text-zinc-400 text-xs mb-3">Usada para receber os pagamentos das assinaturas VIP.</Text>
        <TextInput 
          value={chavePixLoja}
          onChangeText={setChavePixLoja}
          placeholder="Ex: CPF, Email ou Celular"
          placeholderTextColor="#71717a"
          className="bg-zinc-900 text-white p-3 rounded-lg border border-zinc-700 mb-3"
        />
        <TouchableOpacity 
          onPress={saveShopConfig} 
          disabled={loadingConfig} 
          className="bg-zinc-700 py-3 rounded-lg items-center"
        >
          {loadingConfig ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Salvar Chave Pix</Text>}
        </TouchableOpacity>
      </View>

      {/* BLOCO DE FIDELIDADE */}
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

        <TouchableOpacity onPress={saveShopConfig} disabled={loadingConfig} className="bg-orange-500 py-3 rounded-lg items-center mt-2">
          {loadingConfig ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Salvar Regras de Brinde</Text>}
        </TouchableOpacity>
      </View>

      {/* RELATÓRIOS E GESTÃO VIP */}
      <View className="flex-row justify-between mb-3 gap-2 mt-2">
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
      <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-700" onPress={() => navigation.navigate('ManagePlans')}>
        <Text className="text-2xl mr-4">💎</Text>
        <View>
          <Text className="text-white font-bold text-lg">Planos VIP</Text>
          <Text className="text-zinc-400 text-sm">Criar e editar pacotes de assinatura</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-700" onPress={() => navigation.navigate('ManageProducts')}>
        <Text className="text-2xl mr-4">🛍️</Text>
        <View>
          <Text className="text-white font-bold text-lg">Lojinha (Produtos)</Text>
          <Text className="text-zinc-400 text-sm">Controle de estoque e vendas</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl mb-3 flex-row items-center border border-zinc-700" onPress={() => navigation.navigate('ManageStoreOrders')}>
        <Text className="text-2xl mr-4">📦</Text>
        <View>
          <Text className="text-white font-bold text-lg">Pedidos da Lojinha</Text>
          <Text className="text-zinc-400 text-sm">Aprovar vendas e conferir Pix</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}