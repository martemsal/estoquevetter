const BASE_URL = '/api';

export function getStoredToken() {
  try {
    const t = localStorage.getItem('vetter_token');
    if (!t || t === '[object Object]' || t === 'undefined' || t === 'null') {
      localStorage.removeItem('vetter_token');
      return null;
    }
    return t;
  } catch (_) {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token && typeof token === 'string' && token !== '[object Object]') {
      localStorage.setItem('vetter_token', token);
    } else {
      localStorage.removeItem('vetter_token');
    }
  } catch (_) {}
}

export async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    body = JSON.stringify(body);
  }

  // If not FormData, default to application/json
  if (!(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body,
  });

  let data = {};
  let rawText = '';
  try {
    rawText = await response.text();
    data = JSON.parse(rawText);
  } catch (_) {
    // Response may not be JSON
  }

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('A imagem capturada é muito pesada para envio. Foi aplicada uma compressão automática para as próximas.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(data.error || data.message || 'Sessão expirada ou acesso restrito. Faça login novamente.');
    }
    const cleanRaw = rawText && rawText.length < 250 && !rawText.includes('<html') ? rawText : null;
    const errorMsg = data.error || data.message || cleanRaw || `Erro no servidor (código ${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, senha) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  }),
  quickLogin: (id) => apiRequest('/auth/quick-login', {
    method: 'POST',
    body: JSON.stringify({ id }),
  }),
  getQuickUsers: () => apiRequest('/auth/quick-users'),
  getMe: () => apiRequest('/auth/me'),

  // Produtos
  getProdutos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/produtos?${qs}`);
  },
  getProduto: (id) => apiRequest(`/produtos/${id}`),
  createProduto: (payload) => apiRequest('/produtos', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  }),
  updateProduto: (id, payload) => apiRequest(`/produtos/${id}`, {
    method: 'PUT',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  }),
  deleteProduto: (id) => apiRequest(`/produtos/${id}`, {
    method: 'DELETE',
  }),

  // Movimentacoes
  registrarSaida: (payload) => apiRequest('/movimentacoes/saida', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  registrarEntrada: (payload) => apiRequest('/movimentacoes/entrada', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getMovimentacoes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/movimentacoes?${qs}`);
  },

  // Dashboard
  getDashboard: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/dashboard?${qs}`);
  },

  // Usuarios (RBAC)
  getUsuarios: () => apiRequest('/usuarios'),
  createUsuario: (payload) => apiRequest('/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateUsuario: (id, payload) => apiRequest(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteUsuario: (id) => apiRequest(`/usuarios/${id}`, {
    method: 'DELETE',
  }),
};
