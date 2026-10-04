import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Briefcase, 
  User, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  Lock, 
  Mail, 
  CheckCircle,
  Building 
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function UsersPage({ showToast }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form states
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('Operador');
  const [centralPadrao, setCentralPadrao] = useState('Central Piçarras');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsuarios();
      setUsers(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao carregar usuários' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setNome('');
    setEmail('');
    setSenha('');
    setPerfil('Operador');
    setCentralPadrao('Central Piçarras');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setNome(u.nome);
    setEmail(u.email);
    setSenha('');
    setPerfil(u.perfil);
    setCentralPadrao(u.central_padrao || 'Central Piçarras');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      setFormError('Nome e E-mail são obrigatórios.');
      return;
    }
    if (!editingUser && !senha.trim()) {
      setFormError('Senha é obrigatória para novo usuário.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        nome: nome.trim(),
        email: email.trim(),
        senha: senha.trim() || undefined,
        perfil,
        central_padrao: perfil === 'Administrador' ? 'Todas' : centralPadrao
      };

      if (editingUser) {
        await api.updateUsuario(editingUser.id, payload);
        showToast({ type: 'success', message: 'Usuário atualizado com sucesso!' });
      } else {
        await api.createUsuario(payload);
        showToast({ type: 'success', message: 'Novo usuário criado com sucesso!' });
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, userName) => {
    if (id === currentUser.id) {
      showToast({ type: 'error', message: 'Você não pode excluir sua própria conta logada.' });
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) return;

    try {
      await api.deleteUsuario(id);
      showToast({ type: 'success', message: 'Usuário excluído com sucesso!' });
      fetchUsers();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao excluir usuário' });
    }
  };

  const getRoleIcon = (p) => {
    switch (p) {
      case 'Administrador': return <Shield className="w-4 h-4 text-amber-400" />;
      case 'Gerente': return <Briefcase className="w-4 h-4 text-sky-400" />;
      default: return <User className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Gerenciamento de Usuários (RBAC)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Controle de perfis de acesso: Operador, Gerente e Administrador
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="py-3 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <UserPlus className="w-5 h-5" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* RBAC Reference Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
          <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm mb-2">
            <User className="w-4 h-4" />
            <span>Perfil: Operador</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li>Registrar saídas (baixas rápidas)</li>
            <li>Registrar entradas de reposição</li>
            <li>Consultar produtos e estoque</li>
            <li className="text-slate-500">Sem permissão para alterar produtos</li>
          </ul>
        </div>

        <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30">
          <div className="flex items-center gap-2 font-bold text-sky-400 text-sm mb-2">
            <Briefcase className="w-4 h-4" />
            <span>Perfil: Gerente</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li>Cadastrar e editar produtos</li>
            <li>Configurar estoque mínimo de alerta</li>
            <li>Registrar entradas e saídas</li>
            <li>Visualizar relatórios da sua central</li>
          </ul>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
          <div className="flex items-center gap-2 font-bold text-amber-400 text-sm mb-2">
            <Shield className="w-4 h-4" />
            <span>Perfil: Administrador</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
            <li>Acesso irrestrito a todas as 3 centrais</li>
            <li>Gerenciar contas de usuários (RBAC)</li>
            <li>Exclusão de produtos e auditoria geral</li>
            <li>Dashboard consolidado completo</li>
          </ul>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-4">Nome do Usuário</th>
                <th className="py-4 px-4">E-mail</th>
                <th className="py-4 px-3">Perfil (RBAC)</th>
                <th className="py-4 px-3">Central Vinculada</th>
                <th className="py-4 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-500">
                    Carregando usuários...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        {u.nome}
                        {u.id === currentUser.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                            Você
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        u.perfil === 'Administrador'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : u.perfil === 'Gerente'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {getRoleIcon(u.perfil)}
                        <span>{u.perfil}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-xs font-semibold text-slate-300">
                        {u.central_padrao}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Editar Usuário"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDelete(u.id, u.nome)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Lucas Mendes"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lucas@estoque.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {editingUser ? 'Alterar Senha (deixe em branco para manter)' : 'Senha de Acesso'}
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Perfil de Acesso
                  </label>
                  <select
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="Operador">Operador</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Central Padrão
                  </label>
                  <select
                    value={perfil === 'Administrador' ? 'Todas' : centralPadrao}
                    onChange={(e) => setCentralPadrao(e.target.value)}
                    disabled={perfil === 'Administrador'}
                    className="w-full px-3 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  >
                    <option value="Todas">Todas (Admin)</option>
                    <option value="Central Piçarras">Central Piçarras</option>
                    <option value="Central Penha">Central Penha</option>
                    <option value="Central Armação">Central Armação</option>
                    <option value="Rentter">Rentter</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-2xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 active:scale-95 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingUser ? 'Salvar Alterações' : 'Criar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
