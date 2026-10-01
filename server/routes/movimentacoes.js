const express = require('express');
const router = express.Router();
const { db, queryAll, queryOne } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/movimentacoes/saida - Fast Tablet Outflow Dispatch
router.post('/saida', authenticateToken, (req, res) => {
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

    const prod = queryOne('SELECT * FROM produtos WHERE id = ?', [produto_id]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Check stock in the selected central
    const stockRow = queryOne(
      'SELECT quantidade FROM estoque_centrais WHERE produto_id = ? AND central = ?',
      [produto_id, central]
    );
    const currentStock = stockRow ? stockRow.quantidade : 0;

    if (qtd > currentStock) {
      return res.status(400).json({
        error: `Estoque insuficiente na ${central}! Saldo disponível: ${currentStock} ${prod.unidade_medida}(s), solicitado: ${qtd}.`
      });
    }

    // Deduct stock
    const updateStock = db.prepare(`
      UPDATE estoque_centrais
      SET quantidade = quantidade - ?
      WHERE produto_id = ? AND central = ?
    `);
    updateStock.run(qtd, produto_id, central);

    // Register movement with logged-in user ID
    const insertMov = db.prepare(`
      INSERT INTO movimentacoes (produto_id, tipo, central, quantidade, usuario_id, observacao)
      VALUES (?, 'SAIDA', ?, ?, ?, ?)
    `);
    insertMov.run(
      produto_id,
      central,
      qtd,
      req.user.id,
      observacao ? observacao.trim() : `Saída rápida de estoque - ${central}`
    );

    const novoSaldo = currentStock - qtd;
    const isAlerta = novoSaldo <= (prod.estoque_minimo || 5);

    res.json({
      success: true,
      message: `Saída de ${qtd} ${prod.unidade_medida}(s) registrada com sucesso!`,
      produto_nome: prod.nome,
      central,
      quantidade: qtd,
      novo_saldo: novoSaldo,
      estoque_minimo: prod.estoque_minimo,
      is_alerta_estoque: isAlerta,
      responsavel: req.user.nome
    });
  } catch (err) {
    console.error('Erro ao registrar saída:', err);
    res.status(500).json({ error: 'Erro interno ao processar saída: ' + err.message });
  }
});

// POST /api/movimentacoes/entrada - Inflow / Reposição de Estoque
router.post('/entrada', authenticateToken, (req, res) => {
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

    const prod = queryOne('SELECT * FROM produtos WHERE id = ?', [produto_id]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Ensure stock row exists or update
    const stockRow = queryOne(
      'SELECT id, quantidade FROM estoque_centrais WHERE produto_id = ? AND central = ?',
      [produto_id, central]
    );

    if (stockRow) {
      db.prepare(`
        UPDATE estoque_centrais
        SET quantidade = quantidade + ?
        WHERE produto_id = ? AND central = ?
      `).run(qtd, produto_id, central);
    } else {
      db.prepare(`
        INSERT INTO estoque_centrais (produto_id, central, quantidade)
        VALUES (?, ?, ?)
      `).run(produto_id, central, qtd);
    }

    // Register movement
    const insertMov = db.prepare(`
      INSERT INTO movimentacoes (produto_id, tipo, central, quantidade, usuario_id, observacao)
      VALUES (?, 'ENTRADA', ?, ?, ?, ?)
    `);
    insertMov.run(
      produto_id,
      central,
      qtd,
      req.user.id,
      observacao ? observacao.trim() : `Reposição / Entrada de estoque - ${central}`
    );

    const updatedStock = queryOne(
      'SELECT quantidade FROM estoque_centrais WHERE produto_id = ? AND central = ?',
      [produto_id, central]
    );

    res.json({
      success: true,
      message: `Entrada de ${qtd} ${prod.unidade_medida}(s) registrada com sucesso!`,
      produto_nome: prod.nome,
      central,
      novo_saldo: updatedStock ? updatedStock.quantidade : qtd,
      responsavel: req.user.nome
    });
  } catch (err) {
    console.error('Erro ao registrar entrada:', err);
    res.status(500).json({ error: 'Erro interno ao processar entrada: ' + err.message });
  }
});

// GET /api/movimentacoes - Audit history list
router.get('/', authenticateToken, (req, res) => {
  const { tipo, central, produto_id, limit = 50 } = req.query;

  let sql = `
    SELECT 
      m.*,
      p.nome AS produto_nome,
      p.codigo_barras,
      p.categoria,
      p.unidade_medida,
      u.nome AS usuario_nome,
      u.perfil AS usuario_perfil
    FROM movimentacoes m
    JOIN produtos p ON m.produto_id = p.id
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (tipo) {
    sql += ` AND m.tipo = ?`;
    params.push(tipo);
  }

  if (central && central !== 'Todas') {
    sql += ` AND m.central = ?`;
    params.push(central);
  }

  if (produto_id) {
    sql += ` AND m.produto_id = ?`;
    params.push(produto_id);
  }

  sql += ` ORDER BY m.data_movimentacao DESC LIMIT ?`;
  params.push(parseInt(limit, 10));

  const list = queryAll(sql, params);
  res.json(list);
});

module.exports = router;
