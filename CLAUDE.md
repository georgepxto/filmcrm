# TakeOne (FilmmakerCRM) — CLAUDE.md

## Visão Geral do Projeto

**TakeOne** (internamente `filmmakercrm`) é um SaaS CRM web voltado para cineastas e produtores audiovisuais. Gerencia clientes, pacotes de serviços, agenda de gravações, pipeline de pós-produção e controle financeiro.

- Interface em **Português Brasileiro**
- Multi-usuário com isolamento total via **Row Level Security** no Supabase (`user_id = auth.uid()`)
- SPA (Single Page Application) com React Router 7 e layout de sidebar fixa

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React | 19.2.6 |
| Build | Vite | latest |
| Roteamento | React Router DOM | 7.15.1 |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) | 2.105.4 |
| Edge Functions | Supabase Edge Functions (Deno/TypeScript) | — |
| Ícones | Lucide React | 1.14.0 |
| Gráficos | Recharts | 3.8.1 |
| PDF | jsPDF | 4.2.1 |
| Linting | ESLint | — |

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
│   ├── main.jsx                    # Ponto de entrada React (StrictMode + render)
│   ├── App.jsx                     # Roteador principal + AppLayout + AuthGate
│   ├── index.css                   # Design system global (variáveis CSS + componentes)
│   ├── App.css                     # Arquivo vazio (não usar)
│   ├── data.js                     # Constantes (SERVICE_TYPES)
│   ├── components/
│   │   ├── Dashboard.jsx           # Página inicial — métricas, alertas, gráfico
│   │   ├── Calendar.jsx            # Agenda mensal + sync Google Calendar
│   │   ├── Clients.jsx             # Gestão de clientes, pacotes e referências
│   │   ├── Packages.jsx            # Visão geral e edição de pacotes de serviço
│   │   ├── PostControl.jsx         # Pipeline de pós-produção (tabela + sidebar stats)
│   │   ├── Payments.jsx            # Controle financeiro + geração de PDF de recibo
│   │   ├── Settings.jsx            # Perfil, empresa, aparência e segurança
│   │   ├── Login.jsx               # Tela de autenticação (login/register/reset)
│   │   ├── BrandLogo.jsx           # Logo "TakeOne" com gradiente âmbar
│   │   ├── Toast.jsx               # Sistema de notificações toast + ToastProvider
│   │   └── ConfirmModal.jsx        # Modal de confirmação para ações destrutivas
│   ├── contexts/
│   │   ├── AuthContext.jsx         # Estado global de autenticação (Supabase Auth)
│   │   └── ThemeContext.jsx        # Tema dark/light (persiste em localStorage)
│   ├── hooks/
│   │   ├── useSupabaseData.js      # Hook central — todos os CRUDs com otimismo
│   │   └── useGoogleCalendar.js    # Integração OAuth + Google Calendar API
│   └── lib/
│       └── supabaseClient.js       # Instância singleton do cliente Supabase
├── supabase/
│   └── functions/
│       └── google-calendar/
│           └── index.ts            # Edge Function: OAuth + token management AES-256
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
AuthContext  +  ThemeContext  +  ToastProvider
    └→ useAuth() / useTheme() / useToast() disponíveis globalmente
        ↓
    AppLayout — App.jsx (rotas protegidas com sidebar)
        ↓
    useSupabaseData() — busca e muta dados via Supabase
        ↓
    Componentes de página recebem (data, callbacks) como props
        ↓
    Mutação → Supabase → estado local otimista + toast de feedback
```

**Fluxo de Sync Google Calendar:**
```
Usuário clica "Conectar Google"
    ↓
useGoogleCalendar.signIn() → OAuth popup (GIS)
    ↓
Edge Function exchange_code → armazena refresh_token AES-256-GCM no DB
    ↓
Access token salvo no localStorage (chave: takeone_gcal_token)
    ↓
Token renovado automaticamente 5 min antes de expirar
    ↓
