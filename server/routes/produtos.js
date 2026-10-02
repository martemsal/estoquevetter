const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { uploadsDir } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const dataService = require('../dataService');

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

// Helper to save base64 camera image (used in local SQLite fallback)
function saveBase64Image(base64Data) {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    return null;
  }
  const isVercel = Boolean(process.env.VERCEL);
  if (isVercel) {
    return base64Data;
  }
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length < 3) return base64Data;
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `prod_cam_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('Aviso: gravando imagem como data URI:', err.message);
    return base64Data;
  }
}

// GET /api/produtos - List all products with per-central stock & alert flags
router.get('/', authenticateToken, async (req, res) => {
  try {
    const produtos = await dataService.getProdutos(req.query);
    res.json(produtos);
  } catch (err) {
    console.error('Erro ao listar produtos:', err);
    res.status(500).json({ error: 'Erro ao carregar produtos: ' + err.message });
  }
});

// GET /api/produtos/:id - Get Product Details + Stock
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prod = await dataService.getProdutoById(req.params.id);
    if (!prod) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(prod);
  } catch (err) {
    console.error('Erro ao obter produto:', err);
    res.status(500).json({ error: 'Erro interno ao consultar produto' });
  }
});

// POST /api/produtos - Create Product (Gerente and Administrador)
router.post('/', authenticateToken, requireRole(['Gerente', 'Administrador']), upload.single('foto'), async (req, res) => {
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

    let finalFoto = foto_base64;
    if (req.file) {
      finalFoto = `/uploads/${req.file.filename}`;
    }

    const result = await dataService.createProduto({
      nome: nome.trim(),
      codigo_barras,
      categoria,
      unidade_medida,
      estoque_minimo,
      quantidade_inicial,
      central_destino,
      foto_base64: finalFoto
    }, req.user.id);

    res.status(201).json({
      message: 'Produto cadastrado com sucesso!',
      id: result.id,
      codigo_barras: result.codigo_barras,
      foto_path: result.foto_path
    });
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao salvar produto' });
  }
});

// PUT /api/produtos/:id - Update Product (Gerente and Administrador)
router.put('/:id', authenticateToken, requireRole(['Gerente', 'Administrador']), upload.single('foto'), async (req, res) => {
  try {
    const {
      nome,
      codigo_barras,
      categoria,
      unidade_medida,
      estoque_minimo,
      foto_base64
    } = req.body;

    let finalFoto = foto_base64;
    if (req.file) {
      finalFoto = `/uploads/${req.file.filename}`;
    }

    const updated = await dataService.updateProduto(req.params.id, {
      nome,
      codigo_barras,
      categoria,
      unidade_medida,
      estoque_minimo,
      foto_base64: finalFoto
    });

    res.json({
      message: 'Produto atualizado com sucesso!',
      produto: updated
    });
  } catch (err) {
    console.error('Erro ao atualizar produto:', err.message);
    res.status(400).json({ error: err.message || 'Erro ao atualizar produto' });
  }
});

// DELETE /api/produtos/:id - Delete Product (Administrador only)
router.delete('/:id', authenticateToken, requireRole(['Administrador']), async (req, res) => {
  try {
    await dataService.deleteProduto(req.params.id);
    res.json({ message: 'Produto excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir produto:', err.message);
    res.status(500).json({ error: 'Erro ao excluir produto: ' + err.message });
  }
});

module.exports = router;
module.exports.saveBase64Image = saveBase64Image;
