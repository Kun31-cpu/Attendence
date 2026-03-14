import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Mail, 
  Shield, 
  Save,
  CheckCircle2,
  X
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        updatedAt: new Date()
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate old password (hardcoded for this demo as kuntal007)
    if (oldPassword !== 'kuntal007') {
      setPasswordError('Incorrect old password');
      return;
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

    alert(`Admin password updated to: ${newPassword}. (Note: In this demo, this is a UI-only change for the session)`);
    setShowPasswordModal(false);
    setOldPassword('');
    setNewPassword('');
    setSecurityAnswer('');
    setPasswordError('');
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
              <h3 className="text-xl font-serif font-bold mb-2">Change Admin Password</h3>
              <p className="text-sm text-gray-500 mb-6">Verify your identity to update the password.</p>
              
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Old Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>

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
                    Update
                  </button>
                </div>
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
        <div className="p-8 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
          <div className="w-16 h-16 rounded-2xl bg-[#5A5A40] flex items-center justify-center text-white">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold">{profile?.displayName}</h3>
            <p className="text-gray-500 text-sm capitalize">{profile?.role} Account</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" /> Full Name
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none transition-all"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Address
              </label>
              <input 
                type="email" 
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 outline-none cursor-not-allowed"
                value={user?.email || ''}
              />
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Email cannot be changed</p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              {showSuccess && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" /> Profile updated!
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
                  <Save className="w-5 h-5" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif font-bold">Security</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Admin Password</p>
                <p className="text-xs text-gray-500">Current: kuntal007</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="text-xs font-bold text-[#5A5A40] hover:underline"
            >
              Change
            </button>
          </div>
          <p className="text-xs text-gray-400 italic">Note: Password changes for role switching are managed by the system administrator.</p>
        </div>
      </div>
    </div>
  );
}
