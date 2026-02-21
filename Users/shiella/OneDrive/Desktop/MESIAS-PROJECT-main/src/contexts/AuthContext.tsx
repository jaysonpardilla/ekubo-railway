import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  address: string;
  user_type: string;
  contact_number?: string;
  date_of_birth?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const userData = await auth.getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      auth.logout();
      setUser(null);
      return null;
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (token) {
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
      setUser(null);
    }
  }, []);

  const signOut = () => {
    auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile, setUser, setLoading }}>
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
