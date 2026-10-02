# 🚀 Guia de Integração com o Supabase (PostgreSQL na Nuvem)

O **Estoque Vetter** agora suporta conexão direta com o **Supabase** (PostgreSQL na nuvem), garantindo:
- **Persistência Real dos Dados:** Seus produtos, estoque e movimentações nunca são perdidos quando a Vercel reinicia.
- **Sincronização entre as 3 Centrais:** Qualquer saída feita em um tablet na Central 1 atualiza imediatamente na Central 2, Central 3 e no painel do Administrador.
- **Storage Dedicado para Fotos:** As fotos dos produtos são salvas diretamente no Supabase Storage (`produtos-fotos`), com URLs públicas de carregamento ultrarrápido.

---

## Passo 1: Criar o Projeto Gratuito no Supabase (1 minuto)

1. Acesse **[https://supabase.com](https://supabase.com)** e faça login ou crie uma conta gratuita.
2. Clique em **"New Project"**.
3. Preencha:
   - **Name:** `Estoque-Vetter`
   - **Database Password:** crie uma senha forte e guarde-a.
   - **Region:** Selecione **São Paulo (South America / sa-east-1)** para menor latência no Brasil.
4. Clique em **"Create new project"** e aguarde cerca de 1 minuto até o projeto inicializar.

---

## Passo 2: Executar o Script SQL das Tabelas e Fotos

1. No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (ou acesse `https://supabase.com/dashboard/project/_/sql`).
2. Clique em **"New query"**.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste projeto, copie todo o seu conteúdo e cole no editor do Supabase.
4. Clique no botão verde **"Run"** (ou pressione `Ctrl + Enter`).
5. Você verá a mensagem **"Success. No rows returned"**. 
   * As tabelas `usuarios`, `produtos`, `estoque_centrais`, `movimentacoes` e o bucket de storage `produtos-fotos` foram criados e populados automaticamente com os dados padrão!

---

## Passo 3: Copiar as Credenciais do Supabase

1. No menu lateral esquerdo do Supabase, clique no ícone de engrenagem **Project Settings** (na parte inferior).
2. Clique em **API** (em Configuration).
3. Copie os seguintes valores:
   - **Project URL:** algo como `https://abcdefghijklmnopqrst.supabase.co`
   - **anon / public key:** a chave que começa com `eyJhbGciOi...`
   - *(Opcional, recomendado para o servidor)* **service_role key:** a chave secreta que começa com `eyJhbGciOi...`

---

## Passo 4: Configurar as Variáveis na Vercel

1. Acesse o painel da **[Vercel](https://vercel.com/dashboard)**.
2. Clique no seu projeto **estoquevetter**.
3. Vá em **Settings** ➔ **Environment Variables**.
4. Adicione as 2 variáveis:
   - **Key:** `SUPABASE_URL` | **Value:** *(Sua URL do Supabase)*
   - **Key:** `SUPABASE_ANON_KEY` | **Value:** *(Sua Chave anon ou service_role)*
5. Marque as opções de ambientes: **Production**, **Preview**, **Development**.
6. Clique em **Save**.
7. Vá na aba **Deployments**, clique nos `...` do último deploy e selecione **Redeploy** (ou faça um novo push no GitHub).

Pronto! O seu Estoque Vetter agora opera conectado ao banco de dados PostgreSQL na nuvem do Supabase!
