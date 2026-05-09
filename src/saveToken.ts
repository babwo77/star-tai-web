// src/saveToken.ts
import { addDoc, collection, getFirestore } from "firebase/firestore";

const db = getFirestore();

export async function saveToken(token: string) {
  await addDoc(collection(db, "tokens"), {
    token,
    createdAt: new Date().toISOString()
  });
}