const bcrypt = require('bcryptjs');
const { db, queryOne, execute } = require('./db');

function seedDatabase() {
  console.log('--- Iniciando Semeadura do Banco de Dados ---');

  // Check if users already exist
  const existingUser = queryOne('SELECT id FROM usuarios LIMIT 1');
  if (existingUser) {
    console.log('Banco de dados já contém registros. Pulando seed automático.');
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const hashAdmin = bcrypt.hashSync('admin123', salt);
  const hashGerente = bcrypt.hashSync('gerente123', salt);
  const hashOperador = bcrypt.hashSync('operador123', salt);

  // 1. Inserir Usuários
  const insertUser = db.prepare(`
    INSERT INTO usuarios (nome, email, senha, perfil, central_padrao)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('Carlos Silva (Administrador)', 'admin@estoque.com', hashAdmin, 'Administrador', 'Todas');
  insertUser.run('Mariana Costa (Gerente Piçarras)', 'gerente1@estoque.com', hashGerente, 'Gerente', 'Central Piçarras');
  insertUser.run('Roberto Mendes (Gerente Penha)', 'gerente2@estoque.com', hashGerente, 'Gerente', 'Central Penha');
  insertUser.run('Fernanda Lima (Gerente Armação)', 'gerente3@estoque.com', hashGerente, 'Gerente', 'Central Armação');
  insertUser.run('Rodrigo Santos (Gerente Rentter)', 'gerente4@estoque.com', hashGerente, 'Gerente', 'Rentter');
  insertUser.run('Lucas Souza (Operador Piçarras)', 'operador@estoque.com', hashOperador, 'Operador', 'Central Piçarras');
  insertUser.run('Juliana Rocha (Operadora Penha)', 'operador2@estoque.com', hashOperador, 'Operador', 'Central Penha');

  console.log('Usuários cadastrados com sucesso!');

  // 2. Inserir Produtos
  const insertProduct = db.prepare(`
    INSERT INTO produtos (nome, codigo_barras, categoria, unidade_medida, foto_path, estoque_minimo)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertStock = db.prepare(`
    INSERT INTO estoque_centrais (produto_id, central, quantidade)
    VALUES (?, ?, ?)
  `);

  const produtosData = [
    {
      nome: 'Fita Adesiva Empacotamento 48mm x 50m',
      codigo_barras: '78910001001',
      categoria: 'Embalagens',
      unidade_medida: 'Unidade',
      foto_path: '',
      estoque_minimo: 15,
      c1: 4, // Alerta
      c2: 28,
      c3: 16,
      c4: 12
    },
    {
      nome: 'Parafusadeira de Impacto Brushless 20V',
      codigo_barras: '78910002002',
      categoria: 'Ferramentas',
      unidade_medida: 'Unidade',
      foto_path: '',
      estoque_minimo: 3,
      c1: 6,
      c2: 2, // Alerta
      c3: 5,
      c4: 4
    },
    {
      nome: 'Caixa de Papelão Reforçada 40x40x40cm',
      codigo_barras: '78910003003',
      categoria: 'Embalagens',
      unidade_medida: 'Unidade',
      foto_path: '',
      estoque_minimo: 50,
      c1: 95,
      c2: 110,
      c3: 35, // Alerta
      c4: 45
    },
    {
      nome: 'Cabo de Rede UTP Cat6 305m Azul',
      codigo_barras: '78910004004',
      categoria: 'Eletrônicos',
      unidade_medida: 'Caixa',
      foto_path: '',
      estoque_minimo: 4,
      c1: 2, // Alerta
      c2: 8,
      c3: 1, // Alerta
      c4: 3
    },
    {
      nome: 'Álcool Isopropílico 99.8% 1 Litro',
      codigo_barras: '78910005005',
      categoria: 'Insumos',
      unidade_medida: 'Litro',
      foto_path: '',
      estoque_minimo: 8,
      c1: 14,
      c2: 19,
      c3: 9,
      c4: 11
    },
    {
      nome: 'Luva Nitrílica Descartável Preta (Cx 100un)',
      codigo_barras: '78910006006',
      categoria: 'Insumos',
      unidade_medida: 'Caixa',
      foto_path: '',
      estoque_minimo: 10,
      c1: 7, // Alerta
      c2: 22,
      c3: 12,
      c4: 8 // Alerta
    },
    {
      nome: 'Bobina Filme Stretch Manual 500mm x 25 micras',
      codigo_barras: '78910007007',
      categoria: 'Embalagens',
      unidade_medida: 'Kg',
      foto_path: '',
      estoque_minimo: 20,
      c1: 34,
      c2: 17, // Alerta
      c3: 30,
      c4: 25
    },
    {
      nome: 'Multímetro Digital Automotivo CAT III 600V',
      codigo_barras: '78910008008',
      categoria: 'Eletrônicos',
      unidade_medida: 'Unidade',
      foto_path: '',
      estoque_minimo: 2,
      c1: 5,
      c2: 3,
      c3: 4,
      c4: 2
    },
    {
      nome: 'Etiqueta Térmica Adesiva 100x150mm (Rolo 500)',
      codigo_barras: '78910009009',
      categoria: 'Insumos',
      unidade_medida: 'Unidade',
      foto_path: '',
      estoque_minimo: 12,
      c1: 9, // Alerta
      c2: 24,
      c3: 15,
      c4: 18
    },
    {
      nome: 'Trena Métrica Profissional 8 Metros com Trava',
      codigo_barras: '78910010010',
      categoria: 'Ferramentas',
      unidade_medida: 'Metro',
      foto_path: '',
      estoque_minimo: 5,
      c1: 8,
      c2: 7,
      c3: 3, // Alerta
      c4: 6
    }
  ];

  const productIds = [];
  for (const item of produtosData) {
    const res = insertProduct.run(
      item.nome,
      item.codigo_barras,
      item.categoria,
      item.unidade_medida,
      item.foto_path,
      item.estoque_minimo
    );
    const prodId = Number(res.lastInsertRowid);
    productIds.push(prodId);

    insertStock.run(prodId, 'Central Piçarras', item.c1);
    insertStock.run(prodId, 'Central Penha', item.c2);
    insertStock.run(prodId, 'Central Armação', item.c3);
    insertStock.run(prodId, 'Rentter', item.c4);
  }

  console.log(`10 Produtos cadastrados com estoque distribuído em Central Piçarras, Penha, Armação e Rentter.`);

  // 3. Inserir Movimentações Históricas para alimentar Dashboard e Gráficos
  const insertMov = db.prepare(`
    INSERT INTO movimentacoes (produto_id, tipo, central, quantidade, usuario_id, observacao, data_movimentacao)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Gera datas relativas (hoje, ontem, 3 dias atras, 10 dias atras)
  const now = new Date();
  const formatDate = (daysAgo, hours = 10, minutes = 30) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  };

  const sampleMovimentacoes = [
    // Entradas iniciais
    { p: 0, tipo: 'ENTRADA', c: 'Central Piçarras', qtd: 20, u: 1, obs: 'Estoque inicial de fita adesiva', d: formatDate(15, 8, 0) },
    { p: 0, tipo: 'ENTRADA', c: 'Central Penha', qtd: 40, u: 1, obs: 'Estoque inicial', d: formatDate(15, 8, 0) },
    { p: 0, tipo: 'ENTRADA', c: 'Central Armação', qtd: 30, u: 1, obs: 'Estoque inicial', d: formatDate(15, 8, 0) },
    { p: 0, tipo: 'ENTRADA', c: 'Rentter', qtd: 25, u: 1, obs: 'Estoque inicial Rentter', d: formatDate(15, 8, 0) },
    
    // Saidas este mês / ultimos 7 dias / hoje
    // Fita adesiva (alto consumo Central Piçarras)
    { p: 0, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 5, u: 5, obs: 'Expedição de encomendas setor A', d: formatDate(0, 9, 15) },
    { p: 0, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 4, u: 5, obs: 'Embalagem de lotes prioritários', d: formatDate(0, 11, 40) },
    { p: 0, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 7, u: 5, obs: 'Turno da tarde', d: formatDate(2, 14, 20) },
    { p: 0, tipo: 'SAIDA', c: 'Central Penha', qtd: 6, u: 6, obs: 'Separação pedidos ecommerce', d: formatDate(1, 10, 10) },
    { p: 0, tipo: 'SAIDA', c: 'Central Penha', qtd: 6, u: 6, obs: 'Reposição bancada de embalagem', d: formatDate(4, 16, 0) },
    { p: 0, tipo: 'SAIDA', c: 'Central Armação', qtd: 8, u: 4, obs: 'Consumo diário de expedição', d: formatDate(1, 15, 30) },
    { p: 0, tipo: 'SAIDA', c: 'Central Armação', qtd: 6, u: 4, obs: 'Fechamento de paletes', d: formatDate(3, 11, 0) },
    { p: 0, tipo: 'SAIDA', c: 'Rentter', qtd: 5, u: 4, obs: 'Expedição Rentter', d: formatDate(1, 16, 10) },

    // Caixas de papelao (alto consumo em todas as centrais)
    { p: 2, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 15, u: 5, obs: 'Envio de kits comerciais', d: formatDate(0, 8, 45) },
    { p: 2, tipo: 'SAIDA', c: 'Central Penha', qtd: 25, u: 6, obs: 'Remessa semanal filial sul', d: formatDate(0, 14, 0) },
    { p: 2, tipo: 'SAIDA', c: 'Central Armação', qtd: 18, u: 4, obs: 'Pedidos grandes do dia', d: formatDate(0, 13, 20) },
    { p: 2, tipo: 'SAIDA', c: 'Rentter', qtd: 12, u: 5, obs: 'Separação de kits Rentter', d: formatDate(0, 15, 30) },
    { p: 2, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 20, u: 5, obs: 'Lote de vendas #4412', d: formatDate(3, 10, 0) },
    { p: 2, tipo: 'SAIDA', c: 'Central Penha', qtd: 30, u: 6, obs: 'Despacho transportadora', d: formatDate(4, 9, 30) },
    { p: 2, tipo: 'SAIDA', c: 'Central Armação', qtd: 22, u: 4, obs: 'Despacho cliente corporativo', d: formatDate(5, 17, 10) },

    // Etiquetas termicas
    { p: 8, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 4, u: 5, obs: 'Impressoras térmicas docas 1 e 2', d: formatDate(0, 10, 15) },
    { p: 8, tipo: 'SAIDA', c: 'Central Penha', qtd: 3, u: 6, obs: 'Bancada de etiquetagem', d: formatDate(2, 14, 50) },
    { p: 8, tipo: 'SAIDA', c: 'Central Armação', qtd: 5, u: 4, obs: 'Impressoras galpão de triagem', d: formatDate(1, 8, 30) },
    { p: 8, tipo: 'SAIDA', c: 'Rentter', qtd: 2, u: 5, obs: 'Etiquetagem remessas Rentter', d: formatDate(2, 11, 20) },

    // Luvas nitrílicas
    { p: 5, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 3, u: 5, obs: 'EPI operadores turno manhã', d: formatDate(1, 7, 45) },
    { p: 5, tipo: 'SAIDA', c: 'Central Penha', qtd: 4, u: 6, obs: 'Distribuição EPI equipe Penha', d: formatDate(2, 8, 0) },
    { p: 5, tipo: 'SAIDA', c: 'Central Armação', qtd: 2, u: 4, obs: 'Troca de luvas área química', d: formatDate(3, 9, 15) },
    { p: 5, tipo: 'SAIDA', c: 'Rentter', qtd: 2, u: 5, obs: 'Uso operacional Rentter', d: formatDate(1, 8, 10) },

    // Álcool isopropílico
    { p: 4, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 2, u: 5, obs: 'Limpeza de placas de circuito', d: formatDate(2, 16, 20) },
    { p: 4, tipo: 'SAIDA', c: 'Central Penha', qtd: 3, u: 6, obs: 'Manutenção técnica de equipamentos', d: formatDate(0, 15, 10) },

    // Cabo de Rede Cat6
    { p: 3, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 1, u: 5, obs: 'Instalação cabeamento novo rack', d: formatDate(0, 12, 0) },
    { p: 3, tipo: 'SAIDA', c: 'Central Armação', qtd: 2, u: 4, obs: 'Infraestrutura docas 3', d: formatDate(1, 14, 45) },

    // Filme Stretch
    { p: 6, tipo: 'SAIDA', c: 'Central Piçarras', qtd: 6, u: 5, obs: 'Paletização carga pesada', d: formatDate(1, 16, 0) },
    { p: 6, tipo: 'SAIDA', c: 'Central Penha', qtd: 8, u: 6, obs: 'Paletização carga frágil', d: formatDate(0, 16, 45) },
    { p: 6, tipo: 'SAIDA', c: 'Central Armação', qtd: 5, u: 4, obs: 'Fechamento de cargas', d: formatDate(2, 10, 15) },
    { p: 6, tipo: 'SAIDA', c: 'Rentter', qtd: 4, u: 5, obs: 'Embalagem de paletes Rentter', d: formatDate(1, 13, 0) },

    // Parafusadeira
    { p: 1, tipo: 'SAIDA', c: 'Central Penha', qtd: 1, u: 6, obs: 'Envio para equipe de montagem', d: formatDate(0, 8, 30) },

    // Trena
    { p: 9, tipo: 'SAIDA', c: 'Central Armação', qtd: 1, u: 4, obs: 'Uso equipe de inspeção dimensional', d: formatDate(1, 11, 20) },

    // Entrada recente de reposição
    { p: 2, tipo: 'ENTRADA', c: 'Central Penha', qtd: 50, u: 3, obs: 'NF 88392 - Chegada de novo lote fornecedor', d: formatDate(0, 7, 30) },
    { p: 7, tipo: 'ENTRADA', c: 'Central Armação', qtd: 2, u: 4, obs: 'Transferência de estoque aprovada', d: formatDate(1, 9, 0) }
  ];

  for (const m of sampleMovimentacoes) {
    insertMov.run(
      productIds[m.p],
      m.tipo,
      m.c,
      m.qtd,
      m.u,
      m.obs,
      m.d
    );
  }

  console.log(`${sampleMovimentacoes.length} movimentações históricas registradas.`);
  console.log('--- Semeadura concluída com êxito! ---');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
