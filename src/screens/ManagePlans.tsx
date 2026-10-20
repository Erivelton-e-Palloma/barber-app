import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, Platform, Modal, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManagePlans({ navigation }: any) {
  const [plans, setPlans] = useState<any[]>([]);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<any[]>([]); // TODOS OS SERVIÇOS DO BARBEIRO
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]); // ARRAY COM OS NOMES DOS SERVIÇOS MARCADOS
  const [liberaTodos, setLiberaTodos] = useState(false); 
  const [shopIdState, setShopIdState] = useState('');

  async function fetchData() {
    setLoading(true);
    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      if (!shopId) return;
      setShopIdState(shopId);

      // 1. Busca os Planos VIP
      const qPlanos = query(collection(db, "planos_vip"), where("shopId", "==", shopId));
      const snapPlanos = await getDocs(qPlanos);
      setPlans(snapPlanos.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Busca os Serviços Cadastrados (para montar a lista de checkboxes)
      const qServicos = query(collection(db, "servicos"), where("shopId", "==", shopId));
      const snapServicos = await getDocs(qServicos);
      setServicosDisponiveis(snapServicos.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  function openNewModal() {
    setEditingId(null);
    setNome(''); setPreco(''); setSelectedServices([]); setLiberaTodos(false);
    setModalVisible(true);
  }

  function openEditModal(plano: any) {
    setEditingId(plano.id);
    setNome(plano.nome);
    setPreco(plano.preco.toString());
    
    // Converte a string "Degradê, Barba" de volta para array ["Degradê", "Barba"] para marcar as caixinhas
    const servicosSalvos = plano.itens ? plano.itens.split(', ') : [];
    setSelectedServices(servicosSalvos);
    
    setLiberaTodos(plano.liberaTodos || false);
    setModalVisible(true);
  }

  const toggleService = (nomeServico: string) => {
      if (selectedServices.includes(nomeServico)) {
          setSelectedServices(selectedServices.filter(s => s !== nomeServico));
      } else {
          setSelectedServices([...selectedServices, nomeServico]);
      }
  };

  async function handleSave() {
    // Se não for "Super Assinatura", exige que selecione pelo menos um serviço
    if (!nome || !preco || (!liberaTodos && selectedServices.length === 0)) {
        if (Platform.OS === 'web') alert("Preencha o nome, preço e selecione os serviços (ou ative a Super Assinatura).");
        else Alert.alert("Aviso", "Preencha o nome, preço e selecione os serviços.");
        return;
    }
    
    setIsSaving(true);
    try {
      const precoNumber = parseFloat(preco.replace(',', '.'));
      // Transforma o Array ["Degradê", "Barba"] numa String "Degradê, Barba" para o banco
      const itensString = liberaTodos ? 'Todos os Serviços' : selectedServices.join(', ');
      
      const planData = { shopId: shopIdState, nome, preco: precoNumber, itens: itensString, liberaTodos };

      if (editingId) await updateDoc(doc(db, "planos_vip", editingId), planData);
      else await addDoc(collection(db, "planos_vip"), planData);
      
      setModalVisible(false);
      fetchData();
    } catch (error) { console.log(error); } 
    finally { setIsSaving(false); }
  }

  async function handleDelete(id: string) {
    const confirmDelete = async () => {
      try { await deleteDoc(doc(db, "planos_vip", id)); fetchData(); } catch (error) { console.log(error); }
    };
    if (Platform.OS === 'web') { if (window.confirm("Deseja excluir este plano?")) confirmDelete(); } 
    else { Alert.alert("Excluir", "Deseja excluir?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", onPress: confirmDelete, style: "destructive" }]); }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()}><Text className="text-orange-500 text-lg font-bold">← Voltar</Text></TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Planos VIP</Text>
      </View>

      <TouchableOpacity onPress={openNewModal} className="bg-orange-500 p-4 rounded-lg items-center mb-6">
        <Text className="text-white font-bold text-lg">+ Adicionar Novo Plano</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator size="large" color="#f97316" className="mt-10" /> : (
        <FlatList
          data={plans} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className={`p-4 rounded-xl mb-4 flex-row items-center justify-between border ${item.liberaTodos ? 'bg-yellow-500/10 border-yellow-500' : 'bg-zinc-800 border-zinc-700'}`}>
              <View className="flex-1 pr-4">
                <Text className={`font-bold text-lg ${item.liberaTodos ? 'text-yellow-500' : 'text-white'}`}>{item.nome} {item.liberaTodos && "👑"}</Text>
                <Text className="text-zinc-400 text-sm mb-1">{item.itens}</Text>
                <Text className="text-white font-bold">R$ {item.preco?.toFixed(2)} /mês</Text>
              </View>
              <View className="flex-row">
                <TouchableOpacity onPress={() => openEditModal(item)} className="bg-blue-600 w-10 h-10 rounded items-center justify-center mr-2"><Text className="text-white text-lg">✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} className="bg-red-500/20 w-10 h-10 rounded items-center justify-center border border-red-500"><Text className="text-red-400 text-lg">🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => <Text className="text-zinc-500 text-center mt-10">Nenhum plano cadastrado.</Text>}
        />
      )}

      {/* MODAL COM CHECKBOXES */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/80">
          <View className="bg-zinc-900 p-6 rounded-t-3xl border-t border-orange-500/50 max-h-[90%]">
            <Text className="text-white font-bold text-2xl mb-6 text-center">{editingId ? 'Editar Plano' : 'Novo Plano VIP'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text className="text-zinc-400 mb-2">Nome do Plano</Text>
                <TextInput value={nome} onChangeText={setNome} placeholder="Ex: Master All-Inclusive" placeholderTextColor="#71717a" className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700" />

                <View className="flex-row items-center justify-between bg-zinc-800 p-4 rounded-xl mb-4 border border-zinc-700">
                    <View className="flex-1 pr-2">
                        <Text className="text-white font-bold">Super Assinatura (Livre)</Text>
                        <Text className="text-zinc-400 text-xs mt-1">Isenção total. Não precisa selecionar serviços abaixo.</Text>
                    </View>
                    <Switch value={liberaTodos} onValueChange={setLiberaTodos} trackColor={{ false: '#3f3f46', true: '#eab308' }} />
                </View>

                {/* LISTA DINÂMICA DE SERVIÇOS (TIPO CHECKBOX) */}
                {!liberaTodos && (
                    <View className="mb-4">
                        <Text className="text-zinc-400 mb-2">Selecione os Serviços Cobertos:</Text>
                        {servicosDisponiveis.length === 0 ? (
                            <Text className="text-zinc-500 italic text-sm mb-2">Você ainda não tem serviços cadastrados. Vá em 'Serviços' no Painel Admin.</Text>
                        ) : (
                            servicosDisponiveis.map((srv) => {
                                const isChecked = selectedServices.includes(srv.nome);
                                return (
                                    <TouchableOpacity 
                                        key={srv.id} 
                                        onPress={() => toggleService(srv.nome)}
                                        className={`p-3 rounded-lg mb-2 flex-row items-center border ${isChecked ? 'bg-orange-500/20 border-orange-500' : 'bg-zinc-800 border-zinc-700'}`}
                                    >
                                        <View className={`w-5 h-5 rounded border items-center justify-center mr-3 ${isChecked ? 'bg-orange-500 border-orange-500' : 'border-zinc-500'}`}>
                                            {isChecked && <Text className="text-white text-xs">✓</Text>}
                                        </View>
                                        <Text className={`font-bold ${isChecked ? 'text-orange-500' : 'text-zinc-300'}`}>{srv.nome}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                )}

                <Text className="text-zinc-400 mb-2 mt-2">Valor Mensal (R$)</Text>
                <TextInput value={preco} onChangeText={setPreco} keyboardType="numeric" placeholder="Ex: 100.00" placeholderTextColor="#71717a" className="bg-zinc-800 text-white p-4 rounded-xl mb-6 border border-zinc-700" />

                <TouchableOpacity onPress={handleSave} disabled={isSaving} className="bg-orange-500 p-4 rounded-xl items-center mb-3">
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Salvar Plano</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="p-4 rounded-xl items-center mb-6"><Text className="text-red-400 font-bold">Cancelar</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}