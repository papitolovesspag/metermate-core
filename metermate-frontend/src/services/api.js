import axios from 'axios';

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
const resolvedApiBaseUrl = import.meta.env.DEV ? (configuredApiBaseUrl || 'http://localhost:5000/api') : configuredApiBaseUrl;

const api = axios.create({
  baseURL: resolvedApiBaseUrl || undefined
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getApiErrorMessage = (error) => {
  if (!import.meta.env.DEV && !configuredApiBaseUrl) {
    return 'Frontend is missing VITE_API_BASE_URL. Set it in your Render frontend environment variables.';
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.response?.status === 404) {
    return 'Endpoint not found. Verify backend URL and route paths.';
  }

  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return `Unable to reach server (${resolvedApiBaseUrl || 'no API URL configured'}).`;
  }

  return 'Something went wrong. Please try again.';
};

export default api;
