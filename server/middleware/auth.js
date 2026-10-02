const jwt = require('jsonwebtoken');
const dataService = require('../dataService');

const JWT_SECRET = process.env.JWT_SECRET || 'estoque-vetter-secret-key-2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
    }

    try {
      const user = await dataService.getUserById(decoded.id);
      if (!user) {
        // Fallback para as informações assinadas no próprio token se o lookup falhar
        if (decoded.id && decoded.perfil) {
          req.user = {
            id: decoded.id,
            perfil: decoded.perfil,
            central_padrao: decoded.central || 'Todas',
            nome: decoded.nome || 'Usuário'
          };
          return next();
        }
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      req.user = user;
      next();
    } catch (e) {
      if (decoded.id && decoded.perfil) {
        req.user = {
          id: decoded.id,
          perfil: decoded.perfil,
          central_padrao: decoded.central || 'Todas',
          nome: decoded.nome || 'Usuário'
        };
        return next();
      }
      return res.status(500).json({ error: 'Erro ao validar autenticação: ' + e.message });
    }
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      return res.status(403).json({
        error: `Acesso negado. Ação permitida apenas para perfis: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole
};
