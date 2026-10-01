# Estoque Vetter - Aplicativo Tablet de Controle de Estoque (3 Centrais)

Aplicação Web / PWA de alta performance desenvolvida especificamente para operação em **Tablets** (orientação **Paisagem/Landscape** e **Retrato/Portrait**), com suporte a **3 Centrais de Vendas** independentes, registro por foto com câmera do tablet, scanner de código de barras / QR Code, controle de acesso baseado em perfis (RBAC), alertas visuais de estoque baixo e dashboard comparativo com gráficos em tempo real.

Armazenamento local em banco de dados **SQLite** (`estoque_local.db`).

---

## 🚀 Arquitetura & Tecnologias

- **Backend**: Node.js v24 (com motor nativo `node:sqlite`), Express 5, JWT, Bcrypt, Multer.
- **Banco de Dados**: SQLite local (`estoque_local.db`) com Foreign Keys e Journal WAL para máxima integridade e concorrência.
- **Frontend**: React 19, Vite, Tailwind CSS com design industrial de alto contraste e otimizado para toque (touch-friendly com targets ≥ 48px).
- **Gráficos & Métricas**: Recharts (Rosca/Donut de distribuição percentual e Gráfico de Barras comparativo entre Central 1 vs Central 2 vs Central 3).
- **Captura & Escaneamento**:
  - `navigator.mediaDevices.getUserMedia` para captura ao vivo com opção de alternar entre câmera traseira/frontal do tablet.
  - `html5-qrcode` para decodificação rápida de códigos de barras (EAN, Code-128, etc.) e QR Codes direto pelo tablet.
- **PWA (Progressive Web App)**: Manifest, Service Worker para cache offline, meta tags para modo Fullscreen Kiosk.

---

## 📋 Módulos e Funcionalidades

### 1. Autenticação e Controle de Acesso (RBAC)
O sistema suporta 3 perfis com regras estritas de autorização no frontend e no backend:

| Perfil | Permissões | Acesso no Tablet |
|---|---|---|
| **Operador** | Registra saídas rápidas (baixa de consumo), entradas de reposição e consulta produtos. | Visão simplificada focada em operação ágil no depósito. |
| **Gerente** | Cadastra e edita produtos, define estoque mínimo, registra movimentações e visualiza relatórios da sua central. | Painel gerencial e catálogo com edição. |
| **Administrador** | Acesso total ao sistema, visão consolidada das 3 centrais, dashboard gerencial completo e gestão de usuários. | Acesso completo e gestão de RBAC. |

> **Acesso Rápido para Demonstração (1-Toque):** No cabeçalho e na tela de login, há um seletor rápido para alternar instantaneamente entre perfis demo (Admin, Gerentes de cada central e Operadores).

### 2. Gestão de Produtos (Cadastro e Entrada)
- **Foto do Produto**: Captura direta via câmera traseira/frontal do tablet com pré-visualização ou upload de imagem.
- **Código de Barras / QR Code**: Campo de texto com botão de **Gerador Automático** e botão de **Escanear via Câmera do Tablet**.
- **Categorias**: Ferramentas, Insumos, Embalagens, Eletrônicos, Outros.
- **Unidades**: Unidade, Caixa, Kg, Litro, Metro.
- **Estoque Mínimo de Alerta**: Controle por steppers numéricos adaptados para dedos.
- **Central Destino Inicial**: Seleção entre Central 1, Central 2 ou Central 3.

### 3. Despacho Rápido de Saída (Consumo por Central)
- Busca rápida por texto ou escaneamento por código de barras.
- **Seleção Obrigatória da Central de Retirada**: Botões grandes com exibição do saldo em tempo real `[ Central 1 ] [ Central 2 ] [ Central 3 ]`.
- **Validação Rigorosa**: Bloqueia saídas superiores ao saldo disponível na central selecionada.
- **Identificação Automática**: O usuário logado é gravado como responsável pelo despacho.
- **Feedback Imediato**: Notificação com novo saldo e efeito de confirmação.

### 4. Alertas de Estoque Baixo
- **Regra de Negócio**: Ativado quando `(Estoque Atual <= Estoque Mínimo)`.
- **Destaque Visual**: Badges pulsantes vermelhos e cartões de alerta na lista de produtos.
- **Aba Dedicada "Itens em Alerta"**: Lista consolidada dos produtos que necessitam de reposição urgente com botão de 1-toque para reabastecimento.
- **Contador no Topo**: Badge numérico em tempo real no cabeçalho.

### 5. Dashboard de Consumo por Central
- **KPI Cards**: Total de produtos, unidades físicas em estoque, movimentações no dia, total de saídas no período e produtos em alerta.
- **Gráficos Comparativos**:
  - **Rosca / Donut**: Distribuição percentual de retiradas entre Central 1, Central 2 e Central 3.
  - **Barras**: Volume absoluto consumido por cada central.
- **Filtros por Período**: Hoje, Últimos 7 dias, Mês Atual.
- **Top 5 Itens Mais Consumidos por Central**: Ranking com barras proporcionais para Central 1, Central 2, Central 3 e Geral.

---

## 🗄️ Estrutura do Banco de Dados SQLite (`estoque_local.db`)

```sql
-- Usuários do Sistema
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    perfil TEXT CHECK(perfil IN ('Operador', 'Gerente', 'Administrador')) NOT NULL,
    central_padrao TEXT CHECK(central_padrao IN ('Central 1', 'Central 2', 'Central 3', 'Todas')),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo de Produtos
CREATE TABLE produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    codigo_barras TEXT UNIQUE,
    categoria TEXT NOT NULL,
    unidade_medida TEXT NOT NULL,
    foto_path TEXT,
    estoque_minimo INTEGER DEFAULT 5,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Estoque por Central (Produto x Central)
CREATE TABLE estoque_centrais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    central TEXT CHECK(central IN ('Central 1', 'Central 2', 'Central 3')) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    UNIQUE(produto_id, central)
);

-- Auditoria e Histórico de Movimentações
CREATE TABLE movimentacoes (
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
```

---

## 🔑 Contas Pré-Cadastradas (Seed Data)

| E-mail | Senha | Nome | Perfil | Central |
|---|---|---|---|---|
| `admin@estoque.com` | `admin123` | Carlos Silva | Administrador | Todas |
| `gerente1@estoque.com` | `gerente123` | Mariana Costa | Gerente | Central 1 |
| `gerente2@estoque.com` | `gerente123` | Roberto Mendes | Gerente | Central 2 |
| `gerente3@estoque.com` | `gerente123` | Fernanda Lima | Gerente | Central 3 |
| `operador@estoque.com` | `operador123` | Lucas Souza | Operador | Central 1 |
| `operador2@estoque.com` | `operador123` | Juliana Rocha | Operador | Central 2 |

---

## 💻 Instruções de Execução

### 1. Iniciar o Servidor Completo (Produção / Tablet Kiosk)
O servidor Express serve a API REST e a aplicação compilada:
```bash
npm start
```
Acesse no navegador do computador ou no Tablet conectado à mesma rede Wi-Fi:
- **No próprio computador**: `http://localhost:3000`
- **No Tablet (rede local)**: `http://[IP_DO_COMPUTADOR]:3000`

### 2. Modo Desenvolvimento com Hot-Reload (Vite + Node)
```bash
npm run dev
```
- Frontend Vite: `http://localhost:5173`
- Backend Express: `http://localhost:3000`

### 3. Recriar e Semear o Banco de Dados
Caso deseje resetar o banco `estoque_local.db` para o estado inicial:
```bash
npm run seed
```