Sessões CRM + eventos Google Calendar exibidos lado a lado
```

---

## Roteamento (App.jsx)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/login` | `Login` | Autenticação (login / register / reset) |
| `/dashboard` | `Dashboard` | Home — métricas e alertas |
| `/calendar` | `Calendar` | Agenda mensal com Google Calendar |
| `/clients` | `Clients` | Gestão de clientes e pacotes |
| `/packages` | `Packages` | Visão geral dos pacotes |
| `/posts` | `PostControl` | Pipeline de pós-produção |
| `/payments` | `Payments` | Controle financeiro |
| `/settings` | `Settings` | Configurações do usuário |
| `/*` | redirect | Redireciona para `/dashboard` |

**Grupos de navegação na sidebar:**
- **Principal:** Dashboard
- **Clientes:** Clientes, Pacotes
- **Produção:** Agenda, Pós-Produção
- **Financeiro:** Pagamentos
- **Sistema:** Configurações

---

## Design System (`src/index.css`)

### Variáveis CSS — Tema Dark (padrão)

```css
--bg-primary:      #080706   /* fundo mais escuro */
--bg-secondary:    #0e0d0b   /* fundo secundário */
--bg-card:         #141210   /* cards */
--bg-card-hover:   #1b1917   /* cards em hover */
--bg-elevated:     #181512   /* elementos elevados */
--bg-modal:        #100f0d   /* fundos de modal */
--border:          #201e1b   /* borda padrão */
--border-light:    #2a2724   /* borda leve */

--text-primary:    #f0ece4   /* texto principal (off-white) */
--text-secondary:  #a09888   /* texto secundário (bege médio) */
--text-muted:      #6b6155   /* texto apagado */

--amber:           #d4870a   /* cor primária — âmbar cinematográfico */
--amber-light:     #e8a833   /* âmbar claro */
--amber-dim:       #a06808   /* âmbar escuro */
--amber-glow:      rgba(212,135,10,0.10)   /* brilho âmbar sutil */
--amber-glow-strong: rgba(212,135,10,0.22) /* brilho âmbar forte */

--success:         #34d399   /* verde */
--danger:          #ef4444   /* vermelho */
--warning:         #f59e0b   /* laranja */
--info:            #60a5fa   /* azul */

--radius-sm:       4px
--radius-md:       6px
--radius-lg:       8px
--radius-xl:       10px

--font-display:    'DM Serif Display'   /* títulos serifados */
--font-body:       'DM Sans'            /* corpo do texto */
--font-brand:      'Gilroy'             /* logo / marca */

--transition:      0.18s cubic-bezier(0.4, 0, 0.2, 1)
```

### Variáveis CSS — Tema Light (`html.light`)

```css
--bg-primary:    #f8f5ef
--bg-secondary:  #f0ece3
--bg-card:       #ffffff
--bg-card-hover: #f5f2ec
--bg-elevated:   #faf7f2
--bg-modal:      #ffffff
--border:        #e8e2d8
--border-light:  #f0ece3
--text-primary:  #1c1916
--text-secondary:#4a433b
--text-muted:    #8a7e72
```

O tema é aplicado via classe `html.light`. Sem classe = dark.  
Persistido em `localStorage` com chave `takeone-theme`.

### Classes de Componentes Globais

**Layout:**
- `.sidebar` — sidebar fixa de 260px
- `.main-content` — área principal com `margin-left: 260px`
- `.nav-item`, `.nav-item.active` — itens de navegação
- `.mobile-toggle` — botão hambúrguer (mobile)
- `.sidebar-overlay` — overlay escuro no mobile

**Cards e Containers:**
- `.card` — card padrão com borda e fundo
- `.summary-card` — card de métrica (destaque âmbar)
- `.alert-item` — item de alerta com ícone

**Botões:**
- `.btn` — base de todos os botões
- `.btn-primary` — fundo âmbar, texto escuro
- `.btn-secondary` — borda, fundo transparente
- `.btn-danger` — fundo vermelho

