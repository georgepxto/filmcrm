# FilmmakerCRM — CLAUDE.md

## Visão Geral do Projeto

**FilmmakerCRM** é um sistema CRM (Customer Relationship Management) web voltado para cineastas e produtores audiovisuais. Gerencia clientes, pacotes de serviços, agenda de gravações, pipeline de pós-produção e controle financeiro.

A interface está em **Português Brasileiro**. O produto é SaaS com auth multi-usuário — cada usuário vê apenas seus próprios dados (Row Level Security no Supabase).

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite |
| Roteamento | React Router 7 |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Edge Functions | Supabase Edge Functions (Deno/TypeScript) |
| Ícones | Lucide React |
| Gráficos | Recharts |
| PDF | jsPDF |
| Linting | ESLint |

---

## Comandos

```bash
npm install          # instalar dependências
npm run dev          # servidor dev em localhost:5173
npm run build        # build de produção
npm run preview      # preview do build
npm run lint         # checar linting
```

---

## Variáveis de Ambiente

Arquivo `.env` na raiz:

```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_GOOGLE_CLIENT_ID=[google-cloud-client-id]
```

Secrets da Edge Function (via Supabase dashboard):

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=postmessage
TOKEN_ENCRYPTION_KEY=[hex 64 chars — AES-256]
```

---

## Estrutura de Diretórios

```
filmmakercrm/
├── src/
│   ├── main.jsx                    # Ponto de entrada React
│   ├── App.jsx                     # Roteador principal + layout sidebar
│   ├── index.css                   # Design system global (variáveis, componentes)
│   ├── App.css                     # Estilos complementares
│   ├── data.js                     # Dados de demo e constantes
│   ├── components/
│   │   ├── Dashboard.jsx           # Página inicial — métricas e alertas
│   │   ├── Calendar.jsx            # Agenda mensal + sync Google Calendar
│   │   ├── Clients.jsx             # Gestão de clientes e pacotes
│   │   ├── Packages.jsx            # Acompanhamento de pacotes de serviço
│   │   ├── PostControl.jsx         # Pipeline Kanban de pós-produção
│   │   ├── Payments.jsx            # Controle financeiro + PDF de recibo
│   │   ├── Settings.jsx            # Perfil do usuário e configurações
│   │   ├── Login.jsx               # Tela de autenticação
│   │   ├── Toast.jsx               # Sistema de notificações toast
│   │   └── ConfirmModal.jsx        # Modal de confirmação para ações destrutivas
│   ├── contexts/
│   │   └── AuthContext.jsx         # Estado global de autenticação (Supabase Auth)
│   ├── hooks/
│   │   ├── useSupabaseData.js      # Hook central de dados — todos os CRUDs
│   │   └── useGoogleCalendar.js    # Integração OAuth + Google Calendar API
│   └── lib/
│       └── supabaseClient.js       # Instância do cliente Supabase
├── supabase/
│   └── functions/
│       └── google-calendar/
│           └── index.ts            # Edge Function: OAuth + token management
├── public/
├── vite.config.js
├── package.json
└── index.html
```

---

## Arquitetura e Fluxo de Dados

```
Supabase Auth
    ↓
AuthContext (React Context)
    └→ useAuth() disponível globalmente
        ↓
    AppLayout (rotas protegidas em App.jsx)
        ↓
    useSupabaseData() — busca e muta dados via Supabase
        ↓
    Componentes recebem dados + callbacks CRUD como props
        ↓
    Mutações → Supabase → estado local atualizado + toast
```

**Fluxo de Sync Google Calendar:**
```
Usuário clica "Conectar Google"
    ↓
useGoogleCalendar.signIn() → OAuth popup
    ↓
Edge Function exchange_code → armazena refresh_token criptografado no DB
    ↓
Access token salvo no localStorage (renovado automaticamente 5min antes de expirar)
    ↓
