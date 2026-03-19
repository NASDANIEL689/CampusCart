import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../types';

const ADMIN_EMAILS = ['pakodaniel43@gmail.com', 'nasdaniel21@gmail.com'];

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  switchAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          // Auto-promote to admin if email is in the list but role is not admin
          if (ADMIN_EMAILS.includes(user.email || '') && existingProfile.role !== 'admin') {
            const updatedProfile = { ...existingProfile, role: 'admin' as UserRole };
            await updateDoc(docRef, { role: 'admin' });
            setProfile(updatedProfile);
          } else {
            setProfile(existingProfile);
          }
        } else {
          const role: UserRole = ADMIN_EMAILS.includes(user.email || '') ? 'admin' : 'student';
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: role,
            preferences: {
              notifications: {
                messages: true,
                orders: true,
                promotions: false,
              },
              theme: 'system',
            },
            createdAt: Timestamp.now(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in error", error);
    }
  };

  const switchAccount = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signOut(auth);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Switch account error", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, switchAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
