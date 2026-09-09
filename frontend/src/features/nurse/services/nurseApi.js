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
};

export default nurseApi;
