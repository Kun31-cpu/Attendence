import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const data = [
  { name: 'Math', attendance: 85, marks: 78 },
  { name: 'Physics', attendance: 92, marks: 88 },
  { name: 'CS', attendance: 78, marks: 92 },
  { name: 'English', attendance: 95, marks: 85 },
];

export default function StudentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-serif font-bold">Welcome back, {profile?.displayName}</h1>
        <p className="opacity-60 font-serif italic">Here's your academic overview for today.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Attendance', value: '88%', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Avg Marks', value: '85.5', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Labs Done', value: '12/15', icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-500/10' },
          { label: 'Assignments', value: '3 Pending', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/40 backdrop-blur-sm p-6 rounded-3xl border border-white/20 shadow-sm"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm opacity-60 font-medium">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">Performance Overview</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="attendance" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="marks" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notifications/Alerts */}
        <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">Recent Alerts</h3>
          <div className="space-y-4">
            {[
              { title: 'Low Attendance', desc: 'CS attendance is below 75%', type: 'warning' },
              { title: 'New Assignment', desc: 'Physics Lab Report due Friday', type: 'info' },
              { title: 'Marks Updated', desc: 'Math Mid-term results are out', type: 'success' },
            ].map((alert, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/20 border border-white/10">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  alert.type === 'warning' ? 'bg-red-500/10 text-red-600' : 
                  alert.type === 'info' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                )}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{alert.title}</p>
                  <p className="text-xs opacity-60">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
