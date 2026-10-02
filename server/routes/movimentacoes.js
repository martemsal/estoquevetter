const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dataService = require('../dataService');

// POST /api/movimentacoes/saida - Fast Tablet Outflow Dispatch
router.post('/saida', authenticateToken, async (req, res) => {
  try {
    const { produto_id, central, quantidade, observacao } = req.body;

    if (!produto_id) {
      return res.status(400).json({ error: 'Produto não informado' });
    }

    if (!['Central 1', 'Central 2', 'Central 3'].includes(central)) {
      return res.status(400).json({ error: 'Selecione uma Central de Vendas válida (Central 1, 2 ou 3)' });
    }

    const qtd = parseInt(quantidade, 10);
    if (isNaN(qtd) || qtd <= 0) {
      return res.status(400).json({ error: 'Quantidade de saída deve ser maior que zero' });
    }

    const result = await dataService.registrarSaida({
      produto_id,
      central,
      quantidade: qtd,
      observacao
    }, req.user);

    res.json(result);
  } catch (err) {
    console.error('Erro ao registrar saída:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao processar saída' });
  }
});

// POST /api/movimentacoes/entrada - Inflow / Reposição de Estoque
router.post('/entrada', authenticateToken, async (req, res) => {
  try {
    const { produto_id, central, quantidade, observacao } = req.body;

    if (!produto_id) {
      return res.status(400).json({ error: 'Produto não informado' });
    }

    if (!['Central 1', 'Central 2', 'Central 3'].includes(central)) {
      return res.status(400).json({ error: 'Selecione uma Central de Vendas válida' });
    }

    const qtd = parseInt(quantidade, 10);
    if (isNaN(qtd) || qtd <= 0) {
      return res.status(400).json({ error: 'Quantidade de entrada deve ser maior que zero' });
    }

    const result = await dataService.registrarEntrada({
      produto_id,
      central,
      quantidade: qtd,
      observacao
    }, req.user);

    res.json(result);
  } catch (err) {
    console.error('Erro ao registrar entrada:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao processar entrada' });
  }
});

// GET /api/movimentacoes - Audit history list
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tipo, central, produto_id, limit = 50 } = req.query;
    const list = await dataService.getMovimentacoes({
      tipo,
      central,
      produto_id,
      limit: parseInt(limit, 10)
    });
    res.json(list);
  } catch (err) {
    console.error('Erro ao listar movimentações:', err.message);
    res.status(500).json({ error: 'Erro ao carregar histórico: ' + err.message });
  }
});

module.exports = router;
