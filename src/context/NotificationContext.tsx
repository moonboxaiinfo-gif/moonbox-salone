import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NotificationItem } from '../types';
import { StorageService, isLocalDemoMode } from '../services/storageService';
import { createSupabaseRepository } from '../services/supabaseRepository';
import { clearAsyncDataCache } from '../services/asyncDataService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markingRead: boolean;
  markAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  retry: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const refreshNotifications = useCallback(async () => {
    const user = currentUser;
    if (!user) {
      setNotifications([]);
      setLoading(false);
      setError(null);
      clearAsyncDataCache();
      return;
    }
    const tenantId = isSuperAdmin ? 'superadmin' : user.tenantId;
    setLoading(true);
    setError(null);
    try {
      const items = isLocalDemoMode
        ? StorageService.getNotifications(tenantId)
        : await (async () => {
          const repository = createSupabaseRepository();
          if (!repository) throw new Error('Supabase is not configured. Notifications cannot be loaded.');
          return repository.notificationsForCurrentUser(isSuperAdmin ? undefined : tenantId);
        })();
      if (currentUser?.id !== user.id || currentUser?.tenantId !== user.tenantId) return;
      setNotifications([...items]);
    } catch (cause) {
      if (currentUser?.id === user.id) {
        setNotifications([]);
        setError(cause instanceof Error ? cause.message : 'Could not load notifications.');
      }
    } finally {
      if (currentUser?.id === user.id) setLoading(false);
    }
  }, [currentUser, isSuperAdmin]);

  useEffect(() => {
    refreshNotifications().catch(() => undefined);
    return () => {
      clearAsyncDataCache();
    };
  }, [refreshNotifications, attempt]);

  const markAllRead = useCallback(async () => {
    if (!currentUser || markingRead) return;
    const tenantId = isSuperAdmin ? undefined : currentUser.tenantId;
    setMarkingRead(true);
    setError(null);
    try {
      if (isLocalDemoMode) {
        if (tenantId) StorageService.markAllNotificationsRead(tenantId);
      } else {
        const repository = createSupabaseRepository();
        if (!repository) throw new Error('Supabase is not configured. Notifications cannot be updated.');
        await repository.markNotificationsRead(tenantId);
      }
      await refreshNotifications();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark notifications as read.');
    } finally {
      setMarkingRead(false);
    }
  }, [currentUser, isSuperAdmin, markingRead, refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, error, markingRead, markAllRead, refreshNotifications, retry: () => setAttempt(value => value + 1) }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
