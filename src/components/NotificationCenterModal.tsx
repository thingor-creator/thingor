import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  ShieldAlert,
  CreditCard,
  Wrench,
  Info,
  Settings,
  ExternalLink,
  SlidersHorizontal,
  Mail,
  Smartphone,
} from 'lucide-react';
import type { AppNotification } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    userNotificationSettings,
    updateNotificationSettings,
    language,
    t,
    setSelectedItemId,
    setCurrentView,
  } = useApp();

  const isHu = language === 'hu';
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.is_read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warranty':
        return <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />;
      case 'financing':
        return <CreditCard className="h-5 w-5 text-emerald-400 shrink-0" />;
      case 'repair':
        return <Wrench className="h-5 w-5 text-sky-400 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-indigo-400 shrink-0" />;
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) {
      markNotificationAsRead(notification.id);
    }
    if (notification.reference_id) {
      if (notification.type === 'warranty' || notification.type === 'system') {
        setSelectedItemId(notification.reference_id);
        setCurrentView('items');
        onClose();
      } else if (notification.type === 'repair') {
        setCurrentView('repairs');
        onClose();
      } else if (notification.type === 'financing') {
        setCurrentView('financing');
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Bell className="h-5 w-5 text-emerald-400" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isHu ? 'Értesítési Központ' : 'Notification Center'}
              </h3>
              <p className="text-xs text-slate-400">
                {unreadNotificationCount > 0
                  ? isHu
                    ? `${unreadNotificationCount} olvasatlan értesítés`
                    : `${unreadNotificationCount} unread notifications`
                  : isHu
                  ? 'Minden értesítés elolvasva'
                  : 'All notifications read'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isHu ? 'Összes' : 'All'} ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'unread'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isHu ? 'Olvasatlan' : 'Unread'} ({unreadNotificationCount})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{isHu ? 'Beállítások' : 'Settings'}</span>
            </button>
          </div>

          {activeTab !== 'settings' && notifications.length > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              title={isHu ? 'Összes megjelölése olvasottként' : 'Mark all as read'}
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{isHu ? 'Mind olvasott' : 'Mark all read'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
          {activeTab === 'settings' ? (
            /* User Notification Settings Tab */
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  {isHu ? 'Értesítési preferenciák' : 'Notification Preferences'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isHu
                    ? 'Szabályozd, hogy milyen típusú figyelmeztetéseket szeretnél kapni.'
                    : 'Control what types of alerts you want to receive.'}
                </p>
              </div>

              <div className="space-y-3">
                {/* Garancia toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {isHu ? 'Garancia lejárati értesítések' : 'Warranty Expiry Alerts'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isHu ? '30, 14, 3 nappal lejárhatóság előtt' : '30, 14, 3 days before expiry'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={userNotificationSettings?.warranty_enabled ?? true}
                    onChange={e => updateNotificationSettings({ warranty_enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Finanszírozás toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {isHu ? 'Finanszírozás / Részletfizetés esedékességek' : 'Financing & Installment Due Dates'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isHu ? '7, 3 nappal és esedékesség napján' : '7, 3 days before and on due date'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={userNotificationSettings?.financing_enabled ?? true}
                    onChange={e => updateNotificationSettings({ financing_enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Javítások toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-sky-400" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {isHu ? 'Javítási státuszfrissítések' : 'Repair Status Updates'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isHu ? 'Javítás indításakor, elkészültekor és lezárásakor' : 'On repair status changes'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={userNotificationSettings?.repair_enabled ?? true}
                    onChange={e => updateNotificationSettings({ repair_enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>

                {/* In-app toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-indigo-400" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {isHu ? 'In-App Értesítések' : 'In-App Notifications'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isHu ? 'Értesítési harang és lista az alkalmazásban' : 'Notification bell & list inside app'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={userNotificationSettings?.inapp_enabled ?? true}
                    onChange={e => updateNotificationSettings({ inapp_enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Email toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-purple-400" />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {isHu ? 'Email Értesítések' : 'Email Notifications'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isHu ? 'Időzített email emlékeztetők küldése' : 'Scheduled email reminders'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={userNotificationSettings?.email_enabled ?? true}
                    onChange={e => updateNotificationSettings({ email_enabled: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-slate-800/60 mb-3 text-slate-500">
                <Bell className="h-8 w-8" />
              </div>
              <h4 className="text-base font-semibold text-slate-300 mb-1">
                {isHu ? 'Nincs megjeleníthető értesítés' : 'No notifications found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs">
                {activeTab === 'unread'
                  ? isHu
                    ? 'Minden értesítést elolvastál!'
                    : 'You have read all notifications!'
                  : isHu
                  ? 'Amikor lejáró garanciád vagy esedékes törlesztőd érkezik, itt jelenik meg.'
                  : 'Upcoming warranty expiries and financing dues will appear here.'}
              </p>
            </div>
          ) : (
            /* Notification List */
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative flex items-start justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  notification.is_read
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-75 hover:opacity-100 hover:border-slate-700'
                    : 'bg-slate-800/60 border-slate-700/80 shadow-md hover:bg-slate-800 hover:border-emerald-500/40'
                }`}
              >
                {!notification.is_read && (
                  <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}

                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          notification.is_read ? 'text-slate-300' : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </h4>
                      {notification.reference_id && (
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed break-words">
                      {notification.description}
                    </p>
                    <span className="inline-block text-[11px] text-slate-500 mt-2 font-mono">
                      {new Date(notification.created_at).toLocaleDateString(isHu ? 'hu-HU' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.is_read && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        markNotificationAsRead(notification.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                      title={isHu ? 'Megjelölés olvasottként' : 'Mark as read'}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title={isHu ? 'Törlés' : 'Delete'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
