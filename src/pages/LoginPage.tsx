import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { GraduationCap, LogIn, ShieldCheck, HelpCircle, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 text-center border border-black/5"
          >
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-[#5A5A40] rounded-3xl flex items-center justify-center shadow-lg shadow-[#5A5A40]/20">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-2">EduTrack Pro</h1>
            <p className="text-[#5A5A40] mb-10 font-serif italic text-lg">
              {authMode === 'forgot-password' ? 'Reset Your Password' : 'Smart Faculty & Classroom Automation'}
            </p>
            
            {authMode === 'google' ? (
              <div className="space-y-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-95 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  {isSubmitting ? 'Connecting...' : 'Sign in with Google'}
                </button>
                
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or continue with</span></div>
                </div>

                <button
                  onClick={() => setAuthMode('email')}
                  className="w-full flex items-center justify-center gap-3 bg-white text-[#5A5A40] border-2 border-[#5A5A40]/10 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                >
                  <Mail className="w-5 h-5" />
                  Email & Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
                <button 
                  type="button"
                  onClick={() => {
                    setAuthMode('google');
                    setError('');
                    setSuccess('');
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-[#5A5A40] mb-6 hover:opacity-70 transition-opacity"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Google Sign In
                </button>

                {authMode === 'forgot-password' && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                      Enter your email address and we'll send you a link to reset your password.
                    </p>
                  </div>
                )}

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Full Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><UserPlus className="w-5 h-5" /></div>
                      <input 
                        type="text"
                        placeholder="John Doe"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:border-[#5A5A40] outline-none transition-all font-medium"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Mail className="w-5 h-5" /></div>
                    <input 
                      type="email"
                      placeholder="name@university.edu"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:border-[#5A5A40] outline-none transition-all font-medium"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {authMode !== 'forgot-password' && (
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Lock className="w-5 h-5" /></div>
                      <input 
                        type="password"
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:border-[#5A5A40] outline-none transition-all font-medium"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    {authMode === 'email' && (
                      <div className="mt-2 text-right">
                        <button 
                          type="button"
                          onClick={() => {
                            setAuthMode('forgot-password');
                            setError('');
                            setSuccess('');
                          }}
                          className="text-xs font-bold text-[#5A5A40] hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="text-red-500 text-xs font-bold px-1">{error}</p>}
                {success && <p className="text-emerald-600 text-xs font-bold px-1">{success}</p>}

                <button 
                  disabled={isSubmitting}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : (
                    authMode === 'email' ? 'Sign In' : 
                    authMode === 'signup' ? 'Create Account' : 'Send Reset Link'
                  )}
                </button>

                <p className="text-center text-sm text-gray-500 mt-6">
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
                    className="text-[#5A5A40] font-bold hover:underline"
                  >
                    {authMode === 'email' ? 'Create one now' : 
                     authMode === 'signup' ? 'Sign in here' : 'Back to login'}
                  </button>
                </p>
              </form>
            )}
            
            <p className="mt-10 text-[10px] text-gray-400 uppercase font-black tracking-[0.3em]">
              University Enterprise Edition
            </p>
          </motion.div>
        )}

        {step === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-black/5"
          >
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldCheck className="w-12 h-12 text-amber-600" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-gray-900">Security Setup</h2>
              <p className="text-gray-500 mt-2 font-serif italic">Set a security question for future verification.</p>
            </div>

            <form onSubmit={handleSetup} className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Security Question</label>
                <input 
                  type="text"
                  placeholder="e.g., What was your first pet's name?"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:border-[#5A5A40] outline-none transition-all font-medium"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Your Answer</label>
                <input 
                  type="text"
                  placeholder="Enter answer"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:border-[#5A5A40] outline-none transition-all font-medium"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold px-1">{error}</p>}
              <button className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-95">
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
            className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-black/5"
          >
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <HelpCircle className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-serif font-bold text-gray-900">Security Verification</h2>
              <p className="text-gray-500 mt-2 font-serif italic">Answer your security question to continue.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-8">
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Your Question</p>
                <p className="font-serif italic text-lg text-gray-800 leading-relaxed">{profile?.securityQuestion}</p>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Your Answer</label>
                <input 
                  type="text"
                  placeholder="Enter answer"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:border-[#5A5A40] outline-none transition-all font-medium"
                  value={verifyAnswer}
                  onChange={e => {
                    setVerifyAnswer(e.target.value);
                    setError('');
                  }}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-xs font-bold px-1">{error}</p>}
              <button className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20 active:scale-95">
                Verify & Login
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