**Formulários:**
- `.form-group` — wrapper de campo (label + input)
- `.form-control` — input/select/textarea padrão
- `.toggle-switch` — toggle on/off

**Status Badges:**
- `.badge` — badge base
- `.badge-active` / `.badge-ativo` — verde
- `.badge-pending` / `.badge-pausado` — laranja
- `.badge-confirmed` / `.badge-concluido` — cinza

**Barras de Progresso:**
- `.progress-bar` — container
- `.progress-fill` — preenchimento âmbar

**Calendário:**
- `.calendar-grid` — grid 7 colunas
- `.calendar-cell` — célula de dia
- `.calendar-header-cell` — cabeçalho (Dom–Sáb)
- `.calendar-event` — badge de evento

**Pipeline (Kanban não é mais usado — agora é tabela):**
- `.post-layout` — two-column layout (tabela + sidebar)
- `.post-desktop-table` — tabela desktop
- `.post-mobile-list` — cards mobile

**Overlays:**
- `.modal-overlay` — fundo escurecido
- `.modal` — container do modal
- `.toast-container` — container de toasts (fixed, bottom-right)
- `.toast` — item de toast (com variantes `.toast-success`, `.toast-error`, etc.)

**Páginas especiais:**
- `.login-page` — full-screen com efeitos cinemáticos
- `.loading-screen` — spinner de carregamento
- `.empty-state` — estado vazio com ícone e mensagem

### Breakpoints Responsivos

| Breakpoint | Comportamento |
|------------|--------------|
| `900px` | Grids summary passam para 2 colunas |
| `768px` | Sidebar colapsa (hamburger menu), layouts empilham, padding reduzido |
| `480px` | Otimizações adicionais, modais ajustados |

---

## Contexts

### `AuthContext.jsx`

**Providers:** `AuthProvider` wrapping toda a app.  
**Hook:** `useAuth()`

```js
const {
  user,              // Supabase User | null
  loading,           // boolean — checagem inicial
  signIn,            // (email, password) => Promise<{data, error}>
  signUp,            // (email, password, name) => Promise<{data, error}>
  signOut,           // () => Promise<{error}>
  resetPassword,     // (email) => Promise<{data, error}>
  updateProfile,     // (updates) => Promise<{data, error}>
} = useAuth()
```

**Metadados do usuário** (via `user.user_metadata`):
- `full_name` — nome completo
- `avatar_url` — URL do avatar no Supabase Storage
- `currency` — moeda preferida (`BRL`, `USD`, `EUR`)
- `company_name` — nome da empresa
- `document_type` — `CPF` ou `CNPJ`
- `document_number` — número do documento
- `pix_key` — chave PIX para recibos

### `ThemeContext.jsx`

**Providers:** `ThemeProvider` wrapping toda a app.  
**Hook:** `useTheme()`

```js
const { theme, setTheme } = useTheme()
// theme: 'dark' | 'light'
// persiste em localStorage['takeone-theme']
// aplica/remove classe 'light' no <html>
```

---

## Hooks

### `useSupabaseData.js` — Hook Central de Dados

Busca todas as tabelas do usuário logado na inicialização. Usa **otimismo**: atualiza estado local imediatamente e sincroniza com o Supabase em background.

```js
const {
  // Estado
  clients, packages, sessions, videos,
  payments, references, pipelineSettings,
  loading,

  // Métodos
  refetch,

  // Clientes
  addClient,     // (client) => Promise<Client | null>
  updateClient,  // (id, updates) => Promise<Client | null>
  deleteClient,  // (id) => Promise<boolean>

  // Pacotes
  addPackage,    // (pkg) => Promise<Package | null>
  updatePackage, // (id, updates) => Promise<Package | null>
  deletePackage, // (id) => Promise<boolean>

  // Sessões (agenda)
  addSession,    // (session) => Promise<Session | null>
  updateSession, // (id, updates) => Promise<Session | null>
  deleteSession, // (id) => Promise<boolean>

  // Vídeos (pipeline)
  addVideo,      // (video) => Promise<Video | null>
  updateVideo,   // (id, updates) => Promise<Video | null>
  deleteVideo,   // (id) => Promise<boolean>

  // Pagamentos
  addPayment,    // (payment) => Promise<Payment | null>
  deletePayment, // (id) => Promise<boolean>

  // Referências de portfólio
  addReference,    // (ref) => Promise<Reference | null>
  updateReference, // (id, updates) => Promise<Reference | null>
  deleteReference, // (id) => Promise<boolean>

  // Configurações do pipeline
  updatePipelineSettings, // (updates) => Promise<PipelineSettings | null>
} = useSupabaseData()
```

