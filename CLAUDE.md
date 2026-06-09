# TakeOne (FilmmakerCRM) — CLAUDE.md

SaaS CRM para cineastas e produtores audiovisuais. Interface em **Português Brasileiro**. Multi-usuário com RLS total via Supabase (`user_id = auth.uid()`). SPA com React Router 7 e sidebar fixa.

---

## Stack e Comandos

React 19 · Vite · React Router 7 · Supabase (PostgreSQL + Auth + Storage + Edge Functions) · Lucide · Recharts · jsPDF

```bash
npm run dev      # localhost:5173
npm run build
npm run lint
supabase functions deploy <nome>   # após alterar edge functions
```

## Variáveis de Ambiente

```
# .env
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_CLIENT_ID

# Supabase dashboard (Edge Function secrets)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI=postmessage
TOKEN_ENCRYPTION_KEY   # hex 64 chars — AES-256
```

---

## Arquitetura

```
Supabase Auth → AuthContext + ThemeContext + ToastProvider
    → AppLayout (sidebar) → useSupabaseData() → componentes de página
    → Mutação → Supabase → estado local otimista + toast
```

- **Todo dado do usuário** passa por `useSupabaseData()` — lógica de negócio fica no hook, não nos componentes
- **Otimismo:** IDs temporários `tmp_${Date.now()}_${random}`, rollback em falha, `console.error` loga só `error.code` + `error.message`
- **Admin:** painel `/admin/*` protegido por `AdminGate`. Toda ação sensível via `adminActions` → Edge Function `admin`. Nunca chamar `service_role` diretamente do frontend
- **Todos os componentes de página são lazy** (`React.lazy` + `Suspense`) — não importar diretamente em App.jsx

---

## Invariantes Críticos

- **`page-transition`:** nunca usar `transform` nesse wrapper — quebra `position:fixed` de modais
- **Sidebar indicator:** calculado com `getBoundingClientRect()` em `useEffect` quando `location.pathname` muda
- **Tema:** `ThemeProvider` acima de tudo. Classe `html.light` = light mode. Sem classe = dark. Chave localStorage: `takeone-theme`
- **Novas tabelas:** sempre criar RLS com `user_id = auth.uid()`
- **Promover admin:** `UPDATE public.user_profiles SET role = 'admin' WHERE user_id = '<uuid>'` no SQL Editor
- **Trigger automático:** `on_auth_user_created` cria `user_profiles` com `role='user'` em todo signup
- **Senha mínima:** 8 chars — configurar também no Supabase Auth dashboard
- **Arquivos removidos (não recriar):** `src/App.css`, `src/assets/TakeOne.*`, `src/hooks/useSubscription.js`, `public/favicon-clapper.svg`, `public/icons.svg`
- **CSP não está ativo** em `vercel.json` — incompatível com iframes do GAPI do Google

---

## Separação de Dados do Usuário (LGPD)

- `user_metadata` (JWT): apenas `full_name`, `avatar_url` — aparecem no token
- `user_profiles` (tabela): `company_name`, `document_type`, `document_number`, `pix_key`, `currency` — dados sensíveis fora do JWT
- **bizProfile pattern:** `Payments.jsx` e `Clients.jsx` carregam dados empresariais via `useEffect → supabase.from('user_profiles')` em estado local `bizProfile`. Necessário para geração de PDF

---

## Google Calendar

- Tokens de acesso em `sessionStorage` (chave `takeone_gcal_token`). Refresh token criptografado AES-256-GCM no banco
- **Nunca construir `dateTime` manualmente** — usar `buildEventTimes(date, timeStart, timeEnd)`. Normaliza `HH:MM:SS` → `HH:MM`
- Eventos all-day: `{ date: 'YYYY-MM-DD' }` sem `dateTime`. `end.date` é exclusivo — usar dia seguinte
- Prefixos nos títulos dos eventos CRM: `📹` (com cliente) e `📅` (pessoal). Filtro em `useGoogleCalendar.js` exclui ambos para evitar duplicação
- Localhost: adicionar `http://localhost` e `http://localhost:5173` nas **Authorized JavaScript origins** do OAuth Client (não nos redirect URIs)

---

## Design System

Tema dark cinematográfico com acento âmbar (`--amber: #d4870a`). Fontes: DM Serif Display (display), DM Sans (body), Gilroy (marca). Tokens em `src/index.css`. Tema light via classe `html.light`.

- Breakpoint principal: sidebar colapsa em ≤ 1024px
- WCAG AA: contraste mínimo 4.5:1. `--text-muted` light mode: `#685e54`
- Sem `text-transform: uppercase` com `letter-spacing` largo em labels — usar tamanho proporcional normal
- Sem `border-left` colorido como accent — usar border tint + background tint
- `focus-visible` com `outline: 2px solid var(--amber)` em todos os elementos interativos

---

## Migration Pendente

Executar `supabase/migration_business_profile.sql` no SQL Editor para: adicionar colunas empresa em `user_profiles`, migrar de `user_metadata`, restringir MIME no bucket `avatars`.
