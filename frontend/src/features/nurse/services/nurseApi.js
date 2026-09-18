import axios from 'axios';

// Using /api/nurse allows Vite proxy (port 5173) to forward cleanly to port 5000
const BASE_URL = '/api/nurse';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const nurseApi = {
  /** Fetch all active triage patients waiting for vitals capture. */
  getTriageQueue: () =>
    axios.get(`${BASE_URL}/queue`, { headers: getAuthHeader() }),

  /** Submit vitals and forward patient to the Doctor queue. */
  captureVitals: (data) =>
    axios.post(`${BASE_URL}/vitals`, data, { headers: getAuthHeader() }),

  /** Prompt 4.1 & 4.2: Forward a triage patient to Doctor queue with specified urgency level. */
  forwardToDoctor: (data) =>
    axios.post(`${BASE_URL}/forward-to-doctor`, data, { headers: getAuthHeader() }),

  /** Prompt 8.2: Fetch appointments in 'Lab Pending' or 'Reports Ready' state. */
  getLabQueue: () =>
    axios.get(`${BASE_URL}/lab-queue`, { headers: getAuthHeader() }),

  /** Prompt 8.2: Forward a lab request to the Laboratory Head. */
  forwardToLab: (appointmentId) =>
    axios.post(`${BASE_URL}/forward-to-lab`, { appointmentId }, { headers: getAuthHeader() }),

  /** Prompt 8.2: Notify doctor that reports are ready and move patient to Doctor Review Queue. */
  notifyDoctor: (appointmentId) =>
    axios.post(`${BASE_URL}/notify-doctor`, { appointmentId }, { headers: getAuthHeader() }),

  /** Prompt 16.1: Request video teleconsultation session with a specialist doctor. */
  requestTeleconsult: (data) =>
    axios.post(`${BASE_URL}/request-teleconsult`, data, { headers: getAuthHeader() }),

  /** Prompt 16.1: Fetch specialist doctors available for teleconsultation. */
  getDoctors: () =>
    axios.get(`${BASE_URL}/doctors`, { headers: getAuthHeader() }),

  /** Prompt 5.1 & 5.2: Update patient allergies */
  updatePatientAllergies: (patientId, allergies) =>
    axios.patch(`/api/patients/${patientId}/allergies`, { allergies }, { headers: getAuthHeader() }),

  /** Skip & Recall: Move a patient to On-Hold / Absent status. */
  skipPatient: (appointmentId) =>
    axios.patch(`${BASE_URL}/queue/${appointmentId}/skip`, {}, { headers: getAuthHeader() }),

  /** Skip & Recall: Recall a skipped patient back to the active triage queue. */
  recallPatient: (appointmentId) =>
    axios.patch(`${BASE_URL}/queue/${appointmentId}/recall`, {}, { headers: getAuthHeader() }),

  /** Skip & Recall: Mark a skipped patient as No-Show (permanently removes from queue). */
  markNoShow: (appointmentId) =>
    axios.patch(`${BASE_URL}/queue/${appointmentId}/no-show`, {}, { headers: getAuthHeader() }),

};

export default nurseApi;
