import { motion } from 'framer-motion';
import { Check, X, Shield, Zap, Building2, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { openDataBot } from '../DataBot';

const PricingCard = ({ tier, price, features, highlighted = false, icon: Icon, ctaText, onCtaClick }: any) => {
    return (
        <motion.div
            whileHover={{ y: -10 }}
            className={`relative p-8 rounded-3xl flex flex-col h-full transition-all duration-300 ${highlighted
                ? 'bg-navy-900 text-white shadow-2xl scale-105 z-10'
                : 'bg-white text-navy-900 border border-gray-100 shadow-xl'
                }`}
        >
            {highlighted && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Recommandé
                </div>
            )}

            <div className="mb-6 flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${highlighted ? 'bg-white/10' : 'bg-primary/10'}`}>
                    <Icon className={highlighted ? 'text-blue-300' : 'text-primary'} />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">{tier}</h3>
            </div>

            <div className="mb-8">
                <span className="text-4xl font-black">{price}</span>
                {price !== 'Gratuit' && price !== 'Sur mesure' && <span className="text-sm opacity-60 ml-1">/mois</span>}
            </div>

            <div className="flex-grow space-y-4 mb-8">
                {features.map((feature: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                        {feature.included ? (
                            <Check className={`h-5 w-5 mt-0.5 shrink-0 ${highlighted ? 'text-blue-400' : 'text-primary'}`} />
                        ) : (
                            <X className="h-5 w-5 mt-0.5 shrink-0 text-gray-400" />
                        )}
                        <span className={`text-sm ${feature.included ? '' : 'text-gray-400 line-through'}`}>
                            {feature.text}
                        </span>
                    </div>
                ))}
            </div>

            <button
                onClick={onCtaClick}
                className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${highlighted
                    ? 'bg-white text-navy-900 hover:bg-gray-100 shadow-lg shadow-white/10'
                    : 'bg-primary text-white hover:bg-primary-600 shadow-lg shadow-primary/20'
                    }`}
            >
                {ctaText}
            </button>
        </motion.div>
    );
};

export const Pricing = () => {
    const navigate = useNavigate();
    const { startGuestSession } = useAuth();

    const handleGuestStart = async () => {
        await startGuestSession();
        navigate('/app');
    };

    const tiers = [
        {
            tier: 'Invité',
            price: 'Gratuit',
            icon: Shield,
            ctaText: 'Essayer sans compte',
            onCtaClick: handleGuestStart,
            features: [
                { text: 'Fichier ≤ 5 MB · 1 000 lignes · 20 cols', included: true },
                { text: 'Audit + EDA de base', included: true },
                { text: 'Imputation simple (mean, médiane, mode)', included: true },
                { text: 'Encodage OHE / Ordinal', included: true },
                { text: 'Export CSV (filigrane) · Session 30 min', included: true },
                { text: 'Méthodes avancées (KNN, LOF, SMOTE)', included: false },
                { text: 'NLP · Historique · Pipeline .pkl', included: false },
            ]
        },
        {
            tier: 'Membre',
            price: 'Gratuit',
            icon: Zap,
            highlighted: true,
            ctaText: 'S\'inscrire gratuitement',
            onCtaClick: () => navigate('/register'),
            features: [
                { text: 'Données illimitées (taille, lignes, cols)', included: true },
                { text: 'NLP complet (TF-IDF, Word2Vec, BERT)', included: true },
                { text: 'Réseaux de neurones · Auto-Pilot complet', included: true },
                { text: 'Pipeline exportable (.pkl)', included: true },
                { text: 'Rapport complet · Support prioritaire', included: true },
            ]
        },
        {
            tier: 'Premium',
            price: 'Sur mesure',
            icon: Building2,
            ctaText: 'Contacter le support',
            onCtaClick: () => openDataBot('Je souhaite en savoir plus sur le plan Premium et les solutions sur mesure.'),
            features: [
                { text: 'Tout le plan Membre inclus', included: true },
                { text: 'On-premise · API dédiée · SLA 99.9%', included: true },
                { text: 'Formation d\'équipe personnalisée', included: true },
                { text: 'Intégrations (Spark, Hadoop, Airflow)', included: true },
                { text: 'Collaboration · Support 24/7 dédié', included: true },
            ]
        }
    ];

    return (
        <section id="tarifs" className="py-24 bg-gray-50">
            <div className="container mx-auto px-4 md:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block"
                    >
                        Stratégie & Plans
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold text-navy mb-6"
                    >
                        Une puissance adaptée à vos besoins
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-gray-600"
                    >
                        Commencez gratuitement et faites évoluer vos capacités au fur et à mesure que vos données grandissent.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {tiers.map((t, idx) => (
                        <PricingCard key={idx} {...t} />
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-20 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8"
                >
                    <div className="space-y-2">
                        <h4 className="text-xl font-bold text-navy">Une question ?</h4>
                        <p className="text-gray-600">Notre assistant DataBot répond instantanément à toutes vos questions sur le pipeline, les tarifs et les fonctionnalités.</p>
                    </div>
                    <button
                        onClick={() => openDataBot()}
                        className="px-8 py-4 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition-colors shrink-0 flex items-center gap-3"
                    >
                        <Bot size={20} />
                        Discuter avec DataBot
                    </button>
                </motion.div>
            </div>
        </section>
    );
};

export default Pricing;
