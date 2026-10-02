const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const dataService = require('../dataService');

// All endpoints in this router are restricted to Administrador
router.use(authenticateToken);
router.use(requireRole(['Administrador']));

// GET /api/usuarios - List users
router.get('/', async (req, res) => {
  try {
    const users = await dataService.getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ error: 'Erro ao listar usuários: ' + err.message });
  }
});

// POST /api/usuarios - Create user
router.post('/', async (req, res) => {
  try {
    const { nome, email, senha, perfil, central_padrao } = req.body;

    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({ error: 'Nome, e-mail, senha e perfil são obrigatórios' });
    }

    if (!['Operador', 'Gerente', 'Administrador'].includes(perfil)) {
      return res.status(400).json({ error: 'Perfil inválido. Deve ser Operador, Gerente ou Administrador' });
    }

    const central = central_padrao || (perfil === 'Administrador' ? 'Todas' : 'Central 1');

    const created = await dataService.createUsuario({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senha,
      perfil,
      central_padrao: central
    });

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      id: created.id
    });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao cadastrar usuário' });
  }
});

// PUT /api/usuarios/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { nome, email, senha, perfil, central_padrao } = req.body;

    const updated = await dataService.updateUsuario(req.params.id, {
      nome,
      email: email ? email.trim().toLowerCase() : undefined,
      senha: senha && senha.trim() ? senha.trim() : undefined,
      perfil,
      central_padrao
    });

    res.json({
      message: 'Usuário atualizado com sucesso!',
      usuario: updated
    });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/usuarios/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário logado' });
    }

    await dataService.deleteUsuario(req.params.id);
    res.json({ message: 'Usuário excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err.message);
    res.status(500).json({ error: 'Erro ao excluir usuário: ' + err.message });
  }
});

module.exports = router;
