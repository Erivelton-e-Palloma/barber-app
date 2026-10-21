import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { auth, db } from '../config/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';

export default function UserProfile({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData({ id: user.uid, email: user.email, ...docSnap.data() });
          }
        } catch (error) {
          console.log("Erro ao buscar dados do usuário:", error);
        }
      }
      setLoading(false);
    }
    fetchUser();
  }, []);

  async function executeDeletion() {
    setDeleting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // 1. Apaga os dados do Firestore
        await deleteDoc(doc(db, 'usuarios', user.uid));
        // 2. Apaga a conta de Autenticação do Firebase
        await deleteUser(user);
        
        if (Platform.OS === 'web') alert("Conta excluída com sucesso. Adeus!");
        else Alert.alert("Sucesso", "Conta excluída com sucesso.");
        // O Listener de Auth no App.tsx (ou roteamento) vai automaticamente redirecionar para o Login
      }
    } catch (error: any) {
      console.log(error);
      // Se o Firebase exigir login recente por segurança
      if (error.code === 'auth/requires-recent-login') {
          if (Platform.OS === 'web') {
              alert("Por questões de segurança, faça o logout, entre novamente e tente excluir a conta logo em seguida.");
              await signOut(auth);
          } else {
              Alert.alert("Segurança", "Faça o login novamente para confirmar a exclusão.", [
                  { text: "OK", onPress: () => signOut(auth) }
              ]);
          }
      } else {
          if (Platform.OS === 'web') alert("Erro ao excluir conta. Tente novamente.");
          else Alert.alert("Erro", "Não foi possível excluir a conta.");
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteAccount() {
    if (Platform.OS === 'web') {
      if (window.confirm("ATENÇÃO: Isso apagará permanentemente sua conta, agendamentos, planos VIP e pontos de fidelidade. Deseja continuar?")) {
          executeDeletion();
      }
    } else {
      Alert.alert(
        "Excluir Conta Permanentemente",
        "ATENÇÃO: Isso apagará sua conta, histórico, planos VIP e pontos. Essa ação não pode ser desfeita. Deseja continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim, Excluir Tudo", style: "destructive", onPress: executeDeletion }
        ]
      );
    }
  }

  return (
    <ScrollView className="flex-1 bg-zinc-900 px-6 pt-12" contentContainerStyle={{ paddingBottom: 60 }}>
      <View className="flex-row items-center mb-8">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Text className="text-orange-500 text-lg font-bold">← Voltar</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold flex-1">Meu Perfil</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f97316" className="mt-10" />
      ) : (
        <>
            <View className="items-center mb-8">
                <View className="w-24 h-24 bg-zinc-800 rounded-full items-center justify-center border-2 border-zinc-700 mb-4">
                    <Text className="text-4xl">👤</Text>
                </View>
                <Text className="text-white text-2xl font-bold">{userData?.nome || 'Usuário'}</Text>
                {userData?.isVIP && (
                    <Text className="text-yellow-500 font-bold mt-1">👑 Cliente VIP</Text>
                )}
            </View>

            <Text className="text-zinc-500 font-bold mb-2 uppercase text-xs">Seus Dados Pessoais (LGPD)</Text>
            <View className="bg-zinc-800 p-4 rounded-xl mb-8 border border-zinc-700">
                <Text className="text-zinc-400 text-xs mb-1">E-mail</Text>
                <Text className="text-white font-bold text-lg mb-4">{userData?.email || auth.currentUser?.email}</Text>

                <Text className="text-zinc-400 text-xs mb-1">Telefone / WhatsApp</Text>
                <Text className="text-white font-bold text-lg mb-4">{userData?.telefone || 'Não informado'}</Text>

                <Text className="text-zinc-400 text-xs mb-1">Pontos de Fidelidade</Text>
                <Text className="text-orange-500 font-bold text-lg">{userData?.pontosFidelidade || 0} cortes realizados</Text>
            </View>

            <Text className="text-zinc-500 font-bold mb-2 uppercase text-xs">Zona de Perigo</Text>
            <View className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                <Text className="text-red-400 mb-4 text-sm leading-5">
                    De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar a exclusão permanente dos seus dados de nossos servidores.
                </Text>
                
                <TouchableOpacity 
                    onPress={handleDeleteAccount} 
                    disabled={deleting}
                    className="bg-red-600 p-4 rounded-lg items-center flex-row justify-center"
                >
                    {deleting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text className="text-white font-bold text-lg mr-2">🗑️</Text>
                            <Text className="text-white font-bold text-lg">Excluir Minha Conta</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </>
      )}
    </ScrollView>
  );
}