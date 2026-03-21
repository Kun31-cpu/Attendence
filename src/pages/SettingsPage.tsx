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
  HelpCircle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { profile, user, updateProfile } = useAuth();
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
  ];

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // In a real app, we would upload to Firebase Storage
    // For now, we'll use a FileReader to get a base64 string
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        setIsSaving(true);
        await updateProfile({ photoURL: base64String });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setSentCode(code);
    alert(`Verification code sent to ${user?.email}: ${code}`);
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
      
      // Apply theme immediately
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isForgotMode) {
      // Validate old password (default is kuntal007 if not set)
      const currentAdminPassword = profile?.adminPassword || 'kuntal007';
      if (oldPassword !== currentAdminPassword) {
        setPasswordError('Incorrect old password');
        return;
      }
    } else {
      // Validate verification code
      if (!sentCode || inputCode !== sentCode) {
        setPasswordError('Invalid verification code');
        return;
      }
    }

    // Validate security answer
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
      alert(`Admin password successfully updated!`);
    } catch (err) {
      console.error(err);
      setPasswordError('Failed to update password');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-xl font-serif font-bold mb-2">
                {isForgotMode ? 'Reset Admin Password' : 'Change Admin Password'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {isForgotMode 
                  ? 'Verify your identity using the code sent to your email.' 
                  : 'Verify your identity to update the password.'}
              </p>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {!isForgotMode ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-400 uppercase">Old Password</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsForgotMode(true);
                          setPasswordError('');
                        }}
                        className="text-[10px] font-bold text-[#5A5A40] hover:underline uppercase"
                      >
                        Forgot?
                      </button>
                    </div>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Verification Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter 4-digit code"
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        required={isForgotMode}
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-all"
                      >
                        {sentCode ? 'Resend' : 'Send Code'}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Security Question</p>
                  <p className="text-xs italic text-gray-700">{profile?.securityQuestion}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Security Answer</label>
                  <input
                    type="text"
                    placeholder="Enter answer"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    required
                  />
                </div>

                {passwordError && <p className="text-xs text-red-500 font-bold">{passwordError}</p>}
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setIsForgotMode(false);
                      setSentCode(null);
                      setInputCode('');
                      setPasswordError('');
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl font-bold bg-[#5A5A40] text-white hover:bg-[#4A4A30] transition-all"
                  >
                    {isForgotMode ? 'Reset' : 'Update'}
                  </button>
                </div>
                {isForgotMode && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setPasswordError('');
                    }}
                    className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-[#5A5A40] uppercase mt-2"
                  >
                    Back to normal change
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-500 font-serif italic">Manage your profile and security preferences.</p>
      </header>

      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl bg-[#5A5A40] flex items-center justify-center text-white relative group overflow-hidden cursor-pointer"
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold">{profile?.displayName}</h3>
              <p className="text-gray-500 text-sm capitalize">{profile?.role} Account</p>
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
          >
            Upload Custom
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleProfilePictureUpload}
          />
        </div>

        <AnimatePresence>
          {showAvatarPicker && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 py-6 bg-gray-50 border-b border-gray-100 overflow-hidden"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Choose an Avatar</p>
              <div className="flex flex-wrap gap-4">
                {avatars.map((avatar, idx) => (
                  <button
                    key={idx}
                    onClick={async () => {
                      setIsSaving(true);
                      await updateProfile({ photoURL: avatar });
                      setIsSaving(false);
                      setShowAvatarPicker(false);
                    }}
                    className={cn(
                      "w-12 h-12 rounded-xl border-2 transition-all hover:scale-110",
                      profile?.photoURL === avatar ? "border-[#5A5A40]" : "border-transparent"
                    )}
                  >
                    <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full rounded-lg" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
          <div className="grid grid-cols-1 gap-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <User className="w-3 h-3" /> Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 outline-none cursor-not-allowed"
                    value={user?.email || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Banner Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. EduTrack Pro Admin"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                    value={bannerName}
                    onChange={e => setBannerName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Banner Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. System-wide analytics"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                    value={bannerDescription}
                    onChange={e => setBannerDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Sun className="w-3 h-3" /> Appearance
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t as any)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                      theme === t ? "border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40]" : "border-gray-100 hover:border-gray-200 text-gray-500"
                    )}
                  >
                    {t === 'light' && <Sun className="w-5 h-5" />}
                    {t === 'dark' && <Moon className="w-5 h-5" />}
                    {t === 'system' && <GlobeIcon className="w-5 h-5" />}
                    <span className="text-xs font-bold capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <Bell className="w-3 h-3" /> Notifications
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive updates and alerts via email</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      notifications.email ? "bg-[#5A5A40]" : "bg-gray-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      notifications.email ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Push Notifications</p>
                    <p className="text-xs text-gray-500">Real-time alerts on your device</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifications(prev => ({ ...prev, push: !prev.push }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      notifications.push ? "bg-[#5A5A40]" : "bg-gray-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      notifications.push ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy & Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Privacy
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">Public Profile</p>
                    <p className="text-xs text-gray-500">Allow others to see your profile</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy(prev => ({ ...prev, publicProfile: !prev.publicProfile }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      privacy.publicProfile ? "bg-[#5A5A40]" : "bg-gray-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      privacy.publicProfile ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Languages className="w-3 h-3" /> Language
                </h4>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all text-sm"
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Hindi</option>
                </select>
              </div>
            </div>

            {/* Security Question Setup */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-6">
                <HelpCircle className="w-3 h-3" /> Security Question Setup
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase">Security Question</label>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all text-sm"
                  >
                    <option value="">Select a question</option>
                    <option>What was the name of your first pet?</option>
                    <option>What is your mother's maiden name?</option>
                    <option>What was the name of your elementary school?</option>
                    <option>In what city were you born?</option>
                    <option>What is your favorite book?</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase">Security Answer</label>
                  <input
                    type="text"
                    value={securityAnswerInput}
                    onChange={(e) => setSecurityAnswerInput(e.target.value)}
                    placeholder="Enter your answer"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              {showSuccess && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" /> Settings saved!
                </motion.span>
              )}
            </div>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-[#5A5A40] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : (
                <>
                  <Save className="w-5 h-5" /> Save All Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif font-bold">Security</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Admin Password</p>
                  <p className="text-xs text-gray-500">Current: {profile?.adminPassword || 'kuntal007'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="text-xs font-bold text-[#5A5A40] hover:underline"
              >
                Change
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Two-Factor Auth</p>
                  <p className="text-xs text-gray-500">Extra layer of security</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  twoFactorEnabled ? "bg-[#5A5A40]" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  twoFactorEnabled ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif font-bold">Data Management</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Export your account data or reset local application preferences.</p>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                  try {
                    const data = JSON.stringify(profile, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `EduTrack-Data-${profile?.uid || 'user'}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Export failed:', err);
                    alert('Failed to export data. Please try again.');
                  }
                }}
                className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 border border-gray-100"
              >
                <DownloadCloud className="w-5 h-5" /> Export My Data
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Clear all local application cache? This will reset your theme and local preferences.')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
              >
                <X className="w-5 h-5" /> Clear Local Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      {profile?.role === 'faculty' && (
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900">Admin Promotion</h3>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Enter the admin promotion password to upgrade your account.</p>
            <div className="flex gap-3">
              <input 
                type="password"
                placeholder="Enter password and press Enter"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value;
                    if (val === '0007') {
                      try {
                        await updateProfile({ role: 'admin' });
                        alert('Account promoted to Admin!');
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                        alert('Failed to promote account');
                      }
                    } else {
                      alert('Incorrect password');
                    }
                  }
                }}
              />
            </div>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Press Enter to submit</p>
          </div>
        </div>
      )}
    </div>
  );
}
