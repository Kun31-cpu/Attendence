import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Users, 
  BookOpen, 
  FileCheck, 
  Clock,
  TrendingDown,
  ChevronRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const data = [
  { name: 'Mon', attendance: 85 },
  { name: 'Tue', attendance: 88 },
  { name: 'Wed', attendance: 75 },
  { name: 'Thu', attendance: 92 },
  { name: 'Fri', attendance: 80 },
];

export default function FacultyDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-serif font-bold">Faculty Dashboard</h1>
        <p className="opacity-60 font-serif italic">Manage your classes and track student performance.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'My Students', value: '120', icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Courses', value: '3', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Submissions', value: '45/120', icon: FileCheck, color: 'text-purple-600', bg: 'bg-purple-500/10' },
          { label: 'Next Class', value: '10:30 AM', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-500/10' },
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
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">Weekly Attendance Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="attendance" stroke="#5A5A40" strokeWidth={3} dot={{ fill: '#5A5A40', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-sm p-8 rounded-3xl border border-white/20 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">Weak Students Alert</h3>
          <div className="space-y-4">
            {[
              { name: 'John Doe', attendance: '65%', marks: '42/100' },
              { name: 'Alice Smith', attendance: '72%', marks: '38/100' },
              { name: 'Bob Wilson', attendance: '68%', marks: '45/100' },
            ].map((student, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center border border-red-200">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{student.name}</p>
                    <p className="text-xs opacity-60">Att: {student.attendance} | Marks: {student.marks}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                  <ChevronRight className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 text-sm font-bold text-[#5A5A40] hover:underline">View All Alerts</button>
        </div>
      </div>
    </div>
  );
}
