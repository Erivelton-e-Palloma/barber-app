import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform, SectionList, Modal, TextInput, FlatList } from 'react-native';
import { db, auth } from '../config/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, increment, addDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function MyAppointments({ navigation }: any) {
  const [appointmentSections, setAppointmentSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // --- ESTADOS DOS FILTROS (NOVO) ---
  const [availableMonths, setAvailableMonths] = useState<string[]>(['Todos']);
  const [filterMonth, setFilterMonth] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingAppt, setRatingAppt] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const shopId = await AsyncStorage.getItem('@delp_shopId'); 

      if (!user || !shopId) {
          setLoading(false);
          return;
      }

      let userIsAdmin = false;
      const shopRef = doc(db, "barbearias", shopId);
      const shopSnap = await getDoc(shopRef);

      if (shopSnap.exists()) {
          const shopData = shopSnap.data();
          if (user.email?.toLowerCase() === shopData.ownerEmail?.toLowerCase() || user.email?.toLowerCase() === shopData.emailDono?.toLowerCase()) {
              userIsAdmin = true;
          }
      }
      setIsSuperAdmin(userIsAdmin);

      let q;
      if (userIsAdmin) {
          q = query(collection(db, "agendamentos"), where("shopId", "==", shopId));
      } else {
          q = query(collection(db, "agendamentos"), where("shopId", "==", shopId), where("clienteId", "==", user.uid));
      }

      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      list.sort((a: any, b: any) => {
        const dateA = a.data || "0000-00-00";
        const dateB = b.data || "0000-00-00";
        const timeA = a.horario || "00:00";
        const timeB = b.horario || "00:00";

        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return timeA.localeCompare(timeB);
      });

      // --- EXTRAIR OS MESES DISPONÍVEIS PARA O FILTRO ---
      const monthsSet = new Set<string>();
      list.forEach((item: any) => {
          if (item.data && item.data !== "0000-00-00") {
              const parts = item.data.split('-');
              if (parts.length === 3) monthsSet.add(`${parts[1]}/${parts[0]}`); // MM/YYYY
          } else {
              monthsSet.add("Antigos");
          }
      });
      setAvailableMonths(['Todos', ...Array.from(monthsSet)].sort((a, b) => {
          if (a === 'Todos') return -1;
          if (b === 'Todos') return 1;
          return a.localeCompare(b);
      }));
      // ---------------------------------------------------

      const groupedData = list.reduce((acc: any, curr: any) => {
          const dateStr = curr.data || "Data Indefinida";
          if (!acc[dateStr]) acc[dateStr] = [];
          acc[dateStr].push(curr);
          return acc;
      }, {});

      const sections = Object.keys(groupedData).map(dateKey => {
          if (dateKey === "Data Indefinida" || dateKey === "0000-00-00") {
              return { title: "Agendamentos Antigos/Teste", data: groupedData[dateKey] };
          }
          const parts = dateKey.split('-');
          const title = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateKey;
          return {
              title: title,
              data: groupedData[dateKey]
          };
      });

      setAppointmentSections(sections);
    } catch (error) {
      console.log("Erro ao buscar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function confirmAndCancel(id: string) {
      try {
          await deleteDoc(doc(db, "agendamentos", id));
          setAppointmentSections(prev => 
              prev.map(section => ({
                  ...section,
                  data: section.data.filter((item: any) => item.id !== id)
              })).filter(section => section.data.length > 0) 
          );
          if (Platform.OS === 'web') alert("✅ Agendamento cancelado!");
          else Alert.alert("Sucesso", "Agendamento cancelado!");
      } catch (error) {
          if (Platform.OS === 'web') alert("Erro ao cancelar agendamento.");
          else Alert.alert("Erro", "Não foi possível cancelar.");
      }
  }

  function handleCancel(id: string) {
    if (Platform.OS === 'web') {
        if (window.confirm("Deseja realmente cancelar este agendamento?")) confirmAndCancel(id);
    } else {
        Alert.alert("Cancelar", "Deseja cancelar este agendamento?", [
            { text: "Não", style: "cancel" },
            { text: "Sim, Cancelar", style: "destructive", onPress: () => confirmAndCancel(id) }
        ]);
    }
  }

  async function handleApprovePix(id: string) {
      try {
          await updateDoc(doc(db, "agendamentos", id), { status: "confirmado" });
          
          setAppointmentSections(prev => prev.map(section => ({
              ...section,
              data: section.data.map((item: any) => 
                  item.id === id ? { ...item, status: "confirmado" } : item
              )
          })));

          if (Platform.OS === 'web') alert("Pix Aprovado! Horário confirmado para o cliente.");
          else Alert.alert("Sucesso", "Pix Aprovado! Horário confirmado para o cliente.");
      } catch (error) {
          console.log("Erro ao aprovar:", error);
      }
  }

  async function handleCompleteService(agendamentoId: string, clienteId: string) {
    try {
        await updateDoc(doc(db, "agendamentos", agendamentoId), { status: "concluido" });

        if (clienteId) {
            await updateDoc(doc(db, "usuarios", clienteId), {
                pontosFidelidade: increment(1)
            });
        }

        setAppointmentSections(prev => prev.map(section => ({
            ...section,
            data: section.data.map((item: any) => 
                item.id === agendamentoId ? { ...item, status: "concluido" } : item
            )
        })));

        if (Platform.OS === 'web') alert("Serviço concluído! O cliente ganhou +1 ponto.");
        else Alert.alert("Sucesso", "Serviço concluído! O cliente ganhou +1 ponto.");
    } catch (error) {
        console.log("Erro ao concluir:", error);
    }
  }

  function openRatingModal(item: any) {
      setRatingAppt(item);
      setRating(5);
      setComment('');
      setShowRatingModal(true);
  }

  async function submitRating() {
      if (!ratingAppt) return;
      setIsSubmittingRating(true);
      try {
          await addDoc(collection(db, "avaliacoes"), {
              shopId: ratingAppt.shopId,
              barbeiroId: ratingAppt.barbeiroId,
              clienteId: ratingAppt.clienteId,
              clienteNome: ratingAppt.clienteNome || auth.currentUser?.email || "Cliente",
              nota: rating,
              comentario: comment,
              dataAvaliacao: new Date().toISOString()
          });

          await updateDoc(doc(db, "agendamentos", ratingAppt.id), { avaliado: true });

          setAppointmentSections(prev => prev.map(section => ({
              ...section,
              data: section.data.map((item: any) => 
                  item.id === ratingAppt.id ? { ...item, avaliado: true } : item
              )
          })));

          setShowRatingModal(false);
          if (Platform.OS === 'web') alert("Avaliação enviada com sucesso!");
          else Alert.alert("Sucesso", "Sua avaliação ajuda muito o profissional!");
      } catch (error) {
          console.log(error);
          if (Platform.OS === 'web') alert("Erro ao avaliar.");
      } finally {
          setIsSubmittingRating(false);
      }
  }

  // --- LÓGICA DE FILTRAGEM DOS DADOS ---
  const filteredSections = appointmentSections.map(section => {
      // 1. Filtra os itens por texto (nome cliente, servico ou data)
      const filteredData = section.data.filter((item: any) => {
          const search = searchQuery.toLowerCase();
          const matchesSearch = 
              (item.clienteNome || '').toLowerCase().includes(search) ||
              (item.servicoNome || '').toLowerCase().includes(search) ||
              (item.barbeiroNome || '').toLowerCase().includes(search) ||
              section.title.toLowerCase().includes(search);
          return matchesSearch;
      });
      return { ...section, data: filteredData };
  }).filter(section => {
      // 2. Remove seções vazias e aplica o filtro de Mês
      if (section.data.length === 0) return false;
      if (filterMonth === 'Todos') return true;
      if (section.title === 'Agendamentos Antigos/Teste') return filterMonth === 'Antigos';

      const parts = section.title.split('/');
      if (parts.length === 3) {
          return `${parts[1]}/${parts[2]}` === filterMonth;
      }
      return false;
  });

  return (
    <View className="flex-1 bg-zinc-900 px-6 pt-12">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold flex-1">
            {isSuperAdmin ? 'Agenda da Barbearia' : 'Meus Agendamentos'}
        </Text>
      </View>

      {/* ÁREA DE FILTROS E PESQUISA */}
      <View className="mb-6 z-10">
          <TextInput
              placeholder={isSuperAdmin ? "Buscar cliente, dia (ex: 21/10) ou serviço..." : "Buscar data ou serviço..."}
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700 mb-3"
          />
          
          <View>
              <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={availableMonths}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                      <TouchableOpacity 
                          onPress={() => setFilterMonth(item)}
                          className={`px-4 py-2 rounded-full mr-2 border ${filterMonth === item ? 'bg-orange-500 border-orange-500' : 'bg-zinc-800 border-zinc-700'}`}
                      >
                          <Text className={`font-bold ${filterMonth === item ? 'text-white' : 'text-zinc-400'}`}>{item}</Text>
                      </TouchableOpacity>
                  )}
              />
          </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" className="mt-10" />
      ) : (
        <SectionList
          sections={filteredSections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderSectionHeader={({ section: { title } }) => (
            <View className="bg-orange-500/20 p-2 rounded-lg mb-3 mt-4 border border-orange-500/50">
                <Text className="text-orange-500 font-bold text-center text-lg">📅 {title}</Text>
            </View>
          )}

          renderItem={({ item }) => {
            const isConcluido = item.status === 'concluido';
            const isAguardando = item.status === 'aguardando_pix';
            const isConfirmado = item.status === 'confirmado' || item.status === 'agendado';

            return (
              <View className={`p-4 rounded-xl mb-4 border ${isConcluido ? 'bg-zinc-900 border-green-500/50' : 'bg-zinc-800 border-zinc-700'}`}>
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className={`${isConcluido ? 'text-green-500' : 'text-orange-500'} font-bold text-lg`}>
                        {item.servicoNome || "Serviço não informado"} {isConcluido && "✅"}
                    </Text>
                    
                    {isSuperAdmin && (
                        <View className="mt-1 bg-zinc-900/50 p-2 rounded border border-zinc-700">
                            <Text className="text-white font-bold text-sm">Cliente: {item.clienteNome || 'Não informado'}</Text>
                            <Text className="text-zinc-400 text-xs">WhatsApp: {item.clienteTelefone || 'N/A'}</Text>
                        </View>
                    )}
                    
                    <Text className="text-zinc-400 text-xs mt-2">Profissional: {item.barbeiroNome || "Não informado"}</Text>
                  </View>
                  
                  <View className="items-end">
                      <Text className="text-white font-bold text-xl">
                      R$ {item.preco ? Number(item.preco).toFixed(2).replace('.', ',') : '0,00'}
                      </Text>
                      {item.isVIPBooking ? (
                          <Text className="text-yellow-500 font-bold text-xs mt-1">👑 Isento via VIP</Text>
                      ) : item.entradaPaga && !isConcluido ? (
                          <Text className="text-zinc-400 font-bold text-xs mt-1">50% no Pix</Text>
                      ) : null}
                  </View>
                </View>

                {!isSuperAdmin && isAguardando && (
                    <View className="bg-yellow-500/10 p-2 rounded-lg items-center border border-yellow-500/30 mb-3 mt-1">
                        <Text className="text-yellow-500 font-bold text-xs">⏳ Aguardando barbeiro confirmar o Pix...</Text>
                    </View>
                )}
                {!isSuperAdmin && isConfirmado && (
                    <View className="bg-green-500/10 p-2 rounded-lg items-center border border-green-500/30 mb-3 mt-1">
                        <Text className="text-green-500 font-bold text-xs">✅ Horário Confirmado!</Text>
                    </View>
                )}

                <View className="flex-row items-center mb-4 bg-zinc-900/50 p-2 rounded-lg self-start mt-2 border border-zinc-700">
                  <Text className="text-white font-bold">⏰ {item.horario || "Horário Indefinido"}</Text>
                </View>

                {!isConcluido ? (
                    <View className="flex-row justify-between gap-2 flex-wrap">
                        <TouchableOpacity onPress={() => handleCancel(item.id)} className="flex-1 min-w-[100px] bg-red-500/10 border border-red-500 p-3 rounded-lg items-center">
                            <Text className="text-red-500 font-bold">Cancelar</Text>
                        </TouchableOpacity>

                        {isSuperAdmin && isAguardando && (
                            <TouchableOpacity onPress={() => handleApprovePix(item.id)} className="flex-1 min-w-[100px] bg-blue-600 p-3 rounded-lg items-center">
                                <Text className="text-white font-bold">Aprovar Pix ✅</Text>
                            </TouchableOpacity>
                        )}

                        {isSuperAdmin && isConfirmado && (
                            <TouchableOpacity onPress={() => handleCompleteService(item.id, item.clienteId)} className="flex-1 min-w-[100px] bg-green-600 p-3 rounded-lg items-center">
                                <Text className="text-white font-bold">Concluir ✅</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View className="mt-2">
                        <View className="bg-green-500/10 p-3 rounded-lg items-center border border-green-500/30">
                            <Text className="text-green-400 font-bold">Serviço Finalizado</Text>
                        </View>
                        
                        {!isSuperAdmin && !item.avaliado && (
                            <TouchableOpacity onPress={() => openRatingModal(item)} className="mt-2 bg-orange-500 p-3 rounded-lg items-center shadow-lg">
                                <Text className="text-white font-bold">Avaliar Atendimento ⭐</Text>
                            </TouchableOpacity>
                        )}

                        {!isSuperAdmin && item.avaliado && (
                            <View className="mt-2 bg-orange-500/10 p-3 rounded-lg items-center border border-orange-500/30">
                                <Text className="text-orange-400 font-bold text-xs">Avaliação Enviada ⭐</Text>
                            </View>
                        )}
                    </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <Text className="text-zinc-500 text-center mt-10">
                {searchQuery || filterMonth !== 'Todos' ? 'Nenhum agendamento encontrado para esta pesquisa.' : 'Nenhum agendamento encontrado.'}
            </Text>
          )}
        />
      )}

      {/* MODAL DE ESTRELAS (MANTIDO IGUAL) */}
      <Modal visible={showRatingModal} transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/80">
              <View className="bg-zinc-900 p-6 rounded-t-3xl border-t border-orange-500/50">
                  <Text className="text-2xl mb-2 text-center">✂️</Text>
                  <Text className="text-white font-bold text-2xl text-center mb-2">Avaliar Atendimento</Text>
                  <Text className="text-zinc-400 text-center mb-6">Como foi o seu corte com o profissional {ratingAppt?.barbeiroNome}?</Text>
                  
                  <View className="flex-row justify-center gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => setRating(star)}>
                              <Text className={`text-5xl ${rating >= star ? 'text-orange-500' : 'text-zinc-700'}`}>★</Text>
                          </TouchableOpacity>
                      ))}
                  </View>

                  <TextInput
                      value={comment}
                      onChangeText={setComment}
                      placeholder="Deixe um comentário (opcional)..."
                      placeholderTextColor="#71717a"
                      multiline
                      className="bg-zinc-800 text-white p-4 rounded-xl mb-6 border border-zinc-700 min-h-[100px]"
                      textAlignVertical="top"
                  />

                  <TouchableOpacity onPress={submitRating} disabled={isSubmittingRating} className="bg-orange-500 p-4 rounded-xl items-center mb-3">
                      {isSubmittingRating ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Enviar Avaliação</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowRatingModal(false)} className="p-4 rounded-xl items-center mb-6">
                      <Text className="text-red-400 font-bold">Cancelar</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </View>
  );
}