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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-20"
    >
      {/* Premium Banner */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-[3.5rem] p-12 md:p-20 border border-white/40 shadow-2xl group bg-white/40 backdrop-blur-xl"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 45, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-[#5A5A40]/10 blur-[120px] rounded-full opacity-40 pointer-events-none" 
        />
        
        <div className="relative z-10">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-4 mb-10"
          >
            <div className="px-4 py-1.5 rounded-full bg-[#5A5A40]/10 border border-[#5A5A40]/20 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5A5A40]">Faculty Portal</span>
            </div>
            <div className="h-px w-12 bg-[#5A5A40]/20" />
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-playfair font-black tracking-tight text-[#5A5A40] leading-[0.9] mb-8">
                {profile?.bannerName || `Welcome, ${profile?.displayName?.split(' ')[0] || 'Professor'}`}
              </h1>
              <p className="text-lg md:text-xl text-[#5A5A40]/70 font-montserrat font-medium leading-relaxed italic max-w-xl">
                {profile?.bannerDescription || 'Your academic command center. Orchestrate learning, track engagement, and inspire excellence.'}
              </p>
            </div>
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/attendance')}
              className="group/btn relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-[#5A5A40] blur-2xl opacity-20 group-hover/btn:opacity-40 transition-opacity" />
              <div className="relative flex items-center gap-4 px-8 py-6 bg-[#5A5A40] rounded-3xl text-white shadow-2xl shadow-[#5A5A40]/40 overflow-hidden transition-transform">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                <span className="font-montserrat font-black text-sm uppercase tracking-widest">Start Session</span>
                <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10', trend: 'Active across all years' },
          { label: 'Active Courses', value: stats.activeCourses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-500/10', trend: 'Full capacity' },
          { label: 'Pending Tasks', value: stats.pendingTasks, icon: Target, color: 'text-purple-600', bg: 'bg-purple-500/10', trend: 'Submissions to grade' },
          { label: 'Next Lecture', value: stats.nextLecture, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-500/10', trend: 'Room 402B' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white/60 backdrop-blur-xl p-10 rounded-[3rem] border border-white/40 shadow-xl group transition-all"
          >
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-inner transition-transform group-hover:rotate-6", stat.bg)}>
              <stat.icon className={cn("w-8 h-8", stat.color)} />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black font-montserrat">{stat.label}</p>
              <p className="text-3xl font-playfair font-black tracking-tight text-[#5A5A40]">{stat.value}</p>
              <div className="flex items-center gap-2 pt-2">
                <div className="w-1 h-1 rounded-full bg-[#5A5A40]/30" />
                <p className="text-[10px] font-bold text-[#5A5A40]/50 uppercase tracking-widest">{stat.trend}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Chart Area */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 bg-white/60 backdrop-blur-xl p-12 rounded-[3.5rem] border border-white/40 shadow-2xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h3 className="text-2xl md:text-3xl font-playfair font-black text-[#5A5A40] mb-2">Attendance Analytics</h3>
              <p className="text-sm text-[#5A5A40]/50 font-montserrat font-medium">Weekly engagement overview across all batches</p>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-[#5A5A40]/5 rounded-2xl border border-[#5A5A40]/10">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#5A5A40]/60">Real-time Sync</span>
            </div>
          </div>
          
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5A5A40" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5A5A40" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(90,90,64,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#5A5A40', opacity: 0.4 }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#5A5A40', opacity: 0.4 }}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: '1px solid rgba(90,90,64,0.1)', 
                    boxShadow: '0 25px 50px -12px rgba(90,90,64,0.25)',
                    padding: '20px',
                    fontFamily: 'Montserrat',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)'
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
        <div className="space-y-12">
          {/* Recent Activity */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/60 backdrop-blur-xl p-12 rounded-[3.5rem] border border-white/40 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-playfair font-black text-[#5A5A40]">Recent Activity</h3>
              <div className="p-2 bg-[#5A5A40]/10 rounded-xl">
                <Bell className="w-5 h-5 text-[#5A5A40]" />
              </div>
            </div>
            
            <div className="space-y-6">
              {notifications.length === 0 ? (
                <div className="text-center py-16 opacity-30">
                  <Bell className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xs font-montserrat font-black uppercase tracking-widest">No new updates</p>
                </div>
              ) : (
                notifications.slice(0, 3).map((notification) => (
                  <motion.div 
                    whileHover={{ x: 8 }}
                    key={notification.id} 
                    className={cn(
                      "p-6 rounded-[2rem] border transition-all cursor-pointer group",
                      notification.read ? "bg-white/20 border-white/20" : "bg-[#5A5A40]/5 border-[#5A5A40]/10 shadow-sm"
                    )}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-montserrat font-black text-xs tracking-tight mb-2 truncate text-[#5A5A40]">{notification.title}</p>
                        <p className="text-[11px] text-[#5A5A40]/60 font-medium leading-relaxed line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-4 opacity-40">
                          <Clock className="w-3 h-3" />
                          <p className="text-[9px] font-black uppercase tracking-widest">
                            {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                          </p>
                        </div>
                      </div>
                      {!notification.read && <div className="w-2 h-2 rounded-full bg-[#5A5A40] shrink-0 mt-1 shadow-[0_0_10px_rgba(90,90,64,0.5)]" />}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            
            <button 
              onClick={() => navigate('/notifications')}
              className="w-full mt-10 py-5 rounded-2xl bg-[#5A5A40]/5 text-[#5A5A40] font-montserrat font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#5A5A40]/10 transition-all active:scale-95"
            >
              View Full Feed
            </button>
          </motion.div>

          {/* Priority Alerts */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/60 backdrop-blur-xl p-12 rounded-[3.5rem] border border-white/40 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-2xl font-playfair font-black text-[#5A5A40]">Priority Alerts</h3>
              <div className="w-10 h-10 bg-red-500/10 rounded-2xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
            </div>
            
            <div className="space-y-6">
              {[
                { name: 'John Doe', attendance: '65%', marks: '42/100' },
                { name: 'Alice Smith', attendance: '72%', marks: '38/100' },
                { name: 'Bob Wilson', attendance: '68%', marks: '45/100' },
              ].map((student, i) => (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  key={i} 
                  className="flex items-center justify-between p-6 bg-red-500/5 rounded-[2rem] border border-red-500/10 group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-red-100 shadow-sm group-hover:rotate-6 transition-transform">
                      <TrendingDown className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-montserrat font-black text-xs tracking-tight text-[#5A5A40]">{student.name}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-red-500/60 mt-1">Att: {student.attendance} | Marks: {student.marks}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleFlagStudent(student.name)}
                    disabled={flagging === student.name}
                    className="p-4 bg-white hover:bg-red-50 rounded-2xl transition-all shadow-sm active:scale-90"
                    title="Flag Student"
                  >
                    <Flag className={cn(
                      "w-4 h-4 transition-colors",
                      flagging === student.name ? "text-gray-400 animate-pulse" : "text-red-400 group-hover:text-red-600"
                    )} />
                  </button>
                </motion.div>
              ))}
            </div>
            
            <button className="w-full mt-10 py-5 rounded-2xl border border-red-100 text-red-500 font-montserrat font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 transition-all active:scale-95">
              Manage All Alerts
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
