export const generateTimeSlots = (startHour: number, startMin: number, endHour: number, endMin: number, intervalMin: number) => {
  const slots = [];
  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    let nextHour = currentHour;
    let nextMin = currentMin + intervalMin;

    if (nextMin >= 60) {
      nextHour += Math.floor(nextMin / 60);
      nextMin = nextMin % 60;
    }

    const endTime = `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
    slots.push({ startTime, endTime });

    currentMin = nextMin;
    currentHour = nextHour;
  }

  return slots;
};

export const durationOptions = [
  { label: '1시간', value: 60 },
  { label: '1시간 30분', value: 90 },
  { label: '2시간', value: 120 },
];

export const getTimeInMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const addMinutesToTime = (timeStr: string, mins: number): string => {
  const totalMins = getTimeInMinutes(timeStr) + mins;
  const hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};
