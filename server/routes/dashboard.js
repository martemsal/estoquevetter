const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => {
  try {
    const { periodo = '7dias', central } = req.query;

    // Date condition builder for SQLite
    let dateFilter = '';
    if (periodo === 'hoje') {
      dateFilter = ` AND date(data_movimentacao, 'localtime') = date('now', 'localtime')`;
    } else if (periodo === '7dias') {
      dateFilter = ` AND data_movimentacao >= datetime('now', '-7 days', 'localtime')`;
    } else if (periodo === 'mes') {
      dateFilter = ` AND data_movimentacao >= date('now', 'start of month', 'localtime')`;
    }

    // 1. KPI Cards
    const totalProdutos = queryOne('SELECT COUNT(*) as total FROM produtos')?.total || 0;
    
    const totalUnidadesEstoque = queryOne(`
      SELECT COALESCE(SUM(quantidade), 0) as total 
      FROM estoque_centrais
      ${central && central !== 'Todas' ? 'WHERE central = ?' : ''}
    `, central && central !== 'Todas' ? [central] : [])?.total || 0;

    const totalMovimentacoesHoje = queryOne(`
      SELECT COUNT(*) as total 
      FROM movimentacoes 
      WHERE date(data_movimentacao, 'localtime') = date('now', 'localtime')
      ${central && central !== 'Todas' ? 'AND central = ?' : ''}
    `, central && central !== 'Todas' ? [central] : [])?.total || 0;

    const totalSaidasPeriodo = queryOne(`
      SELECT COALESCE(SUM(quantidade), 0) as total 
      FROM movimentacoes 
      WHERE tipo = 'SAIDA' ${dateFilter}
      ${central && central !== 'Todas' ? 'AND central = ?' : ''}
    `, central && central !== 'Todas' ? [central] : [])?.total || 0;

    // Itens em alerta
    const produtosAlerta = queryAll(`
      SELECT 
        p.id, p.nome, p.estoque_minimo,
        COALESCE(c1.quantidade, 0) AS c1,
        COALESCE(c2.quantidade, 0) AS c2,
        COALESCE(c3.quantidade, 0) AS c3,
        (COALESCE(c1.quantidade, 0) + COALESCE(c2.quantidade, 0) + COALESCE(c3.quantidade, 0)) AS total
      FROM produtos p
      LEFT JOIN estoque_centrais c1 ON p.id = c1.produto_id AND c1.central = 'Central 1'
      LEFT JOIN estoque_centrais c2 ON p.id = c2.produto_id AND c2.central = 'Central 2'
      LEFT JOIN estoque_centrais c3 ON p.id = c3.produto_id AND c3.central = 'Central 3'
    `);

    let itensEmAlertaCount = 0;
    produtosAlerta.forEach(p => {
      const min = p.estoque_minimo;
      if (central === 'Central 1') {
        if (p.c1 <= min) itensEmAlertaCount++;
      } else if (central === 'Central 2') {
        if (p.c2 <= min) itensEmAlertaCount++;
      } else if (central === 'Central 3') {
        if (p.c3 <= min) itensEmAlertaCount++;
      } else {
        if (p.total <= min || p.c1 <= min || p.c2 <= min || p.c3 <= min) {
          itensEmAlertaCount++;
        }
      }
    });

    // 2. Gráfico de Consumo Comparativo (Central 1 vs Central 2 vs Central 3)
    const saidasPorCentral = queryAll(`
      SELECT 
        central, 
        COALESCE(SUM(quantidade), 0) as total_quantidade,
        COUNT(*) as total_registros
      FROM movimentacoes
      WHERE tipo = 'SAIDA' ${dateFilter}
      GROUP BY central
    `);

    // Ensure all 3 centrais exist in result
    const centraisMap = {
      'Central 1': { central: 'Central 1', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#3b82f6' },
      'Central 2': { central: 'Central 2', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#22c55e' },
      'Central 3': { central: 'Central 3', total_quantidade: 0, total_registros: 0, percentual: 0, cor: '#a855f7' }
    };

    let totalGeralSaidas = 0;
    saidasPorCentral.forEach(item => {
      if (centraisMap[item.central]) {
        centraisMap[item.central].total_quantidade = Number(item.total_quantidade);
        centraisMap[item.central].total_registros = Number(item.total_registros);
        totalGeralSaidas += Number(item.total_quantidade);
      }
    });

    const consumoComparativo = Object.values(centraisMap).map(c => ({
      ...c,
      percentual: totalGeralSaidas > 0 ? Number(((c.total_quantidade / totalGeralSaidas) * 100).toFixed(1)) : 0
    }));

    // 3. Top 5 Itens Mais Consumidos por Central
    const getTop5ForCentral = (centralName) => {
      return queryAll(`
        SELECT 
          p.id,
          p.nome,
          p.categoria,
          p.unidade_medida,
          COALESCE(SUM(m.quantidade), 0) as total_consumido
        FROM movimentacoes m
        JOIN produtos p ON m.produto_id = p.id
        WHERE m.tipo = 'SAIDA' AND m.central = ? ${dateFilter}
        GROUP BY p.id
        ORDER BY total_consumido DESC
        LIMIT 5
      `, [centralName]);
    };

    const top5Central1 = getTop5ForCentral('Central 1');
    const top5Central2 = getTop5ForCentral('Central 2');
    const top5Central3 = getTop5ForCentral('Central 3');

    // Top 5 Geral Consolidado
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

    // 4. Atividades recentes do dia
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
    `);

    res.json({
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
        'Central 1': top5Central1,
        'Central 2': top5Central2,
        'Central 3': top5Central3,
        'Geral': top5Geral
      },
      atividades_recentes: atividadesRecentes
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).json({ error: 'Erro ao gerar dados do dashboard: ' + err.message });
  }
});

module.exports = router;
