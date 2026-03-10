import React from 'react';
import { Timer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * SessionTimer — Displays a countdown timer for guest sessions (Section D.2).
 * Shows "Session expire dans 28:43" in the navbar area.
 */
export const SessionTimer: React.FC = () => {
    const { isGuest, sessionRemainingSeconds } = useAuth();

    if (!isGuest || sessionRemainingSeconds === null) return null;

    const minutes = Math.floor(sessionRemainingSeconds / 60);
    const seconds = sessionRemainingSeconds % 60;
    const isCritical = sessionRemainingSeconds < 60;  // < 1 min

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(60, 95, 160, 0.08)',
            border: '1px solid rgba(60, 95, 160, 0.2)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#3c5fa0',
            animation: isCritical ? 'pulse 1s infinite' : 'none',
        }}>
            <Timer className="h-4 w-4" style={{ color: '#3c5fa0' }} />
            <span>Session expire dans {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
        </div>
    );
};

export default SessionTimer;
