require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Require DB and auto-seed if empty
const { uploadsDir } = require('./db');
const { seedDatabase } = require('./seed');
seedDatabase();

const authRoutes = require('./routes/auth');
const produtosRoutes = require('./routes/produtos');
const movimentacoesRoutes = require('./routes/movimentacoes');
const dashboardRoutes = require('./routes/dashboard');
const usuariosRoutes = require('./routes/usuarios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded product photos
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuariosRoutes);

// System health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    name: 'Estoque Vetter Tablet 3 Centrais'
  });
});

// Serve frontend production build if present
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Express 5 catch-all fallback
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      if (req.path.startsWith('/assets/')) {
        return res.status(404).send('Asset not found');
      }
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Global JSON error handler
app.use((err, req, res, next) => {
  console.error('Express Error Handler:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Erro interno no servidor'
  });
});

// Start server on 0.0.0.0 for tablet local network accessibility
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVIDOR ESTOQUE VETTER ATIVO EM:`);
  console.log(`   Local:            http://localhost:${PORT}`);
  console.log(`   Tablet / Rede:    http://0.0.0.0:${PORT}`);
  console.log(`======================================================\n`);
});