Sessões CRM + eventos Google Calendar exibidos lado a lado no calendário
```

---

## Modelos de Dados (Supabase)

| Tabela | Campos principais | Propósito |
|--------|-------------------|-----------|
| `clients` | id, user_id, name, contact, email | Diretório de clientes |
| `packages` | id, user_id, client_id, name, total_videos, edited, delivered, posted, status, value, paid, start_date, end_date, billing_cycle | Pacotes de serviço com progresso |
| `sessions` | id, user_id, client_id, title, date, time_start, time_end, service, status, is_all_day, google_event_id | Sessões de gravação/eventos |
| `videos` | id, user_id, client_id, package_id, title, edited, delivered, posted, planned_date | Vídeos com status de pipeline |
| `payments` | id, user_id, client_id, package_id, date, amount, note | Registros financeiros |
| `references` | id, user_id, client_id, title, url, notes | Links de referência por cliente |
| `pipeline_settings` | user_id, notes, links | Notas e utilitários do pipeline |
| `google_tokens` | user_id, refresh_token (criptografado), updated_at | Tokens OAuth Google |
| `rate_limit_logs` | identifier, action, created_at | Rate limiting de API |

Todas as tabelas usam **RLS — Row Level Security**: `user_id = auth.uid()`.

---

## Hooks Principais

### `useSupabaseData.js`
Hook central. Retorna todos os dados e métodos CRUD:
```js
const {
  clients, packages, sessions, videos, payments, references,
  pipelineSettings, loading, refetch,
  addClient, updateClient, deleteClient,
  addPackage, updatePackage, deletePackage,
  addSession, updateSession, deleteSession,
  addVideo, updateVideo, deleteVideo,
  addPayment, deletePayment,
  addReference, deleteReference,
  updatePipelineSettings
} = useSupabaseData()
```
- Ao mutar vídeos, atualiza automaticamente os contadores `edited/delivered/posted` no pacote pai.
- Ao mutar pagamentos, recalcula `package.paid`.

### `useGoogleCalendar.js`
```js
const {
  ready, isSignedIn, loading, events,
  signIn, signOut, fetchEvents,
  createEvent, updateEvent, deleteEvent
} = useGoogleCalendar()
```

---

## Edge Function: `supabase/functions/google-calendar/index.ts`

Ações disponíveis via POST:

| Ação | Rate Limit | Descrição |
|------|-----------|-----------|
| `exchange_code` | 5/hora | Troca código OAuth por tokens |
| `get_token` | 60/hora | Obtém access token via refresh token |
| `revoke` | 10/hora | Remove refresh token do banco |

- Tokens armazenados com criptografia **AES-256-GCM**.
- Rate limiting por `user_id + action + IP`.

---

## Design System

**Paleta:**
- Primária: Âmbar `#d4870a` (tema cinematográfico)
- Background: Gradiente preto `#000000 → #161616`
- Texto: Off-white `#f0ece4`
- Sucesso `#34d399` / Erro `#ef4444` / Aviso `#f59e0b` / Info `#60a5fa`

**Tipografia:**
- Títulos: `Playfair Display` (serif)
- Corpo: `Inter` (sans-serif)

**Classes CSS reutilizáveis (definidas em `index.css`):**
- Layout: `.sidebar`, `.nav-item`, `.main-content`
- Componentes: `.card`, `.form-control`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- Status: `.badge`, `.badge-active`, `.badge-pending`, `.badge-confirmed`
- Overlays: `.modal`, `.toast`
- Calendário: `.calendar-grid`, `.calendar-event`

Responsivo: sidebar com toggle mobile, grids adaptam de 2 colunas (desktop) para 1 coluna (mobile).

---

## Funcionalidades Principais

1. **Clientes** — CRUD de clientes com contato, email e links de referência
2. **Pacotes** — Pacotes de serviço com cota de vídeos, progresso (editado/entregue/postado), valor e ciclo de cobrança
3. **Agenda** — Calendário mensal com sessões do CRM + eventos do Google Calendar
4. **Pipeline** — Kanban de vídeos com fluxo de status: a editar → editado → entregue → postado
5. **Financeiro** — Registro de pagamentos, saldo devedor por pacote, geração de PDF de recibo
6. **Dashboard** — Cards de métricas, gráfico de receita 6 meses, alertas inteligentes (pacotes vencendo, vídeos atrasados, valores em aberto)
7. **Configurações** — Upload de avatar, moeda (BRL/USD/EUR), CPF/CNPJ, chave PIX, troca de senha

---

## Convenções de Código

- **Componentes:** Funcionais com hooks — sem class components
- **Estado:** Context API para auth; custom hooks para dados do servidor; `useState` local para UI
- **Nomeação:** camelCase em JS, kebab-case em classes CSS, sufixo `_id` para IDs de entidade
- **Erros async:** `try/catch` com toast de feedback ao usuário
- **Performance:** `useMemo` e `useCallback` para cálculos pesados e callbacks de componentes filhos
- **Segurança:** nunca expor chaves secretas no frontend; RLS no banco; tokens criptografados

---

## Notas Importantes

- O projeto usa **React Router com layout aninhado**: `App.jsx` define um `AppLayout` que envolve todas as rotas protegidas com a sidebar.
- O `AuthContext` persiste a sessão com Supabase — não criar lógica paralela de sessão.
- Ao adicionar novas tabelas no Supabase, **sempre criar política RLS** com `user_id = auth.uid()`.
- A Edge Function precisa ser redeploy via `supabase functions deploy google-calendar` ao ser modificada.
- Evitar lógica de negócio diretamente nos componentes — colocar no `useSupabaseData.js`.
