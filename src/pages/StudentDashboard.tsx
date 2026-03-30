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
    <div className="relative min-h-screen">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[70%] h-[70%] bg-accent/10 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full"
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 space-y-6 pb-24 px-4 md:px-0"
      >
        {/* Hero Section */}
        <motion.div 
          variants={itemVariants}
          className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-12 border border-white/20 shadow-2xl group bg-white/10 backdrop-blur-2xl"
        >
          <div className="relative z-10 flex flex-col gap-8">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/30 mb-6"
              >
                <GraduationCap className="w-4 h-4 text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Academic Excellence</span>
              </motion.div>
              
              <h1 className="text-4xl md:text-7xl font-playfair font-black tracking-tight text-white leading-[0.95] mb-6">
                {profile?.bannerName || `Hello, ${profile?.displayName?.split(' ')[0]}`}
              </h1>
              
              <p className="text-base md:text-xl text-white/70 font-montserrat font-medium leading-relaxed max-w-xl italic">
                {profile?.bannerDescription || "Your academic journey is a marathon, not a sprint. Track your progress and reach your full potential."}
              </p>
              
              <div className="flex flex-wrap gap-3 mt-8">
                <button 
                  onClick={() => navigate('/assignments')}
                  className="flex-1 min-w-[140px] px-6 py-4 rounded-2xl bg-accent text-white font-montserrat font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-accent/80 transition-all shadow-xl shadow-accent/20 active:scale-95"
                >
                  Assignments <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => navigate('/labs')}
                  className="flex-1 min-w-[140px] px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-montserrat font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
                >
                  Lab Sessions
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 rounded-3xl bg-white/10 border border-white/10 lg:hidden">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Attendance</p>
                  <p className="text-xl font-playfair font-black text-white">{stats.attendance}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">On Track</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Attendance', value: stats.attendance, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { label: 'Avg Marks', value: stats.avgMarks, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Labs Done', value: stats.labsDone, icon: CheckCircle2, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            { label: 'Assignments', value: stats.pendingAssignments, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className={cn(
                "bg-white/10 backdrop-blur-xl p-6 rounded-[2rem] border transition-all group",
                stat.border
              )}
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">{stat.label}</p>
              <p className="text-xl font-playfair font-black tracking-tight text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Chart */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-2 bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-playfair font-black text-white">Academic Performance</h3>
                <p className="text-[10px] font-montserrat font-medium text-white/40 mt-1 uppercase tracking-widest">Attendance vs Marks Comparison</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 self-start">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Live Sync</span>
              </div>
            </div>
            
            <div className="h-[250px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData.length > 0 ? performanceData : [{ name: 'No Data', marks: 0, attendance: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: 'rgba(255,255,255,0.3)' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ 
                      borderRadius: '20px', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      backdropFilter: 'blur(20px)',
                      backgroundColor: 'rgba(10,5,2,0.8)',
                      boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                      padding: '15px'
                    }}
                  />
                  <Bar dataKey="attendance" fill="url(#colorAttendance)" radius={[8, 8, 0, 0]} barSize={24} />
                  <Bar dataKey="marks" fill="url(#colorMarks)" radius={[8, 8, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            {/* Notifications */}
            <motion.div 
              variants={itemVariants}
              className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-playfair font-black text-white flex items-center gap-3">
                  <Bell className="w-5 h-5 text-accent" />
                  Updates
                </h3>
                {notifications.some(n => !n.read) && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-[8px] font-black text-white uppercase tracking-widest">New</span>
                )}
              </div>
              
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-white/10" />
                    </div>
                    <p className="text-white/30 font-montserrat italic text-xs">All caught up!</p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {notifications.slice(0, 3).map((notification) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ x: 5 }}
                        key={notification.id} 
                        className={cn(
                          "flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",
                          notification.read ? "bg-white/5 border-white/5" : "bg-accent/10 border-accent/20 shadow-sm"
                        )}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6 duration-500",
                          notification.type === 'warning' ? 'bg-red-500/10 text-red-400' : 
                          notification.type === 'assignment' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                        )}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-montserrat font-black text-xs tracking-tight text-white mb-0.5 truncate">{notification.title}</p>
                          <p className="text-[10px] text-white/40 font-medium line-clamp-1 leading-relaxed">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-3 h-3 text-white/20" />
                            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">
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
                className="w-full mt-8 py-4 rounded-xl bg-white/5 text-white/60 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95"
              >
                View All Activity
              </button>
            </motion.div>

            {/* Goal Progress */}
            <motion.div 
              variants={itemVariants}
              className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20"
            >
              <h3 className="text-lg font-playfair font-black text-white mb-8 flex items-center gap-3">
                <Target className="w-5 h-5 text-accent" />
                Learning Path
              </h3>
              <div className="space-y-6">
                {[
                  { name: 'Mathematics', progress: 75, color: 'bg-blue-500' },
                  { name: 'Physics', progress: 60, color: 'bg-accent' },
                  { name: 'Computer Science', progress: 90, color: 'bg-emerald-500' },
                ].map((course, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black tracking-tight text-white/80 uppercase">{course.name}</span>
                      <span className="text-[10px] font-bold text-white/30">{course.progress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner">
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
              <button className="w-full mt-8 py-4 rounded-xl border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 transition-all active:scale-95">
                Explore Curriculum
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
