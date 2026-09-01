import { supabase } from '../lib/supabaseClient';
import { Notification, NotificationType } from '../types';

export async function createNotification(
  merchantId: string,
  type: NotificationType,
  title: string,
  body?: string,
  relatedCartId?: string,
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    merchant_id: merchantId,
    type,
    title,
    body: body ?? null,
    related_cart_id: relatedCartId ?? null,
  });
  // Notifications are best-effort — never let a delivery/log failure break the caller's real work.
  if (error) console.error('[notificationService] failed to create notification', error);
}

export async function listNotifications(merchantId: string, limit = 50): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const [{ data: notifications, error }, { count, error: countError }] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('is_read', false),
  ]);

  if (error) throw error;
  if (countError) throw countError;

  return { notifications: (notifications ?? []) as Notification[], unreadCount: count ?? 0 };
}

export async function markNotificationRead(merchantId: string, notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('merchant_id', merchantId);
  if (error) throw error;
}

export async function markAllNotificationsRead(merchantId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('merchant_id', merchantId).eq('is_read', false);
  if (error) throw error;
}
