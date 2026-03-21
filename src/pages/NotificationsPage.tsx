import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { 
  Bell, 
  Check, 
  Trash2, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  AlertCircle, 
  Calendar, 
  Info,
  ChevronRight,
  Filter,
  BellOff,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 }
  }
};

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'assignment': return <BookOpen className="w-5 h-5 text-blue-500" />;
    case 'grade': return <GraduationCap className="w-5 h-5 text-emerald-500" />;
    case 'attendance': return <AlertCircle className="w-5 h-5 text-orange-500" />;
    case 'deadline': return <Calendar className="w-5 h-5 text-red-500" />;
    case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
    default: return <Info className="w-5 h-5 text-[#5A5A40]" />;
  }
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-12 pb-12"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-[#5A5A40]/30" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-montserrat font-black text-[#5A5A40]/60">Stay Updated</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-playfair font-black tracking-tighter leading-[0.9] text-stone-900">
            Inbox<span className="text-[#5A5A40]">.</span>
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-xl text-stone-500 font-montserrat font-medium italic leading-relaxed">
              You have {unreadCount} unread messages.
            </p>
            {unreadCount > 0 && (
              <span className="px-3 py-1 bg-[#5A5A40] text-white text-[10px] font-montserrat font-black uppercase tracking-widest rounded-full animate-pulse">
                New
              </span>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button 
              onClick={() => markAllAsRead()}
              className="flex items-center gap-2 px-6 py-3 bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl text-[10px] font-montserrat font-black uppercase tracking-widest text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white transition-all shadow-xl shadow-black/5 active:scale-95"
            >
              <Check className="w-4 h-4" /> Mark all read
            </button>
          )}
        </motion.div>
      </header>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <motion.div
                key={notification.id}
                variants={itemVariants}
                layout
                exit="exit"
                className={cn(
                  "group relative bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 p-8 transition-all duration-500 hover:shadow-3xl hover:shadow-black/5",
                  !notification.read && "ring-2 ring-[#5A5A40]/10 border-[#5A5A40]/20"
                )}
              >
                <div className="flex gap-8">
                  <div className={cn(
                    "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 border transition-all shadow-sm group-hover:rotate-6",
                    !notification.read ? "bg-white border-[#5A5A40]/20" : "bg-stone-100 border-transparent"
                  )}>
                    <NotificationIcon type={notification.type} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-montserrat font-black text-[#5A5A40] uppercase tracking-[0.2em]">
                          {notification.type}
                        </span>
                        <span className="w-1 h-1 bg-stone-300 rounded-full" />
                        <span className="text-[10px] font-montserrat font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="p-2.5 hover:bg-[#5A5A40]/10 rounded-xl text-[#5A5A40] transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(notification.id)}
                          className="p-2.5 hover:bg-red-50 rounded-xl text-red-400 transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className={cn(
                      "text-2xl font-playfair font-black tracking-tight leading-tight",
                      !notification.read ? "text-stone-900" : "text-stone-400"
                    )}>
                      {notification.title}
                    </h3>
                    <p className={cn(
                      "text-base leading-relaxed font-montserrat font-medium",
                      !notification.read ? "text-stone-600" : "text-stone-400"
                    )}>
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-6 pt-2">
                      {notification.link && (
                        <button 
                          onClick={() => navigate(notification.link!)}
                          className="text-[10px] font-montserrat font-black uppercase tracking-widest text-[#5A5A40] hover:text-stone-900 flex items-center gap-2 group/btn"
                        >
                          View Details
                          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {!notification.read && (
                  <div className="absolute top-8 right-8 w-2 h-2 bg-[#5A5A40] rounded-full animate-pulse" />
                )}
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-32 text-center space-y-8"
            >
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-stone-100 rounded-[3rem] flex items-center justify-center mx-auto text-stone-300">
                  <BellOff className="w-16 h-16" />
                </div>
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-4 w-12 h-12 bg-[#5A5A40]/10 rounded-full blur-xl"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-4xl font-playfair font-black text-stone-900 italic tracking-tight">All clear!</h3>
                <p className="text-stone-400 font-montserrat font-medium text-lg">No new notifications at the moment.</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-stone-900 text-white rounded-2xl text-[10px] font-montserrat font-black uppercase tracking-widest hover:bg-[#5A5A40] transition-all shadow-2xl shadow-black/20"
              >
                Refresh Inbox
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
