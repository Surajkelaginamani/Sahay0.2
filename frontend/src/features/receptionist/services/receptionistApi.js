import axios from 'axios';

// Using /api/receptionist allows Vite proxy (port 5173) to forward cleanly to port 5000
const BASE_URL = '/api/receptionist';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const receptionistApi = {
  // ── Patient ────────────────────────────────────────────────────────────────
  /** Register a new walk-in patient (creates User login + Patient profile). */
  registerPatient: (data) =>
    axios.post(`${BASE_URL}/patient`, data, { headers: getAuthHeader() }),

  /** Search existing patients by name or phone number. */
  searchPatients: (q) =>
    axios.get(`${BASE_URL}/patient/search`, {
      params: { q },
      headers: getAuthHeader(),
    }),

  /** Get all patients who have visited this facility. Pass today=true to filter today only. */
  getFacilityPatients: (todayOnly = false) =>
    axios.get(`${BASE_URL}/patients`, {
      params: todayOnly ? { today: 'true' } : {},
      headers: getAuthHeader(),
    }),

  // ── Appointment ────────────────────────────────────────────────────────────
  /** Schedule a formal appointment linking a patient. */
  createAppointment: (data) =>
    axios.post(`${BASE_URL}/appointment`, data, { headers: getAuthHeader() }),

  /** Check in a patient — sets status to 'CheckedIn' and assigns a queueNumber. */
  checkIn: (appointmentId) =>
    axios.patch(`${BASE_URL}/appointment/${appointmentId}/checkin`, {}, {
      headers: getAuthHeader(),
    }),

  // ── Queue ──────────────────────────────────────────────────────────────────
  /** Prompt 4.1 & 4.2: Add an existing patient to today's walk-in queue with an assigned doctor, urgency, priority, and referralId. */
  addToQueue: (patientId, assignedDoctorId, appointmentDate, priority = 'Routine', referralId, urgency = 'Routine') =>
    axios.post(
      `${BASE_URL}/queue`,
      typeof patientId === 'object'
        ? { urgency: 'Routine', ...patientId }
        : { patientId, assignedDoctorId, appointmentDate, priority, referralId, urgency },
      { headers: getAuthHeader() }
    ),

  /** Fetch today's full appointment queue for the facility. */
  getTodayQueue: (status) =>
    axios.get(`${BASE_URL}/queue/today`, {
      params: status ? { status } : {},
      headers: getAuthHeader(),
    }),

  /** Schedule a future appointment for a patient with a doctor. */
  scheduleAppointment: (data) =>
    axios.post(`${BASE_URL}/appointment/schedule`, data, { headers: getAuthHeader() }),

  /** Fetch all future scheduled appointments for the facility (strictly after today). */
  getUpcomingAppointments: (status) =>
    axios.get(`${BASE_URL}/appointments/upcoming`, {
      params: status ? { status } : {},
      headers: getAuthHeader(),
    }),

  // ── Doctors ────────────────────────────────────────────────────────────────
  /** Fetch all doctors associated with the receptionist's facility. */
  getFacilityDoctors: () =>
    axios.get(`${BASE_URL}/doctors`, { headers: getAuthHeader() }),

  // ── Referrals ──────────────────────────────────────────────────────────────
  /** Fetch all pending ASHA referrals directed to this facility. */
  getIncomingReferrals: () =>
    axios.get(`${BASE_URL}/referrals/incoming`, { headers: getAuthHeader() }),

  // ── Data Conflicts (Prompt 2.2) ────────────────────────────────────────────
  /** Fetch all pending SyncConflict records for admin review. */
  getPendingConflicts: () =>
    axios.get(`${BASE_URL}/conflicts`, { headers: getAuthHeader() }),

  /** Resolve a conflict: action = 'merge' | 'create_new' */
  resolveConflict: (conflictId, action) =>
    axios.post(
      `${BASE_URL}/conflicts/${conflictId}/resolve`,
      { action },
      { headers: getAuthHeader() }
    ),
};

export default receptionistApi;
