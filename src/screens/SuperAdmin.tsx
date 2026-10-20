import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform, Switch, ScrollView, Modal } from 'react-native';
import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

export default function SuperAdmin({ navigation }: any) {
  // ESTADOS DE CRIAÇÃO
  const [nomeBarbearia, setNomeBarbearia] = useState('');
  const [codigoId, setCodigoId] = useState('');
  const [emailDono, setEmailDono] = useState('');
  const [senhaDono, setSenhaDono] = useState(''); // CAMPO DE SENHA RESTAURADO
  const [whatsappDono, setWhatsappDono] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // ESTADOS DA LISTA
  const [barbearias, setBarbearias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ESTADOS DE EDIÇÃO
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editId, setEditId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSenha, setEditSenha] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editLogo, setEditLogo] = useState('');

  async function fetchBarbearias() {
    setFetching(true);
    try {
      const querySnapshot = await getDocs(collection(db, "barbearias"));
      setBarbearias(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.log(error);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchBarbearias();
  }, []);

  // FUNÇÃO DE CRIAR
  async function handleCreateBarbearia() {
    if (!nomeBarbearia || !codigoId || !emailDono || !senhaDono) {
      if (Platform.OS === 'web') alert("Preencha Nome, Código, Email e Senha obrigatórios!");
      else Alert.alert("Erro", "Preencha Nome, Código, Email e Senha obrigatórios!");
      return;
    }

    setLoading(true);
    try {
      const idPadronizado = codigoId.trim().toUpperCase();
      const shopRef = doc(db, "barbearias", idPadronizado); 
      
      await setDoc(shopRef, {
        nome: nomeBarbearia,
        ownerEmail: emailDono.toLowerCase().trim(),
        adminPassword: senhaDono, // SALVA A SENHA
        whatsapp: whatsappDono,
        logo: logoUrl.trim(),
        ativo: true,
        fidelidadeAtiva: true,
        metaFidelidade: 10,
        createdAt: new Date().toISOString()
      });

      setNomeBarbearia('');
      setCodigoId('');
      setEmailDono('');
      setSenhaDono('');
      setWhatsappDono('');
      setLogoUrl('');

      fetchBarbearias();
      if (Platform.OS === 'web') alert("Sistema criado com sucesso!");
      else Alert.alert("Sucesso", "Sistema criado com sucesso!");
    } catch (error) {
      console.log(error);
      if (Platform.OS === 'web') alert("Erro ao criar.");
    } finally {
      setLoading(false);
    }
  }

  // FUNÇÃO ABRIR MODAL DE EDIÇÃO
  function openEditModal(barbearia: any) {
    setEditId(barbearia.id);
    setEditNome(barbearia.nome || '');
    setEditEmail(barbearia.ownerEmail || '');
    setEditSenha(barbearia.adminPassword || '');
    setEditWhatsapp(barbearia.whatsapp || '');
    setEditLogo(barbearia.logo || '');
    setEditModalVisible(true);
  }

  // FUNÇÃO SALVAR EDIÇÃO
  async function handleSaveEdit() {
    if (!editNome || !editEmail) {
      const msg = "Nome e Email não podem ficar vazios.";
      if (Platform.OS === 'web') alert(msg); else Alert.alert("Aviso", msg);
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, "barbearias", editId), {
        nome: editNome,
        ownerEmail: editEmail.toLowerCase().trim(),
        adminPassword: editSenha,
        whatsapp: editWhatsapp,
        logo: editLogo.trim()
      });
      setEditModalVisible(false);
      fetchBarbearias();
      if (Platform.OS === 'web') alert("Atualizado com sucesso!");
    } catch (error) {
      console.log(error);
      if (Platform.OS === 'web') alert("Erro ao atualizar.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: boolean) {
      try {
          await updateDoc(doc(db, "barbearias", id), { ativo: !currentStatus });
          fetchBarbearias();
      } catch(e) { console.log(e); }
  }

  async function handleDelete(id: string) {
      const confirm = async () => {
          try { await deleteDoc(doc(db, "barbearias", id)); fetchBarbearias(); }
          catch(e) { console.log(e); }
      };
      if (Platform.OS === 'web') {
          if (window.confirm("Excluir barbearia permanentemente?")) confirm();
      } else {
          Alert.alert("Excluir", "Deseja excluir esta barbearia?", [
              {text: "Cancelar", style:"cancel"}, {text:"Excluir", onPress: confirm, style:"destructive"}
          ]);
      }
  }

  return (
    <View className="flex-1 bg-[#1a1a1c] px-6 pt-12">
      <View className="flex-row items-center justify-between mb-8">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-zinc-500">Sair</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Painel Super Admin 👑</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-white font-bold mb-4">💈 Criar Nova Barbearia</Text>

          <TextInput value={nomeBarbearia} onChangeText={setNomeBarbearia} placeholder="Nome da Barbearia" placeholderTextColor="#52525b" className="bg-[#27272a] text-white p-4 rounded-xl mb-3 border border-[#3f3f46]" />
          <TextInput value={codigoId} onChangeText={setCodigoId} placeholder="Código (ex: NAVALHA)" placeholderTextColor="#52525b" autoCapitalize="characters" className="bg-[#27272a] text-white p-4 rounded-xl mb-3 border border-[#3f3f46]" />
          <TextInput value={emailDono} onChangeText={setEmailDono} placeholder="Email do Dono (Admin)" placeholderTextColor="#52525b" autoCapitalize="none" keyboardType="email-address" className="bg-[#27272a] text-white p-4 rounded-xl mb-3 border border-[#3f3f46]" />
          
          {/* CAMPO DE SENHA */}
          <TextInput value={senhaDono} onChangeText={setSenhaDono} placeholder="Senha de Acesso (App)" placeholderTextColor="#52525b" autoCapitalize="none" className="bg-[#27272a] text-white p-4 rounded-xl mb-3 border border-[#3f3f46]" />
          
          <TextInput value={whatsappDono} onChangeText={setWhatsappDono} placeholder="WhatsApp do Dono (ex: 82999999999)" placeholderTextColor="#52525b" keyboardType="numeric" className="bg-[#27272a] text-white p-4 rounded-xl mb-3 border border-[#3f3f46]" />

          <Text className="text-zinc-500 text-xs mb-1 ml-1">Personalização Visual (Opcional)</Text>
          <TextInput value={logoUrl} onChangeText={setLogoUrl} placeholder="URL da Logo (ex: https://site.com/logo.png)" placeholderTextColor="#52525b" autoCapitalize="none" className="bg-[#27272a] text-white p-4 rounded-xl mb-6 border border-orange-500/30" />

          <TouchableOpacity onPress={handleCreateBarbearia} disabled={loading} className="bg-[#22c55e] p-4 rounded-xl items-center mb-10">
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Criar Sistema (+)</Text>}
          </TouchableOpacity>

          <Text className="text-zinc-500 font-bold text-xs mb-3">SISTEMAS ATIVOS</Text>

          {fetching ? <ActivityIndicator color="#f97316" size="large" /> : (
              barbearias.map(item => (
                  <View key={item.id} className="bg-[#27272a] p-4 rounded-xl mb-3 border border-[#3f3f46] flex-row justify-between items-center">
                      <View className="flex-1 pr-2">
                          <Text className="text-white font-bold text-lg">{item.nome}</Text>
                          <Text className="text-orange-500 font-bold text-xs mb-2">{item.id}</Text>
                          <Text className="text-zinc-400 text-xs">Admin: {item.ownerEmail}</Text>
                          {item.adminPassword && <Text className="text-zinc-400 text-xs">Senha: {item.adminPassword}</Text>}
                          <Text className="text-zinc-400 text-xs mb-3">WhatsApp: {item.whatsapp}</Text>
                          
                          <View className="flex-row items-center">
                              <TouchableOpacity onPress={() => openEditModal(item)} className="mr-4">
                                  <Text className="text-blue-400 text-xs font-bold">Editar ✏️</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                  <Text className="text-red-500 text-xs font-bold">Excluir 🗑️</Text>
                              </TouchableOpacity>
                          </View>
                      </View>
                      <Switch value={item.ativo ?? true} onValueChange={() => toggleStatus(item.id, item.ativo ?? true)} trackColor={{ false: '#3f3f46', true: '#0d9488' }} />
                  </View>
              ))
          )}
      </ScrollView>

      {/* MODAL DE EDIÇÃO */}
      <Modal visible={editModalVisible} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/80">
          <View className="bg-[#1a1a1c] p-6 rounded-t-3xl border-t border-orange-500/50 max-h-[90%]">
            <Text className="text-white font-bold text-2xl mb-6 text-center">Editar Barbearia</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text className="text-zinc-400 text-xs mb-1">ID (Não editável)</Text>
                <TextInput value={editId} editable={false} className="bg-[#27272a] text-zinc-500 p-4 rounded-xl mb-4 border border-[#3f3f46]" />

                <Text className="text-zinc-400 text-xs mb-1">Nome</Text>
                <TextInput value={editNome} onChangeText={setEditNome} className="bg-[#27272a] text-white p-4 rounded-xl mb-4 border border-[#3f3f46]" />

                <Text className="text-zinc-400 text-xs mb-1">Email do Dono</Text>
                <TextInput value={editEmail} onChangeText={setEditEmail} autoCapitalize="none" className="bg-[#27272a] text-white p-4 rounded-xl mb-4 border border-[#3f3f46]" />

                <Text className="text-zinc-400 text-xs mb-1">Senha (App)</Text>
                <TextInput value={editSenha} onChangeText={setEditSenha} autoCapitalize="none" className="bg-[#27272a] text-white p-4 rounded-xl mb-4 border border-[#3f3f46]" />

                <Text className="text-zinc-400 text-xs mb-1">WhatsApp</Text>
                <TextInput value={editWhatsapp} onChangeText={setEditWhatsapp} keyboardType="numeric" className="bg-[#27272a] text-white p-4 rounded-xl mb-4 border border-[#3f3f46]" />

                <Text className="text-zinc-400 text-xs mb-1">URL da Logo</Text>
                <TextInput value={editLogo} onChangeText={setEditLogo} autoCapitalize="none" className="bg-[#27272a] text-white p-4 rounded-xl mb-8 border border-[#3f3f46]" />

                <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit} className="bg-orange-500 p-4 rounded-xl items-center mb-3">
                    {isSavingEdit ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Salvar Alterações</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setEditModalVisible(false)} className="p-4 rounded-xl items-center mb-4">
                    <Text className="text-zinc-400 font-bold">Cancelar</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}