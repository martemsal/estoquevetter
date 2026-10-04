const { db, queryAll, queryOne } = require('./db');
const { supabase, isSupabaseConfigured, uploadPhotoToStorage } = require('./supabase');
const bcrypt = require('bcryptjs');

// ==============================================================================
// DATA SERVICE: Camada Unificada com suporte dinâmico a Supabase ou SQLite
// ==============================================================================

const NORMALIZE_CENTRAL = {
  'Central 1': 'Central Piçarras',
  'Central 01': 'Central Piçarras',
  'Central 2': 'Central Penha',
  'Central 02': 'Central Penha',
  'Central 3': 'Central Armação',
  'Central 03': 'Central Armação',
};

const TO_LEGACY_CENTRAL = {
  'Central Piçarras': 'Central 1',
  'Central Penha': 'Central 2',
  'Central Armação': 'Central 3',
};

function toLegacyCentral(c) {
  return TO_LEGACY_CENTRAL[c] || c;
}

function normalizeCentral(c) {
  if (!c) return c;
  return NORMALIZE_CENTRAL[c] || c;
}

const ALL_CENTRAIS = [
  'Central Piçarras',
  'Central Penha',
  'Central Armação',
  'Rentter'
];

const dataService = {
  isSupabase: isSupabaseConfigured,
  normalizeCentral,
  ALL_CENTRAIS,

  // ----------------------------------------------------------------------------
  // AUTENTICAÇÃO E USUÁRIOS
  // ----------------------------------------------------------------------------
  async getUserByEmail(email) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return queryOne('SELECT * FROM usuarios WHERE email = ?', [email]);
  },

  async getUserById(id) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return queryOne('SELECT * FROM usuarios WHERE id = ?', [id]);
  },

  async getQuickUsers() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, perfil, central_padrao')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return queryAll('SELECT id, nome, email, perfil, central_padrao FROM usuarios ORDER BY id ASC');
  },

  async getAllUsers() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, perfil, central_padrao, criado_em')
        .order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return queryAll('SELECT id, nome, email, perfil, central_padrao, criado_em FROM usuarios ORDER BY id ASC');
  },

  async createUsuario({ nome, email, senha, perfil, central_padrao }) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(senha, salt);

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{ nome, email, senha: hash, perfil, central_padrao }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const stmt = db.prepare(`
      INSERT INTO usuarios (nome, email, senha, perfil, central_padrao)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = stmt.run(nome, email, hash, perfil, central_padrao);
    return { id: Number(res.lastInsertRowid), nome, email, perfil, central_padrao };
  },

  async updateUsuario(id, { nome, email, senha, perfil, central_padrao }) {
    if (isSupabaseConfigured()) {
      const updateData = { nome, email, perfil, central_padrao };
      if (senha) {
        updateData.senha = bcrypt.hashSync(senha, 10);
      }
      const { data, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    if (senha) {
      const hash = bcrypt.hashSync(senha, 10);
      db.prepare(`
        UPDATE usuarios SET nome = ?, email = ?, senha = ?, perfil = ?, central_padrao = ? WHERE id = ?
      `).run(nome, email, hash, perfil, central_padrao, id);
    } else {
      db.prepare(`
        UPDATE usuarios SET nome = ?, email = ?, perfil = ?, central_padrao = ? WHERE id = ?
      `).run(nome, email, perfil, central_padrao, id);
    }
    return { id, nome, email, perfil, central_padrao };
  },

  async deleteUsuario(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
    return true;
  },

  // ----------------------------------------------------------------------------
  // PRODUTOS E ESTOQUE
  // ----------------------------------------------------------------------------
  async getProdutos({ central, categoria, alerta, busca } = {}) {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('produtos')
        .select(`
          id, nome, codigo_barras, categoria, unidade_medida, foto_path, estoque_minimo, criado_em,
          estoque_centrais (central, quantidade)
        `)
        .order('id', { ascending: false });

      if (categoria && categoria !== 'Todas') {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query;
      if (error) throw error;

      let list = (data || []).map(p => {
        const c1Obj = p.estoque_centrais?.find(ec => ec.central === 'Central Piçarras' || ec.central === 'Central 1' || ec.central === 'Central 01');
        const c2Obj = p.estoque_centrais?.find(ec => ec.central === 'Central Penha' || ec.central === 'Central 2' || ec.central === 'Central 02');
        const c3Obj = p.estoque_centrais?.find(ec => ec.central === 'Central Armação' || ec.central === 'Central 3' || ec.central === 'Central 03');
        const c4Obj = p.estoque_centrais?.find(ec => ec.central === 'Rentter');

        const estoque_c1 = c1Obj ? Number(c1Obj.quantidade) : 0;
        const estoque_c2 = c2Obj ? Number(c2Obj.quantidade) : 0;
        const estoque_c3 = c3Obj ? Number(c3Obj.quantidade) : 0;
        const estoque_c4 = c4Obj ? Number(c4Obj.quantidade) : 0;
        const estoque_total = estoque_c1 + estoque_c2 + estoque_c3 + estoque_c4;

        const min = p.estoque_minimo || 5;
        const c1Low = estoque_c1 <= min;
        const c2Low = estoque_c2 <= min;
        const c3Low = estoque_c3 <= min;
        const c4Low = estoque_c4 <= min;
        const totalLow = estoque_total <= min;
        const hasAnyLow = c1Low || c2Low || c3Low || c4Low || totalLow;

        let relevantStock = estoque_total;
        let relevantLow = hasAnyLow;

        const normCentral = normalizeCentral(central);
        if (normCentral === 'Central Piçarras') {
          relevantStock = estoque_c1;
          relevantLow = c1Low;
        } else if (normCentral === 'Central Penha') {
          relevantStock = estoque_c2;
          relevantLow = c2Low;
        } else if (normCentral === 'Central Armação') {
          relevantStock = estoque_c3;
          relevantLow = c3Low;
        } else if (normCentral === 'Rentter') {
          relevantStock = estoque_c4;
          relevantLow = c4Low;
        }

        return {
          id: p.id,
          nome: p.nome,
          codigo_barras: p.codigo_barras,
          categoria: p.categoria,
          unidade_medida: p.unidade_medida,
          foto_path: p.foto_path,
          estoque_minimo: p.estoque_minimo,
          criado_em: p.criado_em,
          estoque_c1,
          estoque_c2,
          estoque_c3,
          estoque_c4,
          estoque_picarras: estoque_c1,
          estoque_penha: estoque_c2,
          estoque_armacao: estoque_c3,
          estoque_rentter: estoque_c4,
          estoque_total,
          estoque_selecionado: relevantStock,
          em_alerta: relevantLow,
          alerta_c1: c1Low,
          alerta_c2: c2Low,
          alerta_c3: c3Low,
          alerta_c4: c4Low
        };
      });

      if (busca) {
        const lower = busca.toLowerCase();
        list = list.filter(p => 
          (p.nome && p.nome.toLowerCase().includes(lower)) ||
          (p.codigo_barras && p.codigo_barras.toLowerCase().includes(lower)) ||
          (p.categoria && p.categoria.toLowerCase().includes(lower))
        );
      }

      if (alerta === 'true') {
        list = list.filter(p => p.em_alerta);
      }

      return list;
    }

    // Fallback SQLite
    let sql = `
      SELECT 
        p.*,
        COALESCE(c1.quantidade, 0) AS estoque_c1,
        COALESCE(c2.quantidade, 0) AS estoque_c2,
        COALESCE(c3.quantidade, 0) AS estoque_c3,
        COALESCE(c4.quantidade, 0) AS estoque_c4,
        (COALESCE(c1.quantidade, 0) + COALESCE(c2.quantidade, 0) + COALESCE(c3.quantidade, 0) + COALESCE(c4.quantidade, 0)) AS estoque_total
      FROM produtos p
      LEFT JOIN estoque_centrais c1 ON p.id = c1.produto_id AND (c1.central = 'Central Piçarras' OR c1.central = 'Central 1')
      LEFT JOIN estoque_centrais c2 ON p.id = c2.produto_id AND (c2.central = 'Central Penha' OR c2.central = 'Central 2')
      LEFT JOIN estoque_centrais c3 ON p.id = c3.produto_id AND (c3.central = 'Central Armação' OR c3.central = 'Central 3')
      LEFT JOIN estoque_centrais c4 ON p.id = c4.produto_id AND c4.central = 'Rentter'
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
    let results = rows.map(prod => {
      const min = prod.estoque_minimo || 5;
      const c1Low = prod.estoque_c1 <= min;
      const c2Low = prod.estoque_c2 <= min;
      const c3Low = prod.estoque_c3 <= min;
      const c4Low = prod.estoque_c4 <= min;
      const totalLow = prod.estoque_total <= min;
      const hasAnyLow = c1Low || c2Low || c3Low || c4Low || totalLow;

      let relevantStock = prod.estoque_total;
      let relevantLow = hasAnyLow;

      const normCentral = normalizeCentral(central);
      if (normCentral === 'Central Piçarras') {
        relevantStock = prod.estoque_c1;
        relevantLow = c1Low;
      } else if (normCentral === 'Central Penha') {
        relevantStock = prod.estoque_c2;
        relevantLow = c2Low;
      } else if (normCentral === 'Central Armação') {
        relevantStock = prod.estoque_c3;
        relevantLow = c3Low;
      } else if (normCentral === 'Rentter') {
        relevantStock = prod.estoque_c4;
        relevantLow = c4Low;
      }

      return {
        ...prod,
        estoque_picarras: prod.estoque_c1,
        estoque_penha: prod.estoque_c2,
        estoque_armacao: prod.estoque_c3,
        estoque_rentter: prod.estoque_c4,
        estoque_selecionado: relevantStock,
        em_alerta: relevantLow,
        alerta_c1: c1Low,
        alerta_c2: c2Low,
        alerta_c3: c3Low,
        alerta_c4: c4Low
      };
    });

    if (alerta === 'true') {
      results = results.filter(p => p.em_alerta);
    }
    return results;
  },

  async getProdutoById(id) {
    if (isSupabaseConfigured()) {
      const { data: p, error } = await supabase
        .from('produtos')
        .select(`
          id, nome, codigo_barras, categoria, unidade_medida, foto_path, estoque_minimo, criado_em,
          estoque_centrais (central, quantidade)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !p) return null;

      const c1Obj = p.estoque_centrais?.find(ec => ec.central === 'Central Piçarras' || ec.central === 'Central 1' || ec.central === 'Central 01');
      const c2Obj = p.estoque_centrais?.find(ec => ec.central === 'Central Penha' || ec.central === 'Central 2' || ec.central === 'Central 02');
      const c3Obj = p.estoque_centrais?.find(ec => ec.central === 'Central Armação' || ec.central === 'Central 3' || ec.central === 'Central 03');
      const c4Obj = p.estoque_centrais?.find(ec => ec.central === 'Rentter');

      const estoque_c1 = c1Obj ? Number(c1Obj.quantidade) : 0;
      const estoque_c2 = c2Obj ? Number(c2Obj.quantidade) : 0;
      const estoque_c3 = c3Obj ? Number(c3Obj.quantidade) : 0;
      const estoque_c4 = c4Obj ? Number(c4Obj.quantidade) : 0;
      const estoque_total = estoque_c1 + estoque_c2 + estoque_c3 + estoque_c4;

      // Historico
      const { data: hist } = await supabase
        .from('movimentacoes')
        .select(`
          id, tipo, central, quantidade, observacao, data_movimentacao,
          usuarios (nome)
        `)
        .eq('produto_id', id)
        .order('data_movimentacao', { ascending: false })
        .limit(20);

      const historico = (hist || []).map(m => ({
        ...m,
        usuario_nome: m.usuarios?.nome || 'Usuário'
      }));

      return {
        ...p,
        estoque_c1,
        estoque_c2,
        estoque_c3,
        estoque_c4,
        estoque_picarras: estoque_c1,
        estoque_penha: estoque_c2,
        estoque_armacao: estoque_c3,
        estoque_rentter: estoque_c4,
        estoque_total,
        em_alerta: (estoque_c1 <= p.estoque_minimo || estoque_c2 <= p.estoque_minimo || estoque_c3 <= p.estoque_minimo || estoque_c4 <= p.estoque_minimo),
        historico
      };
    }

    // SQLite
    const prod = queryOne(`
      SELECT 
        p.*,
        COALESCE(c1.quantidade, 0) AS estoque_c1,
        COALESCE(c2.quantidade, 0) AS estoque_c2,
        COALESCE(c3.quantidade, 0) AS estoque_c3,
        COALESCE(c4.quantidade, 0) AS estoque_c4,
        (COALESCE(c1.quantidade, 0) + COALESCE(c2.quantidade, 0) + COALESCE(c3.quantidade, 0) + COALESCE(c4.quantidade, 0)) AS estoque_total
      FROM produtos p
      LEFT JOIN estoque_centrais c1 ON p.id = c1.produto_id AND (c1.central = 'Central Piçarras' OR c1.central = 'Central 1')
      LEFT JOIN estoque_centrais c2 ON p.id = c2.produto_id AND (c2.central = 'Central Penha' OR c2.central = 'Central 2')
      LEFT JOIN estoque_centrais c3 ON p.id = c3.produto_id AND (c3.central = 'Central Armação' OR c3.central = 'Central 3')
      LEFT JOIN estoque_centrais c4 ON p.id = c4.produto_id AND c4.central = 'Rentter'
      WHERE p.id = ?
    `, [id]);

    if (!prod) return null;

    const historico = queryAll(`
      SELECT m.*, u.nome AS usuario_nome
      FROM movimentacoes m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.produto_id = ?
      ORDER BY m.data_movimentacao DESC
      LIMIT 20
    `, [id]);

    const c1Low = prod.estoque_c1 <= prod.estoque_minimo;
    const c2Low = prod.estoque_c2 <= prod.estoque_minimo;
    const c3Low = prod.estoque_c3 <= prod.estoque_minimo;
    const c4Low = prod.estoque_c4 <= prod.estoque_minimo;

    return {
      ...prod,
      estoque_picarras: prod.estoque_c1,
      estoque_penha: prod.estoque_c2,
      estoque_armacao: prod.estoque_c3,
      estoque_rentter: prod.estoque_c4,
      alerta_c1: c1Low,
      alerta_c2: c2Low,
      alerta_c3: c3Low,
      alerta_c4: c4Low,
      em_alerta: (c1Low || c2Low || c3Low || c4Low),
      historico
    };
  },

  async createProduto(productData, userId) {
    let {
      nome,
      codigo_barras,
      categoria,
      unidade_medida,
      estoque_minimo,
      quantidade_inicial,
      central_destino,
      foto_base64
    } = productData;

    // Gerar código de barras se vazio
    const barcode = codigo_barras && codigo_barras.trim()
      ? codigo_barras.trim()
      : `VET-${Date.now().toString().slice(-8)}`;

    const minStock = Number(estoque_minimo) >= 0 ? parseInt(estoque_minimo, 10) : 5;
    const initialQty = Number(quantidade_inicial) > 0 ? parseInt(quantidade_inicial, 10) : 0;
    const normDestino = normalizeCentral(central_destino);
    const destino = ALL_CENTRAIS.includes(normDestino) ? normDestino : 'Central Piçarras';

    if (isSupabaseConfigured()) {
      // 1. Verificar duplicidade de código de barras
      const { data: existing } = await supabase
        .from('produtos')
        .select('id, nome')
        .eq('codigo_barras', barcode)
        .maybeSingle();

      if (existing) {
        throw new Error(`Código de barras "${barcode}" já está em uso pelo produto "${existing.nome}".`);
      }

      // 2. Upload da foto para o Supabase Storage se for base64
      let foto_url = '';
      if (foto_base64) {
        foto_url = await uploadPhotoToStorage(foto_base64, `prod_${Date.now()}`);
      }

      // 3. Inserir produto
      const { data: newProd, error: prodErr } = await supabase
        .from('produtos')
        .insert([{
          nome: nome.trim(),
          codigo_barras: barcode,
          categoria: categoria || 'Outros',
          unidade_medida: unidade_medida || 'Unidade',
          foto_path: foto_url,
          estoque_minimo: minStock
        }])
        .select()
        .single();

      if (prodErr) throw prodErr;

      const newProdId = newProd.id;

      // 4. Inserir estoque nas 4 centrais (com fallback gracioso caso a constraint do Supabase ainda seja a antiga)
      const stockPayload = [
        { produto_id: newProdId, central: 'Central Piçarras', quantidade: destino === 'Central Piçarras' ? initialQty : 0 },
        { produto_id: newProdId, central: 'Central Penha', quantidade: destino === 'Central Penha' ? initialQty : 0 },
        { produto_id: newProdId, central: 'Central Armação', quantidade: destino === 'Central Armação' ? initialQty : 0 },
        { produto_id: newProdId, central: 'Rentter', quantidade: destino === 'Rentter' ? initialQty : 0 },
      ];

      const { error: stockInsertErr } = await supabase.from('estoque_centrais').insert(stockPayload);
      if (stockInsertErr) {
        if (stockInsertErr.code === '23514') {
          console.warn('Supabase ainda possui constraint antiga de 3 centrais. Inserindo com nomes legados temporariamente...');
          const legacyDest = toLegacyCentral(destino);
          await supabase.from('estoque_centrais').insert([
            { produto_id: newProdId, central: 'Central 1', quantidade: legacyDest === 'Central 1' ? initialQty : 0 },
            { produto_id: newProdId, central: 'Central 2', quantidade: legacyDest === 'Central 2' ? initialQty : 0 },
            { produto_id: newProdId, central: 'Central 3', quantidade: legacyDest === 'Central 3' ? initialQty : 0 },
          ]);
        } else {
          throw stockInsertErr;
        }
      }

      // 5. Registrar movimentação de entrada inicial se quantidade > 0
      if (initialQty > 0) {
        let validUserId = Number(userId);
        if (!validUserId || isNaN(validUserId)) validUserId = 1;
        try {
          const { error: movErr } = await supabase.from('movimentacoes').insert([{
            produto_id: newProdId,
            tipo: 'ENTRADA',
            central: destino,
            quantidade: initialQty,
            usuario_id: validUserId,
            observacao: `Entrada inicial de cadastro - ${destino}`
          }]);
          if (movErr && movErr.code === '23514') {
            await supabase.from('movimentacoes').insert([{
              produto_id: newProdId,
              tipo: 'ENTRADA',
              central: toLegacyCentral(destino),
              quantidade: initialQty,
              usuario_id: validUserId,
              observacao: `Entrada inicial de cadastro - ${destino}`
            }]);
          }
        } catch (mErr) {
          console.warn('Aviso: erro não-fatal ao registrar histórico inicial:', mErr.message);
        }
      }

      return { id: newProdId, codigo_barras: barcode, foto_path: foto_url };
    }

    // Fallback SQLite
    const existing = queryOne('SELECT id, nome FROM produtos WHERE codigo_barras = ?', [barcode]);
    if (existing) {
      throw new Error(`Código de barras "${barcode}" já cadastrado no produto "${existing.nome}".`);
    }

    const { saveBase64Image } = require('./routes/produtos');
    const foto_path = foto_base64 ? (saveBase64Image(foto_base64) || '') : '';

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

    const insertStock = db.prepare(`
      INSERT INTO estoque_centrais (produto_id, central, quantidade)
      VALUES (?, ?, ?)
    `);
    insertStock.run(newProdId, 'Central Piçarras', destino === 'Central Piçarras' ? initialQty : 0);
    insertStock.run(newProdId, 'Central Penha', destino === 'Central Penha' ? initialQty : 0);
    insertStock.run(newProdId, 'Central Armação', destino === 'Central Armação' ? initialQty : 0);
    insertStock.run(newProdId, 'Rentter', destino === 'Rentter' ? initialQty : 0);

    if (initialQty > 0) {
      const insertMov = db.prepare(`
        INSERT INTO movimentacoes (produto_id, tipo, central, quantidade, usuario_id, observacao)
        VALUES (?, 'ENTRADA', ?, ?, ?, ?)
      `);
      insertMov.run(newProdId, destino, initialQty, userId, `Entrada inicial de cadastro - ${destino}`);
    }

    return { id: newProdId, codigo_barras: barcode, foto_path };
  },

  async updateProduto(id, updateData) {
    const {
      nome,
      codigo_barras,
      categoria,
      unidade_medida,
      estoque_minimo,
      foto_base64
    } = updateData;

    if (isSupabaseConfigured()) {
      const prod = await this.getProdutoById(id);
      if (!prod) throw new Error('Produto não encontrado');

      let foto_url = prod.foto_path;
      if (foto_base64 && foto_base64.startsWith('data:image')) {
        foto_url = await uploadPhotoToStorage(foto_base64, `prod_${id}`);
      }

      const barcode = codigo_barras && codigo_barras.trim() ? codigo_barras.trim() : prod.codigo_barras;

      if (barcode !== prod.codigo_barras) {
        const { data: existing } = await supabase
          .from('produtos')
          .select('id, nome')
          .eq('codigo_barras', barcode)
          .neq('id', id)
          .maybeSingle();

        if (existing) {
          throw new Error(`Código de barras "${barcode}" já está em uso pelo produto "${existing.nome}".`);
        }
      }

      const minStock = Number(estoque_minimo) >= 0 ? parseInt(estoque_minimo, 10) : prod.estoque_minimo;

      const { data, error } = await supabase
        .from('produtos')
        .update({
          nome: nome ? nome.trim() : prod.nome,
          codigo_barras: barcode,
          categoria: categoria || prod.categoria,
          unidade_medida: unidade_medida || prod.unidade_medida,
          foto_path: foto_url,
          estoque_minimo: minStock
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // SQLite
    const prod = queryOne('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!prod) throw new Error('Produto não encontrado');

    const barcode = codigo_barras && codigo_barras.trim() ? codigo_barras.trim() : prod.codigo_barras;
    if (barcode !== prod.codigo_barras) {
      const existing = queryOne('SELECT id, nome FROM produtos WHERE codigo_barras = ? AND id != ?', [barcode, id]);
      if (existing) throw new Error(`Código de barras já está em uso pelo produto "${existing.nome}".`);
    }

    const { saveBase64Image } = require('./routes/produtos');
    let foto_path = prod.foto_path;
    if (foto_base64 && foto_base64.startsWith('data:image')) {
      foto_path = saveBase64Image(foto_base64) || foto_path;
    }

    const minStock = Number(estoque_minimo) >= 0 ? parseInt(estoque_minimo, 10) : prod.estoque_minimo;

    db.prepare(`
      UPDATE produtos
      SET nome = ?, codigo_barras = ?, categoria = ?, unidade_medida = ?, foto_path = ?, estoque_minimo = ?
      WHERE id = ?
    `).run(
      nome ? nome.trim() : prod.nome,
      barcode,
      categoria || prod.categoria,
      unidade_medida || prod.unidade_medida,
      foto_path,
      minStock,
      id
    );

    return { id, nome, codigo_barras: barcode, foto_path };
  },

  async deleteProduto(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
    return true;
  },

  // ----------------------------------------------------------------------------
  // MOVIMENTAÇÕES (SAÍDA / ENTRADA)
  // ----------------------------------------------------------------------------
  async registrarSaida({ produto_id, central, quantidade, observacao }, user) {
    const qtd = parseInt(quantidade, 10);
    const targetCentral = normalizeCentral(central);

    if (isSupabaseConfigured()) {
      const prod = await this.getProdutoById(produto_id);
      if (!prod) throw new Error('Produto não encontrado');

      // Obter saldo da central (tenta nome normalizado, fallback para original)
      let { data: stockRow, error: stockErr } = await supabase
        .from('estoque_centrais')
        .select('id, central, quantidade')
        .eq('produto_id', produto_id)
        .eq('central', targetCentral)
        .maybeSingle();

      if (!stockRow && targetCentral !== central) {
        const { data: legacyRow } = await supabase
          .from('estoque_centrais')
          .select('id, central, quantidade')
          .eq('produto_id', produto_id)
          .eq('central', central)
          .maybeSingle();
        if (legacyRow) stockRow = legacyRow;
      }

      if (stockErr) throw stockErr;

      const currentStock = stockRow ? Number(stockRow.quantidade) : 0;
      if (qtd > currentStock) {
        throw new Error(`Estoque insuficiente na ${targetCentral}! Saldo disponível: ${currentStock} ${prod.unidade_medida}(s), solicitado: ${qtd}.`);
      }

      const novoSaldo = currentStock - qtd;
      const actualCentralName = stockRow?.central || targetCentral;

      // Atualizar estoque da central
      if (stockRow) {
        await supabase
          .from('estoque_centrais')
          .update({ quantidade: novoSaldo })
          .eq('id', stockRow.id);
      } else {
        await supabase
          .from('estoque_centrais')
          .insert([{ produto_id, central: actualCentralName, quantidade: novoSaldo }]);
      }

      // Inserir registro de auditoria
      await supabase.from('movimentacoes').insert([{
        produto_id,
        tipo: 'SAIDA',
        central: actualCentralName,
        quantidade: qtd,
        usuario_id: user.id,
        observacao: observacao ? observacao.trim() : `Saída rápida de estoque - ${actualCentralName}`
      }]);

      const isAlerta = novoSaldo <= (prod.estoque_minimo || 5);

      return {
        success: true,
        message: `Saída de ${qtd} ${prod.unidade_medida}(s) registrada com sucesso!`,
        produto_nome: prod.nome,
        central: actualCentralName,
        quantidade: qtd,
        novo_saldo: novoSaldo,
        estoque_minimo: prod.estoque_minimo,
        is_alerta_estoque: isAlerta,
        responsavel: user.nome
      };
    }

    // SQLite
    const prod = queryOne('SELECT * FROM produtos WHERE id = ?', [produto_id]);
    if (!prod) throw new Error('Produto não encontrado');

    let stockRow = queryOne(
      'SELECT id, central, quantidade FROM estoque_centrais WHERE produto_id = ? AND central = ?',
      [produto_id, targetCentral]
    );
    if (!stockRow && targetCentral !== central) {
      stockRow = queryOne(
        'SELECT id, central, quantidade FROM estoque_centrais WHERE produto_id = ? AND central = ?',
        [produto_id, central]
      );
    }
    const currentStock = stockRow ? stockRow.quantidade : 0;
    const actualCentralName = stockRow?.central || targetCentral;

    if (qtd > currentStock) {
      throw new Error(`Estoque insuficiente na ${actualCentralName}! Saldo disponível: ${currentStock} ${prod.unidade_medida}(s), solicitado: ${qtd}.`);
    }

    const novoSaldo = currentStock - qtd;

    if (stockRow) {
      db.prepare(`
        UPDATE estoque_centrais SET quantidade = ? WHERE id = ?
      `).run(novoSaldo, stockRow.id);
    } else {
      db.prepare(`
        INSERT INTO estoque_centrais (produto_id, central, quantidade) VALUES (?, ?, ?)
      `).run(produto_id, actualCentralName, novoSaldo);
    }

    db.prepare(`
      INSERT INTO movimentacoes (produto_id, tipo, central, quantidade, usuario_id, observacao)
      VALUES (?, 'SAIDA', ?, ?, ?, ?)
    `).run(produto_id, actualCentralName, qtd, user.id, observacao ? observacao.trim() : `Saída rápida de estoque - ${actualCentralName}`);

    const isAlerta = novoSaldo <= (prod.estoque_minimo || 5);

    return {
      success: true,
      message: `Saída de ${qtd} ${prod.unidade_medida}(s) registrada com sucesso!`,
      produto_nome: prod.nome,
      central: actualCentralName,
      quantidade: qtd,
      novo_saldo: novoSaldo,
      estoque_minimo: prod.estoque_minimo,
      is_alerta_estoque: isAlerta,
      responsavel: user.nome
    };
  },

  async registrarEntrada({ produto_id, central, quantidade, observacao }, user) {
    const qtd = parseInt(quantidade, 10);
    const targetCentral = normalizeCentral(central);

    if (isSupabaseConfigured()) {
      const prod = await this.getProdutoById(produto_id);
      if (!prod) throw new Error('Produto não encontrado');

      // Obter saldo da central (tenta nome normalizado, fallback para original)
      let { data: stockRow } = await supabase
        .from('estoque_centrais')
        .select('id, central, quantidade')
        .eq('produto_id', produto_id)
        .eq('central', targetCentral)
        .maybeSingle();

      if (!stockRow && targetCentral !== central) {
        const { data: legacyRow } = await supabase
          .from('estoque_centrais')
          .select('id, central, quantidade')
          .eq('produto_id', produto_id)
          .eq('central', central)
          .maybeSingle();
        if (legacyRow) stockRow = legacyRow;
      }

      const currentStock = stockRow ? Number(stockRow.quantidade) : 0;
      const novoSaldo = currentStock + qtd;
      const actualCentralName = stockRow?.central || targetCentral;

      if (stockRow) {
        await supabase
          .from('estoque_centrais')
          .update({ quantidade: novoSaldo })
          .eq('id', stockRow.id);
      } else {
        await supabase
          .from('estoque_centrais')
          .insert([{ produto_id, central: actualCentralName, quantidade: novoSaldo }]);
      }

      await supabase.from('movimentacoes').insert([{
        produto_id,
        tipo: 'ENTRADA',
        central: actualCentralName,
        quantidade: qtd,
        usuario_id: user.id,
        observacao: observacao ? observacao.trim() : `Entrada / Reposição de estoque - ${actualCentralName}`
      }]);

      return {
        success: true,
        message: `Entrada de ${qtd} ${prod.unidade_medida}(s) registrada com sucesso!`,
        produto_nome: prod.nome,
        central: actualCentralName,
        quantidade: qtd,
        novo_saldo: novoSaldo,
        responsavel: user.nome
      };
    }

    // SQLite
    const prod = queryOne('SELECT * FROM produtos WHERE id = ?', [produto_id]);
    if (!prod) throw new Error('Produto não encontrado');

    let stockRow = queryOne(
      'SELECT id, central, quantidade FROM estoque_centrais WHERE produto_id = ? AND central = ?',
      [produto_id, targetCentral]
    );
    if (!stockRow && targetCentral !== central) {
      stockRow = queryOne(
        'SELECT id, central, quantidade FROM estoque_centrais WHERE produto_id = ? AND central = ?',
        [produto_id, central]
      );
    }

    let currentStock = stockRow ? stockRow.quantidade : 0;
    const actualCentralName = stockRow?.central || targetCentral;
    const novoSaldo = currentStock + qtd;

    if (stockRow) {
      db.prepare(`
        UPDATE estoque_centrais SET quantidade = ? WHERE id = ?
      `).run(novoSaldo, stockRow.id);
    } else {
      db.prepare(`
        INSERT INTO estoque_centrais (produto_id, central, quantidade) VALUES (?, ?, ?)
      `).run(produto_id, actualCentralName, novoSaldo);
    }

    db.prepare(`
      INSERT INTO movimentacoes (produto_id, tipo, central, quantidade, usuario_id, observacao)
      VALUES (?, 'ENTRADA', ?, ?, ?, ?)
    `).run(produto_id, actualCentralName, qtd, user.id, observacao ? observacao.trim() : `Entrada de estoque - ${actualCentralName}`);

    return {
      success: true,
      message: `Entrada de ${qtd} ${prod.unidade_medida}(s) registrada com sucesso!`,
      produto_nome: prod.nome,
      central,
      quantidade: qtd,
      novo_saldo: currentStock + qtd,
      responsavel: user.nome
    };
  },

  async getMovimentacoes({ limit = 50, tipo, central, produto_id }) {
    if (isSupabaseConfigured()) {
      let query = supabase
        .from('movimentacoes')
        .select(`
          id, tipo, central, quantidade, observacao, data_movimentacao,
          produtos (id, nome, codigo_barras, unidade_medida, categoria),
          usuarios (id, nome)
        `)
        .order('data_movimentacao', { ascending: false })
        .limit(limit);

      if (tipo) query = query.eq('tipo', tipo);
      if (central && central !== 'Todas') query = query.eq('central', central);
      if (produto_id) query = query.eq('produto_id', produto_id);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        produto_id: m.produtos?.id,
        tipo: m.tipo,
        central: m.central,
        quantidade: m.quantidade,
        observacao: m.observacao,
        data_movimentacao: m.data_movimentacao,
        produto_nome: m.produtos?.nome || 'Produto Removido',
        codigo_barras: m.produtos?.codigo_barras || '',
        unidade_medida: m.produtos?.unidade_medida || 'Unidade',
        categoria: m.produtos?.categoria || 'Outros',
        usuario_nome: m.usuarios?.nome || 'Usuário'
      }));
    }

    // SQLite
    let sql = `
      SELECT 
        m.*,
        p.nome AS produto_nome,
        p.codigo_barras,
        p.unidade_medida,
        p.categoria,
        u.nome AS usuario_nome
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (tipo) { sql += ` AND m.tipo = ?`; params.push(tipo); }
    if (central && central !== 'Todas') { sql += ` AND m.central = ?`; params.push(central); }
    if (produto_id) { sql += ` AND m.produto_id = ?`; params.push(produto_id); }
    sql += ` ORDER BY m.data_movimentacao DESC LIMIT ?`;
    params.push(limit);

    return queryAll(sql, params);
  },

  // ----------------------------------------------------------------------------
  // DASHBOARD E INDICADORES
  // ----------------------------------------------------------------------------
  async getDashboardData({ periodo = '7dias', central }) {
    if (isSupabaseConfigured()) {
      const now = new Date();
      let startDate = new Date();
      if (periodo === 'hoje') {
        startDate.setHours(0, 0, 0, 0);
      } else if (periodo === '7dias') {
        startDate.setDate(now.getDate() - 7);
      } else if (periodo === 'mes') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data: prods, error: pErr } = await supabase
        .from('produtos')
        .select('id, nome, categoria, unidade_medida, estoque_minimo, estoque_centrais(central, quantidade)');

      if (pErr) throw pErr;

      const totalProdutos = prods?.length || 0;
      let totalUnidadesEstoque = 0;
      let itensEmAlertaCount = 0;

      (prods || []).forEach(p => {
        const c1Obj = p.estoque_centrais?.find(ec => normalizeCentral(ec.central) === 'Central Piçarras');
        const c2Obj = p.estoque_centrais?.find(ec => normalizeCentral(ec.central) === 'Central Penha');
        const c3Obj = p.estoque_centrais?.find(ec => normalizeCentral(ec.central) === 'Central Armação');
        const c4Obj = p.estoque_centrais?.find(ec => normalizeCentral(ec.central) === 'Rentter');
        const q1 = c1Obj ? Number(c1Obj.quantidade) : 0;
        const q2 = c2Obj ? Number(c2Obj.quantidade) : 0;
        const q3 = c3Obj ? Number(c3Obj.quantidade) : 0;
        const q4 = c4Obj ? Number(c4Obj.quantidade) : 0;
        const total = q1 + q2 + q3 + q4;

        const targetNorm = normalizeCentral(central);
        if (targetNorm === 'Central Piçarras') {
          totalUnidadesEstoque += q1;
          if (q1 <= p.estoque_minimo) itensEmAlertaCount++;
        } else if (targetNorm === 'Central Penha') {
          totalUnidadesEstoque += q2;
          if (q2 <= p.estoque_minimo) itensEmAlertaCount++;
        } else if (targetNorm === 'Central Armação') {
          totalUnidadesEstoque += q3;
          if (q3 <= p.estoque_minimo) itensEmAlertaCount++;
        } else if (targetNorm === 'Rentter') {
          totalUnidadesEstoque += q4;
          if (q4 <= p.estoque_minimo) itensEmAlertaCount++;
        } else {
          totalUnidadesEstoque += total;
          if (total <= p.estoque_minimo || q1 <= p.estoque_minimo || q2 <= p.estoque_minimo || q3 <= p.estoque_minimo || q4 <= p.estoque_minimo) {
            itensEmAlertaCount++;
          }
        }
      });

      const { data: allMovs, error: mErr } = await supabase
        .from('movimentacoes')
        .select(`
          id, tipo, central, quantidade, observacao, data_movimentacao, produto_id,
          produtos (nome, categoria, unidade_medida),
          usuarios (nome)
        `)
        .order('data_movimentacao', { ascending: false });

      if (mErr) throw mErr;

      const movs = allMovs || [];
      const movsPeriodo = movs.filter(m => new Date(m.data_movimentacao) >= startDate);
      const saidasPeriodo = movsPeriodo.filter(m => m.tipo === 'SAIDA');

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const movsHoje = movs.filter(m => new Date(m.data_movimentacao) >= todayStart);

      const targetNorm = normalizeCentral(central);

      const totalMovimentacoesHoje = targetNorm && targetNorm !== 'Todas'
        ? movsHoje.filter(m => normalizeCentral(m.central) === targetNorm).length
        : movsHoje.length;

      const totalSaidasPeriodo = (targetNorm && targetNorm !== 'Todas'
        ? saidasPeriodo.filter(m => normalizeCentral(m.central) === targetNorm)
        : saidasPeriodo).reduce((acc, m) => acc + Number(m.quantidade), 0);

      const centraisMap = {
        'Central Piçarras': { central: 'Central Piçarras', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#3b82f6' },
        'Central Penha': { central: 'Central Penha', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#22c55e' },
        'Central Armação': { central: 'Central Armação', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#a855f7' },
        'Rentter': { central: 'Rentter', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#f59e0b' }
      };

      let totalGeralSaidas = 0;
      saidasPeriodo.forEach(m => {
        const norm = normalizeCentral(m.central);
        if (centraisMap[norm]) {
          centraisMap[norm].total_quantidade += Number(m.quantidade);
          centraisMap[norm].total_registros += 1;
          totalGeralSaidas += Number(m.quantidade);
        }
      });

      const consumoComparativo = Object.values(centraisMap).map(c => ({
        ...c,
        percentual: totalGeralSaidas > 0 ? Number(((c.total_quantidade / totalGeralSaidas) * 100).toFixed(1)) : 0
      }));

      const calcTop5 = (cName) => {
        const target = cName ? normalizeCentral(cName) : null;
        const filtered = target ? saidasPeriodo.filter(m => normalizeCentral(m.central) === target) : saidasPeriodo;
        const itemMap = {};
        filtered.forEach(m => {
          const pid = m.produto_id;
          if (!itemMap[pid]) {
            itemMap[pid] = {
              id: pid,
              nome: m.produtos?.nome || 'Produto',
              categoria: m.produtos?.categoria || 'Outros',
              unidade_medida: m.produtos?.unidade_medida || 'Unidade',
              total_consumido: 0
            };
          }
          itemMap[pid].total_consumido += Number(m.quantidade);
        });
        return Object.values(itemMap).sort((a, b) => b.total_consumido - a.total_consumido).slice(0, 5);
      };

      const atividadesRecentes = movs.slice(0, 8).map(m => ({
        id: m.id,
        tipo: m.tipo,
        central: normalizeCentral(m.central) || m.central,
        quantidade: m.quantidade,
        observacao: m.observacao,
        data_movimentacao: m.data_movimentacao,
        produto_nome: m.produtos?.nome || 'Produto',
        usuario_nome: m.usuarios?.nome || 'Usuário'
      }));

      return {
        periodo,
        kpis: {
          total_produtos: totalProdutos,
          total_unidades_estoque: totalUnidadesEstoque,
          total_movimentacoes_hoje: totalMovimentacoesHoje,
          total_saidas_periodo: totalSaidasPeriodo,
          itens_em_alerta: itensEmAlertaCount
        },
        consumo_comparativo: consumoComparativo,
        total_geral_saidas: totalGeralSaidas,
        top5_por_central: {
          'Central Piçarras': calcTop5('Central Piçarras'),
          'Central Penha': calcTop5('Central Penha'),
          'Central Armação': calcTop5('Central Armação'),
          'Rentter': calcTop5('Rentter'),
          'Geral': calcTop5(null)
        },
        atividades_recentes: atividadesRecentes
      };
    }

    // SQLite
    let dateFilter = '';
    if (periodo === 'hoje') {
      dateFilter = ` AND date(data_movimentacao, 'localtime') = date('now', 'localtime')`;
    } else if (periodo === '7dias') {
      dateFilter = ` AND data_movimentacao >= datetime('now', '-7 days', 'localtime')`;
    } else if (periodo === 'mes') {
      dateFilter = ` AND data_movimentacao >= date('now', 'start of month', 'localtime')`;
    }

    const targetNorm = normalizeCentral(central);
    let centralWhereEC = '';
    let centralParamsEC = [];
    let centralWhereM = '';
    let centralParamsM = [];

    if (targetNorm && targetNorm !== 'Todas') {
      if (targetNorm === 'Central Piçarras') {
        centralWhereEC = `WHERE central IN ('Central Piçarras', 'Central 1')`;
        centralWhereM = `AND central IN ('Central Piçarras', 'Central 1')`;
      } else if (targetNorm === 'Central Penha') {
        centralWhereEC = `WHERE central IN ('Central Penha', 'Central 2')`;
        centralWhereM = `AND central IN ('Central Penha', 'Central 2')`;
      } else if (targetNorm === 'Central Armação') {
        centralWhereEC = `WHERE central IN ('Central Armação', 'Central 3')`;
        centralWhereM = `AND central IN ('Central Armação', 'Central 3')`;
      } else if (targetNorm === 'Rentter') {
        centralWhereEC = `WHERE central = 'Rentter'`;
        centralWhereM = `AND central = 'Rentter'`;
      }
    }

    const totalProdutos = queryOne('SELECT COUNT(*) as total FROM produtos')?.total || 0;
    const totalUnidadesEstoque = queryOne(`
      SELECT COALESCE(SUM(quantidade), 0) as total 
      FROM estoque_centrais
      ${centralWhereEC}
    `, centralParamsEC)?.total || 0;

    const totalMovimentacoesHoje = queryOne(`
      SELECT COUNT(*) as total 
      FROM movimentacoes 
      WHERE date(data_movimentacao, 'localtime') = date('now', 'localtime')
      ${centralWhereM}
    `, centralParamsM)?.total || 0;

    const totalSaidasPeriodo = queryOne(`
      SELECT COALESCE(SUM(quantidade), 0) as total 
      FROM movimentacoes 
      WHERE tipo = 'SAIDA' ${dateFilter}
      ${centralWhereM}
    `, centralParamsM)?.total || 0;

    const produtosAlerta = queryAll(`
      SELECT 
        p.id, p.nome, p.estoque_minimo,
        COALESCE(c1.quantidade, 0) AS c1,
        COALESCE(c2.quantidade, 0) AS c2,
        COALESCE(c3.quantidade, 0) AS c3,
        COALESCE(c4.quantidade, 0) AS c4,
        (COALESCE(c1.quantidade, 0) + COALESCE(c2.quantidade, 0) + COALESCE(c3.quantidade, 0) + COALESCE(c4.quantidade, 0)) AS total
      FROM produtos p
      LEFT JOIN estoque_centrais c1 ON p.id = c1.produto_id AND (c1.central = 'Central Piçarras' OR c1.central = 'Central 1')
      LEFT JOIN estoque_centrais c2 ON p.id = c2.produto_id AND (c2.central = 'Central Penha' OR c2.central = 'Central 2')
      LEFT JOIN estoque_centrais c3 ON p.id = c3.produto_id AND (c3.central = 'Central Armação' OR c3.central = 'Central 3')
      LEFT JOIN estoque_centrais c4 ON p.id = c4.produto_id AND c4.central = 'Rentter'
    `);

    let itensEmAlertaCount = 0;
    produtosAlerta.forEach(p => {
      const min = p.estoque_minimo;
      if (targetNorm === 'Central Piçarras') {
        if (p.c1 <= min) itensEmAlertaCount++;
      } else if (targetNorm === 'Central Penha') {
        if (p.c2 <= min) itensEmAlertaCount++;
      } else if (targetNorm === 'Central Armação') {
        if (p.c3 <= min) itensEmAlertaCount++;
      } else if (targetNorm === 'Rentter') {
        if (p.c4 <= min) itensEmAlertaCount++;
      } else {
        if (p.total <= min || p.c1 <= min || p.c2 <= min || p.c3 <= min || p.c4 <= min) {
          itensEmAlertaCount++;
        }
      }
    });

    const saidasPorCentral = queryAll(`
      SELECT 
        central, 
        COALESCE(SUM(quantidade), 0) as total_quantidade,
        COUNT(*) as total_registros
      FROM movimentacoes
      WHERE tipo = 'SAIDA' ${dateFilter}
      GROUP BY central
    `);

    const centraisMap = {
      'Central Piçarras': { central: 'Central Piçarras', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#3b82f6' },
      'Central Penha': { central: 'Central Penha', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#22c55e' },
      'Central Armação': { central: 'Central Armação', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#a855f7' },
      'Rentter': { central: 'Rentter', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#f59e0b' }
    };

    let totalGeralSaidas = 0;
    saidasPorCentral.forEach(item => {
      const norm = normalizeCentral(item.central);
      if (centraisMap[norm]) {
        centraisMap[norm].total_quantidade += Number(item.total_quantidade);
        centraisMap[norm].total_registros += Number(item.total_registros);
        totalGeralSaidas += Number(item.total_quantidade);
      }
    });

    const consumoComparativo = Object.values(centraisMap).map(c => ({
      ...c,
      percentual: totalGeralSaidas > 0 ? Number(((c.total_quantidade / totalGeralSaidas) * 100).toFixed(1)) : 0
    }));

    const getTop5ForCentral = (centralName) => {
      const norm = normalizeCentral(centralName);
      let cWhere = `m.central = ?`;
      let params = [centralName];
      if (norm === 'Central Piçarras') {
        cWhere = `m.central IN ('Central Piçarras', 'Central 1')`;
        params = [];
      } else if (norm === 'Central Penha') {
        cWhere = `m.central IN ('Central Penha', 'Central 2')`;
        params = [];
      } else if (norm === 'Central Armação') {
        cWhere = `m.central IN ('Central Armação', 'Central 3')`;
        params = [];
      } else if (norm === 'Rentter') {
        cWhere = `m.central = 'Rentter'`;
        params = [];
      }

      return queryAll(`
        SELECT 
          p.id,
          p.nome,
          p.categoria,
          p.unidade_medida,
          COALESCE(SUM(m.quantidade), 0) as total_consumido
        FROM movimentacoes m
        JOIN produtos p ON m.produto_id = p.id
        WHERE m.tipo = 'SAIDA' AND ${cWhere} ${dateFilter}
        GROUP BY p.id
        ORDER BY total_consumido DESC
        LIMIT 5
      `, params);
    };

    const top5Geral = queryAll(`
      SELECT 
        p.id,
        p.nome,
        p.categoria,
        p.unidade_medida,
        COALESCE(SUM(m.quantidade), 0) as total_consumido
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      WHERE m.tipo = 'SAIDA' ${dateFilter}
      GROUP BY p.id
      ORDER BY total_consumido DESC
      LIMIT 5
    `);

    const atividadesRecentes = queryAll(`
      SELECT 
        m.*,
        p.nome AS produto_nome,
        u.nome AS usuario_nome
      FROM movimentacoes m
      JOIN produtos p ON m.produto_id = p.id
      JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.data_movimentacao DESC
      LIMIT 8
    `).map(m => ({
      ...m,
      central: normalizeCentral(m.central) || m.central
    }));

    return {
      periodo,
      kpis: {
        total_produtos: totalProdutos,
        total_unidades_estoque: totalUnidadesEstoque,
        total_movimentacoes_hoje: totalMovimentacoesHoje,
        total_saidas_periodo: totalSaidasPeriodo,
        itens_em_alerta: itensEmAlertaCount
      },
      consumo_comparativo: consumoComparativo,
      total_geral_saidas: totalGeralSaidas,
      top5_por_central: {
        'Central Piçarras': getTop5ForCentral('Central Piçarras'),
        'Central Penha': getTop5ForCentral('Central Penha'),
        'Central Armação': getTop5ForCentral('Central Armação'),
        'Rentter': getTop5ForCentral('Rentter'),
        'Geral': top5Geral
      },
      atividades_recentes: atividadesRecentes
    };
  }
};

module.exports = dataService;
