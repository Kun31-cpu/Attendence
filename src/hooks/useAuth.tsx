import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'faculty' | 'student';
  departmentId?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: 'admin' | 'faculty' | 'student') => Promise<void>;
  updateSecurity: (question: string, answer: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const existingProfile = docSnap.data() as UserProfile;
          const isAdminEmail = user.email === 'beraniranjan722@gmail.com';
          
          if (isAdminEmail && existingProfile.role !== 'admin' && !existingProfile.role) {
            // Only auto-upgrade if role is missing or we want to force it
            // Actually, let's just let the switcher handle it if it exists
          }
          setProfile(existingProfile);
        } else {
          // Create default profile if not exists
          const isAdminEmail = user.email === 'beraniranjan722@gmail.com';
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            role: isAdminEmail ? 'admin' : 'student',
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the sign-in popup.');
      } else {
        console.error('Sign-in error:', error);
        throw error;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateRole = async (role: 'admin' | 'faculty' | 'student') => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { role }, { merge: true });
      setProfile(prev => prev ? { ...prev, role } : null);
    }
  };

  const updateSecurity = async (question: string, answer: string) => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { securityQuestion: question, securityAnswer: answer }, { merge: true });
      setProfile(prev => prev ? { ...prev, securityQuestion: question, securityAnswer: answer } : null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout, updateRole, updateSecurity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
