import axios from 'axios';

const API_BASE = '/api/asha';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ashaApi = {
  /** GET /api/asha/hospitals — list all approved hospitals to refer to */
  getHospitals: () =>
    axios.get(`${API_BASE}/hospitals`, { headers: getAuthHeader() }),

  /** GET /api/asha/patients/search?q= — search patients by name or phone */
  searchPatients: (q) =>
    axios.get(`${API_BASE}/patients/search`, {
      params: { q },
      headers: getAuthHeader(),
    }),

  /** POST /api/asha/referral — create a new referral */
  createReferral: (data) =>
    axios.post(`${API_BASE}/referral`, data, { headers: getAuthHeader() }),

  /** GET /api/asha/referrals?status= — list this ASHA's referrals */
  getMyReferrals: (status) =>
    axios.get(`${API_BASE}/referrals`, {
      params: status ? { status } : {},
      headers: getAuthHeader(),
    }),
};

export default ashaApi;
