import axios from 'axios';

const BASE_URL = '/api/pharmacy';

function getAuthHeader() {
  const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const pharmacyApi = {
  /** Fetch all active/pending prescriptions for the pharmacist's facility (Prompt 9.1) */
  getActivePrescriptions: () =>
    axios.get(`${BASE_URL}/prescriptions`, { headers: getAuthHeader() }),

  /** Mark a prescription as dispensed and decrement stock (Prompt 8.1 & 9.1) */
  dispenseMedication: (prescriptionId) =>
    axios.patch(
      `${BASE_URL}/prescriptions/${prescriptionId}/dispense`,
      { prescriptionId },
      { headers: getAuthHeader() }
    ),

  /** Fetch current medicine inventory with stock quantities & low stock indicators (Prompt 8.1 & 8.2) */
  getInventory: () =>
    axios.get(`${BASE_URL}/inventory`, { headers: getAuthHeader() }),

  /** Update or restock medicine quantity (Prompt 8.1 & 8.2) */
  updateStock: (medicineId, data) =>
    axios.patch(`${BASE_URL}/inventory/${medicineId}/stock`, data, {
      headers: getAuthHeader(),
    }),

  /** Add a new medicine to inventory (Prompt 8.1) */
  addMedicine: (medicineData) =>
    axios.post(`${BASE_URL}/inventory`, medicineData, {
      headers: getAuthHeader(),
    }),
};

export default pharmacyApi;
