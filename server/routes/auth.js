const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, queryAll } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Normal Login
router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = queryOne('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const validPassword = bcrypt.compareSync(senha, user.senha);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, perfil: user.perfil, central: user.central_padrao },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      central_padrao: user.central_padrao
    }
  });
});

// Quick Demo Login for Tablet Switcher
router.post('/quick-login', (req, res) => {
  const { id } = req.body;
  const user = queryOne('SELECT * FROM usuarios WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const token = jwt.sign(
    { id: user.id, perfil: user.perfil, central: user.central_padrao },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      central_padrao: user.central_padrao
    }
  });
});

// List demo accounts for easy tablet access
router.get('/quick-users', (req, res) => {
  const users = queryAll('SELECT id, nome, email, perfil, central_padrao FROM usuarios ORDER BY id ASC');
  res.json(users);
});

// Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
