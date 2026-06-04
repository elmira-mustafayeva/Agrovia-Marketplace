import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const http = axios.create({
  baseURL,
  withCredentials: true
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('agrovia_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agrovia_token');
      localStorage.removeItem('agrovia_user');
    }
    return Promise.reject(error);
  }
);