import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { GraduationCap, LogIn, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const { user, profile, signIn, loading, updateSecurity } = useAuth();
  const [step, setStep] = useState<'login' | 'setup' | 'verify' | 'verified'>('login');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [verifyAnswer, setVerifyAnswer] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (user && profile) {
      if (!profile.securityQuestion) {
        setStep('setup');
      } else if (step === 'login') {
        setStep('verify');
      }
    }
  }, [user, profile, step]);

  if (loading) return null;
  
  // Final redirect
  if (user && profile?.securityQuestion && step === 'verified') {
    return <Navigate to="/" />;
  }

  // If they just logged in and we are in verified state but profile is still loading or something
  if (user && profile?.securityQuestion && step === 'verified') return <Navigate to="/" />;

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !answer) {
      setError('Please fill all fields');
      return;
    }
    await updateSecurity(question, answer);
    setStep('verified');
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAnswer.toLowerCase() === profile?.securityAnswer?.toLowerCase()) {
      setStep('verified');
    } else {
      setError('Incorrect answer. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-black/5"
          >
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">EduTrack Pro</h1>
            <p className="text-[#5A5A40] mb-8 font-serif italic">Smart Faculty & Classroom Automation</p>
            
            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-3 bg-[#5A5A40] text-white py-4 rounded-2xl font-medium hover:bg-[#4A4A30] transition-colors shadow-lg shadow-[#5A5A40]/20"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
            
            <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest">
              University Enterprise Edition
            </p>
          </motion.div>
        )}

        {step === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-black/5"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-serif font-bold">Security Setup</h2>
              <p className="text-gray-500 text-sm">Set a security question for future verification.</p>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Security Question</label>
                <input 
                  type="text"
                  placeholder="e.g., What was your first pet's name?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your Answer</label>
                <input 
                  type="text"
                  placeholder="Enter answer"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <button className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all">
                Complete Setup
              </button>
            </form>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div 
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-black/5"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-serif font-bold">Security Verification</h2>
              <p className="text-gray-500 text-sm">Answer your security question to continue.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Your Question</p>
                <p className="font-serif italic text-gray-800">{profile?.securityQuestion}</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your Answer</label>
                <input 
                  type="text"
                  placeholder="Enter answer"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={verifyAnswer}
                  onChange={e => {
                    setVerifyAnswer(e.target.value);
                    setError('');
                  }}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
              <button className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all">
                Verify & Login
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
