import React, { useState, useEffect } from 'react';
import { Bell, X, MessageSquare, ShoppingBag, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, writeBatch, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Notification, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { cn } from '../utils/cn';

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return unsubscribe;
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare size={18} className="text-brand-600" />;
      case 'order': return <ShoppingBag size={18} className="text-blue-600" />;
      case 'system': return <Info size={18} className="text-orange-600" />;
      default: return <CheckCircle size={18} className="text-slate-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all relative",
          isOpen && "bg-brand-50 text-brand-600"
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 glass rounded-3xl shadow-2xl z-50 overflow-hidden border border-white/20"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/50">
                <h3 className="font-display font-bold text-slate-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={cn(
                          "p-4 transition-colors hover:bg-slate-50/50 flex gap-4",
                          !notification.read && "bg-brand-50/30"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                            <span className="text-[10px] text-slate-400">
                              {(notification.createdAt as any)?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{notification.message}</p>
                          {notification.link && (
                            <a 
                              href={notification.link}
                              className="inline-block text-[10px] font-black text-brand-600 uppercase tracking-widest mt-2 hover:underline"
                            >
                              View Details
                            </a>
                          )}
                        </div>
                        {!notification.read && (
                          <div className="mt-2 w-2 h-2 bg-brand-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                      <Bell size={32} />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">No notifications yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
