import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isGuest: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => boolean;
    logout: () => void;
    startGuestSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('dataprep_user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch { /* ignore */ }
        }
        const guestFlag = sessionStorage.getItem('dataprep_guest');
        if (guestFlag === 'true') {
            setIsGuest(true);
        }
    }, []);

    const login = (email: string, _password: string): boolean => {
        // Simulation - accept any credentials
        const newUser: User = {
            id: crypto.randomUUID(),
            email,
            name: email.split('@')[0],
        };
        setUser(newUser);
        setIsGuest(false);
        localStorage.setItem('dataprep_user', JSON.stringify(newUser));
        sessionStorage.removeItem('dataprep_guest');
        return true;
    };

    const logout = () => {
        setUser(null);
        setIsGuest(false);
        localStorage.removeItem('dataprep_user');
        sessionStorage.removeItem('dataprep_guest');
    };

    const startGuestSession = () => {
        setIsGuest(true);
        setUser(null);
        sessionStorage.setItem('dataprep_guest', 'true');
    };

    return (
        <AuthContext.Provider value={{
            user,
            isGuest,
            isAuthenticated: !!user,
            login,
            logout,
            startGuestSession,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
