# Plano: Multi-usuário (Organizations/Workspaces)

**Status:** Pendente — implementar após estabilização dos planos de assinatura  
**Complexidade estimada:** Alta (2–3 semanas)  
**Impacto:** Habilita o plano Studio com equipes de 3–5 membros

---

## Contexto e Motivação

Hoje o TakeOne é **estritamente single-user**: cada conta isola todos os dados via `user_id = auth.uid()` no RLS do Supabase. Um cineasta não consegue compartilhar clientes, agenda ou pipeline com seu assistente ou sócio.

O plano Studio precisa permitir que uma produtora cadastre uma organização e convide membros para colaborar nos mesmos dados. Esta feature não é trivial — requer mudança estrutural no banco, nas queries e no fluxo de onboarding.

---

## Modelo de Dados Novo

### Tabela: `organizations`

```sql
CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,       -- ex: "produtora-xyz"
  owner_id      uuid REFERENCES auth.users NOT NULL,
  plan_id       uuid REFERENCES plans,
  max_members   int NOT NULL DEFAULT 1,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
```

Cada organização pertence a um dono (`owner_id`) e está associada a um plano. `max_members` é definido pelo plano (Studio = 5).

---

### Tabela: `organization_members`

```sql
CREATE TABLE organization_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid REFERENCES organizations ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role       text NOT NULL DEFAULT 'editor',   -- 'owner' | 'editor' | 'viewer'
  joined_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id)
);
```

**Roles:**
| Role | Permissões |
|------|-----------|
| `owner` | Tudo + gerenciar membros + cancelar org |
| `editor` | Criar/editar/excluir todos os dados da org |
| `viewer` | Somente leitura (útil para clientes ou financeiro) |

---

### Tabela: `organization_invites`

```sql
CREATE TABLE organization_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES organizations ON DELETE CASCADE NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'editor',
  token       text UNIQUE NOT NULL,           -- UUID gerado no convite
  invited_by  uuid REFERENCES auth.users NOT NULL,
  expires_at  timestamptz NOT NULL,           -- now() + interval '7 days'
  accepted_at timestamptz,
  created_at  timestamptz DEFAULT now()
);
```

O convite é enviado por email com um link contendo o `token`. O usuário clica, cria conta ou faz login, e é adicionado como membro.

---

### Mudança nas tabelas de dados CRM

Todas as tabelas de dados (`clients`, `packages`, `sessions`, `videos`, `payments`, `references`, `pipeline_settings`) precisam ganhar uma coluna `org_id`:

```sql
ALTER TABLE clients         ADD COLUMN org_id uuid REFERENCES organizations;
ALTER TABLE packages        ADD COLUMN org_id uuid REFERENCES organizations;
ALTER TABLE sessions        ADD COLUMN org_id uuid REFERENCES organizations;
ALTER TABLE videos          ADD COLUMN org_id uuid REFERENCES organizations;
ALTER TABLE payments        ADD COLUMN org_id uuid REFERENCES organizations;
ALTER TABLE references      ADD COLUMN org_id uuid REFERENCES organizations;
ALTER TABLE pipeline_settings ADD COLUMN org_id uuid REFERENCES organizations;
```

**Migração dos dados existentes:** ao habilitar a feature, criar automaticamente uma organização para cada usuário existente e preencher `org_id` em todos os seus registros.

```sql
-- Criar org para cada usuário existente
INSERT INTO organizations (name, slug, owner_id)
SELECT
  COALESCE(raw_user_meta_data->>'company_name', raw_user_meta_data->>'full_name', email),
  id::text,   -- slug temporário baseado no uuid do usuário
  id
FROM auth.users;

-- Associar o dono como membro owner
INSERT INTO organization_members (org_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM organizations o;

-- Preencher org_id em todos os dados existentes
UPDATE clients  c SET org_id = o.id FROM organizations o WHERE o.owner_id = c.user_id;
UPDATE packages p SET org_id = o.id FROM organizations o WHERE o.owner_id = p.user_id;
-- (repetir para todas as tabelas)
```

---

## RLS (Row Level Security) — Nova Lógica

### Função helper

```sql
CREATE OR REPLACE FUNCTION is_org_member(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = target_org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_org_editor(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = target_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  );
$$;
```

### Políticas nas tabelas de dados

Substituir a política atual `user_id = auth.uid()` por:

```sql
-- Leitura: qualquer membro da org
CREATE POLICY "members can read" ON clients
  FOR SELECT USING (is_org_member(org_id));

-- Escrita: apenas editors e owners
CREATE POLICY "editors can write" ON clients
  FOR ALL USING (is_org_editor(org_id));
```

Aplicar o mesmo padrão em `packages`, `sessions`, `videos`, `payments`, `references`, `pipeline_settings`.

---

## Fluxo de Onboarding com Organizações

### Novo usuário (signup)

