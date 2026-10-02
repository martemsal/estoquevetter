const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const dataService = require('../dataService');

// Normal Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await dataService.getUserByEmail(email);
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
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro no servidor ao processar autenticação' });
  }
});

// Quick Demo Login for Tablet Switcher
router.post('/quick-login', async (req, res) => {
  try {
    const { id } = req.body;
    const user = await dataService.getUserById(id);
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
  } catch (err) {
    console.error('Erro no quick-login:', err);
    res.status(500).json({ error: 'Erro ao autenticar usuário rápido' });
  }
});

// List demo accounts for easy tablet access
router.get('/quick-users', async (req, res) => {
  try {
    const users = await dataService.getQuickUsers();
    res.json(users);
  } catch (err) {
    console.error('Erro ao listar usuários rápidos:', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
