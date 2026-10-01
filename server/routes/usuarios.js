const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, queryAll, queryOne, execute } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All endpoints in this router are restricted to Administrador
router.use(authenticateToken);
router.use(requireRole(['Administrador']));

// GET /api/usuarios - List users
router.get('/', (req, res) => {
  const users = queryAll('SELECT id, nome, email, perfil, central_padrao, criado_em FROM usuarios ORDER BY id ASC');
  res.json(users);
});

// POST /api/usuarios - Create user
router.post('/', (req, res) => {
  try {
    const { nome, email, senha, perfil, central_padrao } = req.body;

    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({ error: 'Nome, e-mail, senha e perfil são obrigatórios' });
    }

    if (!['Operador', 'Gerente', 'Administrador'].includes(perfil)) {
      return res.status(400).json({ error: 'Perfil inválido. Deve ser Operador, Gerente ou Administrador' });
    }

    const existing = queryOne('SELECT id FROM usuarios WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(senha, salt);
    const central = central_padrao || (perfil === 'Administrador' ? 'Todas' : 'Central 1');

    const insert = db.prepare(`
      INSERT INTO usuarios (nome, email, senha, perfil, central_padrao)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      nome.trim(),
      email.trim().toLowerCase(),
      hash,
      perfil,
      central
    );

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      id: Number(result.lastInsertRowid)
    });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// PUT /api/usuarios/:id - Update user
router.put('/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const user = queryOne('SELECT * FROM usuarios WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { nome, email, senha, perfil, central_padrao } = req.body;

    if (email && email.trim().toLowerCase() !== user.email) {
      const existing = queryOne('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email.trim().toLowerCase(), userId]);
      if (existing) {
        return res.status(400).json({ error: 'E-mail já está em uso' });
      }
    }

    let query = `
      UPDATE usuarios 
      SET nome = ?, email = ?, perfil = ?, central_padrao = ?
    `;
    const params = [
      nome ? nome.trim() : user.nome,
      email ? email.trim().toLowerCase() : user.email,
      perfil || user.perfil,
      central_padrao || user.central_padrao
    ];

    if (senha && senha.trim()) {
      query += `, senha = ?`;
      const salt = bcrypt.genSaltSync(10);
      params.push(bcrypt.hashSync(senha.trim(), salt));
    }

    query += ` WHERE id = ?`;
    params.push(userId);

    db.prepare(query).run(...params);

    res.json({ message: 'Usuário atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/usuarios/:id - Delete user
router.delete('/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta logada' });
    }

    // Check if user has movements registered
    const movementsCount = queryOne('SELECT COUNT(*) as count FROM movimentacoes WHERE usuario_id = ?', [userId])?.count || 0;
    if (movementsCount > 0) {
      return res.status(400).json({
        error: `Não é possível excluir este usuário pois ele possui ${movementsCount} movimentação(ões) vinculada(s) no histórico de auditoria.`
      });
    }

    execute('DELETE FROM usuarios WHERE id = ?', [userId]);
    res.json({ message: 'Usuário excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
