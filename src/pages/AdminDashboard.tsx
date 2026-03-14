import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Users, 
  Building2, 
  BookOpen, 
  BarChart3,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from 'recharts';

const data = [
  { name: 'CS', value: 400 },
  { name: 'Mechanical', value: 300 },
  { name: 'Electrical', value: 300 },
  { name: 'Civil', value: 200 },
];

const COLORS = ['#5A5A40', '#A8A880', '#D4D4B8', '#E8E8D8'];

export default function AdminDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Admin Console</h1>
          <p className="opacity-60 font-serif italic">System-wide analytics and management</p>
        </div>
        <button className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/20 transition-all">
          <Settings className="w-6 h-6 text-inherit opacity-60" />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Students', value: '1,240', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Departments', value: '8', icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Active Subjects', value: '42', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-sm"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", stat.bg)}>
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <p className="text-sm opacity-60 font-bold uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">Department Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-sm">
          <h3 className="text-xl font-serif font-bold mb-6">Recent System Logs</h3>
          <div className="space-y-4">
            {[
              { user: 'Dr. Smith', action: 'Uploaded new lecture', time: '10m ago' },
              { user: 'Admin', action: 'Added CS Department', time: '1h ago' },
              { user: 'System', action: 'Auto-backup completed', time: '3h ago' },
              { user: 'Prof. Jane', action: 'Updated marks for Math', time: '5h ago' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{log.user}</p>
                    <p className="text-xs opacity-60">{log.action}</p>
                  </div>
                </div>
                <span className="text-xs opacity-40 font-medium">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
