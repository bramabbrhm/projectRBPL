import { supabase } from '../lib/supabase';
import type { Notification, ServiceResponse, UserRole } from '../types/database';

export const notificationService = {
  async getForRole(role: UserRole, limit = 20): Promise<ServiceResponse<Notification[]>> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_role.eq.all,target_role.eq.${role}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data: data as Notification[] | null, error: error?.message ?? null };
  },

  async getUnreadCount(role: UserRole): Promise<number> {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`target_role.eq.all,target_role.eq.${role}`)
      .eq('is_read', false);
    return count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  async markAllRead(role: UserRole): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`target_role.eq.all,target_role.eq.${role}`)
      .eq('is_read', false);
  },

  async create(notification: Omit<Notification, 'id' | 'is_read' | 'created_at'>): Promise<ServiceResponse<Notification>> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({ ...notification, is_read: false })
      .select()
      .single();
    return { data: data as Notification | null, error: error?.message ?? null };
  },

  subscribeToRole(role: UserRole, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications-${role}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_role=eq.${role}`,
        },
        payload => callback(payload.new as Notification)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'target_role=eq.all',
        },
        payload => callback(payload.new as Notification)
      )
      .subscribe();
  },
};