**Comportamentos especiais:**
- Mutar vídeos → recalcula contadores `edited/delivered/posted` no pacote pai
- Mutar pagamentos → recalcula `package.paid`
- IDs temporários gerados como `tmp_${Date.now()}_${random}` para otimismo
- Falha no DB → rollback do estado local

### `useGoogleCalendar.js`

```js
const {
  ready,      // boolean — GIS inicializado
  isSignedIn, // boolean — token válido presente
  loading,    // boolean
  events,     // GoogleEvent[]

  signIn,     // () => void — abre OAuth popup
  signOut,    // () => Promise<void>
  fetchEvents,// (timeMin, timeMax) => Promise<GoogleEvent[]>
  createEvent,// ({summary, description, date, timeStart, timeEnd, location}) => Promise<Event | null>
  updateEvent,// (eventId, {...}) => Promise<Event | null>
  deleteEvent,// (eventId) => Promise<boolean>
} = useGoogleCalendar()
```

**Constantes internas:**
```js
SCOPES = 'calendar.events calendar.readonly'
LS_TOKEN_KEY  = 'takeone_gcal_token'
LS_EXPIRY_KEY = 'takeone_gcal_expiry'
REFRESH_MARGIN_MS = 5 * 60 * 1000  // renovar 5 min antes de expirar
```

**Filtros:** eventos com `"filmmakercrm"` na description ou título começando com `"📹"` são excluídos da exibição (evitar duplicação).

---

## Componentes de Página

### `Dashboard.jsx`

**Props:**
```js
{ clients, packages, sessions, payments, videos, onNavigate }
```

**Métricas calculadas:**
- `activeClients` — pacotes com status Ativo
- `weekSessions` — sessões nos próximos 7 dias
- `totalOwed` — soma de `(value - paid)` de todos os pacotes ativos
- `monthlyExpected` — receita esperada no mês atual
- `monthPayments` — pagamentos recebidos no mês atual
- `chartData` — histórico de 6 meses para o gráfico de barras

**Seções renderizadas:**
1. **Saudação** — baseada na hora do dia + data atual
2. **Featured Card** — "Previsto este mês" (valor total esperado)
3. **Grid 3 colunas:** Clientes ativos · Gravações na semana · Pacotes críticos
4. **Layout 2 colunas:**
   - Esquerda: Alertas inteligentes + Próximas sessões (tabela desktop / cards mobile)
   - Direita: Gráfico de barras 6 meses (Recharts `BarChart`) + Resumo financeiro

**Tipos de alerta:**
| Tipo | Cor | Condição |
|------|-----|---------|
| `urgent` | vermelho | Pacotes com 0 vídeos restantes ou pagamento zero |
| `warning` | laranja | Pacotes com < 20% vídeos ou prestes a vencer |
| `info` | azul | Saldos em aberto |

---

### `Calendar.jsx`

**Props:**
```js
{ clients, sessions, addSession, updateSession, deleteSession, addClient }
```

**Estado local:**
- `viewDate` — mês/ano exibido
- `selectedDay` — dia selecionado no grid
- `showModal` / `editSession` — controle do modal de sessão
- `filterClient` — filtro por cliente
- `syncToGoogle` — toggle de sync ao criar sessão
- `form` — campos do formulário de sessão
- `clientSearch` / `clientDropdownOpen` — busca/dropdown de cliente
- `showNewClientModal` — modal de criação rápida de cliente
- `deleteSessionConfirm` — confirmação de exclusão

