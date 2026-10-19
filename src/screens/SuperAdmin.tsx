import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Switch, Platform } from 'react-native';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export default function SuperAdmin({ navigation }: any) {
  const [nomeBarbearia, setNomeBarbearia] = useState('');
  const [codigo, setCodigo] = useState('');
  const [emailDono, setEmailDono] = useState('');
  const [telefoneDono, setTelefoneDono] = useState('');
  const [sistemas, setSistemas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchSistemas() {
    try {
      const querySnapshot = await getDocs(collection(db, "barbearias"));
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSistemas(lista);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchSistemas();
  }, []);

  async function handleCreateShop() {
    if (!nomeBarbearia || !codigo || !emailDono || !telefoneDono) {
      Alert.alert("Erro", "Preencha todos os campos, incluindo o telefone.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "barbearias"), {
        nome: nomeBarbearia,
        codigo: codigo.toUpperCase().trim(),
        emailDono: emailDono.toLowerCase().trim(),
        telefoneDono: telefoneDono.trim(),
        ativo: true,
        metaFidelidade: 10,
        fidelidadeAtiva: true,
        createdAt: new Date().toISOString()
      });
      Alert.alert("Sucesso", "Novo sistema gerado!");
      setNomeBarbearia('');
      setCodigo('');
      setEmailDono('');
      setTelefoneDono('');
      fetchSistemas();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível criar.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(id: string, currentStatus: boolean) {
    try {
      await updateDoc(doc(db, "barbearias", id), { ativo: !currentStatus });
      fetchSistemas();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível alterar o status.");
    }
  }

  // CORREÇÃO: Usando window.confirm na Web para não travar
  async function handleDelete(id: string) {
    if (Platform.OS === 'web') {
        const confirmar = window.confirm("Atenção: Tem certeza que deseja excluir esta barbearia do banco de dados?");
        if (confirmar) {
            await deleteDoc(doc(db, "barbearias", id));
            fetchSistemas();
        }
    } else {
        Alert.alert("Atenção", "Tem certeza que deseja excluir esta barbearia do banco de dados?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Excluir", style: "destructive", onPress: async () => {
              await deleteDoc(doc(db, "barbearias", id));
              fetchSistemas();
          }}
        ]);
    }
  }

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-zinc-500">Sair</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold flex-1 text-center">Painel Super Admin 👑</Text>
      </View>

      <View className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 mb-6">
        <Text className="text-white font-bold mb-4">🏭 Criar Nova Barbearia</Text>
        
        <TextInput 
          placeholder="Nome da Barbearia"
          placeholderTextColor="#71717a"
          value={nomeBarbearia}
          onChangeText={setNomeBarbearia}
          className="bg-zinc-900 text-white p-3 rounded-lg mb-3 border border-zinc-700"
        />
        <TextInput 
          placeholder="Código (ex: NAVALHA)"
          placeholderTextColor="#71717a"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
          className="bg-zinc-900 text-white p-3 rounded-lg mb-3 border border-zinc-700"
        />
        <TextInput 
          placeholder="Email do Dono (Admin)"
          placeholderTextColor="#71717a"
          value={emailDono}
          onChangeText={setEmailDono}
          autoCapitalize="none"
          keyboardType="email-address"
          className="bg-zinc-900 text-white p-3 rounded-lg mb-3 border border-zinc-700"
        />
        <TextInput 
          placeholder="WhatsApp do Dono (ex: 82999999999)"
          placeholderTextColor="#71717a"
          value={telefoneDono}
          onChangeText={setTelefoneDono}
          keyboardType="numeric"
          className="bg-zinc-900 text-white p-3 rounded-lg mb-4 border border-zinc-700"
        />

        <TouchableOpacity 
          className="bg-green-600 p-3 rounded-lg items-center"
          onPress={handleCreateShop}
          disabled={loading}
        >
          <Text className="text-white font-bold">Criar Sistema (+)</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-zinc-500 font-bold mb-2 uppercase text-xs">Sistemas Ativos</Text>
      
      <FlatList 
        data={sistemas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        renderItem={({ item }) => (
          <View className={`p-4 rounded-xl mb-3 border ${item.ativo ? 'bg-zinc-800 border-zinc-700' : 'bg-red-900/20 border-red-900'}`}>
            <View className="flex-row justify-between items-center mb-2">
              <View>
                <Text className="text-white font-bold text-lg">{item.nome}</Text>
                <Text className="text-orange-500 font-bold text-xs">{item.codigo}</Text>
              </View>
              <Switch 
                value={item.ativo}
                onValueChange={() => toggleAtivo(item.id, item.ativo)}
                trackColor={{ false: '#3f3f46', true: '#f97316' }}
              />
            </View>
            <Text className="text-zinc-500 text-xs">Admin: {item.emailDono}</Text>
            {item.telefoneDono && <Text className="text-zinc-500 text-xs">WhatsApp: {item.telefoneDono}</Text>}
            
            <TouchableOpacity onPress={() => handleDelete(item.id)} className="mt-3 self-end">
                <Text className="text-red-500 text-xs font-bold">Excluir 🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}