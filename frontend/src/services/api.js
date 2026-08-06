// api.js - Single shared axios instance used by every page
// Automatically attaches the JWT token to every request

import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE });

// Attach token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If token expires, log the user out automatically
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Generic file -> text helper (multipart/form-data)
api.uploadFile = async (file) => {
  const token = localStorage.getItem('token');
  const fd    = new FormData();
  fd.append('file', file);
  const res = await axios.post(`${BASE}/upload`, fd, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// Resume import — uploads a PDF/DOCX/TXT resume, and the backend parses
// it into structured fields and saves it as a new resume record.
// Returns { resume, source, warnings }.
api.importResume = async (file) => {
  const token = localStorage.getItem('token');
  const fd    = new FormData();
  fd.append('file', file);
  const res = await axios.post(`${BASE}/resumes/import`, fd, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export default api;
