import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, CheckCheck, X, AlertTriangle, Calendar, CreditCard, Sparkles } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose
}) => {
  const { notifications, unreadCount, markAllRead, loading, error, retry, markingRead } = useNotifications();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl border-l border-[#E8DFD6] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="p-4 bg-[#FAF8F5] border-b border-[#E8DFD6] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#9B3E88]" />
            <h3 className="font-bold text-sm text-[#1B0C2D]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#9B3E88] text-white">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingRead}
                className="text-xs font-semibold text-[#9B3E88] hover:underline flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{markingRead ? 'Saving…' : 'Mark Read'}</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#9B3E88] animate-pulse" />
              <p className="text-xs font-semibold">Loading notifications…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 px-6 text-rose-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-70" />
              <p className="text-xs font-semibold">Could not load notifications</p>
              <p className="text-[11px] mt-1 text-slate-500">{error}</p>
              <button onClick={retry} className="mt-3 text-xs font-bold text-[#9B3E88] hover:underline">Retry</button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#9B3E88]" />
              <p className="text-xs font-semibold">No notifications yet</p>
              <p className="text-[11px] mt-0.5">Booking alerts and stock notices appear here.</p>
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id}
                className={`p-4 transition-colors ${n.read ? 'bg-white' : 'bg-purple-50/40'}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#9B3E88]'}`} />
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-[#1B0C2D]">{n.title}</h5>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