**Seções renderizadas:**
1. **Grid mensal** (7×6)
   - Cabeçalho com nomes dos dias
   - Células de dia com indicadores de evento (CRM + Google Calendar)
   - Hoje destacado com âmbar
2. **Lista de sessões** do dia selecionado ou mês inteiro
3. **Modal de criação/edição:**
   - Seletor de cliente (dropdown com busca)
   - Data / Data-fim (para multi-dia)
   - Hora início/fim ou toggle All-Day
   - Tipo de serviço (SERVICE_TYPES)
   - Status: Pendente / Confirmado / Concluído
   - Toggle Google Calendar sync
4. **Modal de criação rápida de cliente** (nome, contato, email)

**Tipos de serviço** (de `data.js`):
```
Gravação de Reels · Gravação Institucional · Gravação de Curso
Ensaio Fotográfico · Making Of · Gravação de Podcast · Cobertura de Evento
```

---

### `Clients.jsx`

**Props:**
```js
{
  clients, packages, references,
  addClient, updateClient, deleteClient,
  addPackage, updatePackage,
  addReference, updateReference, deleteReference
}
```

**Estado local:**
- `showClientModal` / `showPackageModal` / `showRefModal` — controle de modais
- `editClientData` / `editPackageData` / `editRefData` — dados para edição
- `selectedClient` — cliente selecionado no painel
- `viewMode: 'list' | 'grid'` — modo de visualização
- `searchQuery` — filtro de busca
- `proposalModal` — modal de geração de proposta
- `proposalPkgs` — pacotes selecionados para proposta
- `proposalNote` / `proposalValidity` — dados da proposta
- `generatingPDF` — flag de geração de PDF

**Seções renderizadas:**
1. **Barra de busca + toggle de visualização** (lista / grid)
2. **Lista ou grid de clientes:**
   - Nome, contato, email
   - Contagem de pacotes
   - Valor total dos pacotes
   - Ações: editar, excluir
3. **Painel de detalhe do cliente (ao selecionar):**
   - Cards de pacotes com:
     - Nome + badge de status
     - Grid de métricas (total, editado, entregue, postado, restante)
     - Barra de progresso
     - Valor / Pago / Devendo
   - Seção de Referências (portfólio):
     - Título + plataforma detectada (YouTube, Instagram, etc.)
     - URL e notas
     - Editar / Excluir
4. **Modal cliente:** nome, contato, email
5. **Modal pacote:** cliente, nome, total de vídeos, status, valor, ciclo de cobrança, datas
6. **Modal referência:** cliente, título, URL, notas
7. **Modal proposta:** selecionar pacotes + nota + validade → gera PDF profissional

---

### `Packages.jsx`

**Props:**
```js
{ clients, packages, payments, videos, updatePackage, addPackage }
```

**Estado local:**
- `searchQuery` / `filterStatus` / `filterClient` / `sortBy` — filtros
- `expandedPkg` — pacote expandido para ver detalhes
- `editingPkg` / `editForm` — edição inline de progresso
- `showCreateModal` / `createForm` — criação de novo pacote

**Seções renderizadas:**
1. **Header** com botão "Novo Pacote"
2. **Featured Card** — valor total do portfólio
3. **Grid 3 colunas:** Total · Ativos · Críticos
4. **Barra de filtros:**
   - Busca por cliente/pacote
   - Filtro por status (Todos / Ativo / Pausado / Concluído)
   - Filtro por cliente
   - Ordenação (Recente / Valor / Progresso / Cliente)
5. **Lista de pacotes** (linhas expansíveis):
   - Nome + badge de status
   - Nome do cliente
   - Ciclo de cobrança + data de término
   - Barra de progresso (entregues/total)
   - Valor + estado de pagamento
   - Chevron de expansão
6. **Detalhe expandido:**
   - Grid de métricas mini
   - Quantidade de vídeos relacionados
   - Lista de pagamentos relacionados
   - Formulário de edição inline

