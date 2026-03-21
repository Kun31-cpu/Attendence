import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  AlertCircle,
  Bell,
  ArrowRight,
  GraduationCap,
  Target,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function StudentDashboard() {
  const { profile } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    attendance: '0%',
    avgMarks: '0.0',
    labsDone: '0/0',
    pendingAssignments: '0'
  });
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch Attendance
    const attQuery = query(collection(db, 'attendance'), where('studentId', '==', profile.uid));
    const unsubscribeAtt = onSnapshot(attQuery, (snapshot) => {
      const docs = snapshot.docs;
      const present = docs.filter(d => d.data().status === 'present').length;
      const total = docs.length || 1;
      const percentage = Math.round((present / total) * 100);
      setStats(prev => ({ ...prev, attendance: `${percentage}%` }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));

    // Fetch Marks
    const marksQuery = query(collection(db, 'marks'), where('studentId', '==', profile.uid));
    const unsubscribeMarks = onSnapshot(marksQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      const avg = docs.length > 0 ? (docs.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0) / docs.length).toFixed(1) : '0.0';
      setStats(prev => ({ ...prev, avgMarks: avg }));
      
      // Update performance data for chart
      const chartData = docs.map(d => ({
        name: d.subjectId || 'Subject',
        marks: d.totalMarks || 0,
        attendance: 0 // Will be updated below
      }));
      setPerformanceData(chartData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'marks'));

    // Fetch Labs
    const labsQuery = query(collection(db, 'lab_submissions'), where('studentId', '==', profile.uid));
    const allLabsQuery = query(collection(db, 'labs'));
    
    const unsubscribeLabs = onSnapshot(labsQuery, (subSnap) => {
      onSnapshot(allLabsQuery, (labsSnap) => {
        const done = subSnap.docs.length;
        const total = labsSnap.docs.length;
        setStats(prev => ({ ...prev, labsDone: `${done}/${total}` }));
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'lab_submissions'));

    // Fetch Assignments
    const asgnQuery = query(collection(db, 'assignments'));
    const subQuery = query(collection(db, 'submissions'), where('studentId', '==', profile.uid));
    
    const unsubscribeAsgn = onSnapshot(asgnQuery, (asgnSnap) => {
      onSnapshot(subQuery, (subSnap) => {
        const submittedIds = new Set(subSnap.docs.map(d => d.data().assignmentId));
        const pending = asgnSnap.docs.filter(d => !submittedIds.has(d.id)).length;
        setStats(prev => ({ ...prev, pendingAssignments: `${pending} Pending` }));
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'assignments'));

    return () => {
      unsubscribeAtt();
      unsubscribeMarks();
      unsubscribeLabs();
      unsubscribeAsgn();
    };
  }, [profile]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 pb-12"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-[3.5rem] p-12 md:p-20 border border-white/30 shadow-2xl group bg-[#5A5A40]/5"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-[#5A5A40]/10 blur-[120px] rounded-full opacity-60" 
        />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#5A5A40]/10 border border-[#5A5A40]/20 mb-8"
            >
              <GraduationCap className="w-5 h-5 text-[#5A5A40]" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#5A5A40]">Academic Excellence</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-playfair font-black tracking-tight text-stone-900 leading-[0.9] mb-8">
              {profile?.bannerName || `Hello, ${profile?.displayName?.split(' ')[0]}`}
            </h1>
            
            <p className="text-lg text-stone-600 font-montserrat font-medium leading-relaxed max-w-xl italic">
              {profile?.bannerDescription || "Your academic journey is a marathon, not a sprint. Track your progress and reach your full potential."}
            </p>
            
            <div className="flex flex-wrap gap-4 mt-10">
              <button 
                onClick={() => navigate('/assignments')}
                className="px-8 py-4 rounded-2xl bg-[#5A5A40] text-white font-montserrat font-bold text-sm flex items-center gap-3 hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20 active:scale-95"
              >
                View Assignments <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => navigate('/labs')}
                className="px-8 py-4 rounded-2xl bg-white/50 backdrop-blur-md border border-stone-200 text-stone-800 font-montserrat font-bold text-sm hover:bg-white/80 transition-all active:scale-95"
              >
                Lab Sessions
              </button>
            </div>
          </div>
          
          <div className="hidden lg:block relative">
            <div className="w-64 h-64 rounded-[3rem] bg-stone-100 border border-white/50 shadow-inner flex items-center justify-center overflow-hidden">
              <div className="text-center">
                <p className="text-6xl font-playfair font-black text-[#5A5A40]">{stats.attendance}</p>
                <p className="text-xs font-montserrat font-black uppercase tracking-widest opacity-40 mt-2">Attendance</p>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-emerald-500 shadow-lg flex items-center justify-center text-white animate-bounce">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-2xl bg-indigo-500 shadow-lg flex items-center justify-center text-white animate-pulse">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Attendance', value: stats.attendance, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-100/50' },
          { label: 'Avg Marks', value: stats.avgMarks, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-100/50' },
          { label: 'Labs Done', value: stats.labsDone, icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-100/50' },
          { label: 'Assignments', value: stats.pendingAssignments, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-100/50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className={cn(
              "bg-white/40 backdrop-blur-xl p-10 rounded-[3rem] border shadow-2xl transition-all group",
              stat.border
            )}
          >
            <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-inner transition-transform group-hover:scale-110 duration-500", stat.bg)}>
              <stat.icon className={cn("w-8 h-8", stat.color)} />
            </div>
            <p className="text-[10px] font-montserrat font-black uppercase tracking-[0.2em] opacity-40 mb-2">{stat.label}</p>
            <p className="text-3xl font-playfair font-black tracking-tight text-stone-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Performance Chart */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white/40 backdrop-blur-xl p-12 rounded-[3.5rem] border border-white/50 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-2xl md:text-3xl font-playfair font-bold text-stone-900">Academic Performance</h3>
              <p className="text-sm font-montserrat font-medium text-stone-500 mt-1">Comparison between attendance and marks</p>
            </div>
            <div className="flex items-center gap-3 px-5 py-2.5 bg-[#5A5A40]/5 rounded-full border border-[#5A5A40]/10">
              <div className="w-2 h-2 bg-[#5A5A40] rounded-full animate-pulse" />
              <span className="text-[10px] font-montserrat font-black uppercase tracking-widest text-[#5A5A40]">Live Sync</span>
            </div>
          </div>
          
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData.length > 0 ? performanceData : [{ name: 'No Data', marks: 0, attendance: 0 }]} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#5A5A40" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A8A878" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#A8A878" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#78716c' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#78716c' }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(90, 90, 64, 0.05)' }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: '1px solid rgba(255,255,255,0.5)', 
                    backdropFilter: 'blur(20px)',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                    padding: '20px'
                  }}
                />
                <Bar dataKey="attendance" fill="url(#colorAttendance)" radius={[12, 12, 0, 0]} barSize={32} />
                <Bar dataKey="marks" fill="url(#colorMarks)" radius={[12, 12, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Sidebar Section */}
        <div className="space-y-10">
          {/* Notifications */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/40 backdrop-blur-xl p-10 rounded-[3.5rem] border border-white/50 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-playfair font-bold text-stone-900 flex items-center gap-3">
                <Bell className="w-6 h-6 text-[#5A5A40]" />
                Updates
              </h3>
              {notifications.some(n => !n.read) && (
                <span className="px-3 py-1 rounded-full bg-red-500 text-[10px] font-black text-white uppercase tracking-widest">New</span>
              )}
            </div>
            
            <div className="space-y-6">
              {notifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Bell className="w-10 h-10 text-stone-300" />
                  </div>
                  <p className="text-stone-400 font-montserrat italic text-sm">All caught up!</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.slice(0, 4).map((notification) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ x: 5 }}
                      key={notification.id} 
                      className={cn(
                        "flex gap-5 p-6 rounded-[2rem] border transition-all cursor-pointer group",
                        notification.read ? "bg-white/20 border-white/20" : "bg-[#5A5A40]/5 border-[#5A5A40]/10 shadow-sm"
                      )}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6 duration-500",
                        notification.type === 'warning' ? 'bg-red-500/10 text-red-600' : 
                        notification.type === 'assignment' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                      )}>
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-montserrat font-black text-sm tracking-tight text-stone-800 mb-1 truncate">{notification.title}</p>
                        <p className="text-xs text-stone-500 font-medium line-clamp-2 leading-relaxed">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-4">
                          <Clock className="w-3.5 h-3.5 text-stone-300" />
                          <p className="text-[10px] font-montserrat font-bold uppercase tracking-widest text-stone-400">
                            {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
            
            <button 
              onClick={() => navigate('/notifications')}
              className="w-full mt-10 py-5 rounded-2xl bg-[#5A5A40]/5 text-[#5A5A40] font-montserrat font-black text-xs uppercase tracking-[0.2em] hover:bg-[#5A5A40]/10 transition-all active:scale-95"
            >
              View All Activity
            </button>
          </motion.div>

          {/* Goal Progress */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/40 backdrop-blur-xl p-10 rounded-[3.5rem] border border-white/50 shadow-2xl"
          >
            <h3 className="text-2xl font-playfair font-bold text-stone-900 mb-10 flex items-center gap-3">
              <Target className="w-6 h-6 text-[#5A5A40]" />
              Learning Path
            </h3>
            <div className="space-y-8">
              {[
                { name: 'Mathematics', progress: 75, color: 'bg-blue-500' },
                { name: 'Physics', progress: 60, color: 'bg-[#5A5A40]' },
                { name: 'Computer Science', progress: 90, color: 'bg-emerald-500' },
              ].map((course, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-montserrat font-black tracking-tight text-stone-800">{course.name}</span>
                    <span className="text-xs font-montserrat font-bold text-stone-400">{course.progress}%</span>
                  </div>
                  <div className="h-4 bg-stone-100 rounded-full overflow-hidden p-1 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${course.progress}%` }}
                      transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: "circOut" }}
                      className={cn("h-full rounded-full shadow-lg", course.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-10 py-5 rounded-2xl border border-stone-200 text-stone-600 font-montserrat font-black text-xs uppercase tracking-[0.2em] hover:bg-stone-50 transition-all active:scale-95">
              Explore Curriculum
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
