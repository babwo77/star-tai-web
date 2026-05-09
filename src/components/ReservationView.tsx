import React, { useState, useEffect } from 'react';
import type { TimeSlot, Reservation } from '../types';
import { generateTimeSlots } from '../utils/time';
import { ReservationSlot } from './ReservationSlot';

interface ReservationViewProps {
  maxCapacity: number;
  onToggleAdmin: () => void;
}

export const ReservationView: React.FC<ReservationViewProps> = ({ maxCapacity, onToggleAdmin }) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [currentDate] = useState(new Date());

  useEffect(() => {
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
  }, [maxCapacity, currentDate]);

  const handleReserve = (slotId: string, people: number, duration: number, phoneNumber: string) => {
    setSlots(slots.map(slot => {
      if (slot.id === slotId && slot.availableCapacity >= people) {
        const newReservation: Reservation = {
          id: `${Date.now()}`,
          phoneNumber,
          people,
          duration,
          createdAt: new Date(),
        };
        return {
          ...slot,
          availableCapacity: slot.availableCapacity - people,
          reservations: [...slot.reservations, newReservation],
        };
      }
      return slot;
    }));
    alert('예약이 완료되었습니다!');
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">★ 타이 예약 현황</h1>
          <button
            onClick={onToggleAdmin}
            className="bg-gray-700 hover:bg-gray-600 text-yellow-400 px-4 py-2 rounded"
          >
            관리자 모드
          </button>
        </div>

        <div className="mb-4 text-yellow-400 text-lg">
          <div className="font-bold mb-2">{currentDate.toLocaleDateString('ko-KR')}</div>
          <div className="text-sm text-gray-300">영업시간: 10:00 ~ 14:30</div>
        </div>

        <div className="space-y-3">
          {slots.map((slot) => (
            <ReservationSlot
              key={slot.id}
              slotId={slot.id}
              startTime={slot.startTime}
              endTime={slot.endTime}
              totalCapacity={slot.totalCapacity}
              availableCapacity={slot.availableCapacity}
              reservations={slot.reservations}
              onReserve={handleReserve}
            />
          ))}
        </div>
      </div>
    </div>
  );
};