---

### `PostControl.jsx`

**Props:**
```js
{
  clients, videos, packages,
  addVideo, updateVideo, deleteVideo,
  pipelineSettings, updatePipelineSettings
}
```

**Estado local:**
- `filterClient` / `searchQuery` — filtros
- `showModal` / `editVideoData` — modal de criação/edição
- `hoveredRow` — linha com hover ativo
- `history` — array de últimas 10 mudanças de status (TTL 24h)
- `localNotes` — notas do pipeline
- `deleteConfirm` — confirmação de exclusão
- `form` — campos do formulário de vídeo

**Status de vídeo e lógica:**
```
Não iniciado → Editado → Entregue → Postado
posted > delivered > edited > "não iniciado"
```

**Seções renderizadas:**
1. **Header** + barra de filtros (busca + filtro por cliente)
2. **Tabela desktop** com colunas:
   - Tarefa (título do vídeo)
   - Cliente
   - Concluído (botão toggle direto)
   - Progresso (botão cíclico de status)
   - Data planejada
   - Ações (editar, excluir)
3. **Cards mobile** — versão empilhada
4. **Sidebar direita (300px):**
   - **Widget de stats:** Total · Concluídos · Atrasados · Próximos prazos (4 itens)
   - **Notas:** textarea com salvamento manual
   - **Histórico de atividade:** últimas 10 mudanças de status com timestamp

---

### `Payments.jsx`

**Props:**
```js
{ clients, packages, payments, addPayment, deletePayment }
```

**Estado local:**
- `filterClient` / `viewMonth` — filtros
- `showModal` / `selectedPkg` / `form` — modal de pagamento
- `confirmUndo` — confirmação de desfazer pagamento
- `generatingReceipt` — flag de geração de PDF

**Métricas calculadas:**
- `monthlyExpected` — esperado no mês visualizado
- `monthReceived` — recebido no mês visualizado
- `totalOwed` — total em aberto (todos os meses)
- `filteredPkgs` — pacotes ativos no mês visualizado

**Seções renderizadas:**
1. **Header** com filtro de cliente + navegador de mês (`< Mês Ano >`)
2. **Grid 3 colunas:** Esperado · Recebido · Em aberto
3. **Tabela de pacotes:**
   - Cliente + nome do pacote
   - Valor do pacote
   - Indicador visual de status (Pago / Parcial / Pendente)
   - Barra de progresso de pagamento
   - Pago / Devendo
   - Ações: registrar pagamento · baixar recibo · desfazer pagamento
4. **Modal de pagamento:**
   - Auto-preenche com valor devendo
   - Data (padrão: hoje)
   - Valor (validado contra o devido)
   - Nota opcional
5. **Recibo PDF gerado com jsPDF:**
   - Número do recibo
   - Valor recebido (destaque)
   - Dados do emitente (empresa, documento, data)
   - Dados do pagador (nome do cliente)
   - Descrição do serviço
   - Chave PIX (se configurada)
   - Linha de assinatura

---

### `Settings.jsx`

**Estado local:**
- `name`, `avatarUrl` — dados de perfil
- `currency: 'BRL' | 'USD' | 'EUR'` — moeda
- `companyName`, `documentType`, `documentNumber`, `pixKey` — dados empresa
- `password`, `confirmPassword` — troca de senha
- `theme` — tema (via `useTheme`)
- `loadingProfile`, `loadingBusiness`, `uploadingAvatar`, `loadingPassword` — flags de loading

**Seções renderizadas:**
1. **Perfil:** upload de avatar (Supabase Storage `avatars`) + nome + salvar
2. **Empresa:** nome da empresa, moeda, tipo de documento, número de documento (auto-formatado), chave PIX
3. **Aparência:** cards de tema (Dark / Light) com preview visual
4. **Segurança:** formulário de troca de senha com validação

