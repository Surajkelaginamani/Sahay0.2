/**
 * Authentication and session utilities for SAHAY
 */

/**
 * Retrieves and validates the current user session from localStorage.
 * Checks for token expiration when a JWT token is present.
 * Returns { user, token } if authenticated and valid, otherwise null.
 */
export function getStoredAuth() {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('sahay_token');
    const userStr = localStorage.getItem('user') || localStorage.getItem('sahay_user');

    if (!token && !userStr) return null;

    // Check token expiration if JWT format is detected
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            // Expired token: clear all auth keys and return null
            ['token', 'sahay_token', 'user', 'sahay_user'].forEach((k) => localStorage.removeItem(k));
            return null;
          }
          // If user object isn't stored in localStorage but token has role/id
          if (!userStr && payload.role) {
            return {
              token,
              user: {
                _id: payload.id || payload._id,
                email: payload.email,
                role: payload.role,
                name: payload.name || payload.email,
              },
            };
          }
        }
      } catch (e) {
        // Continue if JWT decode fails on non-standard tokens
      }
    }

    if (userStr) {
      const user = JSON.parse(userStr);
      if (user && user.role) {
        return { token, user };
      }
    }
  } catch (err) {
    console.error('Error reading auth state:', err);
  }
  return null;
}

/**
 * Returns the canonical dashboard route for a given user role.
 */
export function getDashboardRoute(role) {
  switch (role) {
    case 'Doctor':
      return '/dashboard/doctor';
    case 'HospitalAdmin':
    case 'FacilityAdmin':
      return '/dashboard/admin';
    case 'Receptionist':
      return '/dashboard/receptionist';
    case 'Nurse':
      return '/dashboard/nurse';
    case 'LabHead':
      return '/dashboard/lab';
    case 'Pharmacist':
      return '/dashboard/pharmacy';
    case 'Patient':
      return '/dashboard/patient';
    case 'Govt':
    case 'GovernmentOfficial':
      return '/dashboard/govt';
    case 'ASHA':
    case 'AshaWorker':
      return '/dashboard/asha';
    default:
      return null;
  }
}
