import axios from 'axios';

const BASE_URL = '/api/patients';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const patientApi = {
  /** Prompt 9.3: Fetch longitudinal ABDM medical records for logged-in citizen */
  getMyMedicalRecords: () =>
    axios.get(`${BASE_URL}/my-records`, { headers: getAuthHeader() }),
};

export default patientApi;
