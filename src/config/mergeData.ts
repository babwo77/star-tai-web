import { LABELS } from './labels';

export function mergeData(apiData: Partial<typeof LABELS> = {}) {
  return {
    shopName: apiData.shopName ?? LABELS.shopName,
    admin: apiData.admin ?? LABELS.admin,
    menu: apiData.menu ?? LABELS.menu,
    heroTitle: apiData.heroTitle ?? LABELS.heroTitle,
    heroDescription: apiData.heroDescription ?? LABELS.heroDescription,
    heroSubtitle: apiData.heroSubtitle ?? LABELS.heroSubtitle,
    todayDateLabel: apiData.todayDateLabel ?? LABELS.todayDateLabel,
    capacityLabel: apiData.capacityLabel ?? LABELS.capacityLabel,
    totalCapacityLabel: apiData.totalCapacityLabel ?? LABELS.totalCapacityLabel,
    timeRange: apiData.timeRange ?? LABELS.timeRange,
    adminMode: apiData.adminMode ?? LABELS.adminMode,
    reservationSystemManagement:
      apiData.reservationSystemManagement ?? LABELS.reservationSystemManagement,
    maxCapacityLabel: apiData.maxCapacityLabel ?? LABELS.maxCapacityLabel,
    autoApplyNotice: apiData.autoApplyNotice ?? LABELS.autoApplyNotice,
    pendingTitle: apiData.pendingTitle ?? LABELS.pendingTitle,
    confirmButton: apiData.confirmButton ?? LABELS.confirmButton,
    cancelButton: apiData.cancelButton ?? LABELS.cancelButton,
    resetButton: apiData.resetButton ?? LABELS.resetButton,
    requestButton: apiData.requestButton ?? LABELS.requestButton,
    reservationPeopleLabel:
      apiData.reservationPeopleLabel ?? LABELS.reservationPeopleLabel,
    peopleLabel: apiData.peopleLabel ?? LABELS.peopleLabel,
    massageTimeLabel: apiData.massageTimeLabel ?? LABELS.massageTimeLabel,
    phoneNumberLabel: apiData.phoneNumberLabel ?? LABELS.phoneNumberLabel,
    startTimeLabel: apiData.startTimeLabel ?? LABELS.startTimeLabel,
  };
}
