// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBgbWLHVrBZlHd28fftUPin4UT4xZnEyk8",
    authDomain: "my-todo-app-60d9c.firebaseapp.com",
    projectId: "my-todo-app-60d9c",
    storageBucket: "my-todo-app-60d9c.firebasestorage.app",
    messagingSenderId: "93494051094",
    appId: "1:93494051094:web:602096a1c48b54f31ad037"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// After creating your Firebase project, replace the values below
// with the ones from: Firebase Console → Project Settings → Your Apps → SDK setup

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
