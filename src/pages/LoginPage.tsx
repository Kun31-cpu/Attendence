import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { GraduationCap, LogIn, ShieldCheck, HelpCircle, Mail, Lock, UserPlus, ArrowLeft, Sparkles, Globe, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function LoginPage() {
  const { user, profile, signIn, signInWithEmail, signUpWithEmail, loading, updateSecurity, resetPassword } = useAuth();
  const [step, setStep] = useState<'login' | 'setup' | 'verify' | 'verified'>('login');
  const [authMode, setAuthMode] = useState<'google' | 'email' | 'signup' | 'forgot-password'>('google');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [verifyAnswer, setVerifyAnswer] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signIn();
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in Firebase Console.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      if (authMode === 'email') {
        await signInWithEmail(email, password);
      } else if (authMode === 'signup') {
        if (!name) throw new Error('Name is required');
        await signUpWithEmail(email, password, name);
      } else if (authMode === 'forgot-password') {
        if (!email) throw new Error('Email is required');
        await resetPassword(email);
        setSuccess('Password reset link sent to your email!');
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="min-h-screen bg-[#0a0502] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -top-48 -left-48 w-[800px] h-[800px] bg-[#5A5A40]/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, 100, 0]
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-48 -right-48 w-[1000px] h-[1000px] bg-[#F27D26]/10 blur-[150px] rounded-full" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0502]/40 to-[#0a0502]" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl p-10 md:p-14 text-center border border-white/10 relative z-10"
          >
            <div className="flex justify-center mb-10">
              <motion.div 
                whileHover={{ rotate: 12, scale: 1.1 }}
                className="w-24 h-24 bg-gradient-to-br from-[#5A5A40] to-[#4A4A30] rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-[#5A5A40]/40 relative group"
              >
                <div className="absolute inset-0 bg-white/20 rounded-[2.5rem] scale-0 group-hover:scale-100 transition-transform duration-500" />
                <GraduationCap className="w-12 h-12 text-white relative z-10" />
              </motion.div>
            </div>
            
            <h1 className="text-5xl font-playfair font-black text-white tracking-tighter mb-3">EduTrack Pro</h1>
            <p className="text-white/60 mb-12 font-montserrat font-medium italic text-lg leading-relaxed">
              {authMode === 'forgot-password' ? 'Reset Your Password' : 'Smart Faculty & Classroom Automation'}
            </p>
            
            {authMode === 'google' ? (
              <div className="space-y-6">
                <motion.button
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-4 bg-white text-[#0a0502] py-5 rounded-3xl font-montserrat font-black text-sm uppercase tracking-widest shadow-2xl shadow-white/10 hover:bg-gray-100 transition-all disabled:opacity-50 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/5 to-black/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <LogIn className="w-5 h-5" />
                  {isSubmitting ? 'Connecting...' : 'Sign in with Google'}
                </motion.button>
                
                <div className="relative my-10">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black text-white/30"><span className="bg-[#0a0502] px-4">Or continue with</span></div>
                </div>

                <motion.button
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAuthMode('email')}
                  className="w-full flex items-center justify-center gap-4 bg-white/5 text-white border-2 border-white/10 py-5 rounded-3xl font-montserrat font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  <Mail className="w-5 h-5" />
                  Email & Password
                </motion.button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-6 text-left">
                <button 
                  type="button"
                  onClick={() => {
                    setAuthMode('google');
                    setError('');
                    setSuccess('');
                  }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 mb-8 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Google
                </button>

                {authMode === 'forgot-password' && (
                  <div className="mb-8 p-6 bg-white/5 rounded-[2rem] border border-white/10">
                    <p className="text-xs text-white/70 font-montserrat font-medium leading-relaxed italic">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                )}

                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Full Name</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors"><UserPlus className="w-5 h-5" /></div>
                      <input 
                        type="text"
                        placeholder="John Doe"
                        className="w-full pl-14 pr-6 py-5 rounded-3xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-montserrat font-medium text-sm text-white"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Email Address</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors"><Mail className="w-5 h-5" /></div>
                    <input 
                      type="email"
                      placeholder="name@university.edu"
                      className="w-full pl-14 pr-6 py-5 rounded-3xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-montserrat font-medium text-sm text-white"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {authMode !== 'forgot-password' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Password</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors"><Lock className="w-5 h-5" /></div>
                      <input 
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-14 pr-6 py-5 rounded-3xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-montserrat font-medium text-sm text-white"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    {authMode === 'email' && (
                      <div className="mt-3 text-right">
                        <button 
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot-password');
                            setError('');
                            setSuccess('');
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest px-2">{error}</p>}
                {success && <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2">{success}</p>}

                <motion.button 
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSubmitting}
                  className="w-full bg-white text-[#0a0502] py-5 rounded-3xl font-montserrat font-black text-sm uppercase tracking-widest shadow-2xl shadow-white/10 hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : (
                    authMode === 'email' ? 'Sign In' : 
                    authMode === 'signup' ? 'Create Account' : 'Send Reset Link'
                  )}
                </motion.button>

                <p className="text-center text-[11px] font-montserrat font-medium text-white/40 mt-8">
                  {authMode === 'email' ? "Don't have an account? " : 
                   authMode === 'signup' ? "Already have an account? " : "Remember your password? "}
                  <button 
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'signup' ? 'email' : 'signup');
                      if (authMode === 'forgot-password') setAuthMode('email');
                      setError('');
                      setSuccess('');
                    }}
                    className="text-white font-black uppercase tracking-widest hover:underline ml-1"
                  >
                    {authMode === 'email' ? 'Create one now' : 
                     authMode === 'signup' ? 'Sign in here' : 'Back to login'}
                  </button>
                </p>
              </form>
            )}
            
            <div className="mt-14 flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-white/10" />
              <p className="text-[9px] text-white/30 uppercase font-black tracking-[0.4em]">
                University Enterprise Edition
              </p>
              <div className="h-px w-8 bg-white/10" />
            </div>
          </motion.div>
        )}

        {step === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl p-10 md:p-14 border border-white/10 relative z-10"
          >
            <div className="text-center mb-12">
              <div className="w-24 h-24 bg-amber-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <ShieldCheck className="w-12 h-12 text-amber-500" />
              </div>
              <h2 className="text-4xl font-playfair font-black text-white tracking-tight">Security Setup</h2>
              <p className="text-white/60 mt-3 font-montserrat font-medium italic">Set a security question for future verification.</p>
            </div>

            <form onSubmit={handleSetup} className="space-y-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Security Question</label>
                <input 
                  type="text"
                  placeholder="e.g., What was your first pet's name?"
                  className="w-full px-6 py-5 rounded-3xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-montserrat font-medium text-sm text-white"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Your Answer</label>
                <input 
                  type="text"
                  placeholder="Enter answer"
                  className="w-full px-6 py-5 rounded-3xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-montserrat font-medium text-sm text-white"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest px-2">{error}</p>}
              <motion.button 
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white text-[#0a0502] py-5 rounded-3xl font-montserrat font-black text-sm uppercase tracking-widest shadow-2xl shadow-white/10 hover:bg-gray-100 transition-all"
              >
                Complete Setup
              </motion.button>
            </form>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div 
            key="verify"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[3.5rem] shadow-2xl p-10 md:p-14 border border-white/10 relative z-10"
          >
            <div className="text-center mb-12">
              <div className="w-24 h-24 bg-blue-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <HelpCircle className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-4xl font-playfair font-black text-white tracking-tight">Verification</h2>
              <p className="text-white/60 mt-3 font-montserrat font-medium italic">Answer your security question to continue.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-10">
              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mb-3">Your Question</p>
                <p className="font-playfair italic text-xl text-white leading-relaxed">{profile?.securityQuestion}</p>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Your Answer</label>
                <input 
                  type="text"
                  placeholder="Enter answer"
                  className="w-full px-6 py-5 rounded-3xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-montserrat font-medium text-sm text-white"
                  value={verifyAnswer}
                  onChange={e => {
                    setVerifyAnswer(e.target.value);
                    setError('');
                  }}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest px-2">{error}</p>}
              <motion.button 
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-white text-[#0a0502] py-5 rounded-3xl font-montserrat font-black text-sm uppercase tracking-widest shadow-2xl shadow-white/10 hover:bg-gray-100 transition-all"
              >
                Verify & Login
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
