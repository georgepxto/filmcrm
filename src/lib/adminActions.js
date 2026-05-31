import { supabase } from './supabase';

async function call(action, payload) {
  const { data, error } = await supabase.functions.invoke('admin', {
    body: { action, payload },
  });
  if (error) throw error;
  return data;
}

export const adminActions = {
  suspendUser:         (user_id, reason)                   => call('suspend_user',          { user_id, reason }),
  reactivateUser:      (user_id)                           => call('reactivate_user',        { user_id }),
  changeRole:          (user_id, role)                     => call('change_role',            { user_id, role }),
  deleteUser:          (user_id, hard_delete = false)      => call('delete_user',            { user_id, hard_delete }),
  resetUserPassword:   (user_id, email)                    => call('reset_user_password',    { user_id, email }),
  forceLogout:         (user_id)                           => call('force_logout',           { user_id }),
  updateSubscription:  (subscription_id, updates)          => call('update_subscription',    { subscription_id, updates }),
  cancelSubscription:  (subscription_id, user_id, reason)  => call('cancel_subscription',   { subscription_id, user_id, reason }),
  createManualPayment: (subscription_id, user_id, amount, currency) => call('create_manual_payment', { subscription_id, user_id, amount, currency }),
  updateUserNotes:     (user_id, notes)                    => call('update_user_notes',      { user_id, notes }),
};
