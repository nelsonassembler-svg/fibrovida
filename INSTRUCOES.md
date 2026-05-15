# FibroVida — Instruções de Instalação e Publicação

## Arquivos do projeto

```
FibroVida/
├── index.html          ← Estrutura HTML completa
├── style.css           ← Estilos visuais
├── app.js              ← Lógica JavaScript + integração Supabase
├── supabase-schema.sql ← SQL para criar o banco de dados
└── INSTRUCOES.md       ← Este arquivo
```

---

## PASSO 1 — Criar conta no Supabase

1. Acesse https://supabase.com e clique em **Start your project**
2. Crie uma conta gratuita (pode usar o Google)
3. Clique em **New Project**
4. Escolha um nome (ex: `fibrovida`) e uma senha forte para o banco
5. Escolha a região mais próxima (ex: São Paulo)
6. Aguarde o projeto ser criado (~2 minutos)

---

## PASSO 2 — Executar o SQL no Supabase

1. No painel do Supabase, clique em **SQL Editor** (ícone de banco de dados)
2. Clique em **New query**
3. Abra o arquivo `supabase-schema.sql` e copie todo o conteúdo
4. Cole no editor SQL e clique em **Run** (ou pressione Ctrl+Enter)
5. Verifique se apareceu "Success. No rows returned" — isso é correto!

---

## PASSO 3 — Obter as credenciais do Supabase

1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie:
   - **Project URL** (ex: `https://xyzxyz.supabase.co`)
   - **anon public** key (chave longa que começa com `eyJ...`)

---

## PASSO 4 — Configurar o app.js

1. Abra o arquivo `app.js`
2. No topo, encontre as linhas:
   ```javascript
   const SUPABASE_URL = "COLE_AQUI_SUA_URL";
   const SUPABASE_ANON_KEY = "COLE_AQUI_SUA_CHAVE_ANON";
   ```
3. Substitua pelos seus valores:
   ```javascript
   const SUPABASE_URL = "https://seuprojeto.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOi...sua_chave_aqui...";
   ```

---

## PASSO 5 — Configurar confirmação de e-mail (opcional)

Para desabilitar a confirmação de e-mail durante testes:
1. No Supabase, vá em **Authentication** → **Providers** → **Email**
2. Desmarque **Confirm email** e salve
3. Reative depois de terminar os testes

Para personalizar o e-mail de confirmação:
1. Vá em **Authentication** → **Email Templates**
2. Edite os templates como desejar

---

## PASSO 6 — Testar localmente

**Opção A — Extensão Live Server no VS Code:**
1. Instale a extensão "Live Server"
2. Clique com botão direito no `index.html`
3. Selecione "Open with Live Server"

**Opção B — Python (se instalado):**
```bash
cd caminho/para/FibroVida
python -m http.server 8080
```
Acesse: http://localhost:8080

**Opção C — Abrir diretamente:**
Dê dois cliques no `index.html` — funciona para testes básicos,
mas o Supabase pode ter restrições de CORS com `file://`.

---

## PASSO 7 — Publicar no GitHub Pages

### 7.1 — Criar repositório no GitHub

1. Acesse https://github.com e faça login
2. Clique em **New repository**
3. Nome: `fibrovida` (ou qualquer nome)
4. Marque **Public**
5. Clique em **Create repository**

### 7.2 — Enviar os arquivos

**Via GitHub.com (mais fácil):**
1. Clique em **uploading an existing file**
2. Arraste os 4 arquivos: `index.html`, `style.css`, `app.js`, `supabase-schema.sql`
3. Clique em **Commit changes**

**Via Git (terminal):**
```bash
git init
git add index.html style.css app.js supabase-schema.sql
git commit -m "FibroVida v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/fibrovida.git
git push -u origin main
```

### 7.3 — Ativar GitHub Pages

1. No repositório, clique em **Settings**
2. Na barra lateral, clique em **Pages**
3. Em **Source**, selecione **Deploy from a branch**
4. Em **Branch**, selecione **main** e pasta **/ (root)**
5. Clique em **Save**
6. Aguarde 1-2 minutos
7. O link aparecerá no topo: `https://SEU_USUARIO.github.io/fibrovida/`

### 7.4 — Configurar CORS no Supabase

1. No Supabase, vá em **Project Settings** → **API**
2. Em **Allowed origins**, adicione:
   - `https://SEU_USUARIO.github.io`
3. Salve as alterações

---

## PASSO 8 — Criar conta de administrador

1. Acesse o app e clique em **Criar conta**
2. Use o e-mail: `nelsontcmagalhaes@gmail.com`
3. Confirme o e-mail (se ativado)
4. O sistema detecta automaticamente este e-mail como administrador
5. Acesse Configurações para ver o badge de Administrador

---

## Funcionalidades por módulo

| Módulo | Funcionalidades |
|--------|----------------|
| Auth | Login, cadastro, recuperação de senha, confirmação por e-mail, LGPD |
| Início | Saudação, frase motivacional, resumo do dia, atalhos rápidos |
| Saúde | Registro de dor (0-10), sono (1-5 estrelas), humor, histórico |
| Tarefas | CRUD, período (manhã/tarde/noite), marcar concluída, filtros |
| Tratamentos | CRUD, status ativo/inativo, frequência |
| Profissionais | CRUD, especialidade, CRM, contato |
| Medicamentos | CRUD, estoque, alerta de estoque baixo |
| Bem-Estar | Diário de gratidão (3 campos), respiração 4-7-8 e profunda |
| Receitas | CRUD, busca, filtro por categoria, visualização detalhada |
| Relatórios | Resumo semanal, gráficos de dor e sono, imprimir/PDF |
| Configurações | Editar perfil, política LGPD, sair, excluir conta |
| Admin | Acesso total a todos os dados do sistema |

---

## Solução de problemas comuns

**"Erro ao conectar" ou tela em branco:**
- Verifique se colou a URL e chave corretamente no `app.js`
- Certifique-se de não ter espaços extras

**"Email not confirmed":**
- Confirme o e-mail na caixa de entrada, ou
- Desative a confirmação em Authentication → Providers → Email

**Dados não aparecem:**
- Verifique se o SQL foi executado corretamente
- Confirme que o RLS está ativado (está ativado por padrão no schema)

**CORS error ao usar no GitHub Pages:**
- Adicione a URL do GitHub Pages em Project Settings → API → Allowed origins

---

## Suporte

- Supabase Docs: https://supabase.com/docs
- GitHub Pages Docs: https://docs.github.com/pages
