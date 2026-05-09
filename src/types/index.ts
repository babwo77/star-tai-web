export interface Reservation {
  id: string;
  phoneNumber: string;
  people: number;
  duration: number; // 분 단위: 60, 90, 120
  createdAt: Date;
}

export interface TimeSlot {
  id: string;
  startTime: string; // "10:00" 형식
  endTime: string;
  totalCapacity: number;
  availableCapacity: number;
  reservations: Reservation[];
}

export interface Config {
  maxCapacity: number;
  businessHoursStart: string; // "10:00"
  businessHoursEnd: string; // "14:30"
  slotDuration: number; // 30
}
