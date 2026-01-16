/**
 * ============================================================================
 * FIREBASE CONFIGURATION - CURRENTLY DISABLED
 * ============================================================================
 * 
 * Firebase has been disabled as all data is now stored in the custom database.
 * 
 * TO RE-ENABLE FIREBASE:
 * 1. Uncomment all the code blocks marked with "FIREBASE DISABLED"
 * 2. Uncomment the FirebaseConfigProvider in src/pages/Analytics.tsx
 * 3. Ensure .env file has all VITE_FIREBASE_* environment variables set
 * 4. Set ENABLE_FIREBASE flag below to true
 * 
 * ============================================================================
 */

// FIREBASE DISABLED: Set this to true to re-enable Firebase
const ENABLE_FIREBASE = false;

// FIREBASE DISABLED: Uncomment imports below to re-enable
// import { initializeApp, type FirebaseApp } from "firebase/app";
// import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
// import { 
//   getFirestore, 
//   collection, 
//   doc, 
//   getDocs, 
//   getDoc, 
//   setDoc, 
//   updateDoc, 
//   deleteDoc, 
//   onSnapshot, 
//   query, 
//   where, 
//   orderBy,
//   enableNetwork,
//   disableNetwork,
//   type Firestore
// } from "firebase/firestore";

// FIREBASE DISABLED: Placeholder imports for type compatibility
import type { FirebaseApp } from "firebase/app";
import type { Analytics } from "firebase/analytics";
import type { Firestore } from "firebase/firestore";

// FIREBASE DISABLED: Configuration kept for reference
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined
};

// FIREBASE DISABLED: Logging disabled
if (ENABLE_FIREBASE) {
  console.log('🔥 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
    hasAppId: !!firebaseConfig.appId
  });
}

// FIREBASE DISABLED: Placeholder variables for type compatibility
let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let db: Firestore | null = null;

// FIREBASE DISABLED: Initialization code commented out
if (ENABLE_FIREBASE) {
  console.warn('⚠️ Firebase is disabled. Set ENABLE_FIREBASE=true and uncomment initialization code to re-enable.');
  // Uncomment below to re-enable Firebase initialization:
  /*
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
  */
} else {
  console.log('🔥 Firebase is DISABLED - using custom database only');
}

// FIREBASE DISABLED: Helper function disabled
const reconnectFirestore = async () => {
  if (!ENABLE_FIREBASE) {
    console.warn('⚠️ Firebase is disabled - reconnect not available');
    return false;
  }
  // Uncomment below to re-enable:
  /*
  try {
    await enableNetwork(db);
    console.log('🔄 Firestore network re-enabled');
    return true;
  } catch (error) {
    console.error('❌ Failed to reconnect Firestore:', error);
    return false;
  }
  */
  return false;
};

// FIREBASE DISABLED: Placeholder exports for type compatibility
// TO RE-ENABLE: Uncomment the actual Firestore function imports at the top
const collection = null as any;
const doc = null as any;
const getDocs = null as any;
const getDoc = null as any;
const setDoc = null as any;
const updateDoc = null as any;
const deleteDoc = null as any;
const onSnapshot = null as any;
const query = null as any;
const where = null as any;
const orderBy = null as any;
const enableNetwork = null as any;
const disableNetwork = null as any;

// Export everything (placeholders when Firebase is disabled)
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
  firebaseConfig,
  ENABLE_FIREBASE
};