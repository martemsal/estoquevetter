-- ==============================================================================
-- MIGRAÇÃO SUPABASE: 4 CENTRAIS DE ESTOQUE VETTER
-- Central Piçarras, Central Penha, Central Armação e Rentter
-- Execute este script no SQL Editor do seu console Supabase
-- ==============================================================================

-- 1. Atualizar Tabela: usuarios
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_central_padrao_check;

ALTER TABLE usuarios ADD CONSTRAINT usuarios_central_padrao_check 
    CHECK (central_padrao IN ('Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter', 'Central 1', 'Central 2', 'Central 3', 'Todas'));

UPDATE usuarios SET central_padrao = 'Central Piçarras' WHERE central_padrao IN ('Central 1', 'Central 01');
UPDATE usuarios SET central_padrao = 'Central Penha'    WHERE central_padrao IN ('Central 2', 'Central 02');
UPDATE usuarios SET central_padrao = 'Central Armação'  WHERE central_padrao IN ('Central 3', 'Central 03');


-- 2. Atualizar Tabela: estoque_centrais
ALTER TABLE estoque_centrais DROP CONSTRAINT IF EXISTS estoque_centrais_central_check;

ALTER TABLE estoque_centrais ADD CONSTRAINT estoque_centrais_central_check 
    CHECK (central IN ('Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter', 'Central 1', 'Central 2', 'Central 3'));

UPDATE estoque_centrais SET central = 'Central Piçarras' WHERE central IN ('Central 1', 'Central 01');
UPDATE estoque_centrais SET central = 'Central Penha'    WHERE central IN ('Central 2', 'Central 02');
UPDATE estoque_centrais SET central = 'Central Armação'  WHERE central IN ('Central 3', 'Central 03');

-- Inserir registro de estoque da central 'Rentter' com quantidade 0 para produtos existentes que ainda não o possuem
INSERT INTO estoque_centrais (produto_id, central, quantidade)
SELECT id, 'Rentter', 0
FROM produtos
WHERE id NOT IN (
    SELECT produto_id FROM estoque_centrais WHERE central = 'Rentter'
);


-- 3. Atualizar Tabela: movimentacoes
ALTER TABLE movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_central_check;

ALTER TABLE movimentacoes ADD CONSTRAINT movimentacoes_central_check 
    CHECK (central IN ('Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter', 'Central 1', 'Central 2', 'Central 3'));

UPDATE movimentacoes SET central = 'Central Piçarras' WHERE central IN ('Central 1', 'Central 01');
UPDATE movimentacoes SET central = 'Central Penha'    WHERE central IN ('Central 2', 'Central 02');
UPDATE movimentacoes SET central = 'Central Armação'  WHERE central IN ('Central 3', 'Central 03');


-- 4. Opcional: Inserir usuário Gerente da Rentter caso não exista
INSERT INTO usuarios (nome, email, senha, perfil, central_padrao)
VALUES (
    'Rodrigo Santos (Gerente Rentter)',
    'gerente4@estoque.com',
    '$2b$10$tmgVovG3E.UBbilffB2KaeeVZCHi4h9H/bDWQqIEayDsLyvEgPdya',
    'Gerente',
    'Rentter'
)
ON CONFLICT (email) DO NOTHING;

-- Notificação de sucesso
SELECT 'Migração para as 4 Centrais executada com sucesso!' AS status;