```
1. Usuário cria conta (email + senha)
2. Trigger on_auth_user_created:
   - Cria user_profiles (já existente)
   - Cria organizations com nome da empresa ou nome do usuário
   - Cria organization_members com role 'owner'
3. Usuário cai no dashboard normalmente
4. org_id ativo salvo em contexto (único org por padrão)
```

### Usuário convidado

```
1. Owner vai em Configurações → Equipe → Convidar
2. Digita email + escolhe role → system gera token e envia email
3. Convidado clica no link → /invite/{token}
4. Se tem conta: faz login → aceita → vira membro
5. Se não tem conta: tela de signup → após criar conta → aceita automaticamente
6. Redirect para o dashboard da organização
```

---

## Mudanças no Frontend

### Novo contexto: `OrganizationContext.jsx`

```js
const {
  org,           // Organization ativa
  orgs,          // Lista de orgs do usuário (caso seja membro de múltiplas)
  members,       // Membros da org ativa
  myRole,        // 'owner' | 'editor' | 'viewer'
  isOwner,       // boolean
  isEditor,      // boolean
  switchOrg,     // (org_id) => void
  inviteMember,  // (email, role) => Promise
  removeMember,  // (user_id) => Promise
  updateRole,    // (user_id, role) => Promise
} = useOrganization()
```

O `org_id` ativo é persistido em `localStorage` para o caso de o usuário pertencer a múltiplas organizações no futuro.

---

### Mudança em `useSupabaseData.js`

Todas as queries precisam incluir o `org_id` ativo no filtro e no insert:

```js
// Antes
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', user.id)

// Depois
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('org_id', org.id)       // filtro por org
```

Nos inserts:
```js
// Antes
await supabase.from('clients').insert({ ...client, user_id: user.id })

// Depois
await supabase.from('clients').insert({ ...client, user_id: user.id, org_id: org.id })
// user_id mantido para auditoria (quem criou o registro)
```

---

### Nova seção em `Settings.jsx` — Aba "Equipe"

Visível apenas para plano Studio (verificado via `useSubscription`).

**Seções:**
1. **Membros ativos** — lista com nome, email, role e botão de remover/trocar role
2. **Convidar membro** — input de email + select de role + botão enviar
3. **Convites pendentes** — lista com email, role, data de expiração e botão cancelar
4. **Limite de membros** — indicador visual `X / 5 membros usados`

---

### Guard de permissão nos componentes

Ações destrutivas ou de criação precisam verificar o role:

```jsx
const { isEditor } = useOrganization()

// Botões de criar/editar/excluir ficam desabilitados para viewers
<button disabled={!isEditor} className="btn btn-primary">
  Novo Cliente
</button>
```

---

## Edge Function: Convites

Uma nova Edge Function ou extensão da função `admin` para:

```ts
// Ação: send_invite
// Gera token, salva em organization_invites, envia email via Supabase Auth
async function sendInvite(org_id, email, role, invited_by_id) { ... }

// Ação: accept_invite
// Valida token, verifica expiração, cria organization_members
async function acceptInvite(token, user_id) { ... }
```

O email pode ser enviado via **Supabase Auth custom SMTP** ou via **Resend** (recomendado — simples de integrar).

---

## Considerações de Limite por Plano

O `max_members` em `organizations` é controlado pelo plano:

| Plano | max_members |
|-------|------------|
| Free | 1 (só o dono) |
| Starter | 1 |
| Pro | 1 |
| Studio | 5 |

Ao tentar convidar além do limite, a Edge Function retorna erro `member_limit_reached`.

---

## Ordem de Implementação Recomendada

1. **Migration SQL** — criar tabelas `organizations`, `organization_members`, `organization_invites` e colunas `org_id` nas tabelas de dados
2. **Migration de dados existentes** — popular org para cada usuário atual
3. **RLS** — atualizar políticas em todas as tabelas
4. **OrganizationContext** — novo contexto + hook
5. **useSupabaseData** — atualizar todas as queries para usar `org_id`
6. **Onboarding trigger** — atualizar `on_auth_user_created` para criar org automaticamente
7. **Settings → Equipe** — UI de convites e gestão de membros
8. **Edge Function** — envio e aceitação de convites
9. **Página `/invite/:token`** — tela de aceitação de convite
10. **Guards de permissão** — desabilitar ações para viewers nos componentes
11. **Testes** — fluxo completo de convite, aceitação, permissões por role

---

## Riscos e Pontos de Atenção

- **Migração sem downtime:** a adição de `org_id` como nullable primeiro, depois popular, depois tornar NOT NULL é a forma segura
- **Usuários em múltiplas orgs:** o contexto precisa lidar com isso desde o início (um freelancer pode ser editor na org de outro cliente)
- **google_tokens:** essa tabela é pessoal do usuário, não da org — não migrar
- **pipeline_settings:** uma por org (não por usuário)
- **Audit log admin:** registros de `admin_actions` continuam por `user_id`, mas adicionar `org_id` como campo opcional para rastreabilidade
