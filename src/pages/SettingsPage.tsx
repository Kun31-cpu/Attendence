import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Mail, 
  Shield, 
  Save,
  CheckCircle2,
  X,
  FileText,
  Moon,
  Sun,
  Bell,
  Globe as GlobeIcon,
  ShieldCheck,
  DownloadCloud,
  Languages,
  Upload,
  HelpCircle,
  ChevronRight,
  Camera,
  Trash2,
  RefreshCw,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile, user, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bannerName, setBannerName] = useState(profile?.bannerName || '');
  const [bannerDescription, setBannerDescription] = useState(profile?.bannerDescription || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [theme, setTheme] = useState(profile?.theme || 'light');
  const [notifications, setNotifications] = useState(profile?.notifications || { email: true, push: true });
  const [privacy, setPrivacy] = useState(profile?.privacy || { publicProfile: true });
  const [language, setLanguage] = useState(profile?.language || 'English');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(profile?.twoFactorEnabled || false);
  const [securityQuestion, setSecurityQuestion] = useState(profile?.securityQuestion || '');
  const [securityAnswerInput, setSecurityAnswerInput] = useState(profile?.securityAnswer || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBannerName(profile.bannerName || '');
      setBannerDescription(profile.bannerDescription || '');
      setTheme(profile.theme || 'light');
      setNotifications(profile.notifications || { email: true, push: true });
      setPrivacy(profile.privacy || { publicProfile: true });
      setLanguage(profile.language || 'English');
      setTwoFactorEnabled(profile.twoFactorEnabled || false);
      setSecurityQuestion(profile.securityQuestion || '');
      setSecurityAnswerInput(profile.securityAnswer || '');
    }
  }, [profile]);

  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Finn',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Ruby',
  ];

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 1024 * 1024) {
      toast.error('Image size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        setIsSaving(true);
        await updateProfile({ photoURL: base64String });
        toast.success('Profile picture updated!');
      } catch (err) {
        toast.error('Failed to update profile picture');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setSentCode(code);
    toast.info(`Verification code sent to your email: ${code}`);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile({
        displayName,
        bannerName,
        bannerDescription,
        theme,
        notifications,
        privacy,
        language,
        twoFactorEnabled,
        securityQuestion,
        securityAnswer: securityAnswerInput
      });
      
      toast.success('Settings saved successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isForgotMode) {
      const currentAdminPassword = profile?.adminPassword || 'kuntal007';
      if (oldPassword !== currentAdminPassword) {
        setPasswordError('Incorrect old password');
        return;
      }
    } else {
      if (!sentCode || inputCode !== sentCode) {
        setPasswordError('Invalid verification code');
        return;
      }
    }

    if (securityAnswer.toLowerCase() !== profile?.securityAnswer?.toLowerCase()) {
      setPasswordError('Incorrect security answer');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      await updateProfile({ adminPassword: newPassword });
      setShowPasswordModal(false);
      setIsForgotMode(false);
      setSentCode(null);
      setInputCode('');
      setOldPassword('');
      setNewPassword('');
      setSecurityAnswer('');
      setPasswordError('');
      toast.success('Admin password updated successfully!');
    } catch (err) {
      setPasswordError('Failed to update password');
    }
  };

  const handleExportData = () => {
    try {
      const data = JSON.stringify(profile, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EduTrack-Data-${profile?.uid || 'user'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch (err) {
      toast.error('Failed to export data');
    }
  };

  const handleClearCache = () => {
    toast.warning('Are you sure you want to clear local cache?', {
      action: {
        label: 'Clear',
        onClick: () => {
          localStorage.clear();
          window.location.reload();
        }
      }
    });
  };

  return (
    <div className="mobile-page-container pb-40">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 45, 0],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[80%] h-[80%] bg-accent/5 blur-[100px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -45, 0],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[70%] h-[70%] bg-white/5 blur-[100px] rounded-full"
        />
      </div>

      <header className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="section-subtitle">System Config</span>
            <h1 className="section-title">Settings</h1>
          </div>
          <button 
            onClick={() => logout()}
            className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 tap-target"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 space-y-6">
        {/* Profile Section */}
        <section className="glass-card p-0 overflow-hidden">
          <div className="p-6 bg-white/5 border-b border-white/10 flex items-center gap-5">
            <div className="relative group">
              <div 
                className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center text-white overflow-hidden shadow-2xl tap-target"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              >
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center shadow-lg tap-target"
              >
                <Upload className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleProfilePictureUpload}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-playfair font-black leading-tight">{profile?.displayName}</h3>
              <p className="text-[10px] font-montserrat font-black uppercase tracking-widest text-white/40 mt-1">{profile?.role} Account</p>
              <p className="text-xs text-white/60 mt-1 truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>

          <AnimatePresence>
            {showAvatarPicker && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 py-6 bg-white/5 border-b border-white/10 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Avatar</span>
                  <button onClick={() => setShowAvatarPicker(false)} className="text-white/40 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {avatars.map((avatar, idx) => (
                    <button
                      key={idx}
                      onClick={async () => {
                        setIsSaving(true);
                        await updateProfile({ photoURL: avatar });
                        setIsSaving(false);
                        setShowAvatarPicker(false);
                        toast.success('Avatar updated!');
                      }}
                      className={cn(
                        "aspect-square rounded-2xl border-2 transition-all tap-target",
                        profile?.photoURL === avatar ? "border-accent bg-accent/10" : "border-white/10 bg-white/5"
                      )}
                    >
                      <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full p-1" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-montserrat font-black uppercase tracking-widest text-white/40 ml-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-montserrat font-black uppercase tracking-widest text-white/40 ml-1">Banner Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. EduTrack Pro Admin"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                    value={bannerName}
                    onChange={e => setBannerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-montserrat font-black uppercase tracking-widest text-white/40 ml-1">Banner Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. System-wide analytics"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                    value={bannerDescription}
                    onChange={e => setBannerDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-[10px] font-montserrat font-black uppercase tracking-widest text-white/40 ml-1">Appearance</span>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: GlobeIcon, label: 'System' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all tap-target",
                      theme === t.id ? "border-accent bg-accent/10 text-accent" : "border-white/10 bg-white/5 text-white/40"
                    )}
                  >
                    <t.icon className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-[10px] font-montserrat font-black uppercase tracking-widest text-white/40 ml-1">Notifications</span>
              <div className="space-y-3">
                {[
                  { id: 'email', icon: Mail, label: 'Email Alerts', sub: 'Critical updates via email' },
                  { id: 'push', icon: Bell, label: 'Push Notifications', sub: 'Real-time device alerts' }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest leading-none">{item.label}</p>
                        <p className="text-[9px] text-white/40 mt-1 font-medium">{item.sub}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        notifications[item.id as keyof typeof notifications] ? "bg-accent" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        notifications[item.id as keyof typeof notifications] ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Question */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-[10px] font-montserrat font-black uppercase tracking-widest text-white/40 ml-1">Security Setup</span>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Security Question</label>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all appearance-none"
                  >
                    <option value="" className="bg-bg-dark">Select a question</option>
                    <option value="What was the name of your first pet?" className="bg-bg-dark">What was the name of your first pet?</option>
                    <option value="What is your mother's maiden name?" className="bg-bg-dark">What is your mother's maiden name?</option>
                    <option value="What was the name of your elementary school?" className="bg-bg-dark">What was the name of your elementary school?</option>
                    <option value="In what city were you born?" className="bg-bg-dark">In what city were you born?</option>
                    <option value="What is your favorite book?" className="bg-bg-dark">What is your favorite book?</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Security Answer</label>
                  <input
                    type="password"
                    value={securityAnswerInput}
                    onChange={(e) => setSecurityAnswerInput(e.target.value)}
                    placeholder="Enter your answer"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full py-5 bg-white text-black rounded-[2rem] font-montserrat font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-white/10 tap-target flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save All Changes
                </>
              )}
            </button>
          </form>
        </section>

        {/* Security Section */}
        <section className="glass-card space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-playfair font-black">Security</h3>
              <p className="text-[9px] font-montserrat font-black uppercase tracking-widest text-white/40">Access & Protection</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 tap-target group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
                  <Key className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest">Admin Password</p>
                  <p className="text-[9px] text-white/40 mt-1 font-medium">Update system access key</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-all" />
            </button>

            <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest">Two-Factor Auth</p>
                  <p className="text-[9px] text-white/40 mt-1 font-medium">Extra layer of security</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  twoFactorEnabled ? "bg-amber-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  twoFactorEnabled ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="glass-card space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-playfair font-black">Data</h3>
              <p className="text-[9px] font-montserrat font-black uppercase tracking-widest text-white/40">Privacy & Storage</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleExportData}
              className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/10 tap-target group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-blue-500 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest">Export My Data</p>
                  <p className="text-[9px] text-white/40 mt-1 font-medium">Download your profile JSON</p>
                </div>
              </div>
              <DownloadCloud className="w-4 h-4 text-white/20 group-hover:text-blue-500 transition-all" />
            </button>

            <button 
              onClick={handleClearCache}
              className="w-full flex items-center justify-between p-5 bg-red-500/5 rounded-2xl border border-red-500/10 tap-target group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500/40 group-hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest text-red-500">Clear Cache</p>
                  <p className="text-[9px] text-red-500/40 mt-1 font-medium">Reset local preferences</p>
                </div>
              </div>
              <RefreshCw className="w-4 h-4 text-red-500/20 group-hover:text-red-500 transition-all" />
            </button>
          </div>
        </section>

        {/* Admin Promotion */}
        {profile?.role === 'faculty' && (
          <section className="glass-card space-y-6 border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-playfair font-black">Promotion</h3>
                <p className="text-[9px] font-montserrat font-black uppercase tracking-widest text-purple-500/40">Upgrade Account</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500/30" />
                <input 
                  type="password"
                  placeholder="Enter admin key..."
                  className="w-full bg-purple-500/5 border border-purple-500/20 rounded-2xl py-4 pl-12 pr-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value;
                      if (val === '0007') {
                        try {
                          await updateProfile({ role: 'admin' });
                          toast.success('Account promoted to Admin!');
                          setTimeout(() => window.location.reload(), 1000);
                        } catch (err) {
                          toast.error('Failed to promote account');
                        }
                      } else {
                        toast.error('Incorrect promotion key');
                      }
                    }
                  }}
                />
              </div>
              <p className="text-[9px] text-purple-500/40 font-black uppercase tracking-widest text-center">Press Enter to verify</p>
            </div>
          </section>
        )}
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-sm space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent">Security</span>
                  <h3 className="text-2xl font-playfair font-black">
                    {isForgotMode ? 'Reset Key' : 'Update Key'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 tap-target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {!isForgotMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Current Password</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsForgotMode(true);
                          setPasswordError('');
                        }}
                        className="text-[9px] font-black text-accent uppercase tracking-widest hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Verification Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="4-digit code"
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        required={isForgotMode}
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        className="px-4 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all"
                      >
                        {sentCode ? 'Resend' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Security Question</p>
                  <p className="text-xs italic text-white/80">{profile?.securityQuestion || 'No question set'}</p>
                  <input
                    type="text"
                    placeholder="Your answer"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-montserrat font-medium focus:ring-2 focus:ring-accent/50 outline-none transition-all"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    required
                  />
                </div>

                {passwordError && (
                  <div className="flex items-center gap-2 text-red-500 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{passwordError}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="w-full py-5 bg-accent text-white rounded-[2rem] font-montserrat font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-accent/20 tap-target"
                >
                  {isForgotMode ? 'Reset Password' : 'Update Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
