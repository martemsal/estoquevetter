const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db, queryAll, queryOne, execute, uploadsDir } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Multer setup for direct file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  }
});
const upload = multer({ storage });

// Helper to save base64 camera image
function saveBase64Image(base64Data) {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    return null;
  }
  const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length < 3) return null;
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `prod_cam_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}

// GET /api/produtos - List all products with per-central stock & alert flags
router.get('/', authenticateToken, (req, res) => {
  const { central, categoria, alerta, busca } = req.query;

  let sql = `
    SELECT 
      p.*,
      COALESCE(c1.quantidade, 0) AS estoque_c1,
      COALESCE(c2.quantidade, 0) AS estoque_c2,
      COALESCE(c3.quantidade, 0) AS estoque_c3,
      (COALESCE(c1.quantidade, 0) + COALESCE(c2.quantidade, 0) + COALESCE(c3.quantidade, 0)) AS estoque_total
    FROM produtos p
    LEFT JOIN estoque_centrais c1 ON p.id = c1.produto_id AND c1.central = 'Central 1'
    LEFT JOIN estoque_centrais c2 ON p.id = c2.produto_id AND c2.central = 'Central 2'
    LEFT JOIN estoque_centrais c3 ON p.id = c3.produto_id AND c3.central = 'Central 3'
    WHERE 1=1
  `;

  const params = [];

  if (busca) {
    sql += ` AND (p.nome LIKE ? OR p.codigo_barras LIKE ? OR p.categoria LIKE ?)`;
    const term = `%${busca}%`;
    params.push(term, term, term);
  }

  if (categoria && categoria !== 'Todas') {
    sql += ` AND p.categoria = ?`;
    params.push(categoria);
  }

  sql += ` ORDER BY p.id DESC`;

  const rows = queryAll(sql, params);

  // Compute alert states
  const results = rows.map(prod => {
    const min = prod.estoque_minimo || 5;
    const c1Low = prod.estoque_c1 <= min;
    const c2Low = prod.estoque_c2 <= min;
    const c3Low = prod.estoque_c3 <= min;
    const totalLow = prod.estoque_total <= min;
    const hasAnyLow = c1Low || c2Low || c3Low || totalLow;

    let relevantStock = prod.estoque_total;
    let relevantLow = hasAnyLow;

    if (central === 'Central 1') {
      relevantStock = prod.estoque_c1;
      relevantLow = c1Low;
    } else if (central === 'Central 2') {
      relevantStock = prod.estoque_c2;
      relevantLow = c2Low;
    } else if (central === 'Central 3') {
      relevantStock = prod.estoque_c3;
      relevantLow = c3Low;
    }

    return {
      ...prod,
      alerta_c1: c1Low,
      alerta_c2: c2Low,
      alerta_c3: c3Low,
      alerta_total: totalLow,
      em_alerta: hasAnyLow,
      estoque_relevante: relevantStock,
      alerta_relevante: relevantLow
    };
  });

  // Filter by alert if requested
  const filtered = alerta === 'true'
    ? results.filter(r => r.alerta_relevante)
    : results;

  res.json(filtered);
});

// GET /api/produtos/:id - Get single product detail with history
router.get('/:id', authenticateToken, (req, res) => {
  const prod = queryOne(`
    SELECT 
      p.*,
      COALESCE(c1.quantidade, 0) AS estoque_c1,
      COALESCE(c2.quantidade, 0) AS estoque_c2,
      COALESCE(c3.quantidade, 0) AS estoque_c3,
      (COALESCE(c1.quantidade, 0) + COALESCE(c2.quantidade, 0) + COALESCE(c3.quantidade, 0)) AS estoque_total
    FROM produtos p
    LEFT JOIN estoque_centrais c1 ON p.id = c1.produto_id AND c1.central = 'Central 1'
    LEFT JOIN estoque_centrais c2 ON p.id = c2.produto_id AND c2.central = 'Central 2'
    LEFT JOIN estoque_centrais c3 ON p.id = c3.produto_id AND c3.central = 'Central 3'
    WHERE p.id = ?
  `, [req.params.id]);

  if (!prod) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }

  const historico = queryAll(`
    SELECT m.*, u.nome AS usuario_nome
    FROM movimentacoes m
    JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.produto_id = ?
    ORDER BY m.data_movimentacao DESC
    LIMIT 20
  `, [req.params.id]);

  res.json({
    ...prod,
    em_alerta: (prod.estoque_c1 <= prod.estoque_minimo || prod.estoque_c2 <= prod.estoque_minimo || prod.estoque_c3 <= prod.estoque_minimo),
    historico
  });
});

// POST /api/produtos - Create Product (Gerente and Administrador)
router.post('/', authenticateToken, requireRole(['Gerente', 'Administrador']), upload.single('foto'), (req, res) => {
  try {
    const {
      nome,
      codigo_barras,
      categoria,
      unidade_medida,
      estoque_minimo,
      quantidade_inicial,
      central_destino,
      foto_base64
    } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório' });
    }

    let foto_path = '';
    if (req.file) {
      foto_path = `/uploads/${req.file.filename}`;
    } else if (foto_base64) {
      foto_path = saveBase64Image(foto_base64) || '';
    }

    // Auto-generate barcode if blank
    const barcode = codigo_barras && codigo_barras.trim()
      ? codigo_barras.trim()
      : `VET-${Date.now().toString().slice(-8)}`;

    // Verify unique barcode
    const existing = queryOne('SELECT id FROM produtos WHERE codigo_barras = ?', [barcode]);
    if (existing) {
      return res.status(400).json({ error: 'Código de barras já cadastrado em outro produto' });
    }

    const minStock = Number(estoque_minimo) >= 0 ? parseInt(estoque_minimo, 10) : 5;
    const initialQty = Number(quantidade_inicial) > 0 ? parseInt(quantidade_inicial, 10) : 0;
    const destino = ['Central 1', 'Central 2', 'Central 3'].includes(central_destino)
      ? central_destino
      : 'Central 1';

    const insertProd = db.prepare(`
      INSERT INTO produtos (nome, codigo_barras, categoria, unidade_medida, foto_path, estoque_minimo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertProd.run(
      nome.trim(),
      barcode,
      categoria || 'Outros',
      unidade_medida || 'Unidade',
      foto_path,
      minStock
    );

    const newProdId = Number(result.lastInsertRowid);

    // Initialize stock across all 3 Centrais
    const insertStock = db.prepare(`
      INSERT INTO estoque_centrais (produto_id, central, quantidade)
      VALUES (?, ?, ?)
    `);

    insertStock.run(newProdId, 'Central 1', destino === 'Central 1' ? initialQty : 0);
    insertStock.run(newProdId, 'Central 2', destino === 'Central 2' ? initialQty : 0);
    insertStock.run(newProdId, 'Central 3', destino === 'Central 3' ? initialQty : 0);

    // Register initial inflow movement if quantity > 0
    if (initialQty > 0) {
      const insertMov = db.prepare(`
        INSERT INTO movimentacoes (produto_id, tipo, central, quantidade, usuario_id, observacao)
        VALUES (?, 'ENTRADA', ?, ?, ?, ?)
      `);
      insertMov.run(
        newProdId,
        destino,
        initialQty,
        req.user.id,
        `Entrada inicial de cadastro - ${destino}`
      );
    }

    res.status(201).json({
      message: 'Produto cadastrado com sucesso!',
      id: newProdId,
      codigo_barras: barcode
    });
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err);
    res.status(500).json({ error: 'Erro interno ao salvar produto: ' + err.message });
  }
});

