import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ConversionModal } from './ConversionModal';

interface PremiumGuardProps {
    feature: string;
    children: React.ReactNode;
    blur?: boolean;
    fallbackMessage?: string;
}

/**
 * PremiumGuard — Wraps a component and blocks access for unauthorized tiers.
 * 
 * Usage:
 *   <PremiumGuard feature="correlation_heatmap" blur={true}>
 *       <CorrelationMatrix data={...} />
 *   </PremiumGuard>
 */
export const PremiumGuard: React.FC<PremiumGuardProps> = ({
    feature,
    children,
    blur = true,
    fallbackMessage,
}) => {
    const { canAccess, tier, isGuest } = useAuth();
    const [showModal, setShowModal] = React.useState(false);

    // Si canAccess(feature) est vrai (y compris pour le staff via AuthContext), 
    // on affiche directement le contenu.
    if (canAccess(feature)) {
        return <>{children}</>;
    }

    return (
        <div style={{ position: 'relative' }}>
            {/* Blurred preview or placeholder */}
            {blur ? (
                <div
                    style={{
                        filter: 'blur(6px)',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        opacity: 0.6,
                    }}
                >
                    {children}
                </div>
            ) : (
                <div style={{
                    background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)',
                    borderRadius: '12px',
                    padding: '40px',
                    textAlign: 'center',
                    border: '2px dashed #a0b4ff',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4F6AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <p style={{ color: '#3c5fa0', fontWeight: 600, marginTop: '16px', fontSize: '16px' }}>
                        {fallbackMessage || 'Fonctionnalité réservée aux membres'}
                    </p>
                </div>
            )}

            {/* Overlay with unlock button */}
            <div
                onClick={() => setShowModal(true)}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    background: blur ? 'rgba(255, 255, 255, 0.3)' : 'transparent',
                    borderRadius: '12px',
                }}
            >
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px 32px',
                    boxShadow: '0 8px 32px rgba(60, 95, 160, 0.2)',
                    textAlign: 'center',
                    maxWidth: '320px',
                    border: '1px solid #e0e8ff',
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3c5fa0, #5178c0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <p style={{ fontWeight: 700, color: '#1a2b6d', fontSize: '15px', margin: '0 0 8px' }}>
                        {isGuest ? 'Créer un compte pour débloquer' : 'Passez au niveau supérieur'}
                    </p>
                    <p style={{ color: '#6b7fa3', fontSize: '13px', margin: '0 0 16px', lineHeight: '1.5' }}>
                        {fallbackMessage || `Cette fonctionnalité est réservée aux niveaux supérieurs.`}
                    </p>
                    <button style={{
                        background: 'linear-gradient(135deg, #3c5fa0 0%, #5178c0 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 24px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'transform 0.2s',
                    }}>
                        Débloquer
                    </button>
                </div>
            </div>

            {showModal && (
                <ConversionModal
                    trigger={feature}
                    currentTier={tier}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

export default PremiumGuard;
