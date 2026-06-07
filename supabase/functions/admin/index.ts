// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://filmmakercrm.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RATE_LIMIT = 60 // requisições por hora por admin

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401)
    }

    // Verifica o caller via JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    // Verifica se é admin usando service role (imune a bugs de RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    if (profile?.role !== 'admin') return json({ error: 'Forbidden — admin only' }, 403)

    // Rate limiting simples
    const oneHourAgo  = new Date(Date.now() - 3_600_000).toISOString()
    const { count }   = await adminClient
      .from('admin_actions')
      .select('id', { count: 'exact', head: true })
      .eq('admin_id', user.id)
      .gte('created_at', oneHourAgo)
    if ((count || 0) >= RATE_LIMIT) return json({ error: 'Rate limit exceeded' }, 429)

    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('cf-connecting-ip') ||
               'unknown'

    const { action, payload } = await req.json()

    const log = async (targetUserId: string | null, actionName: string, actionPayload: any) => {
      await adminClient.from('admin_actions').insert({
        admin_id:       user.id,
        target_user_id: targetUserId,
        action:         actionName,
        payload:        actionPayload,
        ip_address:     ip,
      })
    }

    let result: any = null

    switch (action) {
      // ── suspend_user ──────────────────────────────────────────
      case 'suspend_user': {
        const { user_id, reason } = payload
        await adminClient.from('user_profiles').update({
          status:            'suspended',
          suspended_at:      new Date().toISOString(),
          suspension_reason: reason || null,
          updated_at:        new Date().toISOString(),
        }).eq('user_id', user_id)
        await adminClient.auth.admin.signOut(user_id, 'global')
        await log(user_id, 'user_suspended', { reason })
        result = { success: true }
        break
      }

      // ── reactivate_user ───────────────────────────────────────
      case 'reactivate_user': {
        const { user_id } = payload
        await adminClient.from('user_profiles').update({
          status:            'active',
          suspended_at:      null,
          suspension_reason: null,
          updated_at:        new Date().toISOString(),
        }).eq('user_id', user_id)
        await log(user_id, 'user_reactivated', {})
        result = { success: true }
        break
      }

      // ── change_role ───────────────────────────────────────────
      case 'change_role': {
        const { user_id, role } = payload
        if (!['user', 'admin'].includes(role)) throw new Error('Invalid role')
        await adminClient.from('user_profiles').update({
          role,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user_id)
        await log(user_id, 'role_changed', { new_role: role })
        result = { success: true }
        break
      }

      // ── delete_user ───────────────────────────────────────────
      case 'delete_user': {
        const { user_id, hard_delete } = payload
        if (hard_delete) {
          const { error: delError } = await adminClient.auth.admin.deleteUser(user_id)
          if (delError) throw delError
          await log(user_id, 'user_hard_deleted', {})
        } else {
          await adminClient.from('user_profiles').update({
            status:     'deleted',
            updated_at: new Date().toISOString(),
          }).eq('user_id', user_id)
          await log(user_id, 'user_soft_deleted', {})
        }
        result = { success: true }
        break
      }

      // ── reset_user_password ───────────────────────────────────
      case 'reset_user_password': {
        const { user_id } = payload
        // Busca o email server-side para evitar que payload manipulado envie recovery para outro endereço
        const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(user_id)
        if (getUserError || !targetUser?.email) throw new Error('User not found')
        const { error: resetError } = await adminClient.auth.admin.generateLink({
          type:  'recovery',
          email: targetUser.email,
        })
        if (resetError) throw resetError
        await log(user_id, 'password_reset_sent', {})
        result = { success: true }
        break
      }

      // ── force_logout ──────────────────────────────────────────
      case 'force_logout': {
        const { user_id } = payload
        await adminClient.auth.admin.signOut(user_id, 'global')
        await log(user_id, 'force_logout', {})
        result = { success: true }
        break
      }

      // ── update_subscription ───────────────────────────────────
      case 'update_subscription': {
        const { subscription_id, updates } = payload
        const ALLOWED_SUB_FIELDS = ['status', 'billing_cycle', 'current_period_start', 'current_period_end', 'trial_ends_at', 'canceled_at', 'cancel_reason']
        const safeUpdates = Object.fromEntries(
          Object.entries(updates).filter(([k]) => ALLOWED_SUB_FIELDS.includes(k))
        )
        const { data: sub } = await adminClient
          .from('subscriptions')
          .update({ ...safeUpdates, updated_at: new Date().toISOString() })
          .eq('id', subscription_id)
          .select('user_id')
          .single()
        await log(sub?.user_id || null, 'subscription_updated', { subscription_id, updates: safeUpdates })
        result = { success: true }
        break
      }

      // ── cancel_subscription ───────────────────────────────────
      case 'cancel_subscription': {
        const { subscription_id, user_id, reason } = payload
        await adminClient.from('subscriptions').update({
          status:       'canceled',
          canceled_at:  new Date().toISOString(),
          cancel_reason: reason || null,
          updated_at:   new Date().toISOString(),
        }).eq('id', subscription_id)
        await log(user_id, 'subscription_canceled', { subscription_id, reason })
        result = { success: true }
        break
      }

      // ── create_manual_payment ─────────────────────────────────
      case 'create_manual_payment': {
        const { subscription_id, user_id, amount, currency } = payload
        const { data: payment, error: pmtError } = await adminClient
          .from('subscription_payments')
          .insert({
            subscription_id,
            user_id,
            amount:   Number(amount),
            currency: currency || 'BRL',
            status:   'paid',
            paid_at:  new Date().toISOString(),
          })
          .select()
          .single()
        if (pmtError) throw pmtError
        await log(user_id, 'manual_payment_created', { subscription_id, amount })
        result = payment
        break
      }

      // ── update_user_notes ─────────────────────────────────────
      case 'update_user_notes': {
        const { user_id, notes } = payload
        await adminClient.from('user_profiles').update({
          notes,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user_id)
        await log(user_id, 'user_notes_updated', {})
        result = { success: true }
        break
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400)
    }

    return json(result)

  } catch (err) {
    console.error('[admin-fn]', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