// PUT /api/produtos/:id - Update Product (Gerente and Administrador)
router.put('/:id', authenticateToken, requireRole(['Gerente', 'Administrador']), upload.single('foto'), (req, res) => {
  try {
    const prodId = req.params.id;
    const prod = queryOne('SELECT * FROM produtos WHERE id = ?', [prodId]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const {
      nome,
      codigo_barras,
      categoria,
      unidade_medida,
      estoque_minimo,
      foto_base64
    } = req.body;

    let foto_path = prod.foto_path;
    if (req.file) {
      foto_path = `/uploads/${req.file.filename}`;
    } else if (foto_base64) {
      foto_path = saveBase64Image(foto_base64) || foto_path;
    }

    const barcode = codigo_barras && codigo_barras.trim() ? codigo_barras.trim() : prod.codigo_barras;

    // Check duplicate barcode
    if (barcode !== prod.codigo_barras) {
      const existing = queryOne('SELECT id FROM produtos WHERE codigo_barras = ? AND id != ?', [barcode, prodId]);
      if (existing) {
        return res.status(400).json({ error: 'Código de barras já está em uso por outro produto' });
      }
    }

    const minStock = Number(estoque_minimo) >= 0 ? parseInt(estoque_minimo, 10) : prod.estoque_minimo;

    const updateStmt = db.prepare(`
      UPDATE produtos
      SET nome = ?, codigo_barras = ?, categoria = ?, unidade_medida = ?, foto_path = ?, estoque_minimo = ?
      WHERE id = ?
    `);

    updateStmt.run(
      nome ? nome.trim() : prod.nome,
      barcode,
      categoria || prod.categoria,
      unidade_medida || prod.unidade_medida,
      foto_path,
      minStock,
      prodId
    );

    res.json({ message: 'Produto atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE /api/produtos/:id - Delete Product (Administrador only)
router.delete('/:id', authenticateToken, requireRole(['Administrador']), (req, res) => {
  try {
    const prodId = req.params.id;
    const prod = queryOne('SELECT * FROM produtos WHERE id = ?', [prodId]);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Cascade handles estoque_centrais, clean up movimentacoes
    execute('DELETE FROM movimentacoes WHERE produto_id = ?', [prodId]);
    execute('DELETE FROM estoque_centrais WHERE produto_id = ?', [prodId]);
    execute('DELETE FROM produtos WHERE id = ?', [prodId]);

    res.json({ message: 'Produto excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

module.exports = router;
