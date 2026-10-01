const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const isVercel = Boolean(process.env.VERCEL);
const defaultDbPath = path.join(__dirname, '..', 'estoque_local.db');
const dbPath = isVercel ? path.join('/tmp', 'estoque_local.db') : defaultDbPath;
const uploadsDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');

if (isVercel && !fs.existsSync(dbPath) && fs.existsSync(defaultDbPath)) {
  try {
    fs.copyFileSync(defaultDbPath, dbPath);
  } catch (e) {
    console.warn('Aviso: Falha ao copiar banco para /tmp:', e);
  }
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for durability and performance
db.exec('PRAGMA foreign_keys = ON;');
try {
  db.exec('PRAGMA journal_mode = WAL;');
} catch (_) {
  // in some serverless tmp environments WAL might be restricted
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      perfil TEXT CHECK(perfil IN ('Operador', 'Gerente', 'Administrador')) NOT NULL,
      central_padrao TEXT CHECK(central_padrao IN ('Central 1', 'Central 2', 'Central 3', 'Todas')),
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo_barras TEXT UNIQUE,
      categoria TEXT NOT NULL,
      unidade_medida TEXT NOT NULL,
      foto_path TEXT,
      estoque_minimo INTEGER DEFAULT 5,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS estoque_centrais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      central TEXT CHECK(central IN ('Central 1', 'Central 2', 'Central 3')) NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
      UNIQUE(produto_id, central)
    );

    CREATE TABLE IF NOT EXISTS movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      tipo TEXT CHECK(tipo IN ('ENTRADA', 'SAIDA')) NOT NULL,
      central TEXT CHECK(central IN ('Central 1', 'Central 2', 'Central 3')) NOT NULL,
      quantidade INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      observacao TEXT,
      data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (produto_id) REFERENCES produtos(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);
}

initTables();

// Helper functions for clean parameterized queries
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

function execute(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

module.exports = {
  db,
  queryAll,
  queryOne,
  execute,
  uploadsDir
};
