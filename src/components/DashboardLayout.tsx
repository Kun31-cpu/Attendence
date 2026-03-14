import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  FileText, 
  Beaker, 
  Video, 
  LogOut, 
  User,
  Menu,
  X,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarCheck, label: 'Attendance', path: '/attendance' },
  { icon: FileText, label: 'Assignments', path: '/assignments' },
  { icon: Beaker, label: 'Labs', path: '/labs' },
  { icon: Video, label: 'Video Library', path: '/videos' },
  { icon: User, label: 'Settings', path: '/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, logout, updateRole, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState<{ role: 'admin' | 'faculty' | 'student' } | null>(null);
  const [passwordInput, setPasswordInput] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);

  const isAdminEmail = user?.email === 'beraniranjan722@gmail.com';

  const roleTheme = React.useMemo(() => {
    switch (profile?.role) {
      case 'admin':
        return {
          bg: "bg-[#0a0a0a]",
          gradient: "radial-gradient(circle at 50% 0%, #1a1a1a 0%, #0a0a0a 100%)",
          sidebar: "bg-black/40 border-white/10 text-white",
          navActive: "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]",
          navHover: "hover:bg-white/5 text-gray-400 hover:text-white",
          accent: "bg-white",
          text: "text-white",
          subtext: "text-gray-400",
          glass: "bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl",
          elements: ['#ffffff10', '#ffffff05', '#ffffff08']
        };
      case 'faculty':
        return {
          bg: "bg-[#f5f5f0]",
          gradient: "linear-gradient(135deg, #f5f5f0 0%, #e8e8e0 100%)",
          sidebar: "bg-white/60 border-black/5 text-gray-900",
          navActive: "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20",
          navHover: "hover:bg-[#5A5A40]/5 text-gray-600 hover:text-[#5A5A40]",
          accent: "bg-[#5A5A40]",
          text: "text-gray-900",
          subtext: "text-gray-500",
          glass: "bg-white/80 backdrop-blur-xl border-white shadow-xl",
          elements: ['#5A5A4010', '#5A5A4005', '#5A5A4008']
        };
      case 'student':
        return {
          bg: "bg-[#f0f4ff]",
          gradient: "linear-gradient(180deg, #f0f4ff 0%, #e0e7ff 100%)",
          sidebar: "bg-white/80 border-indigo-100 text-gray-900",
          navActive: "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20",
          navHover: "hover:bg-indigo-50 text-gray-600 hover:text-indigo-600",
          accent: "bg-indigo-600",
          text: "text-gray-900",
          subtext: "text-gray-500",
          glass: "bg-white/90 backdrop-blur-xl border-white shadow-xl",
          elements: ['#4f46e510', '#4f46e505', '#4f46e508']
        };
      default:
        return {
          bg: "bg-gray-50",
          gradient: "",
          sidebar: "bg-white border-gray-200 text-gray-900",
          navActive: "bg-gray-900 text-white",
          navHover: "hover:bg-gray-100 text-gray-600",
          accent: "bg-gray-900",
          text: "text-gray-900",
          subtext: "text-gray-500",
          glass: "bg-white border-gray-200",
          elements: []
        };
    }
  }, [profile?.role]);

  const handleRoleSwitch = (role: 'admin' | 'faculty' | 'student') => {
    if (profile?.role === role) return;
    setShowPasswordModal({ role });
    setPasswordInput('');
    setPasswordError(false);
  };

  const confirmRoleSwitch = async () => {
    // Simple password check - in a real app this would be more secure
    if (passwordInput === 'kuntal007') {
      if (showPasswordModal) {
        await updateRole(showPasswordModal.role);
        setShowPasswordModal(null);
        setIsMobileMenuOpen(false);
      }
    } else {
      setPasswordError(true);
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.label === 'Settings' && profile?.role === 'student') return false;
    return true;
  });

  return (
    <div 
      className={cn(
        "min-h-screen flex transition-colors duration-700 relative overflow-hidden", 
        roleTheme.bg,
        profile?.role === 'admin' ? "dark" : ""
      )}
      style={{ backgroundImage: roleTheme.gradient }}
    >
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {roleTheme.elements.map((color, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 30, 0]
            }}
            transition={{ 
              duration: 10 + i * 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute rounded-full blur-[120px]"
            style={{ 
              backgroundColor: color,
              width: `${400 + i * 100}px`,
              height: `${400 + i * 100}px`,
              left: `${10 + i * 30}%`,
              top: `${20 + i * 20}%`,
            }}
          />
        ))}
        {profile?.role === 'student' && (
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        )}
      </div>
      {/* Role Switch Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-black/5"
            >
              <h3 className="text-2xl font-serif font-bold mb-2 text-gray-900">Confirm Role Switch</h3>
              <p className="text-sm text-gray-500 mb-6 font-serif italic">Enter admin password to switch to <span className="font-bold text-gray-900 capitalize">{showPasswordModal.role}</span> mode.</p>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="password"
                    placeholder="Enter password"
                    className={cn(
                      "w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium",
                      passwordError ? "border-red-500 ring-4 ring-red-500/10" : "border-gray-200 focus:ring-4 focus:ring-[#5A5A40]/10 focus:border-[#5A5A40]"
                    )}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRoleSwitch()}
                    autoFocus
                  />
                  {passwordError && <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1"><X className="w-3 h-3" /> Incorrect password. Try again.</p>}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPasswordModal(null)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRoleSwitch}
                    className="flex-1 py-4 rounded-2xl font-bold bg-[#5A5A40] text-white hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-95"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col w-72 backdrop-blur-2xl border-r p-8 transition-all duration-500",
        roleTheme.sidebar
      )}>
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500", roleTheme.accent)}>
            <span className={cn("font-bold text-xl", profile?.role === 'admin' ? "text-black" : "text-white")}>E</span>
          </div>
          <span className="font-serif font-bold text-2xl tracking-tight">EduTrack</span>
        </div>

        <nav className="flex-1 space-y-2">
          {filteredNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group active:scale-95",
                location.pathname === item.path 
                  ? roleTheme.navActive
                  : roleTheme.navHover
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", location.pathname === item.path ? "scale-110" : "")} />
              <span className="font-bold text-sm tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        {isAdminEmail && (
          <div className={cn(
            "mb-8 p-5 rounded-[1.5rem] border transition-all duration-500",
            profile?.role === 'admin' ? "bg-white/5 border-white/10" : "bg-amber-50/50 border-amber-100"
          )}>
            <div className={cn("flex items-center gap-2 mb-4", profile?.role === 'admin' ? "text-amber-400" : "text-amber-800")}>
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Admin Controls</span>
            </div>
            <div className="flex flex-col gap-2">
              {(['admin', 'faculty', 'student'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className={cn(
                    "text-[10px] py-2.5 px-4 rounded-xl font-black uppercase tracking-wider transition-all active:scale-95",
                    profile?.role === r 
                      ? (profile?.role === 'admin' ? "bg-amber-400 text-black" : "bg-amber-200 text-amber-900")
                      : (profile?.role === 'admin' ? "bg-white/5 text-amber-400 hover:bg-white/10" : "bg-white text-amber-600 hover:bg-amber-100")
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-8 border-t border-white/5">
          <div className="flex items-center gap-4 px-2 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden shadow-inner">
              <User className="w-7 h-7 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate tracking-tight">{profile?.displayName}</p>
              <p className={cn("text-[10px] font-bold uppercase tracking-widest", roleTheme.subtext)}>{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all font-bold text-sm active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 right-0 h-20 border-b flex items-center justify-between px-8 z-50 backdrop-blur-xl transition-all duration-500",
        roleTheme.sidebar
      )}>
        <span className="font-serif font-bold text-2xl tracking-tight">EduTrack</span>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn("p-2 rounded-xl transition-colors", profile?.role === 'admin' ? "bg-white/5" : "bg-gray-100")}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed inset-0 z-40 p-8 pt-28 md:hidden backdrop-blur-3xl transition-all duration-500",
              roleTheme.bg
            )}
            style={{ backgroundImage: roleTheme.gradient }}
          >
             <nav className="space-y-3">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-5 px-8 py-5 rounded-3xl text-lg font-bold transition-all active:scale-95",
                    location.pathname === item.path 
                      ? roleTheme.navActive
                      : cn("bg-white/5 border border-white/5", roleTheme.text)
                  )}
                >
                  <item.icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={logout}
                className="w-full flex items-center gap-5 px-8 py-5 text-red-500 text-lg font-bold bg-red-500/5 rounded-3xl mt-4 active:scale-95"
              >
                <LogOut className="w-6 h-6" />
                <span>Logout</span>
              </button>

              {isAdminEmail && (
                <div className={cn(
                  "mt-10 p-8 rounded-[2.5rem] border transition-all duration-500",
                  profile?.role === 'admin' ? "bg-white/5 border-white/10" : "bg-amber-50/50 border-amber-100"
                )}>
                  <div className={cn("flex items-center gap-3 mb-6", profile?.role === 'admin' ? "text-amber-400" : "text-amber-800")}>
                    <ShieldAlert className="w-6 h-6" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Admin Controls</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['admin', 'faculty', 'student'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleSwitch(r)}
                        className={cn(
                          "text-[10px] py-4 rounded-2xl font-black uppercase tracking-wider transition-all active:scale-95",
                          profile?.role === r 
                            ? (profile?.role === 'admin' ? "bg-amber-400 text-black" : "bg-amber-200 text-amber-900")
                            : (profile?.role === 'admin' ? "bg-white/5 text-amber-400 border border-white/10" : "bg-white text-amber-600 border border-amber-200")
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 pt-24 md:pt-8 lg:pt-12 overflow-auto relative z-10">
        <div className={cn(
          "max-w-7xl mx-auto min-h-[calc(100vh-6rem)] md:min-h-0 p-6 md:p-10 rounded-[2.5rem] transition-all duration-500",
          roleTheme.glass,
          roleTheme.text
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
