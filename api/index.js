require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('../server/routes/auth');
const produtosRoutes = require('../server/routes/produtos');
const movimentacoesRoutes = require('../server/routes/movimentacoes');
const dashboardRoutes = require('../server/routes/dashboard');
const usuariosRoutes = require('../server/routes/usuarios');
const { uploadsDir } = require('../server/db');
const { seedDatabase } = require('../server/seed');

try {
  seedDatabase();
} catch (e) {
  console.warn('Seed status:', e.message);
}

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/movimentacoes', movimentacoesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    name: 'Estoque Vetter Tablet 3 Centrais',
    environment: 'vercel-serverless'
  });
});

module.exports = app;
