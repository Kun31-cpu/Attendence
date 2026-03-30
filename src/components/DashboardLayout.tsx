import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  Settings, 
  LogOut, 
  User, 
  Shield, 
  Menu, 
  X, 
  Bell, 
  Search,
  Users,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Fingerprint,
  CalendarCheck,
  FileText,
  Beaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { NotificationBell } from './NotificationBell';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['admin', 'faculty', 'student'] },
  { icon: CalendarCheck, label: 'Attendance', path: '/attendance', roles: ['admin', 'faculty', 'student'] },
  { icon: FileText, label: 'Assignments', path: '/assignments', roles: ['admin', 'faculty', 'student'] },
  { icon: Beaker, label: 'Labs', path: '/labs', roles: ['admin', 'faculty', 'student'] },
  { icon: Video, label: 'Library', path: '/videos', roles: ['admin', 'faculty', 'student'] },
  { icon: Users, label: 'Users', path: '/users', roles: ['admin'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['admin', 'faculty', 'student'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, logout, updateRole, user, isOffline } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredNavItems = navItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  const bottomNavItems = filteredNavItems.slice(0, 4);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const roleTheme = {
    admin: 'from-purple-600/20 to-blue-600/20 text-blue-400 border-blue-500/30',
    faculty: 'from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/30',
    student: 'from-orange-600/20 to-rose-600/20 text-orange-400 border-orange-500/30',
  }[profile?.role || 'student'];

  return (
    <div className="min-h-screen bg-[#0a0502] text-white selection:bg-accent selection:text-white">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Mobile Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-5 py-4 flex items-center justify-between",
        scrolled ? "bg-[#0a0502]/80 backdrop-blur-2xl border-b border-white/5 py-3" : "bg-transparent"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg", 
            profile?.role === 'admin' ? 'bg-blue-600' : 
            profile?.role === 'faculty' ? 'bg-emerald-600' : 'bg-orange-600'
          )}>
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-playfair font-black tracking-tight leading-none">EduTrack</h1>
            <p className="text-[8px] font-montserrat font-black uppercase tracking-[0.2em] text-white/30">
              {profile?.role} Edition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 rounded-full border-2 border-white/10 p-0.5 tap-target"
          >
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-32 px-5 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-8 pt-4 bg-gradient-to-t from-[#0a0502] via-[#0a0502]/95 to-transparent">
        <div className="max-w-md mx-auto glass-effect rounded-[2.5rem] p-2 flex items-center justify-around">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-300 tap-target",
                  isActive ? "text-white" : "text-white/40"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute inset-0 bg-white/10 rounded-2xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={cn("w-6 h-6", isActive && "animate-pulse-soft")} />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
              </Link>
            );
          })}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl text-white/40 tap-target"
          >
            <Menu className="w-6 h-6" />
            <span className="text-[8px] font-black uppercase tracking-widest">More</span>
          </button>
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0a0502]/95 backdrop-blur-3xl p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-2xl font-playfair font-black">Navigation</h2>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center tap-target"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="glass-card p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest">{item.label}</p>
                      <p className="text-[10px] text-white/40 font-medium mt-1">Access {item.label.toLowerCase()}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto pt-12">
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center justify-between p-6 glass-card border-red-500/20 text-red-400 tap-target"
              >
                <div className="flex items-center gap-4">
                  <LogOut className="w-6 h-6" />
                  <span className="font-black uppercase tracking-widest">Sign Out</span>
                </div>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Overlay */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[110] bg-[#0a0502]/95 backdrop-blur-3xl p-8 flex flex-col"
          >
            <div className="flex justify-end mb-8">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center tap-target"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mb-12">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full animate-pulse-glow" />
                <img 
                  src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
                  alt="Profile"
                  className="w-32 h-32 rounded-[3rem] border-4 border-white/10 relative z-10 object-cover"
                />
              </div>
              <h2 className="text-3xl font-playfair font-black tracking-tight">{profile?.displayName}</h2>
              <p className="text-white/40 font-montserrat font-medium italic mt-1">{user?.email}</p>
              
              <div className={cn("mt-6 px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em]", roleTheme)}>
                {profile?.role} Access
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center justify-between p-6 glass-card tap-target"
              >
                <div className="flex items-center gap-4">
                  <User className="w-6 h-6 text-blue-400" />
                  <span className="font-black uppercase tracking-widest">Edit Profile</span>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20" />
              </button>

              <div className="p-6 glass-card space-y-6">
                <div className="flex items-center gap-4">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  <span className="font-black uppercase tracking-widest">Switch Role</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {['student', 'faculty', 'admin'].map((r) => (
                    <button
                      key={r}
                      onClick={async () => {
                        if (r !== profile?.role) {
                          const pass = prompt(`Enter password to switch to ${r}:`);
                          
                          // Handle cancel
                          if (pass === null) return;
                          
                          const requiredPass = 'kuntal007';
                          
                          if (pass !== requiredPass) {
                            alert('Invalid password');
                            return;
                          }
                        }
                        
                        try {
                          await updateRole(r as any);
                          setIsProfileOpen(false);
                        } catch (err) {
                          console.error(err);
                          alert('Failed to update role. Please try again.');
                        }
                      }}
                      className={cn(
                        "py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all active:scale-95",
                        profile?.role === r 
                          ? "bg-white text-black border-white shadow-lg shadow-white/10" 
                          : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-auto text-center text-[9px] text-white/20 uppercase font-black tracking-[0.4em] pb-8">
              EduTrack Enterprise v2.5.0
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
