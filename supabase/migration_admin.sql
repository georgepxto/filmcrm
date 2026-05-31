-- ================================================================
-- TakeOne — Admin Schema Migration
-- Cole no SQL Editor do Supabase Dashboard e execute
-- ORDEM IMPORTA: tabela → função → policies → trigger → backfill
-- ================================================================

-- ── 1. user_profiles (sem policies ainda — is_admin() não existe) ──
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role              text NOT NULL DEFAULT 'user'
    CHECK (role   IN ('user', 'admin')),
  status            text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  suspended_at      timestamptz,
  suspension_reason text,
  notes             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ── 2. is_admin() — agora user_profiles já existe ─────────────
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = uid AND role = 'admin'
  );
$$;

-- ── 3. Policies de user_profiles (is_admin() já existe) ───────
DROP POLICY IF EXISTS "user_profiles_select"      ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_update"  ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert"      ON public.user_profiles;

CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "user_profiles_own_update"
  ON public.user_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "user_profiles_admin_update"
  ON public.user_profiles FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

-- ── 4. Trigger: cria perfil automaticamente no signup ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Backfill: perfis para usuários já existentes ───────────
INSERT INTO public.user_profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ── 6. plans ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text    UNIQUE NOT NULL,
  name          text    NOT NULL,
  description   text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly  numeric,
  features      jsonb   DEFAULT '[]',
  limits        jsonb   DEFAULT '{}',
  is_active     boolean DEFAULT true,
  sort_order    int     DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_public_read"   ON public.plans;
DROP POLICY IF EXISTS "admins_manage_plans" ON public.plans;

CREATE POLICY "plans_public_read"
  ON public.plans FOR SELECT USING (true);

CREATE POLICY "admins_manage_plans"
  ON public.plans FOR ALL USING (is_admin(auth.uid()));

-- ── 7. subscriptions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id              uuid NOT NULL REFERENCES public.plans(id),
  status               text NOT NULL
    CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
  billing_cycle        text NOT NULL
    CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz,
  current_period_end   timestamptz,
  trial_ends_at        timestamptz,
  canceled_at          timestamptz,
  cancel_reason        text,
  external_id          text,
  external_provider    text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select"            ON public.subscriptions;
DROP POLICY IF EXISTS "admins_manage_subscriptions"     ON public.subscriptions;

CREATE POLICY "subscriptions_select"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "admins_manage_subscriptions"
  ON public.subscriptions FOR ALL
  USING (is_admin(auth.uid()));

-- ── 8. subscription_payments ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid    NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id         uuid    NOT NULL,
  amount          numeric NOT NULL,
  currency        text    DEFAULT 'BRL',
  status          text    NOT NULL
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at         timestamptz,
  external_id     text,
  invoice_url     text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subpayments_select"         ON public.subscription_payments;
DROP POLICY IF EXISTS "admins_manage_subpayments"  ON public.subscription_payments;

CREATE POLICY "subpayments_select"
  ON public.subscription_payments FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "admins_manage_subpayments"
  ON public.subscription_payments FOR ALL
  USING (is_admin(auth.uid()));

-- ── 9. admin_actions (audit log) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  action         text NOT NULL,
  payload        jsonb,
  ip_address     text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_audit"   ON public.admin_actions;
DROP POLICY IF EXISTS "admins_insert_audit" ON public.admin_actions;

CREATE POLICY "admins_read_audit"
  ON public.admin_actions FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "admins_insert_audit"
  ON public.admin_actions FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- ── 10. RPC: admin_get_users() ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id                uuid,
  email             text,
  full_name         text,
  avatar_url        text,
  currency          text,
  company_name      text,
  created_at        timestamptz,
  last_sign_in_at   timestamptz,
  role              text,
  status            text,
  suspended_at      timestamptz,
  suspension_reason text,
  notes             text
)
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT
    u.id,
    u.email,
    (u.raw_user_meta_data->>'full_name')    AS full_name,
    (u.raw_user_meta_data->>'avatar_url')   AS avatar_url,
    (u.raw_user_meta_data->>'currency')     AS currency,
    (u.raw_user_meta_data->>'company_name') AS company_name,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(p.role,   'user')   AS role,
    COALESCE(p.status, 'active') AS status,
    p.suspended_at,
    p.suspension_reason,
    p.notes
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.user_id = u.id
  WHERE is_admin(auth.uid())
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users() TO authenticated;

-- ── 11. RPC: admin_get_user_stats() ───────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_user_stats(target_uid uuid)
RETURNS jsonb
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE WHEN is_admin(auth.uid()) THEN
      jsonb_build_object(
        'clients',  (SELECT COUNT(*)::int FROM public.clients  WHERE user_id = target_uid),
        'packages', (SELECT COUNT(*)::int FROM public.packages WHERE user_id = target_uid),
        'sessions', (SELECT COUNT(*)::int FROM public.sessions WHERE user_id = target_uid),
        'videos',   (SELECT COUNT(*)::int FROM public.videos   WHERE user_id = target_uid),
        'payments', (SELECT COUNT(*)::int FROM public.payments WHERE user_id = target_uid)
      )
    ELSE NULL
    END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_stats(uuid) TO authenticated;

-- ── 12. Seed: planos padrão ───────────────────────────────────
INSERT INTO public.plans
  (slug, name, description, price_monthly, price_yearly, features, limits, sort_order)
VALUES
  (
    'free', 'Free', 'Para começar',
    0, 0,
    '["3 clientes","5 pacotes","Agenda básica"]'::jsonb,
    '{"max_clients":3,"max_packages":5}'::jsonb,
    0
  ),
  (
    'starter', 'Starter', 'Para freelancers',
    29, 290,
    '["15 clientes","30 pacotes","Google Calendar","PDF de recibos"]'::jsonb,
    '{"max_clients":15,"max_packages":30}'::jsonb,
    1
  ),
  (
    'pro', 'Pro', 'Para profissionais',
    79, 790,
    '["Clientes ilimitados","Pacotes ilimitados","Google Calendar","PDF de recibos","Pipeline avançado"]'::jsonb,
    '{"max_clients":-1,"max_packages":-1}'::jsonb,
    2
  ),
  (
    'studio', 'Studio', 'Para produtoras',
    199, 1990,
    '["Tudo do Pro","Multi-usuário","White-label","Suporte prioritário","Relatórios avançados"]'::jsonb,
    '{"max_clients":-1,"max_packages":-1,"multi_user":true}'::jsonb,
    3
  )
ON CONFLICT (slug) DO NOTHING;

-- ── Promover usuário a admin (rode separado após execução acima) ──
-- UPDATE public.user_profiles SET role = 'admin' WHERE user_id = '<seu-uuid>';
-- SELECT id, email FROM auth.users WHERE email = 'seu@email.com';
