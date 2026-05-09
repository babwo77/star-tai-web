import React, { useState } from 'react';
import type { Reservation } from '../types'; // ✅ 이 한 줄만 바꿔!
import { durationOptions } from '../utils/time';

interface ReservationSlotProps {
  slotId: string;
  startTime: string;
  endTime: string;
  totalCapacity: number;
  availableCapacity: number;
  reservations: Reservation[];
  onReserve: (slotId: string, people: number, duration: number, phoneNumber: string) => void;
  isAdminMode?: boolean;
  onEdit?: (slotId: string) => void;
  onDelete?: (slotId: string) => void;
}

export const ReservationSlot: React.FC<ReservationSlotProps> = ({
  slotId,
  startTime,
  endTime,
  totalCapacity,
  availableCapacity,
  reservations,
  onReserve,
  isAdminMode = false,
  onEdit,
  onDelete,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [people, setPeople] = useState(1);
  const [duration, setDuration] = useState(60);
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      alert('전화번호를 입력해주세요');
      return;
    }
    onReserve(slotId, people, duration, phoneNumber);
    setPhoneNumber('');
    setPeople(1);
    setShowForm(false);
  };

  return (
    <div
      className="border-2 border-yellow-400 rounded-lg p-4 bg-black hover:bg-gray-900 transition cursor-pointer"
      onClick={() => !isAdminMode && setShowForm(!showForm)}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="text-yellow-400 font-bold text-lg">
          {startTime} ~ {endTime}
        </div>
        {isAdminMode && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(slotId);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              수정
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(slotId);
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      <div className="text-yellow-400 mb-2">
        예약 가능: {availableCapacity}/{totalCapacity}명
      </div>

      {reservations.length > 0 && (
        <div className="text-yellow-300 text-sm mb-3">
          <div className="mb-1">예약 현황:</div>
          {reservations.map((res) => (
            <div key={res.id} className="text-xs text-gray-300 ml-2">
              • {res.people}명 ({res.duration}분) - {res.phoneNumber}
            </div>
          ))}
        </div>
      )}

      {showForm && !isAdminMode && (
        <form onSubmit={handleSubmit} className="mt-4 p-3 bg-gray-800 rounded">
          <div className="mb-3">
            <label className="text-yellow-400 block text-sm mb-1">인원수</label>
            <select
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              className="w-full p-2 bg-gray-700 text-yellow-400 border border-yellow-400 rounded"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}명</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="text-yellow-400 block text-sm mb-1">시술시간</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-2 bg-gray-700 text-yellow-400 border border-yellow-400 rounded"
            >
              {durationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="text-yellow-400 block text-sm mb-1">전화번호</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full p-2 bg-gray-700 text-yellow-400 border border-yellow-400 rounded"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded"
          >
            예약 확정
          </button>
        </form>
      )}
    </div>
  );
};