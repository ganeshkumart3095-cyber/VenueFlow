import React, { useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, serverTimestamp } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { seedMockData } from '../lib/mockData';
import { AuthContext, UserProfile } from './AuthContextType';

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const loginAsGuest = () => {
    setLoading(false);
    setIsAuthReady(true);
    setUser({
      uid: 'guest',
      email: 'guest@example.com',
      displayName: 'Guest User',
      isAnonymous: true,
      emailVerified: true,
      phoneNumber: null,
      photoURL: null,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as unknown as import('firebase/auth').IdTokenResult),
      reload: async () => {},
      toJSON: () => ({}),
    } as unknown as FirebaseUser);
    setProfile({
      uid: 'guest',
      email: 'guest@example.com',
      name: 'Guest User',
      role: 'attendee'
    });
  };

  useEffect(() => {
    seedMockData(); 
    
    let unsubscribe: () => void = () => {};
    
    const authTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth check timed out. Entering guest mode fallback.");
        loginAsGuest();
      }
    }, 2000);

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          clearTimeout(authTimeout);
          setUser(user);
          if (user) {
            try {
                const docRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                  setProfile(docSnap.data() as UserProfile);
                } else {
                  const newProfile: UserProfile = {
                    uid: user.uid,
                    email: user.email || '',
                    name: user.displayName || 'User',
                    role: 'attendee',
                  };
                  await setDoc(docRef, { ...newProfile, createdAt: serverTimestamp() });
                  setProfile(newProfile);
                }
            } catch (fireError) {
                // Non-fatal, just use user info (Firestore often offline in dev)
                setProfile({
                    uid: user.uid,
                    email: user.email || '',
                    name: user.displayName || 'User',
                    role: 'attendee'
                });
            }
          } else {
            setProfile(null);
          }
          setLoading(false);
          setIsAuthReady(true);
        },
        (error) => {
          clearTimeout(authTimeout);
          console.error("Firebase Auth observer error:", error);
          loginAsGuest();
        }
      );
    } catch (err) {
      clearTimeout(authTimeout);
      console.error("Auth Listener Error:", err);
      setLoading(false);
      setIsAuthReady(true);
    }

    return () => {
      unsubscribe();
      clearTimeout(authTimeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
