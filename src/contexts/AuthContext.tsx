import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../services/api';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    isGuest: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password?: string) => Promise<void>;
    logout: () => void;
    startGuestSession: () => Promise<void>;
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

    const register = async (name: string, email: string, password?: string) => {
        try {
            await authApi.register(name, email, password || 'default-pass');
        } catch (e) {
            console.error("Error registering user", e);
            throw e;
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await authApi.login(email, password);
            const data = response.data;

            const newUser: User = {
                id: data.id,
                email: data.email,
                name: data.name,
            };

            setUser(newUser);
            setIsGuest(false);
            localStorage.setItem('dataprep_user', JSON.stringify(newUser));
            localStorage.setItem('dataprep_token', data.token);
            sessionStorage.removeItem('dataprep_guest');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setIsGuest(false);
        localStorage.removeItem('dataprep_user');
        localStorage.removeItem('dataprep_token');
        sessionStorage.removeItem('dataprep_guest');
    };

    const startGuestSession = async () => {
        try {
            const response = await authApi.guestLogin();
            const data = response.data;
            setIsGuest(true);
            setUser(null);
            localStorage.setItem('dataprep_token', data.token); // Crucial for 401 fix
            sessionStorage.setItem('dataprep_guest', 'true');
        } catch (e) {
            console.error("Error starting guest session", e);
        }
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
