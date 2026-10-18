import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence, 
  browserSessionPersistence, 
  getAuth 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// NOVO: Importando o Firebase Storage
import { getStorage } from "firebase/storage"; 
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyD36XM0x2Lu1NITvACJxB65Y4Of6kSvczo",
  authDomain: "barbershopapp-82c3b.firebaseapp.com",
  projectId: "barbershopapp-82c3b",
  storageBucket: "barbershopapp-82c3b.firebasestorage.app",
  messagingSenderId: "523904445224",
  appId: "1:523904445224:web:7ee12a7f3531f09ca6be1d"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let auth: any;

if (Platform.OS === 'web') {
  try {
    auth = initializeAuth(app, {
      persistence: browserSessionPersistence
    });
  } catch (e) {
    auth = getAuth(app);
  }
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } catch (e) {
    auth = getAuth(app); 
  }
}

export { auth };
export const db = getFirestore(app);
// NOVO: Exportando o Storage
export const storage = getStorage(app);