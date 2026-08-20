import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Bell, BellOff, CheckCircle2, Calendar, FileText, MessageSquare, ShieldAlert } from 'lucide-react';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await axios.put(`/api/notifications/${id}`);
      if (res.data.success) {
        setNotifications((prev) => 
          prev.map((notif) => (notif._id === id ? { ...notif, isRead: true } : notif))
        );
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'invite':
        return <Calendar className="w-4.5 h-4.5 text-primary-400" />;
      case 'file':
        return <FileText className="w-4.5 h-4.5 text-emerald-400" />;
      case 'message':
        return <MessageSquare className="w-4.5 h-4.5 text-indigo-400" />;
      default:
        return <ShieldAlert className="w-4.5 h-4.5 text-amber-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col selection:bg-primary-500 selection:text-white transition-colors duration-300">
      {/* Header Bar */}
      <header className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-900 bg-white/85 dark:bg-slate-950/85 sticky top-0 backdrop-blur z-30 transition-colors duration-300">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          Back to Dashboard
        </button>
        <span className="text-sm font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 flex-shrink-0">Notifications Inbox</span>
      </header>

      {/* Main Inbox */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="glass-premium p-8 rounded-3xl border border-slate-200 dark:border-slate-800 min-h-[450px] shadow-2xl flex flex-col justify-between bg-white/40 dark:bg-slate-900/40 transition-colors duration-300">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-900">
              <h2 className="text-sm font-semibold tracking-wider text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-primary-500 animate-swing" />
                Unread Messages & Invites
              </h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                {notifications.filter((n) => !n.isRead).length} Unread
              </span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                <div className="w-8 h-8 border-4 border-t-primary-500 border-r-transparent border-b-primary-500 border-l-transparent rounded-full animate-spin"></div>
                <p className="mt-4">Loading inbox messages...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-center space-y-3">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl text-slate-400 dark:text-slate-700">
                  <BellOff className="w-8 h-8" />
                </div>
                <p className="text-xs">Your inbox is completely clear.</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 max-w-xs">When users invite you to meetings or share files, details appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-900 mt-2">
                {notifications.map((notif) => {
                  const dateStr = new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const timeStr = new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={notif._id}
                      className={`py-4 flex items-center justify-between gap-4 px-2 rounded-xl transition ${
                        notif.isRead ? 'opacity-60' : 'bg-primary-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Avatar / Icon wrapper */}
                        <div className="relative shrink-0">
                          {notif.sender ? (
                            <img
                              src={notif.sender.profileImage}
                              alt={notif.sender.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 flex items-center justify-center">
                              {getIcon(notif.type)}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center scale-90">
                            {getIcon(notif.type)}
                          </span>
                        </div>

                        {/* Content text */}
                        <div className="flex flex-col">
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-normal max-w-md">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                            {dateStr} &bull; {timeStr}
                          </span>
                        </div>
                      </div>

                      {/* Right side mark read */}
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif._id)}
                          className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition"
                          title="Mark as Read"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-600 pt-6 border-t border-slate-100 dark:border-slate-900 text-center">
            System logs notifications are automatically pruned after 30 days.
          </div>
        </div>
      </main>
    </div>
  );
};

export default Notifications;
