import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, FlatList, Image, Alert, Platform, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth'; 
import { auth, db } from '../config/firebase'; 
import { collection, getDocs, query, where, doc, getDoc, addDoc } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

const PLANOS_VIP = [
  { id: '1', nome: 'Social + Sobrancelha', preco: 25.00, itens: 'Corte Social e Sobrancelha' },
  { id: '2', nome: 'Degradê + Barba', preco: 35.00, itens: 'Corte Degradê e Barba' },
  { id: '3', nome: 'Plano Master', preco: 60.00, itens: 'Corte Livre 4x ao mês' }
];

export default function Home({ navigation }: any) {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [shopName, setShopName] = useState('');
  const [shopIdState, setShopIdState] = useState('');
  const [chavePixLoja, setChavePixLoja] = useState('');
  const [isOwner, setIsOwner] = useState(false); 
  
  const [pontos, setPontos] = useState(0);
  const [meta, setMeta] = useState(10);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);

  // ESTADOS VIP & USUARIO
  const [userData, setUserData] = useState<any>(null);
  const [isVIP, setIsVIP] = useState(false);
  const [planoAtual, setPlanoAtual] = useState<string>('');
  const [diasVencimentoVIP, setDiasVencimentoVIP] = useState<number | null>(null);

  // ESTADOS DO MODAL DE ASSINATURA
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  async function checkPermissionAndLoyalty() {
      const name = await AsyncStorage.getItem('@delp_shopName');
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      const ownerEmail = await AsyncStorage.getItem('@delp_ownerEmail');
      const currentUser = auth.currentUser;

      setShopName(name || "Barbearia");
      if (shopId) setShopIdState(shopId);

      if (currentUser?.email && ownerEmail && currentUser.email.toLowerCase() === ownerEmail.toLowerCase()) {
          setIsOwner(true); 
      } else {
          setIsOwner(false);
      }

      if (shopId && currentUser) {
          try {
              const shopSnap = await getDoc(doc(db, "barbearias", shopId));
              if (shopSnap.exists()) {
                  const data = shopSnap.data();
                  if (data.metaFidelidade) setMeta(data.metaFidelidade);
                  setFidelidadeAtiva(data.fidelidadeAtiva ?? true); 
                  if (data.chavePixLoja) setChavePixLoja(data.chavePixLoja);
              }

              const userSnap = await getDoc(doc(db, "usuarios", currentUser.uid));
              if (userSnap.exists()) {
                  const uData = userSnap.data();
                  setUserData({ id: currentUser.uid, ...uData });
                  if (uData.pontosFidelidade) setPontos(uData.pontosFidelidade);
                  
                  setIsVIP(uData.isVIP || false);
                  setPlanoAtual(uData.vipPlanName || '');
                  if (uData.isVIP && uData.vipExpiration) {
                      const expiracao = new Date(uData.vipExpiration);
                      const hoje = new Date();
                      const diferencaDias = Math.ceil((expiracao.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
                      setDiasVencimentoVIP(diferencaDias);
                  }
              }
          } catch (error) { console.log("Erro:", error); }
      }
  }

  useFocusEffect(useCallback(() => { checkPermissionAndLoyalty(); }, []));

  useEffect(() => {
    async function fetchBarbers() {
      try {
        const shopId = await AsyncStorage.getItem('@delp_shopId');
        if (!shopId) return;
        const q = query(collection(db, "barbeiros"), where("shopId", "==", shopId));
        const querySnapshot = await getDocs(q);
        setBarbers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { console.log(error); }
    }
    fetchBarbers();
  }, []);

  function handleLogout() {
      if (Platform.OS === 'web') {
          if (window.confirm("Deseja sair?")) signOut(auth).then(() => window.location.reload());
      } else {
          Alert.alert("Sair", "Deseja sair da sua conta?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sim", onPress: () => signOut(auth) }
          ]);
      }
  }

  // ABRIR O MODAL DO PLANO
  const openPlanModal = (plano: any) => {
      setSelectedPlan(plano);
      setShowPlanModal(true);
  };

  const copyPix = async () => {
      if (chavePixLoja) {
          await Clipboard.setStringAsync(chavePixLoja);
          if (Platform.OS === 'web') alert("Chave Pix copiada!");
          else Alert.alert("Copiado!", "Chave Pix copiada.");
      } else {
          if (Platform.OS === 'web') alert("A barbearia ainda não configurou a chave Pix.");
          else Alert.alert("Aviso", "A barbearia ainda não configurou a chave Pix.");
      }
  };

  // ENVIA SOLICITAÇÃO PARA O BARBEIRO
  const handleConfirmPayment = async () => {
      if (!userData) return;
      setIsRequesting(true);
      try {
          await addDoc(collection(db, 'solicitacoes_vip'), {
              clienteId: userData.id,
              clienteNome: userData.nome || auth.currentUser?.email,
              clienteTelefone: userData.telefone || 'Sem contato',
              planoId: selectedPlan.id,
              planoNome: selectedPlan.nome,
              planoPreco: selectedPlan.preco,
              shopId: shopIdState,
              status: 'pendente',
              dataSolicitacao: new Date().toISOString()
          });
          setShowPlanModal(false);
          if (Platform.OS === 'web') alert("Sucesso! Pagamento informado. O barbeiro irá liberar seu acesso VIP em breve.");
          else Alert.alert("Sucesso!", "Pagamento informado. O barbeiro irá liberar seu acesso VIP em breve.");
      } catch (error) {
          console.log(error);
          if (Platform.OS === 'web') alert("Erro ao enviar.");
      } finally {
          setIsRequesting(false);
      }
  };

  const progresso = Math.min((pontos / meta) * 100, 100);

  return (
    <ScrollView className="flex-1 bg-zinc-900 px-6 pt-12" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-zinc-400 text-sm">Olá, Bem-vindo</Text>
          <Text className="text-white text-3xl font-bold">{shopName}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} className="bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-700">
          <Text className="text-red-400 font-bold">Sair</Text>
        </TouchableOpacity>
      </View>

      {isVIP && diasVencimentoVIP !== null && (
          <View className={`p-4 rounded-xl mb-4 border ${diasVencimentoVIP <= 5 ? 'bg-red-500/10 border-red-500' : 'bg-yellow-500/10 border-yellow-500'}`}>
              <Text className={`font-bold ${diasVencimentoVIP <= 5 ? 'text-red-400' : 'text-yellow-500'}`}>
                  {diasVencimentoVIP <= 0 ? '⚠️ Sua assinatura VIP venceu! Renove com o barbeiro.' : `👑 Você é VIP! Plano: ${planoAtual} (Vence em ${diasVencimentoVIP} dias).`}
              </Text>
          </View>
      )}

      {/* VITRINE */}
      {!isVIP && !isOwner && (
          <View className="mb-6">
              <Text className="text-white text-xl font-bold mb-3">Planos de Assinatura 👑</Text>
              <Text className="text-zinc-400 text-sm mb-4">Seja VIP tenha mais exclusividade, descontos, pague por mês e não se preocupe mais com taxas de agendamento nos seus serviços favoritos.</Text>
              
              <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={PLANOS_VIP}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                      <View className="bg-zinc-800 border border-yellow-500/50 p-4 rounded-xl mr-4 w-60">
                          <Text className="text-yellow-500 font-bold text-lg mb-1">{item.nome}</Text>
                          <Text className="text-zinc-300 text-sm mb-3 h-10">{item.itens}</Text>
                          <Text className="text-white font-bold text-2xl mb-4">R$ {item.preco.toFixed(2)}<Text className="text-sm text-zinc-400">/mês</Text></Text>
                          
                          <TouchableOpacity onPress={() => openPlanModal(item)} className="bg-yellow-600 p-3 rounded-lg items-center">
                              <Text className="text-white font-bold">Quero Assinar</Text>
                          </TouchableOpacity>
                      </View>
                  )}
              />
          </View>
      )}

      {fidelidadeAtiva && (
          <View className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-5 rounded-2xl mb-6 border border-orange-500/30 shadow-lg">
              <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center"><Text className="text-2xl mr-2">🎁</Text><Text className="text-white font-bold text-lg">Cartão Fidelidade</Text></View>
                  <Text className="text-orange-500 font-bold text-xl">{pontos}/{meta}</Text>
              </View>
              <View className="h-3 bg-zinc-700 rounded-full w-full overflow-hidden mb-2">
                  <View className="h-full bg-orange-500 rounded-full" style={{ width: `${progresso}%` }} />
              </View>
              {pontos >= meta ? <Text className="text-green-400 font-bold text-sm text-center mt-1">🎉 Parabéns! Você atingiu a meta e ganhou o prêmio!</Text> : <Text className="text-zinc-400 text-sm">Faltam <Text className="text-white font-bold">{meta - pontos}</Text> cortes para o brinde.</Text>}
          </View>
      )}

      <View className="mb-6">
        <TouchableOpacity className="bg-orange-500 p-4 rounded-xl mb-3 items-center" onPress={() => navigation.navigate('MyAppointments')}>
          <Text className="text-white font-bold text-lg">📅 Meus Agendamentos</Text>
        </TouchableOpacity>

        {isOwner && (
            <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl items-center border border-zinc-700" onPress={() => navigation.navigate('AdminPanel')}>
            <Text className="text-orange-500 font-bold text-lg">⚙️ Painel Admin</Text>
            </TouchableOpacity>
        )}
      </View>

      <Text className="text-white text-xl font-bold mb-4">Nossos Barbeiros(as)</Text>
      <View className="mb-10">
        {barbers.map(item => (
            <TouchableOpacity key={item.id} onPress={() => navigation.navigate('BarberProfile', { barber: item })} className="bg-zinc-800 p-4 rounded-xl mb-4 flex-row items-center border border-zinc-700">
                <Image source={{ uri: item.foto }} className="w-16 h-16 rounded-full mr-4 bg-zinc-700 border border-zinc-600" />
                <View>
                    <Text className="text-white font-bold text-lg">{item.nome}</Text>
                    <Text className="text-zinc-400 text-sm">{item.especialidade}</Text>
                    <Text className="text-orange-500 text-sm mt-1">⭐ {item.nota || "5.0"}</Text>
                </View>
            </TouchableOpacity>
        ))}
      </View>

      {/* MODAL DE PAGAMENTO PIX DA ASSINATURA */}
      <Modal visible={showPlanModal} transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/80">
              <View className="bg-zinc-900 p-6 rounded-t-3xl border-t border-yellow-500/50">
                  <Text className="text-2xl mb-2 text-center">👑</Text>
                  <Text className="text-white font-bold text-2xl text-center mb-1">Assinatura VIP</Text>
                  <Text className="text-zinc-400 text-center mb-6">Plano: {selectedPlan?.nome}</Text>
                  
                  <View className="bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-700">
                      <Text className="text-white font-bold mb-2">1. Realize o pagamento via Pix:</Text>
                      <Text className="text-yellow-500 font-bold text-2xl mb-4">R$ {selectedPlan?.preco?.toFixed(2)}</Text>
                      
                      <Text className="text-zinc-400 text-sm mb-1">Chave Pix da Barbearia:</Text>
                      <View className="flex-row items-center justify-between bg-zinc-900 p-3 rounded-lg mb-2">
                          <Text className="text-white font-bold">{chavePixLoja || "Chave não configurada"}</Text>
                          <TouchableOpacity onPress={copyPix} className="bg-zinc-700 px-3 py-1 rounded">
                              <Text className="text-white text-xs">Copiar</Text>
                          </TouchableOpacity>
                      </View>
                      <Text className="text-zinc-500 text-xs italic">O comprovante ficará salvo no seu banco.</Text>
                  </View>

                  <TouchableOpacity onPress={handleConfirmPayment} disabled={isRequesting} className="bg-yellow-600 p-4 rounded-xl items-center mb-3">
                      {isRequesting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Já fiz o Pagamento ✅</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowPlanModal(false)} className="p-4 rounded-xl items-center mb-6">
                      <Text className="text-red-400 font-bold">Cancelar</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </ScrollView>
  );
}