import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 여기에 Firebase 설정을 입력하세요
// Firebase Console에서 프로젝트 설정에서 확인할 수 있습니다
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