**Validações:**
- CPF: algoritmo de validação dos dígitos verificadores
- CNPJ: algoritmo de validação dos dígitos verificadores
- Auto-formatação de CPF (000.000.000-00) e CNPJ (00.000.000/0000-00)
- Senha: mínimo 6 caracteres + confirmação

---

### `Login.jsx`

**Modos:** `'login'` | `'register'` | `'reset'`

**Seções renderizadas:**
1. **Coluna esquerda:**
   - Logo BrandLogo
   - Tagline do produto
   - Lista de 4 features com ícones Lucide
   - Rodapé com ícone de cadeado
2. **Coluna direita (glassmorphism):**
   - Formulário adaptado ao modo atual
   - Email (todos os modos)
   - Senha + toggle show/hide (login e register)
   - Nome (apenas register)
   - Link "Esqueci a senha" (apenas login)
   - Botão de submit com spinner
   - Mensagens de erro/sucesso

**Efeitos visuais CSS:**
- `.light-orb-main` + `.light-orb-secondary` — orbes de luz cinemáticas
- `.light-beam` + `.lens-flare` — raios e flares
- `.bg-overlay` — overlay escuro sobre fundo

---

### `Toast.jsx`

**Provider:** `ToastProvider`  
**Hook:** `useToast()`

```js
const { success, error, warning, info } = useToast()
// success(msg)            — auto-dismiss 3000ms
// error(msg, dur?)        — auto-dismiss 5000ms
// warning(msg, dur?)      — auto-dismiss 4000ms
// info(msg, dur?)         — auto-dismiss 3500ms
```

**Estrutura de toast:**
```js
{ id, message, type: 'success'|'error'|'warning'|'info', exiting: boolean }
```

Renderizado em `.toast-container` (fixed, bottom-right). Animações de entrada e saída.

---

### `ConfirmModal.jsx`

**Props:**
```js
{
  title: string,
  message: string,
  confirmLabel?: string,  // padrão: 'Confirmar'
  cancelLabel?: string,   // padrão: 'Cancelar'
  danger?: boolean,       // true = botão vermelho
  onConfirm: () => void,
  onCancel: () => void
}
```

Clique no overlay chama `onCancel`.

---

### `BrandLogo.jsx`

Renderiza `"Take"` em branco (`#f5f5f5`) e `"One"` com gradiente âmbar (`--amber-light` → `--amber-dim`).

---

## Modelos de Dados (Supabase)

### `clients`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| user_id | uuid FK | auth.uid() |
| name | text | Nome do cliente |
| contact | text | Telefone/WhatsApp |
| email | text | E-mail |
| created_at | timestamp | — |

### `packages`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| user_id | uuid FK | — |
| client_id | uuid FK | — |
| name | text | Nome do pacote |
| total_videos | int | Cota de vídeos |
| edited | int | Vídeos editados |
| delivered | int | Vídeos entregues |
| posted | int | Vídeos postados |
| status | text | `Ativo` / `Pausado` / `Concluído` |
| value | numeric | Valor do pacote |
| paid | numeric | Valor pago |
| start_date | date | Data de início |
| end_date | date | Data de término |
| duration_months | int | Duração em meses |
| billing_cycle | text | Ciclo de cobrança |
| created_at | timestamp | — |

### `sessions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| user_id | uuid FK | — |
| client_id | uuid FK nullable | — |
| title | text | Título da sessão |
| date | date | Data de início |
| date_end | date nullable | Data de fim (multi-dia) |
| time_start | time nullable | Hora de início |
| time_end | time nullable | Hora de fim |
| service | text | Tipo de serviço |
| status | text | `Pendente` / `Confirmado` / `Concluído` |
| is_all_day | bool | Evento o dia todo |
| google_event_id | text nullable | ID do evento no Google Calendar |
| created_at | timestamp | — |

### `videos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| user_id | uuid FK | — |
| client_id | uuid FK | — |
| package_id | uuid FK | — |
| title | text | Título do vídeo |
| edited | bool | Editado |
| delivered | bool | Entregue |
| posted | bool | Postado |
| planned_date | date nullable | Prazo planejado |
| created_at | timestamp | — |

