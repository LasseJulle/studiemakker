import * as React from 'react';
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase/client';
import { Session } from '@supabase/supabase-js';
import { User } from './types';

import AuthPage from './components/pages/AuthPage';
import DashboardPage from './components/pages/DashboardPage';
import UpgradePage from './components/pages/UpgradePage';
import PaymentSuccessPage from './components/pages/PaymentSuccessPage';
import Header from './components/Header';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (session: Session | null) => {
    if (session?.user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        console.error('Error fetching profile:', error);
        setUser(null);
      } else if (data) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          display_name: data.display_name,
          is_premium: data.is_premium,
        });
      } else {
        // Fallback for when a profile doesn't exist yet.
        setUser({
            id: session.user.id,
            email: session.user.email,
            display_name: session.user.email?.split('@')[0] || 'Bruger',
            is_premium: false,
        });
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        await fetchUserProfile(session);
        setLoading(false);

        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setSession(session);
            await fetchUserProfile(session);
          }
        );

        return () => {
          authListener?.subscription.unsubscribe();
        };
    };
    
    getInitialSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  
  const refreshUser = () => {
      fetchUserProfile(session);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Indlæser StudieHjælperen...</p>
      </div>
    );
  }

  const MainLayout: React.FC = () => {
    if (!user) return <Navigate to="/login" />;
    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} />
            <Outlet />
        </div>
    );
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <AuthPage />} />
      
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage user={user!} />} />
        <Route path="/opgrader" element={<UpgradePage />} />
        <Route path="/betaling-succes" element={<PaymentSuccessPage user={user!} refreshUser={refreshUser} />} />
      </Route>
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
};

export default App;