/**
 * Shared calculation logic for Doctor Dashboard and QueuePanel.
 * Strictly derives KPI metrics from the active queue / appointments array.
 * Zero external hardcoding, 100% dynamic synchronization.
 */

// Helper: check if a given date string or Date object falls within today
export const isToday = (dateValue) => {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Derive "Waiting in Queue" by filtering the array for waiting status.
 * Matches: 'Waiting', 'Waiting for Doctor', 'CheckedIn', 'Checked In'
 */
export const isWaitingInQueue = (appt) => {
  if (!appt) return false;
  const s = (appt.status || '').trim().toLowerCase();
  return (
    s === 'waiting' ||
    s === 'waiting for doctor' ||
    s === 'checkedin' ||
    s === 'checked in'
  );
};

/**
 * Derive "Urgent Priority" / "Critical" by filtering the array for triage tags
 * or urgency matching 'URGENT' or 'EMERGENCY'.
 */
export const isUrgentOrCritical = (appt) => {
  if (!appt) return false;

  // 1. Urgency field
  const urgency = String(appt.urgency || '').toUpperCase();
  if (urgency === 'URGENT' || urgency === 'EMERGENCY') return true;

  // 2. Priority field
  const priority = String(appt.priority || '').toUpperCase();
  if (priority === 'URGENT' || priority === 'EMERGENCY') return true;

  // 3. Critical lab flag or critical lab order
  if (appt.isCriticalLab) return true;
  if (Array.isArray(appt.labOrders) && appt.labOrders.some((o) => o?.isCritical)) return true;

  // 4. Clinical / Triage tags matching 'URGENT' or 'EMERGENCY'
  if (Array.isArray(appt.clinicalTags)) {
    const hasUrgentTag = appt.clinicalTags.some((tag) => {
      const t = String(tag).toUpperCase();
      return t.includes('URGENT') || t.includes('EMERGENCY');
    });
    if (hasUrgentTag) return true;
  }

  // 5. Triage object structure if present
  if (appt.triage) {
    const triageStr = JSON.stringify(appt.triage).toUpperCase();
    if (triageStr.includes('URGENT') || triageStr.includes('EMERGENCY')) return true;
  }

  return false;
};

/**
 * Derive "Consultations Today" by filtering the array for completed statuses bounded by today's date.
 * Matches: status === 'Completed' or 'Closed', with consultation date falling on today.
 */
export const isConsultationCompletedToday = (appt) => {
  if (!appt) return false;
  const s = (appt.status || '').trim().toUpperCase();
  if (s !== 'COMPLETED' && s !== 'CLOSED') return false;

  const dateToCheck =
    appt.consultationEndTime ||
    appt.updatedAt ||
    appt.appointmentDate ||
    appt.createdAt;

  return isToday(dateToCheck);
};

/**
 * Virtual OPD / Teleconsultation check
 */
export const isVirtualConsultation = (appt) => {
  if (!appt) return false;
  return (
    appt.type === 'Teleconsultation' ||
    Boolean(appt.teleconsultRoomId) ||
    [
      'Teleconsult Requested',
      'Teleconsult Scheduled',
      'Teleconsult Confirmed',
      'Patient Waiting in Room',
      'In Teleconsult',
    ].includes(appt.status)
  );
};

/**
 * Consolidated calculation producing shared metrics across Doctor Dashboard and QueuePanel.
 */
export const deriveQueueMetrics = (appointments = []) => {
  const list = Array.isArray(appointments) ? appointments : [];

  const waitingList = list.filter(isWaitingInQueue);
  const urgentList = list.filter(isUrgentOrCritical);
  const completedTodayList = list.filter(isConsultationCompletedToday);
  const virtualList = list.filter(isVirtualConsultation);
  const reportsReadyList = list.filter((a) => a.status === 'Reports Ready');
  const checkedInList = list.filter((a) => {
    const s = (a.status || '').toLowerCase();
    return s === 'checkedin' || s === 'checked in';
  });
  const criticalLabsList = list.filter(
    (a) => a.isCriticalLab || (Array.isArray(a.labOrders) && a.labOrders.some((o) => o?.isCritical))
  );
  const patientWaitingInCallList = list.filter(
    (a) => a.status === 'Patient Waiting in Room'
  );

  return {
    waitingCount: waitingList.length,
    checkedInCount: checkedInList.length,
    urgentCount: urgentList.length,
    completedTodayCount: completedTodayList.length,
    virtualCount: virtualList.length,
    reportsReadyCount: reportsReadyList.length,
    criticalLabsCount: criticalLabsList.length,
    patientWaitingInCallCount: patientWaitingInCallList.length,
    total: list.length,
  };
};
