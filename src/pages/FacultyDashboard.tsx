import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Users, 
  BookOpen, 
  FileCheck, 
  Clock,
  TrendingDown,
  ChevronRight,
  Bell,
  Flag,
  ArrowUpRight,
  Target,
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { useNotifications } from '../hooks/useNotifications';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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

export default function FacultyDashboard() {
  const { profile } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const [flagging, setFlagging] = useState<string | null>(null);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: '0',
    activeCourses: '0',
    pendingTasks: '0',
    nextLecture: '10:30'
  });
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch Students
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.docs.length.toString() }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // Fetch Subjects
    const subjectsQuery = query(collection(db, 'subjects'), where('facultyId', '==', profile.uid));
    const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, activeCourses: snapshot.docs.length.toString().padStart(2, '0') }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'subjects'));

    // Fetch Submissions (Pending)
    const submissionsQuery = query(collection(db, 'submissions'), where('status', '==', 'submitted'));
    const labSubmissionsQuery = query(collection(db, 'lab_submissions'), where('score', '==', 0));
    
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (subSnap) => {
      onSnapshot(labSubmissionsQuery, (labSnap) => {
        const pending = subSnap.docs.length + labSnap.docs.length;
        setStats(prev => ({ ...prev, pendingTasks: pending.toString() }));
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'submissions'));

    // Mock trend data for now, but could be aggregated from attendance collection
    setAttendanceTrend([
      { name: 'Mon', attendance: 85 },
      { name: 'Tue', attendance: 88 },
      { name: 'Wed', attendance: 75 },
      { name: 'Thu', attendance: 92 },
      { name: 'Fri', attendance: 80 },
    ]);

    return () => {
      unsubscribeStudents();
      unsubscribeSubjects();
      unsubscribeSubmissions();
    };
  }, [profile]);

  const handleFlagStudent = async (studentName: string) => {
    setFlagging(studentName);
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: profile?.uid,
        title: 'Student Flagged',
        message: `${studentName} has been flagged for low attendance/marks.`,
        type: 'warning',
        read: false,
        createdAt: serverTimestamp(),
        link: '/attendance'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notifications');
    } finally {
      setFlagging(null);
    }
  };

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
          className="absolute -top-[10%] -right-[10%] w-[70%] h-[70%] bg-[#5A5A40]/10 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-stone-500/10 blur-[120px] rounded-full"
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 space-y-8 md:space-y-12 pb-24 px-4 md:px-0"
      >
        {/* Hero Section */}
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-xl shadow-[#5A5A40]/20">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-5xl font-playfair font-black text-white tracking-tight">
                Faculty Hub
              </h1>
            </div>
            <p className="text-base md:text-lg text-white/50 font-montserrat font-medium italic leading-relaxed max-w-xl">
              Welcome back, {profile?.displayName?.split(' ')[0] || 'Professor'}. Manage your courses and track student progress.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 p-2 rounded-2xl border border-white/10 backdrop-blur-xl">
            <div className="flex flex-col items-end px-4">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Current Session</span>
              <span className="text-sm font-bold text-white">Academic Year 2024</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#5A5A40] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 'Active across all years' },
            { label: 'Active Courses', value: stats.activeCourses, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: 'Full capacity' },
            { label: 'Pending Tasks', value: stats.pendingTasks, icon: FileCheck, color: 'text-purple-400', bg: 'bg-purple-500/10', trend: 'Submissions to grade' },
            { label: 'Next Lecture', value: stats.nextLecture, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10', trend: 'Room 402B' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/20 shadow-2xl group transition-all"
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-6 shadow-lg", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-black">{stat.label}</p>
                <p className="text-2xl md:text-4xl font-playfair font-black tracking-tight text-white">{stat.value}</p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest truncate">{stat.trend}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Main Chart Area */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-2 bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-white/20 shadow-2xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h3 className="text-2xl md:text-3xl font-playfair font-black text-white mb-2">Attendance Analytics</h3>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Weekly engagement overview</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 self-start">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Real-time Sync</span>
              </div>
            </div>
            
            <div className="h-[300px] md:h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: 'rgba(255,255,255,0.3)' }}
                    dy={15}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: 'rgba(255,255,255,0.3)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                      padding: '20px',
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(10,5,2,0.9)',
                      backdropFilter: 'blur(20px)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#5A5A40" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorAttendance)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Sidebar Sections */}
          <div className="space-y-8 md:space-y-12">
            {/* Recent Activity */}
            <motion.div 
              variants={itemVariants}
              className="bg-white/10 backdrop-blur-xl p-8 rounded-[3rem] border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-playfair font-black text-white">Recent Activity</h3>
                <div className="p-3 bg-white/5 rounded-2xl">
                  <Bell className="w-5 h-5 text-[#5A5A40]" />
                </div>
              </div>
              
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 opacity-30">
                    <Bell className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No new updates</p>
                  </div>
                ) : (
                  notifications.slice(0, 4).map((notification) => (
                    <motion.div 
                      whileHover={{ x: 8 }}
                      key={notification.id} 
                      className={cn(
                        "p-5 rounded-[2rem] border transition-all cursor-pointer group",
                        notification.read ? "bg-white/5 border-white/5" : "bg-[#5A5A40]/10 border-[#5A5A40]/20 shadow-lg"
                      )}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs tracking-tight mb-1 truncate text-white">{notification.title}</p>
                          <p className="text-[11px] text-white/40 font-medium leading-relaxed line-clamp-2 italic">{notification.message}</p>
                          <div className="flex items-center gap-2 mt-4 opacity-30">
                            <Clock className="w-3.5 h-3.5" />
                            <p className="text-[9px] font-black uppercase tracking-widest">
                              {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                            </p>
                          </div>
                        </div>
                        {!notification.read && <div className="w-2 h-2 rounded-full bg-[#5A5A40] shrink-0 mt-1.5 shadow-[0_0_12px_rgba(90,90,64,0.6)]" />}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              
              <button 
                onClick={() => navigate('/notifications')}
                className="w-full mt-8 py-5 rounded-2xl bg-white/5 text-white/60 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 border border-white/10"
              >
                View Full Feed
              </button>
            </motion.div>

            {/* Priority Alerts */}
            <motion.div 
              variants={itemVariants}
              className="bg-white/10 backdrop-blur-xl p-8 rounded-[3rem] border border-white/20 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-playfair font-black text-white">Priority Alerts</h3>
                <div className="w-10 h-10 bg-red-500/10 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: 'John Doe', attendance: '65%', marks: '42/100' },
                  { name: 'Alice Smith', attendance: '72%', marks: '38/100' },
                  { name: 'Bob Wilson', attendance: '68%', marks: '45/100' },
                ].map((student, i) => (
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    key={i} 
                    className="flex items-center justify-between p-5 bg-red-500/5 rounded-[2rem] border border-red-500/10 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-red-500/10 group-hover:rotate-6 transition-transform">
                        <TrendingDown className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <p className="font-black text-xs tracking-tight text-white/80">{student.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400/60 mt-1">Att: {student.attendance} | Marks: {student.marks}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleFlagStudent(student.name)}
                      disabled={flagging === student.name}
                      className="p-4 bg-white/5 hover:bg-red-500/10 rounded-2xl transition-all active:scale-90"
                      title="Flag Student"
                    >
                      <Flag className={cn(
                        "w-4 h-4 transition-colors",
                        flagging === student.name ? "text-white/20 animate-pulse" : "text-red-400 group-hover:text-red-500"
                      )} />
                    </button>
                  </motion.div>
                ))}
              </div>
              
              <button className="w-full mt-8 py-5 rounded-2xl border border-white/10 text-red-400/60 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/5 transition-all active:scale-95">
                Manage All Alerts
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
