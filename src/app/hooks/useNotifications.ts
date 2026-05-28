import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/notificationService';
import type { Notification, UserRole } from '../types/database';

export function useNotifications(role: UserRole) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const [notifRes, countRes] = await Promise.all([
      notificationService.getForRole(role, 20),
      notificationService.getUnreadCount(role),
    ]);
    setNotifications(notifRes.data ?? []);
    setUnreadCount(countRes);
    setLoading(false);
  }, [role]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    const channel = notificationService.subscribeToRole(role, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(c => c + 1);
    });
    return () => { channel.unsubscribe(); };
  }, [role]);

  const markRead = async (id: string) => {
    await notificationService.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllRead(role);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch: fetchNotifications };
}
