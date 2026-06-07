# TakeOne — CRM para Cineastas

**TakeOne** é um SaaS CRM web voltado para cineastas e produtores audiovisuais. Gerencia clientes, pacotes de serviços, agenda de gravações, pipeline de pós-produção e controle financeiro — tudo em um só lugar.

---

## Funcionalidades

- **Dashboard** — métricas em tempo real, alertas inteligentes e gráfico de receita dos últimos 6 meses
- **Agenda** — calendário mensal com sync bidirecional com o Google Calendar
- **Clientes & Pacotes** — gestão completa de clientes, pacotes de serviço e portfólio de referências; geração de propostas em PDF
- **Pipeline de Pós-Produção** — acompanhamento de vídeos por status (Editado → Entregue → Postado) com notas e histórico de atividade
- **Pagamentos** — controle financeiro por mês, registro de pagamentos e geração de recibos em PDF
- **Configurações** — perfil, empresa, tema dark/light, troca de senha
- **Painel Admin** — gerenciamento de usuários, planos, assinaturas, métricas SaaS e audit log (acesso restrito a admins)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite |
| Roteamento | React Router DOM 7 |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Edge Functions | Supabase Edge Functions (Deno/TypeScript) |
| Ícones | Lucide React |
| Gráficos | Recharts |
| PDF | jsPDF |

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Projeto no [Google Cloud Console](https://console.cloud.google.com) (para integração com Google Calendar)

---

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd filmmakercrm

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# Crie .env na raiz (veja seção abaixo)

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://[seu-projeto].supabase.co
VITE_SUPABASE_ANON_KEY=[sua-anon-key]
VITE_GOOGLE_CLIENT_ID=[seu-google-client-id]
```

### Secrets das Edge Functions

Configure no Supabase Dashboard → Edge Functions → Secrets:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=postmessage
TOKEN_ENCRYPTION_KEY=[hex com 64 caracteres — AES-256]
```

---

## Configuração do Banco de Dados

### Tabelas do CRM

Crie as tabelas no SQL Editor do Supabase com RLS habilitado e política `user_id = auth.uid()`:

`clients` · `packages` · `sessions` · `videos` · `payments` · `references` · `pipeline_settings` · `google_tokens` · `rate_limit_logs`

### Tabelas do painel admin

Execute o arquivo `supabase/migration_admin.sql` no SQL Editor do Supabase. Ele cria:

- Tabelas: `user_profiles`, `plans`, `subscriptions`, `subscription_payments`, `admin_actions`
- Funções: `is_admin()`, `admin_get_users()`, `admin_get_user_stats()`
- Trigger de criação automática de perfil no signup
- Seed com 4 planos padrão (Free, Starter, Pro, Studio)

### Promover um usuário a admin

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE user_id = '<uuid-do-usuario>';
```

---

## Deploy das Edge Functions

```bash
# Google Calendar (OAuth + tokens criptografados)
supabase functions deploy google-calendar

# Painel Admin (ações administrativas sensíveis)
supabase functions deploy admin
```

---

## Scripts disponíveis

```bash
npm run dev       # servidor dev em localhost:5173
npm run build     # build de produção
npm run preview   # preview do build
npm run lint      # checar linting
```

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── admin/          # Painel administrativo
│   ├── Dashboard.jsx
│   ├── Calendar.jsx
│   ├── Clients.jsx
│   ├── Packages.jsx
│   ├── PostControl.jsx
│   ├── Payments.jsx
│   └── Settings.jsx
├── contexts/
│   ├── AuthContext.jsx   # Auth + role/isAdmin
│   └── ThemeContext.jsx  # Tema dark/light
├── hooks/
│   ├── useSupabaseData.js    # CRUDs centralizados com otimismo
│   ├── useAdminData.js       # Dados do painel admin
│   ├── useSubscription.js    # Assinatura ativa do usuário
│   └── useGoogleCalendar.js  # Integração Google Calendar
└── lib/
    ├── supabase.js       # Cliente Supabase (singleton)
    └── adminActions.js   # Ações admin via Edge Function
supabase/
├── functions/
│   ├── google-calendar/  # OAuth + criptografia AES-256-GCM
│   └── admin/            # Ações sensíveis (suspender, trocar role, etc.)
└── migration_admin.sql
```

---

## Segurança

- Isolamento total de dados por usuário via **Row Level Security**
- Refresh tokens do Google Calendar criptografados com **AES-256-GCM**
- Rate limiting nas Edge Functions (janela deslizante de 1 hora)
- Ações administrativas executadas exclusivamente via Edge Function com `service_role`
- Audit log completo de todas as ações do painel admin

---

## Planos de Assinatura

| Plano | Preço/mês | Clientes | Pacotes |
|-------|-----------|----------|---------|
| Free | Grátis | 3 | 5 |
| Starter | R$ 29 | 15 | 30 |
| Pro | R$ 79 | Ilimitado | Ilimitado |
| Studio | R$ 199 | Ilimitado | Ilimitado + Multi-usuário |

---

## Licença

Proprietário — todos os direitos reservados.
