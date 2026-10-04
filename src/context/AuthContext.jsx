import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCentral, setActiveCentral] = useState('Todas');
  const [alertCount, setAlertCount] = useState(0);

  // Check login status on mount
  useEffect(() => {
    async function initAuth() {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getMe();
        setUser(data.user);
        if (data.user.central_padrao && data.user.central_padrao !== 'Todas') {
          setActiveCentral(data.user.central_padrao);
        }
      } catch (err) {
        console.warn('Sessão expirada:', err);
        setStoredToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  // Refresh alert count
  const refreshAlertCount = async () => {
    try {
      const data = await api.getDashboard({ periodo: 'hoje' });
      if (data?.kpis?.itens_em_alerta !== undefined) {
        setAlertCount(data.kpis.itens_em_alerta);
      }
    } catch {
      // ignore silently
    }
  };

  useEffect(() => {
    if (user) {
      refreshAlertCount();
      const interval = setInterval(refreshAlertCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const login = async (email, senha) => {
    const data = await api.login(email, senha);
    setStoredToken(data.token);
    setUser(data.user);
    if (data.user.central_padrao && data.user.central_padrao !== 'Todas') {
      setActiveCentral(data.user.central_padrao);
    }
    refreshAlertCount();
    return data;
  };

  const quickLogin = async (id) => {
    const data = await api.quickLogin(id);
    setStoredToken(data.token);
    setUser(data.user);
    if (data.user.central_padrao && data.user.central_padrao !== 'Todas') {
      setActiveCentral(data.user.central_padrao);
    } else {
      setActiveCentral('Todas');
    }
    refreshAlertCount();
    return data;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setActiveCentral('Todas');
  };

  const isOperador = user?.perfil === 'Operador';
  const isGerente = user?.perfil === 'Gerente';
  const isAdmin = user?.perfil === 'Administrador';

  // Role permissions
  const canEditProducts = !!user; // Todos os operadores, gerentes e administradores podem cadastrar/editar
  const canDeleteProducts = !!user; // Opção de excluir itens cadastrados disponível para todos os perfis autorizados
  const canManageUsers = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        quickLogin,
        logout,
        activeCentral,
        setActiveCentral,
        alertCount,
        refreshAlertCount,
        isOperador,
        isGerente,
        isAdmin,
        canEditProducts,
        canDeleteProducts,
        canManageUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
