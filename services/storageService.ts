import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { ExpenseRecord, Language } from "../types";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCiHxan-uy8lcWcGYhJaYcYmAqx8O43cA",
  authDomain: "amcjunkshop.firebaseapp.com",
  projectId: "amcjunkshop",
  storageBucket: "amcjunkshop.firebasestorage.app",
  messagingSenderId: "52296965371",
  appId: "1:52296965371:web:fd4b1c4e6c145c6c54e45e",
  measurementId: "G-WZV2JPTYMQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const STORAGE_KEY_LANG = 'moneyflow_language';

export const storageService = {
  /**
   * Subscribes to real-time updates from the 'records' collection in Firestore.
   */
  subscribe: (callback: (records: ExpenseRecord[]) => void) => {
    // Query records (Client-side sorting is handled in ViewRecordsView)
    const q = query(collection(db, "records"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => doc.data() as ExpenseRecord);
      callback(records);
    }, (error) => {
      console.error("Firebase subscription error:", error);
    });

    return unsubscribe;
  },

  /**
   * Adds or updates a record in Firestore.
   */
  addRecord: async (record: ExpenseRecord): Promise<void> => {
    try {
      await setDoc(doc(db, "records", record.id), record);
    } catch (e) {
      console.error("Error adding document: ", e);
      throw e;
    }
  },

  /**
   * Deletes a record from Firestore by ID.
   */
  deleteRecord: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, "records", id));
    } catch (e) {
      console.error("Error deleting document: ", e);
      throw e;
    }
  },

  /**
   * Gets the preferred language from LocalStorage (device specific setting).
   */
  getLanguage: (): Language => {
    return (localStorage.getItem(STORAGE_KEY_LANG) as Language) || Language.EN;
  },

  /**
   * Sets the preferred language in LocalStorage.
   */
  setLanguage: (lang: Language): void => {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  },

  // --- AUTH METHODS ---

  /**
   * Initiates Google Login via Popup.
   */
  loginWithGoogle: async (): Promise<User> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  },

  /**
   * Signs out the current user.
   */
  logout: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  },

  /**
   * Subscribes to authentication state changes.
   */
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  }
};