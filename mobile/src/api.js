import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://task-tracker-saas.onrender.com/api';

async function request(path, opts = {}) {
  const token = await AsyncStorage.getItem('tt_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
const del = (path) => request(path, { method: 'DELETE' });

export const api = {
  login: (email, password) => post('/auth/login', { email, password }),
  signup: (body) => post('/auth/signup', body),

  getDashboard: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/dashboard${q ? '?' + q : ''}`);
  },
  getWeeklyScores: () => get('/weekly-scores'),
  saveWeeklyScore: (body) => post('/weekly-scores', body),

  getTasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/tasks${q ? '?' + q : ''}`);
  },
  createTask: (body) => post('/tasks', body),
  updateTask: (id, body) => put(`/tasks/${id}`, body),
  deleteTask: (id) => del(`/tasks/${id}`),

  getSections: () => get('/sections').then(r => Array.isArray(r) ? r : []),
  getSectionsFull: () => get('/sections?full=true').then(r => Array.isArray(r) ? r : []),
  createSection: (body) => post('/sections', body),
  updateSection: (id, body) => put(`/sections/${id}`, body),
  deleteSection: (id) => del(`/sections/${id}`),

  getStakeholders: () => get('/stakeholders').then(r => Array.isArray(r) ? r : []),
  getPeopleFull: () => get('/stakeholders?full=true').then(r => Array.isArray(r) ? r : []),
  createPerson: (body) => post('/stakeholders', body),
  updatePerson: (id, body) => put(`/stakeholders/${id}`, body),
  deletePerson: (id) => del(`/stakeholders/${id}`),

  sendOverdueReminders: () => post('/notifications/send-overdue', {}),
  getNotificationStatus: () => get('/notifications/status'),
};
