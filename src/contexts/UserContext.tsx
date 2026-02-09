import React, { createContext, useContext, useState, useCallback } from 'react';

export interface UserProfile {
  username: string;
  email: string;
  elo: number;
  level: number;
  xp: number;
  totalBattles: number;
  wins: number;
  losses: number;
  streak: number;
  badges: string[];
  joinedAt: string;
  assessmentCompleted: boolean;
}

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  signup: (username: string, email: string, password: string) => void;
  logout: () => void;
  completeAssessment: (elo: number) => void;
  updateElo: (delta: number) => void;
  addBadge: (badge: string) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

const STORAGE_KEY = 'codeclash_user';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const persist = (u: UserProfile | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const login = useCallback((email: string, _password: string) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      persist(JSON.parse(saved));
    } else {
      persist({
        username: email.split('@')[0],
        email,
        elo: 0,
        level: 1,
        xp: 0,
        totalBattles: 0,
        wins: 0,
        losses: 0,
        streak: 0,
        badges: [],
        joinedAt: new Date().toISOString(),
        assessmentCompleted: false,
      });
    }
  }, []);

  const signup = useCallback((username: string, email: string, _password: string) => {
    persist({
      username,
      email,
      elo: 0,
      level: 1,
      xp: 0,
      totalBattles: 0,
      wins: 0,
      losses: 0,
      streak: 0,
      badges: [],
      joinedAt: new Date().toISOString(),
      assessmentCompleted: false,
    });
  }, []);

  const logout = useCallback(() => persist(null), []);

  const completeAssessment = useCallback((elo: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, elo, assessmentCompleted: true, level: Math.floor(elo / 200) + 1 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateElo = useCallback((delta: number) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, elo: Math.max(0, prev.elo + delta) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addBadge = useCallback((badge: string) => {
    setUser(prev => {
      if (!prev) return prev;
      if (prev.badges.includes(badge)) return prev;
      const updated = { ...prev, badges: [...prev.badges, badge] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login, signup, logout,
      completeAssessment, updateElo, addBadge,
    }}>
      {children}
    </UserContext.Provider>
  );
};
