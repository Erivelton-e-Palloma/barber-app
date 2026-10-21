import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, FlatList, Image, Alert, Platform, Modal, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth'; 
import { auth, db } from '../config/firebase'; 
import { collection, getDocs, query, where, doc, getDoc, addDoc } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

export default function Home({ navigation }: any) {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [planosVipDinamicos, setPlanosVipDinamicos] = useState<any[]>([]);
  const [servicosLoja, setServicosLoja] = useState<any[]>([]); 
  const [produtosLojinha, setProdutosLojinha] = useState<any[]>([]); 
  const [meusPedidosLojinha, setMeusPedidosLojinha] = useState<any[]>([]); 
  
  const [shopName, setShopName] = useState('');
  const [shopLogo, setShopLogo] = useState<string | null>(null); 
  const [shopIdState, setShopIdState] = useState('');
  const [chavePixLoja, setChavePixLoja] = useState('');
  const [isOwner, setIsOwner] = useState(false); 
  
  const [pontos, setPontos] = useState(0);
  const [meta, setMeta] = useState(10);
  const [fidelidadeAtiva, setFidelidadeAtiva] = useState(true);

  const [userData, setUserData] = useState<any>(null);
  const [isVIP, setIsVIP] = useState(false);
  const [planoAtual, setPlanoAtual] = useState<string>('');
  const [diasVencimentoVIP, setDiasVencimentoVIP] = useState<number | null>(null);
  const [pedidoPendenteId, setPedidoPendenteId] = useState<string | null>(null);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isBuyingProduct, setIsBuyingProduct] = useState(false);

  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false); 

  async function checkPermissionAndLoyalty() {
      const name = await AsyncStorage.getItem('@delp_shopName');
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      const ownerEmail = await AsyncStorage.getItem('@delp_ownerEmail');
      const currentUser = auth.currentUser;

      setShopName(name || "Barbearia");
      if (shopId) {
          setShopIdState(shopId);
          fetchPlanosDinamicos(shopId);
          fetchServicosLoja(shopId); 
          fetchProdutosDaLoja(shopId); 
      }

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
                  if (data.nome) setShopName(data.nome);
                  if (data.logo) setShopLogo(data.logo); 
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
                      setDiasVencimentoVIP(Math.ceil((expiracao.getTime() - hoje.getTime()) / (1000 * 3600 * 24)));
                  }
              }

              const qPendente = query(collection(db, "solicitacoes_vip"), where("clienteId", "==", currentUser.uid), where("shopId", "==", shopId), where("status", "==", "pendente"));
              const snapPendente = await getDocs(qPendente);
              if (!snapPendente.empty) setPedidoPendenteId(snapPendente.docs[0].data().planoId);
              else setPedidoPendenteId(null);

              fetchMeusPedidosLojinha(currentUser.uid, shopId); 

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

  async function fetchPlanosDinamicos(idLoja: string) {
      try {
          const q = query(collection(db, "planos_vip"), where("shopId", "==", idLoja));
          const snap = await getDocs(q);
          setPlanosVipDinamicos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) { console.log(error); }
  }

  async function fetchServicosLoja(idLoja: string) {
      try {
          const q = query(collection(db, "servicos"), where("shopId", "==", idLoja));
          const snap = await getDocs(q);
          setServicosLoja(snap.docs.map(d => d.data()));
      } catch (error) { console.log(error); }
  }

  async function fetchProdutosDaLoja(idLoja: string) {
      try {
          const q = query(collection(db, "produtos"), where("shopId", "==", idLoja));
          const snap = await getDocs(q);
          setProdutosLojinha(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.estoque > 0)); 
      } catch (error) { console.log(error); }
  }

  async function fetchMeusPedidosLojinha(userId: string, shopId: string) {
      try {
          const q = query(collection(db, "pedidos_lojinha"), where("clienteId", "==", userId), where("shopId", "==", shopId));
          const snap = await getDocs(q);
          const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          pedidos.sort((a, b) => new Date(b.dataPedido).getTime() - new Date(a.dataPedido).getTime());
          setMeusPedidosLojinha(pedidos);
      } catch (error) { console.log(error); }
  }

  function handleLogout() {
      if (Platform.OS === 'web') {
          if (window.confirm("Deseja sair?")) signOut(auth).then(() => window.location.reload());
      } else {
          Alert.alert("Sair", "Deseja sair da sua conta?", [{ text: "Cancelar", style: "cancel" }, { text: "Sim", onPress: () => signOut(auth) }]);
      }
  }

  const openPlanModal = (plano: any) => { setSelectedPlan(plano); setShowPlanModal(true); };
  const openProductModal = (produto: any) => { setSelectedProduct(produto); setShowProductModal(true); };

  const copyPix = async () => {
      if (chavePixLoja) {
          await Clipboard.setStringAsync(chavePixLoja);
          if (Platform.OS === 'web') alert("Chave Pix copiada!"); else Alert.alert("Copiado!", "Chave Pix copiada.");
      } else {
          if (Platform.OS === 'web') alert("Chave Pix não configurada."); else Alert.alert("Aviso", "Chave Pix não configurada.");
      }
  };

  const handleConfirmPayment = async () => {
      if (!userData) return;
      setIsRequesting(true);
      try {
          await addDoc(collection(db, 'solicitacoes_vip'), {
              clienteId: userData.id, clienteNome: userData.nome || auth.currentUser?.email, clienteTelefone: userData.telefone || 'Sem contato',
              planoId: selectedPlan.id, planoNome: selectedPlan.nome, planoItens: selectedPlan.itens || 'Todos',
              planoPreco: selectedPlan.preco, planoLiberaTodos: selectedPlan.liberaTodos || false, shopId: shopIdState,
              status: 'pendente', dataSolicitacao: new Date().toISOString()
          });
          setPedidoPendenteId(selectedPlan.id); 
          setShowPlanModal(false);
          if (Platform.OS === 'web') alert("Sucesso! O barbeiro irá liberar seu VIP em breve."); else Alert.alert("Sucesso!", "O barbeiro irá liberar seu VIP em breve.");
      } catch (error) { console.log(error); } finally { setIsRequesting(false); }
  };

  const handleConfirmProductPurchase = async () => {
      if (!userData || !selectedProduct) return;
      setIsBuyingProduct(true);
      try {
          await addDoc(collection(db, 'pedidos_lojinha'), {
              clienteId: userData.id,
              clienteNome: userData.nome || auth.currentUser?.email,
              clienteTelefone: userData.telefone || 'Sem contato',
              produtoId: selectedProduct.id,
              produtoNome: selectedProduct.nome,
              precoPago: selectedProduct.preco,
              shopId: shopIdState,
              status: 'aguardando_aprovacao', 
              dataPedido: new Date().toISOString()
          });

          setShowProductModal(false);
          fetchMeusPedidosLojinha(userData.id, shopIdState); 
          
          if (Platform.OS === 'web') alert("Pedido enviado! O barbeiro irá conferir o Pix e liberar seu produto.");
          else Alert.alert("Sucesso!", "Pedido enviado! O barbeiro irá conferir o Pix e liberar seu produto.");
      } catch (error) { console.log(error); } finally { setIsBuyingProduct(false); }
  };

  const progresso = Math.min((pontos / meta) * 100, 100);

  const formatDataHora = (isoStr: string) => {
      const d = new Date(isoStr);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <ScrollView className="flex-1 bg-zinc-900 px-6 pt-12" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-row items-center flex-1">
          {shopLogo ? <Image source={{ uri: shopLogo }} className="w-12 h-12 rounded-full mr-3 border border-orange-500" /> : <Text className="text-3xl mr-3">💈</Text>}
          <View className="flex-1">
              <Text className="text-zinc-400 text-sm">Olá, Bem-vindo</Text>
              <Text className="text-white text-xl font-bold truncate" numberOfLines={1}>{shopName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} className="bg-zinc-800 px-3 py-2 rounded-lg border border-zinc-700 ml-2">
          <Text className="text-red-400 font-bold text-xs">Sair</Text>
        </TouchableOpacity>
      </View>

      {isVIP && diasVencimentoVIP !== null && (
          <View className={`p-4 rounded-xl mb-4 border ${diasVencimentoVIP <= 5 ? 'bg-red-500/10 border-red-500' : 'bg-yellow-500/10 border-yellow-500'}`}>
              <Text className={`font-bold ${diasVencimentoVIP <= 5 ? 'text-red-400' : 'text-yellow-500'}`}>{diasVencimentoVIP <= 0 ? '⚠️ Sua assinatura VIP venceu! Renove com o barbeiro.' : `👑 Você é VIP! Plano: ${planoAtual} (Vence em ${diasVencimentoVIP} dias).`}</Text>
          </View>
      )}

      {/* 1. BARBEIROS */}
      <View className="mb-6">
          <Text className="text-white text-xl font-bold mb-4">Escolha um Profissional</Text>
          <View className="flex-row flex-wrap gap-4">
            {barbers.map(item => (
                <TouchableOpacity key={item.id} onPress={() => navigation.navigate('BarberProfile', { barber: item })} className="bg-zinc-800 p-4 rounded-xl flex-row items-center border border-zinc-700 flex-1 min-w-[280px] max-w-[400px]">
                    <Image source={{ uri: item.foto }} className="w-16 h-16 rounded-full mr-4 bg-zinc-700 border border-zinc-600" />
                    <View className="flex-1">
                        <Text className="text-white font-bold text-lg">{item.nome}</Text>
                        <Text className="text-zinc-400 text-sm">{item.especialidade}</Text>
                        <Text className="text-orange-500 text-sm mt-1">⭐ {item.nota || "5.0"}</Text>
                    </View>
                </TouchableOpacity>
            ))}
          </View>
      </View>

      {/* 2. MEUS AGENDAMENTOS E PAINEL ADMIN */}
      <View className="mb-8">
        <TouchableOpacity className="bg-orange-500 p-4 rounded-xl mb-3 items-center shadow-lg" onPress={() => navigation.navigate('MyAppointments')}><Text className="text-white font-bold text-lg">📅 Meus Agendamentos</Text></TouchableOpacity>
        {isOwner && <TouchableOpacity className="bg-zinc-800 p-4 rounded-xl items-center border border-zinc-700" onPress={() => navigation.navigate('AdminPanel')}><Text className="text-orange-500 font-bold text-lg">⚙️ Painel Admin</Text></TouchableOpacity>}
      </View>

      {/* 3. CARTÃO FIDELIDADE */}
      {fidelidadeAtiva && (
          <View className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-5 rounded-2xl mb-8 border border-orange-500/30 shadow-lg">
              <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center"><Text className="text-2xl mr-2">🎁</Text><Text className="text-white font-bold text-lg">Cartão Fidelidade</Text></View>
                  <Text className="text-orange-500 font-bold text-xl">{pontos}/{meta}</Text>
              </View>
              <View className="h-3 bg-zinc-700 rounded-full w-full overflow-hidden mb-2"><View className="h-full bg-orange-500 rounded-full" style={{ width: `${progresso}%` }} /></View>
              {pontos >= meta ? <Text className="text-green-400 font-bold text-sm text-center mt-1">🎉 Parabéns! Ganhou o prêmio!</Text> : <Text className="text-zinc-400 text-sm">Faltam <Text className="text-white font-bold">{meta - pontos}</Text> cortes para o brinde.</Text>}
          </View>
      )}

      {/* 4. PLANOS VIP EM GRID (NOVO) */}
      {!isVIP && !isOwner && planosVipDinamicos.length > 0 && (
          <View className="mb-8">
              <Text className="text-white text-xl font-bold mb-3">Planos de Assinatura 👑</Text>
              <Text className="text-zinc-400 text-sm mb-4">Seja VIP, pague por mês e não se preocupe com taxas.</Text>
              
              <View className="flex-row flex-wrap gap-4">
                  {planosVipDinamicos.map((item) => {
                      const isSuper = item.liberaTodos;
                      let valorOriginal = 0;
                      if (!isSuper && item.itens) {
                          const nomes = item.itens.split(', ');
                          valorOriginal = servicosLoja.filter(s => nomes.includes(s.nome)).reduce((acc, curr) => acc + (curr.preco || 0), 0);
                      }
                      const temEconomia = valorOriginal > item.preco;
                      const economiaReal = valorOriginal - item.preco;
                      const economiaPorcentagem = valorOriginal > 0 ? Math.round((economiaReal / valorOriginal) * 100) : 0;
                      const isPendente = pedidoPendenteId === item.id;
                      const isBloqueado = pedidoPendenteId !== null && pedidoPendenteId !== item.id;

                      return (
                          <View key={item.id} className="bg-zinc-800 border border-yellow-500/50 p-4 rounded-xl flex-1 min-w-[260px] max-w-[350px] justify-between">
                              <View>
                                  <Text className="text-yellow-500 font-bold text-lg mb-1">{item.nome}</Text>
                                  <Text className="text-zinc-300 text-sm mb-2 min-h-[40px]">{item.itens}</Text>
                                  {isSuper ? ( <View className="mb-3 h-12 justify-center"><Text className="text-green-400 font-bold text-xs bg-green-400/10 self-start px-2 py-1 rounded">🔥 Acesso Livre</Text></View>
                                  ) : temEconomia ? (
                                      <View className="mb-3 h-12 justify-center">
                                          <Text className="text-zinc-400 text-xs line-through">Sem plano: R$ {valorOriginal.toFixed(2)}</Text>
                                          <Text className="text-green-400 font-bold text-xs bg-green-400/10 self-start px-2 py-1 rounded mt-1">🔥 Economiza R$ {economiaReal.toFixed(2)} ({economiaPorcentagem}%)</Text>
                                      </View>
                                  ) : <View className="mb-3 h-12 justify-center" />}
                                  <Text className="text-white font-bold text-2xl mb-4">R$ {item.preco?.toFixed(2)}<Text className="text-sm text-zinc-400">/mês</Text></Text>
                              </View>
                              <TouchableOpacity onPress={() => openPlanModal(item)} disabled={isPendente || isBloqueado} className={`p-3 rounded-lg items-center ${isPendente ? 'bg-zinc-600' : isBloqueado ? 'bg-zinc-800 border border-zinc-700' : 'bg-yellow-600'}`}>
                                  <Text className={`font-bold ${isPendente || isBloqueado ? 'text-zinc-400' : 'text-white'}`}>{isPendente ? '⏳ Aguardando' : 'Quero Assinar'}</Text>
                              </TouchableOpacity>
                          </View>
                      );
                  })}
              </View>
          </View>
      )}

      {/* 5. LOJINHA EM GRID (NOVO) */}
      {!isOwner && produtosLojinha.length > 0 && (
          <View className="mb-10">
              <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-white text-xl font-bold">Lojinha 🛍️</Text>
                  <TouchableOpacity onPress={() => setShowMyOrdersModal(true)} className="bg-orange-500/20 px-3 py-1 rounded-lg border border-orange-500">
                      <Text className="text-orange-500 font-bold text-xs">🛒 Minhas Compras</Text>
                  </TouchableOpacity>
              </View>
              <Text className="text-zinc-400 text-sm mb-4">Pague via Pix e retire na sua visita.</Text>
              
              <View className="flex-row flex-wrap gap-4">
                  {produtosLojinha.map((item) => (
                      <View key={item.id} className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl flex-1 min-w-[160px] max-w-[220px]">
                          {item.imagemUrl ? <Image source={{ uri: item.imagemUrl }} className="w-full h-32 rounded-lg mb-3 bg-zinc-700" resizeMode="cover" /> : <View className="w-full h-32 rounded-lg mb-3 bg-zinc-700 items-center justify-center"><Text className="text-4xl">📦</Text></View>}
                          <Text className="text-white font-bold text-lg mb-1 truncate" numberOfLines={1}>{item.nome}</Text>
                          <Text className="text-zinc-400 text-xs mb-1 h-8" numberOfLines={2}>{item.descricao || 'Sem descrição'}</Text>
                          
                          <Text className="text-green-400 font-bold text-xs bg-green-400/10 self-start px-2 py-1 rounded mb-2">Disponível: {item.estoque}</Text>
                          
                          <Text className="text-orange-500 font-bold text-xl mb-4">R$ {item.preco?.toFixed(2)}</Text>
                          <TouchableOpacity onPress={() => openProductModal(item)} className="bg-orange-500 p-3 rounded-lg items-center"><Text className="text-white font-bold">Comprar</Text></TouchableOpacity>
                      </View>
                  ))}
              </View>
          </View>
      )}

      {/* MODAIS (MANTIDOS IGUAIS) */}
      <Modal visible={showPlanModal} transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/80"><View className="bg-zinc-900 p-6 rounded-t-3xl border-t border-yellow-500/50"><Text className="text-2xl mb-2 text-center">👑</Text><Text className="text-white font-bold text-2xl text-center mb-1">Assinatura VIP</Text><Text className="text-zinc-400 text-center mb-6">Plano: {selectedPlan?.nome}</Text><View className="bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-700"><Text className="text-white font-bold mb-2">Realize o pagamento via Pix:</Text><Text className="text-yellow-500 font-bold text-2xl mb-4">R$ {selectedPlan?.preco?.toFixed(2)}</Text><Text className="text-zinc-400 text-sm mb-1">Chave Pix da Barbearia:</Text><View className="flex-row items-center justify-between bg-zinc-900 p-3 rounded-lg mb-2"><Text className="text-white font-bold">{chavePixLoja || "Chave não configurada"}</Text><TouchableOpacity onPress={copyPix} className="bg-zinc-700 px-3 py-1 rounded"><Text className="text-white text-xs">Copiar</Text></TouchableOpacity></View></View><TouchableOpacity onPress={handleConfirmPayment} disabled={isRequesting} className="bg-yellow-600 p-4 rounded-xl items-center mb-3">{isRequesting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Já fiz o Pagamento ✅</Text>}</TouchableOpacity><TouchableOpacity onPress={() => setShowPlanModal(false)} className="p-4 rounded-xl items-center mb-6"><Text className="text-red-400 font-bold">Cancelar</Text></TouchableOpacity></View></View>
      </Modal>

      <Modal visible={showProductModal} transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/80"><View className="bg-zinc-900 p-6 rounded-t-3xl border-t border-orange-500/50"><Text className="text-2xl mb-2 text-center">🛍️</Text><Text className="text-white font-bold text-2xl text-center mb-1">Comprar Produto</Text><Text className="text-zinc-400 text-center mb-6">{selectedProduct?.nome}</Text><View className="bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-700"><Text className="text-white font-bold mb-2">Transfira o valor via Pix para garantir:</Text><Text className="text-orange-500 font-bold text-2xl mb-4">R$ {selectedProduct?.preco?.toFixed(2)}</Text><Text className="text-zinc-400 text-sm mb-1">Chave Pix da Barbearia:</Text><View className="flex-row items-center justify-between bg-zinc-900 p-3 rounded-lg mb-2"><Text className="text-white font-bold">{chavePixLoja || "Chave não configurada"}</Text><TouchableOpacity onPress={copyPix} className="bg-zinc-700 px-3 py-1 rounded"><Text className="text-white text-xs">Copiar</Text></TouchableOpacity></View><Text className="text-zinc-500 text-xs italic mt-2">O produto será reservado assim que o barbeiro confirmar o Pix.</Text></View><TouchableOpacity onPress={handleConfirmProductPurchase} disabled={isBuyingProduct} className="bg-orange-500 p-4 rounded-xl items-center mb-3">{isBuyingProduct ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Já fiz o Pagamento ✅</Text>}</TouchableOpacity><TouchableOpacity onPress={() => setShowProductModal(false)} className="p-4 rounded-xl items-center mb-6"><Text className="text-red-400 font-bold">Cancelar</Text></TouchableOpacity></View></View>
      </Modal>

      <Modal visible={showMyOrdersModal} transparent={true} animationType="slide">
          <View className="flex-1 bg-zinc-900 pt-16 px-6">
              <View className="flex-row items-center justify-between mb-8">
                  <Text className="text-white font-bold text-2xl">Minhas Compras 🛒</Text>
                  <TouchableOpacity onPress={() => setShowMyOrdersModal(false)} className="bg-zinc-800 p-2 rounded-lg"><Text className="text-white font-bold">Fechar ✕</Text></TouchableOpacity>
              </View>

              <FlatList
                  data={meusPedidosLojinha}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                      <View className="bg-zinc-800 p-4 rounded-xl mb-3 border border-zinc-700">
                          <View className="flex-row justify-between mb-2">
                              <Text className="text-white font-bold text-lg flex-1">{item.produtoNome}</Text>
                              <Text className="text-orange-500 font-bold text-lg">R$ {item.precoPago?.toFixed(2)}</Text>
                          </View>
                          <Text className="text-zinc-400 text-xs mb-3">Feito em {formatDataHora(item.dataPedido)}</Text>
                          
                          {item.status === 'aguardando_aprovacao' ? (
                              <View className="bg-yellow-500/10 border border-yellow-500 p-2 rounded-lg items-center"><Text className="text-yellow-500 font-bold text-xs">⏳ Aguardando Barbeiro Confirmar Pix</Text></View>
                          ) : item.status === 'aprovado' ? (
                              <View className="bg-green-500/10 border border-green-500 p-2 rounded-lg items-center"><Text className="text-green-400 font-bold text-xs">✅ Pagamento Aprovado! Retire na barbearia.</Text></View>
                          ) : item.status === 'entregue' ? (
                              <View className="bg-zinc-700 p-2 rounded-lg items-center"><Text className="text-zinc-400 font-bold text-xs">📦 Produto Entregue</Text></View>
                          ) : (
                              <View className="bg-red-500/10 border border-red-500 p-2 rounded-lg items-center"><Text className="text-red-400 font-bold text-xs">❌ Pedido Cancelado</Text></View>
                          )}
                      </View>
                  )}
                  ListEmptyComponent={() => <Text className="text-zinc-500 text-center mt-10">Você ainda não comprou nenhum produto.</Text>}
              />
          </View>
      </Modal>

    </ScrollView>
  );
}