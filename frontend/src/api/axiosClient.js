import axios from 'axios';

export const normalizeApiBaseUrl = (value) => {
  const raw = (value || '').trim().replace(/\/+$/, '');

  if (!raw) return 'http://localhost:5000/api';
  if (raw === 'http://localhost' || raw === 'http://localhost/') {
    return 'http://localhost:5000/api';
  }
  if (raw === 'http://localhost/api') {
    return 'http://localhost:5000/api';
  }

  return raw;
};

const BASE_URL = normalizeApiBaseUrl(import.meta.env?.VITE_API_BASE_URL);

const createClient = () =>
  axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

/**
 * Central Axios instance — all API calls go through this.
 * Authentication relies on the HTTP-only cookie set by the backend.
 */
const apiClient = createClient();
const refreshClient = createClient();

// Response interceptor: handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        await refreshClient.post('/auth/refresh');
        return apiClient(originalRequest);
      } catch {
        window.dispatchEvent(new Event('auth:logout'));
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:logout'));
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
