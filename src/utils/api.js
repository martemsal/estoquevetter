const BASE_URL = '/api';

export function getStoredToken() {
  return localStorage.getItem('vetter_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('vetter_token', token);
  } else {
    localStorage.removeItem('vetter_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    // Response may not be JSON
  }

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('A imagem capturada é muito pesada para envio. Foi aplicada uma compressão automática para as próximas.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(data.error || 'Acesso restrito. Seu perfil atual não possui permissão para esta ação.');
    }
    throw new Error(data.error || `Erro no servidor (código ${response.status})`);
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
  createProduto: (formData) => apiRequest('/produtos', {
    method: 'POST',
    body: formData,
  }),
  updateProduto: (id, formData) => apiRequest(`/produtos/${id}`, {
    method: 'PUT',
    body: formData,
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
