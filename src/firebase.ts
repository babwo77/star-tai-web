import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAEgTcRrXe12be0yQPC_U5vBnF9fJar484",
  authDomain: "star-tai-reservation.firebaseapp.com",
  projectId: "star-tai-reservation",
  storageBucket: "star-tai-reservation.firebasestorage.app",
  messagingSenderId: "154281928431",
  appId: "1:154281928431:web:e96145e2dfc90bde011d1a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);           // ← Firestore 추가
export const messaging = getMessaging(app);

console.log("✅ Firebase App + Firestore 초기화 성공");