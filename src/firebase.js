import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgbWLHVrBZlHd28fftUPin4UT4xZnEyk8",
  authDomain: "my-todo-app-60d9c.firebaseapp.com",
  projectId: "my-todo-app-60d9c",
  storageBucket: "my-todo-app-60d9c.firebasestorage.app",
  messagingSenderId: "93494051094",
  appId: "1:93494051094:web:602096a1c48b54f31ad037"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
