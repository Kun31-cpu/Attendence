import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, Variants } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Users, 
  Building2, 
  BookOpen, 
  BarChart3,
  ShieldCheck,
  Settings,
  Activity,
  ArrowUpRight,
  Database,
  Lock
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from 'recharts';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

const COLORS = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'];

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

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: '0',
    departments: '0',
    activeSubjects: '0'
  });
  const [deptDistribution, setDeptDistribution] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Students
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.docs.length.toLocaleString() }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // Fetch Departments
    const deptQuery = collection(db, 'departments');
    const unsubscribeDept = onSnapshot(deptQuery, (snapshot) => {
      setStats(prev => ({ ...prev, departments: snapshot.docs.length.toString().padStart(2, '0') }));
      
      // Mock distribution for now
      setDeptDistribution([
        { name: 'CS', value: 400 },
        { name: 'Mechanical', value: 300 },
        { name: 'Electrical', value: 300 },
        { name: 'Civil', value: 200 },
      ]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'departments'));

    // Fetch Subjects
    const subQuery = collection(db, 'subjects');
    const unsubscribeSub = onSnapshot(subQuery, (snapshot) => {
      setStats(prev => ({ ...prev, activeSubjects: snapshot.docs.length.toString().padStart(2, '0') }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'subjects'));

    return () => {
      unsubscribeStudents();
      unsubscribeDept();
      unsubscribeSub();
    };
  }, []);

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
          className="absolute -top-[10%] -right-[10%] w-[70%] h-[70%] bg-emerald-500/10 blur-[120px] rounded-full"
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
        className="relative z-10 space-y-8 md:space-y-12 pb-24 px-4 md:px-0"
      >
        {/* Premium Banner */}
        <motion.div 
          variants={itemVariants}
          className="relative overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-20 border border-white/20 shadow-2xl group bg-white/30 backdrop-blur-2xl"
        >
          <div className="relative z-10">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 md:gap-4 mb-6 md:mb-10"
            >
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">System Administrator</span>
              </div>
              <div className="h-px w-8 md:w-12 bg-emerald-500/20" />
            </motion.div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 md:gap-10">
              <div className="max-w-3xl">
                <h1 className="text-3xl md:text-6xl font-playfair font-black tracking-tight text-emerald-900 leading-[1.1] md:leading-[0.9] mb-4 md:mb-8">
                  {profile?.bannerName || 'Command Center'}
                </h1>
                <p className="text-base md:text-xl text-emerald-800/70 font-montserrat font-medium leading-relaxed italic max-w-xl">
                  {profile?.bannerDescription || 'Oversee institutional growth, manage security protocols, and optimize system performance with precision.'}
                </p>
              </div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group/btn relative cursor-pointer self-start md:self-auto"
              >
                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 group-hover/btn:opacity-40 transition-opacity" />
                <div className="relative flex items-center gap-3 md:gap-4 px-6 md:px-8 py-4 md:py-6 bg-emerald-600 rounded-2xl md:rounded-3xl text-white shadow-2xl shadow-emerald-500/40 overflow-hidden transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                  <span className="font-montserrat font-black text-[10px] md:text-sm uppercase tracking-widest text-white">System Audit</span>
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:rotate-12 transition-transform" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {[
            { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10', trend: 'Active across all years' },
            { label: 'Departments', value: stats.departments, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-500/10', trend: 'All systems operational' },
            { label: 'Active Subjects', value: stats.activeSubjects, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-500/10', trend: 'Current semester' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="bg-white/40 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-white/40 shadow-xl group transition-all"
            >
              <div className={cn("w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-inner transition-transform group-hover:rotate-6", stat.bg)}>
                <stat.icon className={cn("w-6 h-6 md:w-8 md:h-8", stat.color)} />
              </div>
              <div className="space-y-1 md:space-y-2">
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] opacity-40 font-black font-montserrat">{stat.label}</p>
                <p className="text-3xl md:text-4xl font-playfair font-black tracking-tight text-emerald-900">{stat.value}</p>
                <div className="flex items-center gap-2 pt-1 md:pt-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500/30" />
                  <p className="text-[9px] md:text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest">{stat.trend}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          {/* Department Distribution */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/40 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-white/40 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8 md:mb-12">
              <div>
                <h3 className="text-xl md:text-3xl font-playfair font-black text-emerald-900 mb-1 md:mb-2">Departmental Reach</h3>
                <p className="text-xs md:text-sm text-emerald-800/50 font-montserrat font-medium">Student distribution across major faculties</p>
              </div>
              <div className="p-3 md:p-4 bg-emerald-500/10 rounded-xl md:rounded-2xl">
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
              </div>
            </div>
            
            <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptDistribution.length > 0 ? deptDistribution : [{ name: 'No Data', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={window.innerWidth < 768 ? 60 : 100}
                    outerRadius={window.innerWidth < 768 ? 90 : 140}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {deptDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: 'none', 
                      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
                      padding: '15px md:20px',
                      fontFamily: 'Montserrat',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-60 ml-2">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* System Logs */}
          <motion.div 
            variants={itemVariants}
            className="bg-white/40 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-white/40 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8 md:mb-12">
              <div>
                <h3 className="text-xl md:text-3xl font-playfair font-black text-emerald-900 mb-1 md:mb-2">System Logs</h3>
                <p className="text-xs md:text-sm text-emerald-800/50 font-montserrat font-medium">Real-time infrastructure monitoring</p>
              </div>
              <button className="p-3 md:p-4 bg-emerald-500/10 rounded-xl md:rounded-2xl hover:bg-emerald-500/20 transition-colors group">
                <Settings className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
            
            <div className="space-y-4 md:space-y-6">
              {[
                { user: 'Dr. Smith', action: 'Uploaded new lecture', time: '10m ago', icon: Activity, color: 'text-blue-500' },
                { user: 'Admin', action: 'Added CS Department', time: '1h ago', icon: Database, color: 'text-emerald-500' },
                { user: 'System', action: 'Auto-backup completed', time: '3h ago', icon: Lock, color: 'text-purple-500' },
                { user: 'Prof. Jane', action: 'Updated marks for Math', time: '5h ago', icon: ShieldCheck, color: 'text-orange-500' },
              ].map((log, i) => (
                <motion.div 
                  whileHover={{ x: 8 }}
                  key={i} 
                  className="flex items-center justify-between p-4 md:p-6 bg-white/30 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/60 group transition-all hover:shadow-lg"
                >
                  <div className="flex items-center gap-3 md:gap-5">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm group-hover:rotate-6 transition-transform">
                      <log.icon className={cn("w-5 h-5 md:w-6 md:h-6", log.color)} />
                    </div>
                    <div>
                      <p className="font-montserrat font-black text-[10px] md:text-xs tracking-tight text-emerald-900">{log.user}</p>
                      <p className="text-[10px] md:text-[11px] text-emerald-800/60 font-medium">{log.action}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 md:gap-2">
                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-30">{log.time}</span>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  </div>
                </motion.div>
              ))}
            </div>
            
            <button className="w-full mt-8 md:mt-12 py-4 md:py-5 rounded-xl md:rounded-2xl bg-emerald-600 text-white font-montserrat font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95">
              Access Full Audit Logs
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
