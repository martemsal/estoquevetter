const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dataService = require('../dataService');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { periodo = '7dias', central } = req.query;
    const dashboard = await dataService.getDashboardData({ periodo, central });
    res.json(dashboard);
  } catch (err) {
    console.error('Erro no dashboard:', err.message);
    res.status(500).json({ error: 'Erro ao gerar dados do dashboard: ' + err.message });
  }
});

module.exports = router;
