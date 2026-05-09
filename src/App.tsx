import { useState, useEffect, useMemo } from 'react';
import {
  collection, addDoc, onSnapshot, query, serverTimestamp,
  where, setDoc, doc, getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

// 타입 정의
type Slot = {
  id: string;
  startTime: string;
  endTime: string;
  total: number;
};

type Reservation = {
  id: string;
  slotId: string;
  people: number;
  duration: number;
  phoneNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  date: string;
  fcmToken?: string;
  createdAt?: any;
};

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [today, setToday] = useState(getCurrentBusinessDate());
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [fcmToken, setFcmToken] = useState("");
  const [myPhone, setMyPhone] = useState(localStorage.getItem('myPhone') || "");
  const [maxCapacity, setMaxCapacity] = useState(5);

  // 비즈니스 데이트 계산
  function getCurrentBusinessDate() {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(now.getTime() + kstOffset);
    let year = kstDate.getUTCFullYear();
    let month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
    let day = String(kstDate.getUTCDate()).padStart(2, '0');
    const hour = now.getHours();
    if (hour >= 0 && hour <= 9) {
      const prev = new Date(now.getTime() - 24 * 60 * 60 * 1000 + kstOffset);
      year = prev.getUTCFullYear();
      month = String(prev.getUTCMonth() + 1).padStart(2, '0');
      day = String(prev.getUTCDate()).padStart(2, '0');
    }
    return `${year}-${month}-${day}`;
  }

  // 시간 포맷
  function formatTime(hour24: number, minute: number) {
    const period = hour24 < 12 ? '오전' : '오후';
    let hour12;
    if (hour24 === 0) hour12 = 12;
    else if (hour24 === 12) hour12 = 12;
    else if (hour24 > 12) hour12 = hour24 - 12;
    else hour12 = hour24;
    return `${period} ${hour12}:${String(minute).padStart(2, '0')}`;
  }

  // 슬롯 초기화
  useEffect(() => {
    const list: Slot[] = [];
    let h = 10, m = 0;
    while (true) {
      const start = formatTime(h, m);
      let nextM = m + 30, nextH = h;
      if (nextM >= 60) {
        nextM = 0;
        nextH++;
      }
      const end = formatTime(nextH, nextM);
      list.push({ id: `slot-${list.length}`, startTime: start, endTime: end, total: 5 });
      m = nextM;
      h = nextH;
      if (h >= 24) break;
    }
    setSlots(list);
  }, []);

  // 최대 인원 실시간 동기화
  useEffect(() => {
    const loadCapacity = async () => {
      const snap = await getDoc(doc(db, "settings", "capacity"));
      if (snap.exists()) {
        setMaxCapacity(snap.data().maxCapacity || 5);
      }
    };
    loadCapacity();

    const unsub = onSnapshot(doc(db, "settings", "capacity"), (snap) => {
      if (snap.exists()) {
        setMaxCapacity(snap.data().maxCapacity || 5);
      }
    });
    return () => unsub();
  }, []);

  // 오디오 잠금 해제
  useEffect(() => {
    const unlockAudio = async () => {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    return () => document.removeEventListener('click', unlockAudio);
  }, []);

  // FCM 초기화 및 알림 처리
  useEffect(() => {
    const initFCM = async () => {
      try {
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (!registration) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setIsLoaded(true);
          return;
        }
        const token = await getToken(messaging, {
          vapidKey: "BCs9-zCB4ny3SpzrqBrHlAd5T4pxd1Tejte1uC5gHwFoh8ynZPSWRBDyRMv_f66zSsjGfAe9Zbtm3SHGC4FTxPA",
          serviceWorkerRegistration: registration
        });
        if (token) {
          setFcmToken(token);
          await setDoc(doc(db, "customerTokens", token.substring(0, 20)), {
            token: token,
            updatedAt: new Date(),
            platform: 'web'
          });
        }

        onMessage(messaging, async (payload) => {
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 1.0;
            await audio.play();
          } catch (e) {
            console.log('알림음 재생 실패', e);
          }

          const title = payload.notification?.title || '별타이';
          const body = payload.notification?.body || '';

          if (document.hidden && Notification.permission === 'granted') {
            const notification = new Notification(title, {
              body: body,
              icon: '/logo192.png',
              tag: payload.data?.reservationId || 'default',
              requireInteraction: true
            });
            notification.onclick = () => {
              window.location.reload();
            };
          } else {
            if (confirm(`📢 ${title}\n${body}`)) {
              window.location.reload();
            }
          }
        });
      } catch (err: any) {
        console.error("FCM 에러:", err);
      }
      setIsLoaded(true);
    };
    initFCM();
  }, []);

  // 예약 실시간 동기화 (중요)
  useEffect(() => {
    const q = query(
      collection(db, "reservations"),
      where("date", "==", today)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Reservation[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      } as Reservation)).sort((a, b) => b.createdAt - a.createdAt);

      setReservations(data);
    }, (error) => {
      console.error("Firestore 에러:", error);
    });
    return () => unsubscribe();
  }, [today]);

  // 내 예약 필터링
  useEffect(() => {
    if (myPhone && reservations.length > 0) {
      setMyReservations(reservations.filter(r => r.phoneNumber === myPhone));
    } else {
      setMyReservations([]);
    }
  }, [reservations, myPhone]);

  // 날짜 변경 체크
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = getCurrentBusinessDate();
      if (currentDate !== today) setToday(currentDate);
    }, 60000);
    return () => clearInterval(interval);
  }, [today]);

  // 실시간 인원 계산
  const slotAvailability = useMemo(() => {
    const map: Record<string, number> = {};
    slots.forEach(slot => {
      const slotIndex = parseInt(slot.id.replace("slot-", ""));
      let used = 0;
      reservations.forEach(r => {
        if (r.status !== 'approved') return;
        const startIndex = parseInt((r.slotId || "").replace("slot-", "")) || 0;
        const slotsNeeded = Math.ceil((r.duration || 60) / 30);
        for (let i = 0; i < slotsNeeded; i++) {
          if (startIndex + i === slotIndex) {
            used += (r.people || 0);
            break;
          }
        }
      });
      map[slot.id] = Math.max(0, maxCapacity - used);
    });
    return map;
  }, [reservations, maxCapacity, slots]);

  const getSlotReservations = (slotId: string): Reservation[] => {
    const currentIndex = parseInt(slotId.replace("slot-", ""));
    return reservations.filter(r => {
      const startIndex = parseInt((r.slotId || "").replace("slot-", "")) || 0;
      const slotsNeeded = Math.ceil((r.duration || 60) / 30);
      for (let i = 0; i < slotsNeeded; i++) {
        if (startIndex + i === currentIndex) return true;
      }
      return false;
    });
  };

  const getVisibleSlots = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const nowMinutes = hour * 60 + minute;
    if (hour >= 0 && hour <= 8) return [];
    return slots.filter((_, index) => {
      const slotMinutes = 600 + index * 30;
      return nowMinutes < slotMinutes;
    });
  };

  // ★★★ 예약 신청 (인원 오버 검증 완벽 버전) ★★★
  const requestReservation = async (slotId: string) => {
    const peopleStr = prompt('인원 (1~5)', '1');
    const people = parseInt(peopleStr || "0");
    if (isNaN(people) || people < 1 || people > 5) {
      alert('❌ 인원은 1~5명 사이로 입력해주세요.');
      return;
    }
    const duration = parseInt(prompt('시간 (60/90/120)', '60') || "60");
    const phoneNumber = prompt('전화번호', '010-');
    if (!duration || !phoneNumber) return;

    // 예약이 차지할 모든 30분 슬롯을 확인
    const startIndex = parseInt(slotId.replace("slot-", ""));
    const slotsNeeded = Math.ceil(duration / 30);
    for (let i = 0; i < slotsNeeded; i++) {
      const checkSlotId = `slot-${startIndex + i}`;
      const available = slotAvailability[checkSlotId] ?? maxCapacity;
      if (available < people) {
        alert(`❌ ${slots.find(s => s.id === checkSlotId)?.startTime || ''} 시간대 잔여 인원이 ${available}명입니다.`);
        return;
      }
    }

    localStorage.setItem('myPhone', phoneNumber);
    setMyPhone(phoneNumber);

    try {
      await addDoc(collection(db, "reservations"), {
        slotId,
        people,
        duration,
        phoneNumber,
        status: 'pending',
        note: '',
        date: today,
        fcmToken: fcmToken || "",
        createdAt: serverTimestamp()
      });
      alert('✅ 예약 신청 완료! 관리자 승인 대기중');
    } catch (err: any) {
      alert('❌ 예약 중 오류: ' + err.message);
    }
  };

  if (!isLoaded) return (
    <div style={{ background: '#0b0b0f', color: '#d4af37', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      로딩중...
    </div>
  );

  const visibleSlots = getVisibleSlots();
  const now = new Date();
  const isReservationOpen = now.getHours() >= 9;

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b0f', color: '#d4af37', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '3.5rem', margin: 0 }}>⭐ 별타이</h1>
        <a href="tel:0632285011" style={{ background: '#d4af37', color: '#000', padding: '12px 24px', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📞 전화 예약
        </a>
      </div>

      <p style={{ textAlign: 'center', fontSize: '1.8rem', marginBottom: '30px' }}>타이 마사지 예약 시스템</p>

      {/* 내 예약 상태 */}
      {myReservations.length > 0 && (
        <div style={{ background: '#1a1a22', padding: '20px', borderRadius: '12px', border: '1px solid #d4af37', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>📋 내 예약 현황 ({myReservations.length}건)</h3>
          {myReservations.map(r => (
            <div key={r.id} style={{ padding: '10px', marginBottom: '8px', borderRadius: '8px', background: r.status === 'approved' ? '#1a3a1a' : r.status === 'rejected' ? '#3a1a1a' : '#2a2a35', border: `1px solid ${r.status === 'approved' ? '#22c55e' : r.status === 'rejected' ? '#ef4444' : '#d4af37'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{slots.find(s => s.id === r.slotId)?.startTime || r.slotId} ~ {r.duration}분</span>
                <span style={{ color: r.status === 'approved' ? '#22c55e' : r.status === 'rejected' ? '#ef4444' : '#d4af37', fontWeight: 'bold' }}>
                  {r.status === 'approved' ? '✅ 수락됨' : r.status === 'rejected' ? '❌ 거절됨' : '⏳ 대기중'}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa' }}>인원: {r.people}명 | 전화: {r.phoneNumber}</div>
              {r.status === 'approved' && (
                <div style={{ fontSize: '0.8rem', color: '#22c55e', marginTop: '5px' }}>
                  ⚠️ 예약 변경은 2시간 전 가능하며, 반복 취소/변경 시 불이익을 받으실 수 있습니다.
                </div>
              )}
              {r.status === 'rejected' && (
                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '5px' }}>
                  현재 시간 및 인원 조정이 필요합니다.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>예약 가능 시간</h2>
        {!isReservationOpen ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            <p style={{ fontSize: '1.5rem' }}>⏰ 예약 대기 중</p>
            <p>오전 9:00에 예약이 오픈됩니다</p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>(오전 10:00부터 마사지 시작 가능)</p>
          </div>
        ) : visibleSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            <p style={{ fontSize: '1.5rem' }}>오늘 예약 마감</p>
            <p>내일 오전 9:00에 다시 예약해주세요</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px' }}>
            {visibleSlots.map(slot => {
              const available = slotAvailability[slot.id] ?? maxCapacity;
              const isFull = available === 0;
              const slotReservations = getSlotReservations(slot.id);

              return (
                <div key={slot.id} style={{ background: isFull ? '#2a1a1a' : '#1a1a22', padding: '20px', borderRadius: '12px', border: `1px solid ${isFull ? '#ef4444' : '#d4af37'}` }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {slot.startTime} ~ {slot.endTime}
                  </div>
                  <div style={{ fontSize: '1.4rem', margin: '15px 0', color: isFull ? '#ef4444' : '#22c55e' }}>
                    잔여 {available} / {maxCapacity}명
                  </div>

                  {slotReservations.map((r) => (
                    <div key={r.id} style={{ fontSize: '0.85rem', marginBottom: '4px', padding: '4px 8px', background: '#0f0f15', borderRadius: '4px', color: r.status === 'approved' ? '#22c55e' : r.status === 'rejected' ? '#ef4444' : '#d4af37' }}>
                      {r.status === 'approved' ? '✅' : r.status === 'rejected' ? '❌' : '⏳'} 📞 {r.phoneNumber} | {r.people}명 | {r.duration}분
                    </div>
                  ))}

                  {isFull && <div style={{ color: '#ef4444', textAlign: 'center', fontWeight: 'bold', marginTop: '10px' }}>예약 매진</div>}
                  {!isFull && (
                    <button onClick={() => requestReservation(slot.id)} style={{ width: '100%', padding: '14px', background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', marginTop: '10px' }}>
                      예약 신청
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}