### `payments`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| user_id | uuid FK | — |
| client_id | uuid FK | — |
| package_id | uuid FK | — |
| date | date | Data do pagamento |
| amount | numeric | Valor recebido |
| note | text | Observação |
| created_at | timestamp | — |

### `references`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| user_id | uuid FK | — |
| client_id | uuid FK | — |
| title | text | Título |
| url | text | URL do conteúdo |
| notes | text | Notas |
| created_at | timestamp | — |

### `pipeline_settings`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| user_id | uuid FK | — |
| notes | text | Notas do pipeline |
| links | jsonb | Links utilitários |
| history | jsonb | Histórico de atividade (últimas 10 entradas) |
| created_at | timestamp | — |
| updated_at | timestamp | — |

### `google_tokens`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| user_id | uuid PK | — |
| refresh_token | text | Criptografado AES-256-GCM |
| updated_at | timestamp | — |

### `rate_limit_logs`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | — |
| identifier | text | user_id ou IP |
| action | text | Nome da ação |
| created_at | timestamp | Janela de 1 hora |

**Todas as tabelas têm política RLS: `user_id = auth.uid()`**

---

## Edge Function: `google-calendar/index.ts`

Deno/TypeScript rodando no Supabase Edge. Chamada via `supabase.functions.invoke('google-calendar', { body })`.

### Ações disponíveis

| Ação | Rate Limit | Descrição |
|------|-----------|-----------|
| `exchange_code` | 5/hora | Troca código OAuth por access + refresh token |
| `get_token` | 60/hora | Obtém access token via refresh token armazenado |
| `revoke` | 10/hora | Revoga acesso e remove token do banco |

**Rate limits globais:** 120 requisições/hora por usuário.

**Segurança:**
- Criptografia: **AES-256-GCM** para refresh tokens
- Autenticação: JWT via header `Authorization: Bearer`
- Rate limiting: janela deslizante de 1 hora por `user_id + action + IP`
- Migração automática de tokens plaintext legados para formato criptografado

**Variáveis de ambiente necessárias:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=postmessage
TOKEN_ENCRYPTION_KEY   # hex 64 chars
```

---

## Convenções de Código

- **Componentes:** Funcionais com hooks — sem class components
- **Estado global:** Context API para Auth, Theme, Toast
- **Estado de servidor:** `useSupabaseData()` — custom hook único para todos os CRUDs
- **Estado de UI:** `useState` local no componente
- **Nomeação:** camelCase em JS/JSX, kebab-case em classes CSS, sufixo `_id` para FK
- **Erros async:** `try/catch` com `useToast()` para feedback ao usuário
- **Performance:** `useMemo` para cálculos derivados, `useCallback` para callbacks de componentes filhos
- **Segurança:** sem chaves secretas no frontend; RLS no banco; tokens criptografados na Edge Function
- **Lógica de negócio:** sempre em `useSupabaseData.js`, não nos componentes

---

## Notas Importantes

- **React Router nested layout:** `App.jsx` define `AppLayout` que envolve todas as rotas protegidas com a sidebar. `AuthGate` redireciona para `/login` se não autenticado.
- **Não criar lógica paralela de sessão** — `AuthContext` já persiste e escuta mudanças via `onAuthStateChange`.
- **Novas tabelas Supabase:** sempre criar política RLS com `user_id = auth.uid()`.
- **Edge Function:** requer redeploy via `supabase functions deploy google-calendar` após mudanças.
- **Otimismo:** `useSupabaseData` usa IDs temporários `tmp_*` e faz rollback em falha.
- **Tema:** o `ThemeProvider` precisa estar acima de tudo para que `useTheme()` funcione em qualquer componente.
- **Avatar:** armazenado no bucket `avatars` do Supabase Storage (público).
- **PDF:** recibos e propostas gerados client-side com `jsPDF` — sem servidor envolvido.
- **Google Calendar:** eventos do CRM criados com prefixo `📹` no título para não serem reimportados como eventos externos.
