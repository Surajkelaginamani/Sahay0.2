import axios from 'axios';

// Using /api/doctor allows Vite proxy (port 5173) to forward cleanly to port 5000
const BASE_URL = '/api/doctor';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const doctorApi = {
  /** Fetch waiting and checked-in patient queue for the logged-in doctor. */
  getQueue: () =>
    axios.get(`${BASE_URL}/queue`, { headers: getAuthHeader() }),

  /** Submit an ABDM-compliant clinical consultation and complete the appointment. */
  submitConsultation: (data) =>
    axios.post(`${BASE_URL}/consultation`, data, { headers: getAuthHeader() }),

  /** Prompt 7.2: Fetch longitudinal patient history (Consultations, Prescriptions, LabOrders, Vitals). */
  getPatientHistory: (patientId) =>
    axios.get(`${BASE_URL}/history/${patientId}`, { headers: getAuthHeader() }),

  /** Prompt 7.2: Request lab test and update appointment status to 'Lab Pending'. */
  requestLabTest: (data) =>
    axios.post(`${BASE_URL}/lab-test`, data, { headers: getAuthHeader() }),

  /** Prompt 7.2: Close consultation, generate prescription, and mark appointment 'Completed'. */
  closeConsultation: (data) =>
    axios.post(`${BASE_URL}/consultation/close`, data, { headers: getAuthHeader() }),

  /** Prompt 11.2: Close consultation with clinical summary tags and voice note transcript. */
  closeConsultationWithSummary: (data) =>
    axios.post(`${BASE_URL}/consultation/close`, data, { headers: getAuthHeader() }),

  /** Prompt 16.1 & 16.3: Join active teleconsultation session. */
  joinTeleconsult: (appointmentId) =>
    axios.post(`${BASE_URL}/teleconsult/join`, { appointmentId }, { headers: getAuthHeader() }),

  /** Prompt 3.1 & 3.2: Fetch official standardized lab tests catalog. */
  getLabCatalog: () =>
    axios.get('/api/labs/catalog', { headers: getAuthHeader() }),

  /** Prompt 6.3: Fetch Gemini AI longitudinal clinical insights for patient. */
  getAiInsights: (patientId) =>
    axios.get(`/api/ai/insights/${patientId}`, { headers: getAuthHeader() }),
};

export default doctorApi;
