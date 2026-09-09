import axios from 'axios';

const API_BASE = '/api/referrals';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const referralApi = {
  /** GET /api/referrals/hospitals — list approved hospitals to refer to */
  getHospitals: () =>
    axios.get(`${API_BASE}/hospitals`, { headers: getAuthHeader() }),

  /** GET /api/referrals/patients/search?q= — search patients system-wide */
  searchPatients: (q) =>
    axios.get(`${API_BASE}/patients/search`, {
      params: { q },
      headers: getAuthHeader(),
    }),

  /** POST /api/referrals — create a new referral (Prompt 15.1/15.2) */
  createReferral: (data) =>
    axios.post(API_BASE, data, { headers: getAuthHeader() }),

  /** GET /api/referrals?status= — list referrals created by current user */
  getMyReferrals: (status) =>
    axios.get(API_BASE, {
      params: status ? { status } : {},
      headers: getAuthHeader(),
    }),
};

export default referralApi;
