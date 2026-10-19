import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { db, auth } from '../config/firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications'; 

export default function Booking({ route, navigation }: any) {
  const { barber, service } = route.params;
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const paymentMethod = 'pix';
  const [pixConfirmado, setPixConfirmado] = useState(false);
  const valorEntrada = service.preco * 0.5;

  const [userData, setUserData] = useState<{nome: string, telefone: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyTimes, setBusyTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0); 

  const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];

  const getMonthName = (offset: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() + offset);
      return monthNames[d.getMonth()];
  };

  const generateDatesForMonth = (offset: number) => {
    const dates = [];
    const today = new Date();
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

  useEffect(() => {
    async function fetchUserData() {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, "usuarios", auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserData({ nome: userSnap.data().nome, telefone: userSnap.data().telefone });
          }
        } catch (error) { console.log("Erro ao buscar dados do cliente:", error); }
      }
    }
    fetchUserData();
  }, []);

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
    } catch (error) { console.log("Erro", error); } 
    finally { setLoadingTimes(false); }
  }

  const copyToClipboard = async () => {
    if (barber.chavePix) {
        await Clipboard.setStringAsync(barber.chavePix);
        alertOrConfirm("Copiado!", "Chave Pix copiada para a área de transferência.");
    } else {
        alertOrConfirm("Aviso", "O barbeiro não cadastrou uma chave Pix.");
    }
  };

  async function scheduleAppointmentReminder() {
      if (Platform.OS === 'web') return;
      try {
          await Notifications.scheduleNotificationAsync({
              content: {
                  title: "⏰ Faltam 20 minutos!",
                  body: `Seu corte com ${barber.nome} está quase na hora. Não se atrase! ✂️`,
                  sound: true,
              },
              trigger: { seconds: 10 } as any, 
          });
      } catch (error) { console.log("Erro notificação:", error); }
  }

  async function handleConfirmBooking() {
    if (!selectedDate || !selectedTime) {
      alertOrConfirm("Atenção", "Selecione um dia e um horário!");
      return;
    }
    if (!userData) {
      alertOrConfirm("Atenção", "Dados não carregados. Faça login novamente.");
      return;
    }

    setLoading(true);

    try {
      const shopId = await AsyncStorage.getItem('@delp_shopId');
      const shopName = await AsyncStorage.getItem('@delp_shopName');

      if (!shopId) {
        alertOrConfirm("Erro", "Loja não identificada.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "agendamentos"), {
        clienteId: auth.currentUser?.uid,
        clienteEmail: auth.currentUser?.email,
        clienteNome: userData.nome, 
        clienteTelefone: userData.telefone, 
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
        entradaPaga: true,
        status: 'agendado',
        shopId: shopId,
        shopName: shopName,
        createdAt: new Date().toISOString()
      });

      scheduleAppointmentReminder();

      // Confirmação Direta - Sem WhatsApp
      if (Platform.OS === 'web') {
          alert("Agendamento Confirmado! ✅\nO barbeiro já foi notificado no sistema.");
          navigation.navigate('Home');
      } else {
          Alert.alert("Sucesso! ✅", "Agendamento confirmado. O barbeiro já recebeu seu horário no sistema.", [
              { text: "OK", onPress: () => navigation.navigate('Home') }
          ]);
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

  const isButtonEnabled = () => {
      if (loading || !selectedDate || !selectedTime || !userData || !pixConfirmado) return false;
      return true;
  };

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
                <Text className="text-zinc-400">Serviços Escolhidos:</Text>
                <Text className="text-white text-xl font-bold">{service.nome}</Text>
                <Text className="text-orange-500 font-bold">R$ {service.preco?.toFixed(2)} • {service.duracao} min totais</Text>
                <Text className="text-zinc-500 mt-2">Profissional: {barber.nome}</Text>
            </View>

            <Text className="text-white text-lg font-bold mb-3">Escolha o Dia</Text>
            <View className="flex-row justify-between items-center mb-3 bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                <TouchableOpacity onPress={() => setMonthOffset(0)} disabled={monthOffset === 0}>
                    <Text className={monthOffset === 0 ? "text-zinc-600 font-bold" : "text-orange-500 font-bold"}>{"← Atual"}</Text>
                </TouchableOpacity>
                <Text className="text-white font-bold text-lg">{getMonthName(monthOffset)}</Text>
                <TouchableOpacity onPress={() => setMonthOffset(1)} disabled={monthOffset === 1}>
                    <Text className={monthOffset === 1 ? "text-zinc-600 font-bold" : "text-orange-500 font-bold"}>{"Próximo →"}</Text>
                </TouchableOpacity>
            </View>

            {/* ESPAÇAMENTO INFERIOR (pb-4) PARA AFASTAR A BARRA DE ROLAGEM */}
            <View className="mb-6">
                <FlatList 
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 16 }} 
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
            {/* ESPAÇAMENTO INFERIOR (pb-4) PARA AFASTAR A BARRA DE ROLAGEM */}
            <View className="mb-6">
                {loadingTimes ? (
                    <ActivityIndicator color="#f97316" size="small" />
                ) : (
                    <FlatList 
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 16 }}
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

            <Text className="text-white text-lg font-bold mb-3">Pagamento da Entrada</Text>
            <View className="bg-zinc-800 p-4 rounded-xl mb-6 border border-zinc-700">
                <Text className="text-white font-bold mb-2">Para garantir o horário, pague 50% do serviço via Pix.</Text>
                <Text className="text-orange-500 font-bold text-xl mb-4">Valor: R$ {valorEntrada.toFixed(2)}</Text>
                
                <Text className="text-zinc-400 text-sm mb-1">Chave Pix do Barbeiro:</Text>
                <View className="flex-row items-center justify-between bg-zinc-900 p-3 rounded-lg mb-4">
                    <Text className="text-white font-bold">{barber.chavePix || "Chave não cadastrada"}</Text>
                    <TouchableOpacity onPress={copyToClipboard} className="bg-zinc-700 px-3 py-1 rounded">
                        <Text className="text-white text-xs">Copiar</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    onPress={() => setPixConfirmado(true)}
                    className={`p-3 rounded-lg items-center ${pixConfirmado ? 'bg-green-600' : 'bg-zinc-700'}`}
                >
                    <Text className="text-white font-bold">{pixConfirmado ? "✅ Entrada Paga!" : "Já fiz o pagamento no banco"}</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                className={`p-4 rounded-xl items-center mb-20 ${isButtonEnabled() ? 'bg-orange-500' : 'bg-zinc-700'}`}
                onPress={handleConfirmBooking}
                disabled={!isButtonEnabled()}
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