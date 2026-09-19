import axios from 'axios';
import { setupOfflineInterceptors, syncQueue } from './offlineSync';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global request interceptor on default axios to ensure JWT token is attached
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Attach offline caching and background sync interceptors to both api and global axios
setupOfflineInterceptors(api);
setupOfflineInterceptors(axios);

// Initial sync attempt if online on application startup
if (typeof navigator !== 'undefined' && navigator.onLine) {
  syncQueue().catch(() => {});
}

// Patient API (Prompt 7.1 - 4-digit PIN authentication & Recovery)
export const patientAPI = {
  register: (data) => api.post('/auth/patient/register', data).catch(() => api.post('/patients/register', data)),
  login: (data) => api.post('/auth/patient/login', data),
  changeTemporaryPin: (data) => api.patch('/auth/patient/change-temporary-pin', data),
};

// Hospital Admin API
export const hospitalAPI = {
  register: (data) => api.post('/hospital-auth/register', data),
  login: (data) => api.post('/hospital-auth/login', data),
};

// Government Official API
export const govtAPI = {
  login: (data) => api.post('/govt/login', data),
  register: (data) => api.post('/govt/register', data),
  getPendingHospitals: (config) => api.get('/govt/pending-hospitals', config),
  verifyHospital: (id, status, config) => api.put(`/govt/verify-hospital/${id}`, { status }, config),
  getDashboardMetrics: () => api.get('/govt/dashboard-metrics'),
  getFacilities: (status) => api.get('/govt/facilities', { params: status ? { status } : {} }),
};

// Hospital Admin Management API (protected - requires HospitalAdmin JWT)
export const hospitalAdminAPI = {
  createStaff: (data) => api.post('/hospital/create-staff', data),
  getStaff: () => api.get('/hospital/staff'),
  resetPassword: (id, password) => api.put(`/hospital/staff/${id}/password`, { password }),
  deleteStaff: (id) => api.delete(`/hospital/staff/${id}`),
};
// Staff Auth API (Unified login for Doctor, ASHA, HospitalAdmin, LabHead, FacilityAdmin, Receptionist, Nurse & Recovery)
export const staffAuthAPI = {
  login: (data) => api.post('/auth/staff-login', data),
  forgotPassword: (data) => api.post('/auth/staff/forgot-password', data),
  resetPassword: (token, data) => api.patch(`/auth/staff/reset-password/${token}`, data),
};

// Receptionist API (patient & appointment management & PIN reset)
export const receptionistAPI = {
  registerPatient:   (data) => api.post('/receptionist/patient', data),
  searchPatients:    (q)    => api.get('/receptionist/patient/search', { params: { q } }),
  createAppointment: (data) => api.post('/receptionist/appointment', data),
  checkIn:           (id)   => api.patch(`/receptionist/appointment/${id}/checkin`),
  getTodayQueue:     (status) =>
    api.get('/receptionist/queue/today', status ? { params: { status } } : {}),
  verifyAndResetPin: (patientId, data) =>
    api.patch(`/auth/patient/${patientId}/verify-and-reset-pin`, data),
};

export default api;

