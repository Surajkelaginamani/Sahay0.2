import axios from 'axios';

const BASE_URL = '/api/pharmacy';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const pharmacyApi = {
  /** Fetch all active/pending prescriptions for the pharmacist's facility */
  getActivePrescriptions: () =>
    axios.get(`${BASE_URL}/prescriptions`, { headers: getAuthHeader() }),

  /** Mark a prescription as dispensed */
  dispenseMedication: (prescriptionId) =>
    axios.patch(
      `${BASE_URL}/prescriptions/${prescriptionId}/dispense`,
      { prescriptionId },
      { headers: getAuthHeader() }
    ),
};

export default pharmacyApi;
