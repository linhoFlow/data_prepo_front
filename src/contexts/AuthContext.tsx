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
    register: (name: string, email: string) => void;
    logout: () => void;
    startGuestSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

const USERS_KEY = 'dataprep_registered_users';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('dataprep_user');
        let userFound = false;
        if (stored) {
            try {
                const parsedUser = JSON.parse(stored);
                setUser(parsedUser);
                userFound = true;
                // Ensure guest mode is cleared if user is found
                setIsGuest(false);
                sessionStorage.removeItem('dataprep_guest');
            } catch { /* ignore */ }
        }

        if (!userFound) {
            const guestFlag = sessionStorage.getItem('dataprep_guest');
            if (guestFlag === 'true') {
                setIsGuest(true);
            }
        }
    }, []);

    const register = (name: string, email: string) => {
        try {
            const stored = localStorage.getItem(USERS_KEY);
            const users = stored ? JSON.parse(stored) : [];
            const filtered = users.filter((u: any) => u.email !== email);
            localStorage.setItem(USERS_KEY, JSON.stringify([...filtered, { name, email }]));
        } catch (e) {
            console.error("Error registering user", e);
        }
    };

    const login = (email: string, _password: string): boolean => {
        // Simulation - check registry first
        let name = '';
        try {
            const stored = localStorage.getItem(USERS_KEY);
            const users = stored ? JSON.parse(stored) : [];
            const registeredUser = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
            if (registeredUser) {
                name = registeredUser.name;
            } else {
                // Fallback to extraction logic
                const namePart = email.split(/[@.]/)[0];
                name = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
            }
        } catch {
            const namePart = email.split(/[@.]/)[0];
            name = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
        }

        const newUser: User = {
            id: crypto.randomUUID(),
            email,
            name: name,
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
            register,
            logout,
            startGuestSession,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
