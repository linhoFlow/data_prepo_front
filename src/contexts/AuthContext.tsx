import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../services/api';

// ─── Types ───
type UserTier = 'guest' | 'starter' | 'pro' | 'enterprise';

interface User {
    id: string;
    email: string;
    name: string;
    tier: UserTier;
    role: 'user' | 'admin' | 'manager' | 'guest';
}

interface TierInfo {
    tier: string;
    limits: {
        max_file_size_mb: number | null;
        max_columns: number | null;
        max_rows: number | null;
        max_files: number | null;
        session_timeout_minutes: number | null;
        allowed_export_formats: string[];
        report_visible_percent: number;
    };
    blocked_features: string[];
}

interface AuthContextType {
    user: User | null;
    isGuest: boolean;
    isAdmin: boolean;
    isStaff: boolean;
    isAuthenticated: boolean;
    tier: UserTier;
    tierInfo: TierInfo | null;
    sessionExpiresAt: Date | null;
    sessionRemainingSeconds: number | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password?: string) => Promise<void>;
    logout: () => void;
    startGuestSession: () => Promise<void>;
    canAccess: (feature: string) => boolean;
    setTierInfo: (info: TierInfo) => void;
}

// ─── Feature blocking list (mirrored from backend tier_config.py) ───
const GUEST_BLOCKED_FEATURES = [
    "nlp_tfidf", "nlp_word2vec", "nlp_bert",
    "knn_imputer", "iterative_imputer",
    "smote",
    "isolation_forest", "lof", "elliptic_envelope",
    "neural_network",
    "pipeline_export_pkl",
    "save_pipeline", "regression_test",
    "advanced_visuals",
    "autopilot_full",
    "scatter_matrix", "correlation_heatmap", "funnel_chart",
];

const STARTER_BLOCKED_FEATURES: string[] = [];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('dataprep_user');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch { return null; }
        }
        return null;
    });

    const [isGuest, setIsGuest] = useState(() => {
        const guestFlag = sessionStorage.getItem('dataprep_guest');
        const userStored = localStorage.getItem('dataprep_user');
        return guestFlag === 'true' && !userStored;
    });

    const [tier, setTier] = useState<UserTier>(() => {
        const stored = localStorage.getItem('dataprep_user');
        if (stored) {
            try {
                return JSON.parse(stored).tier || 'starter';
            } catch { return 'starter'; }
        }
        const token = localStorage.getItem('dataprep_token');
        if (token) {
            try {
                const parts = token.split('.');
                const payload = JSON.parse(atob(parts[1]));
                return payload.tier || 'guest';
            } catch { return 'guest'; }
        }
        return 'guest';
    });

    const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
    const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(() => {
        const expiryStr = sessionStorage.getItem('dataprep_guest_expiry');
        if (expiryStr) {
            const expiry = new Date(expiryStr);
            return expiry > new Date() ? expiry : null;
        }
        return null;
    });
    const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState<number | null>(null);

    const logout = useCallback(() => {
        setUser(null);
        setIsGuest(false);
        setTier('guest');
        setSessionExpiresAt(null);
        setTierInfo(null);

        // Nettoyage complet
        localStorage.removeItem('dataprep_user');
        localStorage.removeItem('dataprep_token');
        sessionStorage.removeItem('dataprep_guest');
        sessionStorage.removeItem('dataprep_guest_expiry');

        // Nettoyage de l'état de l'analyse pour éviter le bleeding entre sessions
        sessionStorage.removeItem('current_dataset_id');
        sessionStorage.removeItem('current_file_name');
        sessionStorage.removeItem('current_step');
    }, []);

    // ─── Session timer (Disabled per user request) ───
    useEffect(() => {
        setSessionRemainingSeconds(null);
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
            // Nettoyer avant de se connecter pour garantir une session propre
            logout();

            const response = await authApi.login(email, password);
            const data = response.data;

            const newUser: User = {
                id: data.id,
                email: data.email,
                name: data.name,
                tier: (data.tier || 'starter') as UserTier,
                role: data.role || 'user'
            };

            setUser(newUser);
            setIsGuest(false);
            setTier(newUser.tier);
            setSessionExpiresAt(null); // No expiry for registered users
            localStorage.setItem('dataprep_user', JSON.stringify(newUser));
            localStorage.setItem('dataprep_token', data.token);
            sessionStorage.removeItem('dataprep_guest');
            sessionStorage.removeItem('dataprep_guest_expiry');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    useEffect(() => {
        // Validation logic if needed, but synchronous state is already set
        if (!user) {
            const guestFlag = sessionStorage.getItem('dataprep_guest');
            if (guestFlag === 'true') {
                const expiryStr = sessionStorage.getItem('dataprep_guest_expiry');
                if (expiryStr) {
                    const expiry = new Date(expiryStr);
                    if (expiry < new Date()) {
                        logout();
                    }
                }
            }
        }
    }, [logout, user]);

    const startGuestSession = async () => {
        try {
            const response = await authApi.guestLogin();
            const data = response.data;
            setIsGuest(true);
            setUser(null);
            setTier('guest');
            localStorage.setItem('dataprep_token', data.token);
            sessionStorage.setItem('dataprep_guest', 'true');

            // Set session expiry (None)
            setSessionExpiresAt(null);
            sessionStorage.removeItem('dataprep_guest_expiry');
        } catch (e) {
            console.error("Error starting guest session", e);
            throw e; // Rethrow to let the UI handle it
        }
    };

    const canAccess = useCallback((feature: string): boolean => {
        // Staff members (admin/manager) have full access bypass
        if (user?.role === 'admin' || user?.role === 'manager') return true;

        if (tier === 'pro' || tier === 'enterprise') return true;
        if (tier === 'guest') return !GUEST_BLOCKED_FEATURES.includes(feature);
        if (tier === 'starter') return !STARTER_BLOCKED_FEATURES.includes(feature);
        return false;
    }, [tier, user]);

    return (
        <AuthContext.Provider value={{
            user,
            isGuest,
            isAdmin: user?.role === 'admin',
            isStaff: user?.role === 'admin' || user?.role === 'manager',
            isAuthenticated: !!user,
            tier,
            tierInfo,
            sessionExpiresAt,
            sessionRemainingSeconds,
            login,
            register,
            logout,
            startGuestSession,
            canAccess,
            setTierInfo,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
