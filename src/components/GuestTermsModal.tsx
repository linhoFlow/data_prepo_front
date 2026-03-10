import React, { useState, useEffect } from 'react';

/**
 * GuestTermsModal — Affiche les conditions d'utilisation au démarrage
 * d'une session invité (Section D.1).
 */
interface GuestTermsModalProps {
    onAccept: () => void;
    onDecline?: () => void;
}

export const GuestTermsModal: React.FC<GuestTermsModalProps> = ({ onAccept, onDecline }) => {
    const [accepted, setAccepted] = useState(false);

    // Check if already accepted in this session
    useEffect(() => {
        const alreadyAccepted = sessionStorage.getItem('dataprep_terms_accepted');
        if (alreadyAccepted === 'true') {
            onAccept();
        }
    }, [onAccept]);

    const handleAccept = () => {
        sessionStorage.setItem('dataprep_terms_accepted', 'true');
        setAccepted(true);
        onAccept();
    };

    if (accepted) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                maxWidth: '520px',
                width: '90%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4F6AFF, #7B8FFF)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '24px',
                    }}>
                        👋
                    </div>
                    <h3 style={{ color: '#1a2b6d', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                        Mode Invité — Conditions d'utilisation
                    </h3>
                </div>

                <div style={{
                    background: '#f8faff',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '24px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: '#4a5568',
                }}>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li style={{ marginBottom: '10px' }}>
                            Les données uploadées sont traitées <strong>en mémoire</strong> et supprimées définitivement à la fermeture de la session. Aucune donnée n'est conservée sur nos serveurs.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            La session expire après <strong>30 minutes</strong> d'inactivité.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            L'utilisation est limitée à un <strong>usage personnel</strong> et non commercial.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            Les résultats obtenus en mode invité ne bénéficient d'aucune garantie de <strong>reproductibilité</strong> (absence de test de non-régression).
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            Les fonctionnalités avancées (NLP, réseaux de neurones, visuels interactifs) sont <strong>réservées aux membres</strong>.
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            Limites : fichier ≤ <strong>5 MB</strong>, ≤ <strong>1 000 lignes</strong>, ≤ <strong>20 colonnes</strong>, <strong>1 fichier</strong> simultané, <strong>3 opérations/heure</strong>.
                        </li>
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleAccept}
                        style={{
                            flex: 1,
                            background: 'linear-gradient(135deg, #4F6AFF 0%, #7B8FFF 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '15px',
                            boxShadow: '0 4px 16px rgba(79, 106, 255, 0.3)',
                        }}
                    >
                        J'accepte — Continuer
                    </button>
                    {onDecline && (
                        <button
                            onClick={onDecline}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                color: '#6b7fa3',
                                border: '2px solid #e0e8ff',
                                borderRadius: '12px',
                                padding: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Créer un compte
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuestTermsModal;
