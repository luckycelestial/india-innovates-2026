import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Helper for dynamic function URL
export const getFunctionsBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5001/praja-gcp-challenge/us-central1';
  }
  return `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;
};
