import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

// Firebase 초기화
const db = getFirestore();

// 예약 데이터 타입 (로컬 Reservation과 호환)
export interface ReservationData {
  id: string;
  phoneNumber: string;
  people: number;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled'; // 로컬 타입에 맞춤
  slotId: string;
  requestedAt: Date;
  note?: string;
}

// Firestore에 예약 저장
export async function saveReservation(reservation: ReservationData) {
  try {
    const docRef = await addDoc(collection(db, 'reservations'), {
      ...reservation,
      requestedAt: reservation.requestedAt.toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('예약 저장 실패:', error);
    throw error;
  }
}

// 모든 예약 불러오기
export async function getAllReservations(): Promise<ReservationData[]> {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'reservations'), orderBy('requestedAt', 'desc'))
    );
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      requestedAt: new Date(doc.data().requestedAt),
    })) as ReservationData[];
  } catch (error) {
    console.error('예약 불러오기 실패:', error);
    return [];
  }
}

// 예약 상태 업데이트
export async function updateReservationStatus(id: string, status: 'confirmed' | 'cancelled') {
  try {
    await updateDoc(doc(db, 'reservations', id), { status });
  } catch (error) {
    console.error('예약 상태 업데이트 실패:', error);
    throw error;
  }
}

// 예약 삭제
export async function deleteReservation(id: string) {
  try {
    await deleteDoc(doc(db, 'reservations', id));
  } catch (error) {
    console.error('예약 삭제 실패:', error);
    throw error;
  }
}

// 대기 중인 예약만 가져오기
export async function getPendingReservations(): Promise<ReservationData[]> {
  try {
    const q = query(
      collection(db, 'reservations'), 
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      requestedAt: new Date(doc.data().requestedAt),
    })) as ReservationData[];
  } catch (error) {
    console.error('대기 예약 불러오기 실패:', error);
    return [];
  }
}