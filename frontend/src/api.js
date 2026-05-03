const BASE = import.meta.env.PROD ? '/api' : 'http://localhost:5004/api';

function getToken() {
  return localStorage.getItem('tt_token');
}

async function req(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.clear();
    window.location.reload();
    return;
  }
  if (res.status === 402) {
    window.dispatchEvent(new CustomEvent('trial-expired'));
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (email, password) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (data) =>
    req('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  googleAuth: (credential, company_name) =>
    req('/auth/google', { method: 'POST', body: JSON.stringify({ credential, company_name }) }),
  me: () => req('/auth/me'),

  getCompanies: () => req('/admin/companies'),
  updateCompany: (id, data) => req(`/admin/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getUsers: () => req('/users'),
  createUser: data => req('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => req(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: id => req(`/users/${id}`, { method: 'DELETE' }),

  getTasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/tasks${q ? '?' + q : ''}`);
  },
  createTask: data => req('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => req(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: id => req(`/tasks/${id}`, { method: 'DELETE' }),

  getDashboard: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/dashboard${q ? '?' + q : ''}`);
  },
  getSections: () => req('/sections'),
  getSectionsFull: () => req('/sections?full=true'),
  createSection: data => req('/sections', { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (id, data) => req(`/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSection: id => req(`/sections/${id}`, { method: 'DELETE' }),

  getStakeholders: () => req('/stakeholders'),
  getPeopleFull: () => req('/stakeholders?full=true'),
  createPerson: data => req('/stakeholders', { method: 'POST', body: JSON.stringify(data) }),
  updatePerson: (id, data) => req(`/stakeholders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePerson: id => req(`/stakeholders/${id}`, { method: 'DELETE' }),
  getWeeklyScores: () => req('/weekly-scores'),
  saveWeeklyScore: data => req('/weekly-scores', { method: 'POST', body: JSON.stringify(data) }),

  createPaymentOrder: (plan) => req('/payment/create-order', { method: 'POST', body: JSON.stringify({ plan }) }),
  verifyPayment: (data) => req('/payment/verify', { method: 'POST', body: JSON.stringify(data) }),

  getNotificationStatus: () => req('/notifications/status'),
  sendOverdueReminders: (stakeholderIds = null) => req('/notifications/send-overdue', { method: 'POST', body: JSON.stringify({ stakeholderIds }) }),
  testWhatsApp: (phone) => req('/notifications/test', { method: 'POST', body: JSON.stringify({ phone }) }),

  getSettings: () => req('/settings'),
  saveSettings: (data) => req('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  getComments: (taskId) => req(`/tasks/${taskId}/comments`),
  addComment: (taskId, comment) => req(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ comment }) }),
  deleteComment: (taskId, commentId) => req(`/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' }),

  getSubtasks: (taskId) => req(`/tasks/${taskId}/subtasks`),
  addSubtask: (taskId, description) => req(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ description }) }),
  toggleSubtask: (taskId, subtaskId, is_done) => req(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify({ is_done }) }),
  deleteSubtask: (taskId, subtaskId) => req(`/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' }),
};
