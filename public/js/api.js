const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

async function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    let message = data && data.message;
    if (!message) {
      message = response.statusText || `HTTP ${response.status}`;
    }
    if (response.status === 403 && message.includes('登录已过期')) {
      logout();
    }
    throw new Error(message);
  }

  return data;
}

// 认证相关API
const authAPI = {
  register: (username, password) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),

  login: (username, password) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),

  getMe: () => apiRequest('/auth/me')
};

// 用户管理API
const userAPI = {
  getAll: () => apiRequest('/users'),
  getPending: () => apiRequest('/users/pending'),
  approve: (userId, role) => apiRequest(`/users/approve/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  }),
  updateRole: (userId, role) => apiRequest(`/users/role/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  }),
  updateBalance: (userId, amount, operation) => apiRequest(`/users/balance/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ amount, operation })
  })
};

// 商品API
const productAPI = {
  getListed: () => apiRequest('/products/listed'),
  getAll: () => apiRequest('/products'),
  create: (data) => apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiRequest(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiRequest(`/products/${id}`, {
    method: 'DELETE'
  }),
  purchase: (productId) => apiRequest(`/products/purchase/${productId}`, {
    method: 'POST'
  }),
  getPurchaseHistory: () => apiRequest('/products/purchases/history')
};
