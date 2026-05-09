import React, { useState, useEffect } from 'react';
import type { TimeSlot } from '../types';                // ✅ 타입 전용 import
import { generateTimeSlots } from '../utils/time';
// import { ReservationSlot } from './ReservationSlot';  // 사용 안 하면 삭제 or 주석

interface AdminPanelProps {
  onExit: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState(5);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [currentDate] = useState(new Date());            // ✅ setCurrentDate 제거
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const ADMIN_PASSWORD = '9511';

  useEffect(() => {
    if (!isAuthenticated) return;

    const timeSlots = generateTimeSlots(10, 0, 14, 30, 30);
    const initialSlots: TimeSlot[] = timeSlots.map((slot, index) => ({
      id: `${currentDate.toISOString().split('T')[0]}-${index}`,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalCapacity: maxCapacity,
      availableCapacity: maxCapacity,
      reservations: [],
    }));
    setSlots(initialSlots);
  }, [isAuthenticated, maxCapacity, currentDate]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordInput('');
    } else {
      alert('비밀번호가 틀렸습니다.');
      setPasswordInput('');
    }
  };

  const handleCapacityChange = (newCapacity: number) => {
    setMaxCapacity(newCapacity);
    setSlots(slots.map(slot => ({
      ...slot,
      totalCapacity: newCapacity,
      availableCapacity: Math.min(newCapacity, slot.availableCapacity),
    })));
  };

  const handleEditSlot = (slotId: string) => {
    setEditingSlotId(editingSlotId === slotId ? null : slotId);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (confirm('이 슬롯의 모든 예약을 삭제하시겠습니까?')) {
      setSlots(slots.map(slot =>
        slot.id === slotId
          ? { ...slot, reservations: [], availableCapacity: slot.totalCapacity }
          : slot
      ));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 p-8 rounded-lg border-2 border-yellow-400 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-yellow-400 mb-6 text-center">관리자 모드</h1>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-yellow-400 block mb-2">비밀번호 입력</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full p-3 bg-gray-700 text-yellow-400 border border-yellow-400 rounded focus:outline-none focus:border-yellow-300"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded"
            >
              확인
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full bg-gray-700 hover:bg-gray-600 text-yellow-400 py-3 rounded"
            >
              돌아가기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">★ 관리자 모드</h1>
          <button
            onClick={onExit}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            나가기
          </button>
        </div>

        <div className="mb-6 bg-gray-900 p-4 rounded border-2 border-yellow-400">
          <label className="text-yellow-400 block mb-2 font-bold">전체 예약 인원 설정</label>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min="1"
              max="10"
              value={maxCapacity}
              onChange={(e) => handleCapacityChange(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-yellow-400 font-bold text-lg w-16">{maxCapacity}명</span>
          </div>
          <p className="text-gray-300 text-sm mt-2">전체 인원을 조정하면 모든 슬롯에 자동으로 적용됩니다.</p>
        </div>

        <div className="mb-4 text-yellow-400">
          <div className="font-bold mb-2 text-lg">{currentDate.toLocaleDateString('ko-KR')}</div>
          <div className="text-sm text-gray-300">영업시간: 10:00 ~ 14:30</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {slots.map((slot) => (
            <div key={slot.id} className="bg-gray-900 p-3 rounded border border-yellow-400">
              <div className="flex justify-between items-start mb-2">
                <div className="text-yellow-400 font-bold">{slot.startTime} ~ {slot.endTime}</div>
                <div className="text-yellow-400 text-sm">
                  {slot.availableCapacity}/{slot.totalCapacity}명
                </div>
              </div>

              {slot.reservations.length > 0 && (
                <div className="text-yellow-300 text-xs mb-2">
                  {slot.reservations.map((res) => (
                    <div key={res.id} className="text-gray-300">
                      • {res.people}명 ({res.duration}분) - {res.phoneNumber}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditSlot(slot.id)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold"
                >
                  {editingSlotId === slot.id ? '완료' : '수정'}
                </button>
                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};