import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, Platform, Modal, ActivityIndicator, ScrollView, Image } from 'react-native';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManageProducts({ navigation }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [estoque, setEstoque] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [shopIdState, setShopIdState] = useState('');

  async function fetchProducts() {
    setLoading(true);
    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      if (!shopId) return;
      setShopIdState(shopId);

      const q = query(collection(db, "produtos"), where("shopId", "==", shopId));
      const querySnapshot = await getDocs(q);
      setProducts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.log(error); } 
    finally { setLoading(false); }
  }

  useEffect(() => { fetchProducts(); }, []);

  function openNewModal() {
    setEditingId(null);
    setNome(''); setPreco(''); setEstoque(''); setDescricao(''); setImagemUrl('');
    setModalVisible(true);
  }

  function openEditModal(produto: any) {
    setEditingId(produto.id);
    setNome(produto.nome);
    setPreco(produto.preco.toString());
    setEstoque(produto.estoque.toString());
    setDescricao(produto.descricao || '');
    setImagemUrl(produto.imagemUrl || '');
    setModalVisible(true);
  }

  async function handleSave() {
    if (!nome || !preco || !estoque) {
        const msg = "Preencha o Nome, Preço e Quantidade em Estoque!";
        if (Platform.OS === 'web') alert(msg); else Alert.alert("Aviso", msg);
        return;
    }
    
    setIsSaving(true);
    try {
      const precoNumber = parseFloat(preco.replace(',', '.'));
      const estoqueNumber = parseInt(estoque, 10);
      
      const productData = { 
          shopId: shopIdState, 
          nome, 
          preco: precoNumber, 
          estoque: estoqueNumber, 
          descricao,
          imagemUrl 
      };

      if (editingId) await updateDoc(doc(db, "produtos", editingId), productData);
      else await addDoc(collection(db, "produtos"), productData);
      
      setModalVisible(false);
      fetchProducts();
    } catch (error) { console.log(error); } 
    finally { setIsSaving(false); }
  }

  async function handleDelete(id: string) {
    const confirmDelete = async () => {
      try { await deleteDoc(doc(db, "produtos", id)); fetchProducts(); } catch (error) { console.log(error); }
    };
    if (Platform.OS === 'web') { if (window.confirm("Deseja excluir este produto?")) confirmDelete(); } 
    else { Alert.alert("Excluir", "Deseja excluir?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", onPress: confirmDelete, style: "destructive" }]); }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()}><Text className="text-orange-500 text-lg font-bold">← Voltar</Text></TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Lojinha 🛍️</Text>
      </View>

      <TouchableOpacity onPress={openNewModal} className="bg-orange-500 p-4 rounded-lg items-center mb-6">
        <Text className="text-white font-bold text-lg">+ Adicionar Produto</Text>
      </TouchableOpacity>

      {loading ? <ActivityIndicator size="large" color="#f97316" className="mt-10" /> : (
        <FlatList
          data={products} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View className={`p-4 rounded-xl mb-4 flex-row items-center justify-between border ${item.estoque <= 0 ? 'bg-red-500/10 border-red-500' : 'bg-zinc-800 border-zinc-700'}`}>
              
              {item.imagemUrl ? (
                  <Image source={{ uri: item.imagemUrl }} className="w-16 h-16 rounded-lg mr-4 border border-zinc-600" />
              ) : (
                  <View className="w-16 h-16 rounded-lg mr-4 bg-zinc-700 items-center justify-center border border-zinc-600"><Text>📦</Text></View>
              )}

              <View className="flex-1 pr-2">
                <Text className="font-bold text-lg text-white">{item.nome}</Text>
                <Text className="text-zinc-400 text-xs mb-1" numberOfLines={1}>{item.descricao || "Sem descrição"}</Text>
                
                <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-orange-500 font-bold">R$ {item.preco?.toFixed(2)}</Text>
                    <Text className={`font-bold text-xs px-2 py-1 rounded ${item.estoque > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                        {item.estoque > 0 ? `${item.estoque} em estoque` : 'Esgotado'}
                    </Text>
                </View>
              </View>
              
              <View className="flex-col ml-2 gap-2">
                <TouchableOpacity onPress={() => openEditModal(item)} className="bg-blue-600 w-10 h-10 rounded items-center justify-center"><Text className="text-white text-lg">✏️</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} className="bg-red-500/20 w-10 h-10 rounded items-center justify-center border border-red-500"><Text className="text-red-400 text-lg">🗑️</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => <Text className="text-zinc-500 text-center mt-10">Nenhum produto cadastrado.</Text>}
        />
      )}

      {/* MODAL DE PRODUTO */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/80">
          <View className="bg-zinc-900 pt-6 px-6 rounded-t-3xl border-t border-orange-500/50 w-full" style={{ maxHeight: '90%', flexShrink: 1 }}>
            
            <Text className="text-white font-bold text-2xl mb-4 text-center">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 80 }}>
                <Text className="text-zinc-400 mb-1 text-xs">Nome do Produto *</Text>
                <TextInput value={nome} onChangeText={setNome} placeholder="Ex: Pomada Efeito Matte" placeholderTextColor="#71717a" className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700" />

                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                        <Text className="text-zinc-400 mb-1 text-xs">Preço (R$) *</Text>
                        <TextInput value={preco} onChangeText={setPreco} keyboardType="numeric" placeholder="35.00" placeholderTextColor="#71717a" className="bg-zinc-800 text-white p-4 rounded-xl border border-zinc-700" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-zinc-400 mb-1 text-xs">Estoque (Qtd) *</Text>
                        <TextInput value={estoque} onChangeText={setEstoque} keyboardType="numeric" placeholder="10" placeholderTextColor="#71717a" className="bg-zinc-800 text-white p-4 rounded-xl border border-zinc-700" />
                    </View>
                </View>

                <Text className="text-zinc-400 mb-1 text-xs">Descrição Curta</Text>
                <TextInput value={descricao} onChangeText={setDescricao} placeholder="Ex: Fixação forte e sem brilho." placeholderTextColor="#71717a" className="bg-zinc-800 text-white p-4 rounded-xl mb-4 border border-zinc-700" />

                <Text className="text-zinc-400 mb-1 text-xs">URL da Imagem (Opcional)</Text>
                <TextInput value={imagemUrl} onChangeText={setImagemUrl} autoCapitalize="none" placeholder="https://link-da-imagem.com/foto.png" placeholderTextColor="#71717a" className="bg-zinc-800 text-white p-4 rounded-xl mb-8 border border-zinc-700" />

                <TouchableOpacity onPress={handleSave} disabled={isSaving} className="bg-orange-500 p-4 rounded-xl items-center mb-3">
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Salvar Produto</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="p-4 rounded-xl items-center mb-6">
                    <Text className="text-red-400 font-bold">Cancelar</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}