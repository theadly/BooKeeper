import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration obtained from the user's project settings
const firebaseConfig = {
  apiKey: "AIzaSyDaaV9dOo59YkiOh-4A_iPbsOrp9Y5R4q0",
  authDomain: "bookeeper-481607.firebaseapp.com",
  projectId: "bookeeper-481607",
  storageBucket: "bookeeper-481607.firebasestorage.app",
  messagingSenderId: "503603855698",
  appId: "1:503603855698:web:6de3d5af8d9c092f72fa8b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;