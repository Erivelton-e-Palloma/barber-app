import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, Linking, TextInput, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function Booking({ route, navigation }: any) {
  const { barber, service } = route.params;
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [busyTimes, setBusyTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  // --- NOVA LÓGICA DE MESES ---
  const [monthOffset, setMonthOffset] = useState(0); // 0 = Mês atual, 1 = Próximo mês

  const paymentOptions = [
    { id: 'dinheiro', label: '💵 Dinheiro' },
    { id: 'pix', label: '💠 Pix' },
    { id: 'cartao', label: '💳 Cartão' },
  ];

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

  const getMonthName = (offset: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() + offset);
      return monthNames[d.getMonth()];
  };

  const generateDatesForMonth = (offset: number) => {
    const dates = [];
    const today = new Date();
    
    // Define a data alvo baseada no offset (0 = hoje, 1 = dia 1 do próximo mês)
    const targetMonthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    
    let startDate = offset === 0 ? today : targetMonthDate;
    let lastDay = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();

    for (let i = startDate.getDate(); i <= lastDay; i++) {
      const date = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), i);
      const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const fullDateLocal = `${year}-${month}-${day}`;

      dates.push({
        fullDate: fullDateLocal, 
        display: `${diaSemana} ${day}/${month}`
      });
    }
    return dates;
  };

  const dates = generateDatesForMonth(monthOffset);

  useFocusEffect(
    useCallback(() => {
      if (selectedDate) checkAvailability(selectedDate);
    }, [selectedDate])
  );

  async function checkAvailability(date: string) {
    setLoadingTimes(true);
    setBusyTimes([]); 
    setSelectedTime(null); 

    try {
        const q = query(
            collection(db, "agendamentos"),
            where("barbeiroId", "==", barber.id),
            where("data", "==", date),
            where("status", "==", "agendado") 
        );

        const querySnapshot = await getDocs(q);
        const times = querySnapshot.docs.map(doc => doc.data().horario);
        setBusyTimes(times);
    } catch (error) {
        console.log("Erro", error);
    } finally {
        setLoadingTimes(false);
    }
  }

  const forceOpenWeb = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank'; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openWhatsAppToBarber = async (date: string, time: string, method: string) => {
    const [ano, mes, dia] = date.split('-');
    const dataFormatada = `${dia}/${mes}`;
    
    const message = `Olá *${barber.nome}*! Sou *${clientName}* 👋\n\nAcabei de agendar:\n\n✂️ *${service.nome}*\n📅 ${dataFormatada} às ${time}\n💰 Pagamento: ${method.toUpperCase()}`;
    
    if (Platform.OS === 'web') {
        const urlWeb = `https://wa.me/?text=${encodeURIComponent(message)}`;
        forceOpenWeb(urlWeb);
    } else {
        const urlMobile = `whatsapp://send?text=${encodeURIComponent(message)}`;
        try {
            const supported = await Linking.canOpenURL(urlMobile);
            if (supported) {
                await Linking.openURL(urlMobile);
            } else {
                const urlFallback = `https://wa.me/?text=${encodeURIComponent(message)}`;
                await Linking.openURL(urlFallback);
            }
        } catch (error) {
            console.log("Erro zap", error);
        }
    }
  };

  async function handleConfirmBooking() {
    if (!selectedDate || !selectedTime) {
      alertOrConfirm("Atenção", "Selecione um dia e um horário!");
      return;
    }
    if (!paymentMethod) {
      alertOrConfirm("Atenção", "Selecione a forma de pagamento!");
      return;
    }
    if (clientName.trim() === '') {
        alertOrConfirm("Atenção", "Por favor, preencha seu Nome!");
        return;
    }

    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
        alertOrConfirm("Telefone Inválido", "Por favor, digite um número de WhatsApp válido (com DDD).");
        return;
    }

    setLoading(true);

    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      const shopName = await AsyncStorage.getItem('@delp_shopName');

      if (!shopId) {
        alertOrConfirm("Erro", "Loja não identificada. Faça login novamente.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "agendamentos"), {
        clienteId: auth.currentUser?.uid,
        clienteEmail: auth.currentUser?.email,
        clienteNome: clientName,
        clienteTelefone: clientPhone,
        barbeiroId: barber.id,
        barbeiroNome: barber.nome,
        barbeiroFoto: barber.foto,
        servicoId: service.id,
        servicoNome: service.nome,
        preco: service.preco,
        duracao: service.duracao,
        data: selectedDate,
        horario: selectedTime,
        metodoPagamento: paymentMethod,
        status: 'agendado',
        shopId: shopId,
        shopName: shopName,
        createdAt: new Date().toISOString()
      });

      if (Platform.OS === 'web') {
          const confirmText = "Agendamento Confirmado! ✅\n\nDeseja enviar o comprovante para o barbeiro no WhatsApp?\n\n[OK] = Sim, Enviar Zap\n[Cancelar] = Não, obrigado";
          if (window.confirm(confirmText)) {
              openWhatsAppToBarber(selectedDate, selectedTime, paymentMethod);
          }
          navigation.navigate('Home');
      } else {
          Alert.alert(
            "Agendamento Confirmado! ✅", 
            "Deseja enviar o comprovante para o barbeiro no WhatsApp?", 
            [
              { text: "Não, obrigado", onPress: () => navigation.navigate('Home') },
              { text: "Sim, Enviar no Zap 💬", onPress: () => {
                  openWhatsAppToBarber(selectedDate, selectedTime, paymentMethod);
                  navigation.navigate('Home');
                }
              }
            ]
          );
      }

    } catch (error) {
      console.log("Erro", error);
      alertOrConfirm("Erro", "Não foi possível agendar.");
    } finally {
      setLoading(false);
    }
  }

  function alertOrConfirm(title: string, msg: string) {
      if (Platform.OS === 'web') alert(`${title}\n${msg}`);
      else Alert.alert(title, msg);
  }

  return (
    <FlatList
      className="flex-1 bg-zinc-900 px-6 pt-12"
      contentContainerStyle={{ paddingBottom: 120 }} 
      data={[]} 
      renderItem={null}
      ListHeaderComponent={
        <>
            <View className="flex-row items-center mb-6">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
                </TouchableOpacity>
                <Text className="text-white text-2xl font-bold">Agendar Horário</Text>
            </View>

            <View className="bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-700">
                <Text className="text-zinc-400">Serviço Escolhido:</Text>
                <Text className="text-white text-xl font-bold">{service.nome}</Text>
                <Text className="text-orange-500 font-bold">R$ {service.preco?.toFixed(2)} • {service.duracao} min</Text>
                <Text className="text-zinc-500 mt-2">Profissional: {barber.nome}</Text>
            </View>

            <Text className="text-white text-lg font-bold mb-2">Seus Dados</Text>
            <TextInput 
                className="bg-zinc-800 text-white p-4 rounded-xl mb-3 border border-zinc-700"
                placeholder="Seu Nome (ex: João)"
                placeholderTextColor="#71717a"
                value={clientName}
                onChangeText={setClientName}
            />
            <TextInput 
                className="bg-zinc-800 text-white p-4 rounded-xl mb-6 border border-zinc-700"
                placeholder="Seu WhatsApp (ex: 11999999999)"
                placeholderTextColor="#71717a"
                keyboardType="phone-pad"
                value={clientPhone}
                onChangeText={setClientPhone}
            />

            <Text className="text-white text-lg font-bold mb-3">Escolha o Dia</Text>
            
            {/* NOVO: SELETOR DE MESES */}
            <View className="flex-row justify-between items-center mb-3 bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                <TouchableOpacity onPress={() => setMonthOffset(0)} disabled={monthOffset === 0}>
                    <Text className={monthOffset === 0 ? "text-zinc-600 font-bold" : "text-orange-500 font-bold"}>{"← Atual"}</Text>
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">{getMonthName(monthOffset)}</Text>
                <TouchableOpacity onPress={() => setMonthOffset(1)} disabled={monthOffset === 1}>
                    <Text className={monthOffset === 1 ? "text-zinc-600 font-bold" : "text-orange-500 font-bold"}>{"Próximo →"}</Text>
                </TouchableOpacity>
            </View>

            <View className="h-20 mb-6">
                <FlatList 
                horizontal
                showsHorizontalScrollIndicator={false}
                data={dates}
                keyExtractor={(item) => item.fullDate}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                    onPress={() => setSelectedDate(item.fullDate)}
                    className={`p-4 rounded-xl mr-3 justify-center items-center border ${
                        selectedDate === item.fullDate 
                        ? 'bg-orange-500 border-orange-500' 
                        : 'bg-zinc-800 border-zinc-700'
                    }`}
                    >
                    <Text className={`font-bold ${selectedDate === item.fullDate ? 'text-white' : 'text-zinc-400'}`}>
                        {item.display}
                    </Text>
                    </TouchableOpacity>
                )}
                />
            </View>

            <Text className="text-white text-lg font-bold mb-3">Escolha o Horário</Text>
            <View className="h-16 mb-6">
                {loadingTimes ? (
                    <ActivityIndicator color="#f97316" size="small" />
                ) : (
                    <FlatList 
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={barber.horarios} 
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                        const isBusy = busyTimes.includes(item);
                        if (isBusy) return null; 

                        return (
                            <TouchableOpacity 
                            onPress={() => setSelectedTime(item)}
                            className={`px-6 py-3 rounded-xl mr-3 justify-center items-center border ${
                                selectedTime === item 
                                ? 'bg-orange-500 border-orange-500' 
                                : 'bg-zinc-800 border-zinc-700'
                            }`}
                            >
                            <Text className={`font-bold ${selectedTime === item ? 'text-white' : 'text-zinc-400'}`}>
                                {item}
                            </Text>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={() => (
                        <Text className="text-zinc-500 italic">Selecione um dia para ver os horários.</Text>
                    )}
                    />
                )}
            </View>

            <Text className="text-white text-lg font-bold mb-3">Pagamento no Local</Text>
            <View className="flex-row justify-between mb-8">
                {paymentOptions.map((option) => (
                <TouchableOpacity
                    key={option.id}
                    onPress={() => setPaymentMethod(option.id)}
                    className={`flex-1 p-3 mx-1 rounded-xl items-center border ${
                    paymentMethod === option.id
                    ? 'bg-orange-500 border-orange-500'
                    : 'bg-zinc-800 border-zinc-700'
                    }`}
                >
                    <Text className={`font-bold ${paymentMethod === option.id ? 'text-white' : 'text-zinc-400'}`}>
                    {option.label}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity 
                className={`p-4 rounded-xl items-center mb-20 ${(!selectedDate || !selectedTime || !paymentMethod) ? 'bg-zinc-700' : 'bg-orange-500'}`}
                onPress={handleConfirmBooking}
                disabled={loading || !selectedDate || !selectedTime || !paymentMethod}
            >
                {loading ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text className="text-white font-bold text-lg">Confirmar Agendamento ✅</Text>
                )}
            </TouchableOpacity>

            <View className="h-10" />
        </>
      }
    />
  );
}