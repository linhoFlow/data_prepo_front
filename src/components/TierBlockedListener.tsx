import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ConversionModal from './ConversionModal';

/**
 * TierBlockedListener — Écoute l'événement global 'tier-blocked' 
 * (émis par l'intercepteur API) pour afficher le ConversionModal.
 */
export const TierBlockedListener: React.FC = () => {
    const { tier, isStaff } = useAuth();
    const [blockedData, setBlockedData] = useState<{
        trigger: string;
        upgradeHint?: string;
    } | null>(null);

    useEffect(() => {
        const handleTierBlocked = (event: any) => {
            // Ne jamais afficher de blocage pour le staff (Admin/Manager)
            if (isStaff) return;

            const { trigger, upgrade_hint } = event.detail;
            setBlockedData({ trigger, upgradeHint: upgrade_hint });
        };

        window.addEventListener('tier-blocked', handleTierBlocked);
        return () => window.removeEventListener('tier-blocked', handleTierBlocked);
    }, [isStaff]);

    if (!blockedData || isStaff) return null;

    return (
        <ConversionModal
            trigger={blockedData.trigger}
            currentTier={tier}
            upgradeHint={blockedData.upgradeHint}
            onClose={() => setBlockedData(null)}
        />
    );
};

export default TierBlockedListener;
