import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile as updateFirebaseProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'faculty' | 'student';
  departmentId?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  bannerName?: string;
  bannerDescription?: string;
  adminPassword?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    email: boolean;
    push: boolean;
  };
  privacy?: {
    publicProfile: boolean;
  };
  language?: string;
  twoFactorEnabled?: boolean;
  photoURL?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isOffline: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: 'admin' | 'faculty' | 'student') => Promise<void>;
  updateSecurity: (question: string, answer: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const ADMIN_EMAIL = 'beraniranjan722@gmail.com';

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setIsOffline(false);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firestore connection failed: the client is offline. Please check your Firebase configuration or ensure the database is provisioned.");
          setIsOffline(true);
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const existingProfile = docSnap.data() as UserProfile;
            const isAllowedEmail = user.email === ADMIN_EMAIL;
            
            // Force student role if not the allowed email but somehow has admin/faculty role
            if (!isAllowedEmail && (existingProfile.role === 'admin' || existingProfile.role === 'faculty')) {
              const updatedProfile = { ...existingProfile, role: 'student' as const };
              await updateDoc(docRef, { role: 'student' });
              setProfile(updatedProfile);
            } else {
              setProfile(existingProfile);
            }
          } else {
            // Create default profile if not exists
            const isAllowedEmail = user.email === ADMIN_EMAIL;
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              role: isAllowedEmail ? 'admin' : 'student',
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
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

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateFirebaseProfile(userCredential.user, { displayName: name });
    
    const isAllowedEmail = email === ADMIN_EMAIL;
    const newProfile: UserProfile = {
      uid: userCredential.user.uid,
      email: email,
      displayName: name,
      role: isAllowedEmail ? 'admin' : 'student',
    };
    await setDoc(doc(db, 'users', userCredential.user.uid), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateRole = async (role: 'admin' | 'faculty' | 'student') => {
    if (user) {
      const isAllowedEmail = user.email === ADMIN_EMAIL;
      // Only allow role change to admin/faculty if it's the allowed email
      if (!isAllowedEmail && (role === 'admin' || role === 'faculty')) {
        throw new Error('Unauthorized role change');
      }
      
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

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, data, { merge: true });
      setProfile(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isOffline,
      signIn, 
      signInWithEmail,
      signUpWithEmail,
      logout, 
      updateRole, 
      updateSecurity, 
      updateProfile,
      resetPassword
    }}>
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
