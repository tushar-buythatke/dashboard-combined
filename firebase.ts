// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  enableNetwork,
  disableNetwork,
  type Firestore
} from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined
};

// Log Firebase config for debugging (without sensitive data)
console.log('🔥 Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId
});

// Initialize Firebase
let app: FirebaseApp;
let analytics: Analytics | null = null;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Initialize analytics only if supported (not in Node.js or SSR)
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('📊 Firebase Analytics initialized');
    }
  }).catch(() => {
    console.log('📊 Analytics not supported in this environment');
  });
  
  console.log('✅ Firebase app initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

// Helper to force reconnect to Firestore
const reconnectFirestore = async () => {
  try {
    await enableNetwork(db);
    console.log('🔄 Firestore network re-enabled');
    return true;
  } catch (error) {
    console.error('❌ Failed to reconnect Firestore:', error);
    return false;
  }
};

// Export everything needed
export { 
  app, 
  analytics, 
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  enableNetwork,
  disableNetwork,
  reconnectFirestore,
  firebaseConfig
};