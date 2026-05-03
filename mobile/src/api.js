import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://task-tracker-backend-production-94c1.up.railway.app/api';

async function request(path, opts = {}, retries = 2) {
  const token = await AsyncStorage.getItem('tt_token');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      ...opts,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (retries > 0 && (err.name === 'AbortError' || err.message === 'Network request failed')) {
      await new Promise(r => setTimeout(r, 1500));
      return request(path, opts, retries - 1);
    }
    if (err.name === 'AbortError') throw new Error('Request timed out. Please check your connection.');
    throw err;
  }
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
const del = (path) => request(path, { method: 'DELETE' });

export const api = {
  login: (email, password) => post('/auth/login', { email, password }),
  signup: (body) => post('/auth/signup', body),
  googleMobileAuth: (access_token, company_name) => post('/auth/google-mobile', { access_token, company_name }),

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

  getUsers: () => get('/users').then(r => Array.isArray(r) ? r : []),
  createUser: (body) => post('/users', body),
  updateUser: (id, body) => put(`/users/${id}`, body),
  deleteUser: (id) => del(`/users/${id}`),

  getSettings: () => get('/settings'),
  saveSettings: (body) => put('/settings', body),

  getComments: (taskId) => get(`/tasks/${taskId}/comments`),
  addComment: (taskId, comment) => post(`/tasks/${taskId}/comments`, { comment }),
  deleteComment: (taskId, commentId) => del(`/tasks/${taskId}/comments/${commentId}`),

  getSubtasks: (taskId) => get(`/tasks/${taskId}/subtasks`),
  addSubtask: (taskId, description) => post(`/tasks/${taskId}/subtasks`, { description }),
  toggleSubtask: (taskId, subtaskId, is_done) => request(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify({ is_done }) }),
  deleteSubtask: (taskId, subtaskId) => del(`/tasks/${taskId}/subtasks/${subtaskId}`),
};
