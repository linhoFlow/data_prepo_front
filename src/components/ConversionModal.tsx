import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu } from 'lucide-react';

type TriggerType = string;

// ─── Contextual conversion messages (Section C) ───
// On supprime les mentions de "Enterprise" pour les membres Starter/Enterprise
const TRIGGER_MESSAGES: Record<string, { title: string; message: Record<string, string> }> = {
    file_size: {
        title: 'Fichier trop volumineux',
        message: {
            guest: 'Votre fichier dépasse la limite du mode invité. Créez un compte gratuit pour traiter des fichiers sans limite.',
            starter: 'Dépassement de limite de sécurité détecté (Fichier).'
        }
    },
    rows: {
        title: 'Trop de lignes',
        message: {
            guest: 'Votre fichier dépasse 1 000 lignes. Créez un compte gratuit pour traiter des données illimitées.',
            starter: 'Dépassement de limite de sécurité détecté (Lignes).'
        }
    },
    columns: {
        title: 'Trop de colonnes',
        message: {
            guest: 'Votre dataset a plus de 20 colonnes. Créez un compte gratuit pour une analyse sans limites.',
            starter: 'Dépassement de limite de sécurité détecté (Colonnes).'
        }
    },
    rate_limit: {
        title: 'Limite atteinte',
        message: {
            guest: 'Vous avez atteint le maximum de 3 opérations par heure. Créez un compte pour travailler sans restriction.',
            starter: 'Vous avez atteint une limite de sécurité temporaire.'
        }
    },
    export_format: {
        title: 'Format premium',
        message: {
            guest: 'Exportez en Excel, JSON, XML et même Pickle sans restrictions avec un compte gratuit.',
            starter: 'Format de fichier activé.'
        }
    },
    feature_blocked: {
        title: 'Fonctionnalité Membres',
        message: {
            guest: 'Cette méthode avancée est disponible uniquement pour les membres.',
            starter: 'Fonctionnalité premium activée.'
        }
    },
    correlation_heatmap: {
        title: 'Visualisation avancée',
        message: {
            guest: 'La matrice de corrélation est réservée aux membres. Créez un compte pour visualiser les relations entre vos variables.',
            starter: 'Visualisation avancée activée.'
        }
    },
    funnel_chart: {
        title: 'Funnel chart',
        message: {
            guest: 'Le graphique funnel offre une vue avancée de vos données. Créez un compte gratuit pour y accéder.',
            starter: 'Graphique funnel activé.'
        }
    },
    nlp_tfidf: {
        title: 'NLP premium',
        message: {
            guest: 'Le traitement NLP est réservé aux membres. Créez un compte gratuit pour accéder au TF-IDF, Word2Vec et BERT.',
            starter: 'Analyse NLP avancée activée.'
        }
    },
};

const DEFAULT_MESSAGE = {
    title: 'Fonctionnalité Membres',
    message: {
        guest: 'Cette fonctionnalité est réservée aux membres. Créez un compte en quelques secondes.',
        starter: 'Fonctionnalité activée pour votre compte.'
    }
};

interface ConversionModalProps {
    trigger: TriggerType;
    currentTier: string;
    onClose: () => void;
    upgradeHint?: string;
}

export const ConversionModal: React.FC<ConversionModalProps> = ({
    trigger,
    currentTier,
    onClose,
    upgradeHint,
}) => {
    const navigate = useNavigate();

    // Correct logic: if it's not guest, it's at least starter. 
    // Enterprise is treated as the highest tier.
    const activeTier = (currentTier === 'enterprise' || currentTier === 'starter') ? 'starter' : 'guest';
    const info = TRIGGER_MESSAGES[trigger] || DEFAULT_MESSAGE;

    // If user is already on a paid tier, we don't show "only for members" messages
    const displayMessage = upgradeHint || info.message[activeTier] || info.message['guest'];

    const handleAction = () => {
        if (currentTier === 'guest') {
            navigate('/register');
            onClose();
        } else {
            // Pour les membres déjà inscrits (Starter/Enterprise), 
            // on ferme simplement car l'utilisateur veut "ignorer les restrictions"
            onClose();
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                animation: 'fadeIn 0.2s ease',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: '20px', padding: '40px',
                    maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
                    textAlign: 'center', position: 'relative',
                }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '16px', right: '16px', background: 'none',
                        border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999',
                    }}
                >
                    ✕
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: '#f0f5ff', borderRadius: '50%' }}>
                        <Cpu size={32} color="#3c5fa0" />
                    </div>
                </div>

                {/* Title */}
                <h3 style={{ color: '#1a2b6d', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }}>
                    {info.title}
                </h3>

                {/* Message */}
                <p style={{ color: '#6b7fa3', fontSize: '15px', lineHeight: 1.6, margin: '0 0 8px' }}>
                    {displayMessage}
                </p>

                <div style={{
                    display: (currentTier === 'admin' || currentTier === 'manager') ? 'none' : 'inline-block',
                    padding: '4px 12px', borderRadius: '20px',
                    background: '#f0f5ff', color: '#3c5fa0', fontSize: '12px', fontWeight: 600,
                    marginBottom: '24px',
                }}>
                    Niveau actuel : {currentTier === 'guest' ? 'Invité' : 'Membre'}
                </div>

                {/* CTA buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={handleAction}
                        style={{
                            background: 'linear-gradient(135deg, #3c5fa0 0%, #5178c0 100%)',
                            color: 'white', border: 'none', borderRadius: '12px', padding: '14px 24px',
                            fontWeight: 700, cursor: 'pointer', fontSize: '16px',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 16px rgba(60, 95, 160, 0.3)',
                        }}
                    >
                        {currentTier === 'guest' ? 'Créer un compte' : 'Continuer'}
                    </button>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', color: '#3c5fa0', border: '2px solid #3c5fa0',
                            borderRadius: '12px', padding: '12px 24px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                        }}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConversionModal;
