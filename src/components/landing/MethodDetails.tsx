import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Info, AlertTriangle, Database, AlertCircle, Code2, Scaling, ArrowRight } from 'lucide-react';

type Method = {
    id: number;
    name: string;
    conditions: string[];
    warnings?: string[];
    type: 'imputation' | 'suppression' | 'advanced';
};

const simpleImputation: Method[] = [
    { id: 1, name: 'Imputation par la moyenne', conditions: ['Distribution symetrique (gaussienne)', 'Pas de valeurs aberrantes significatives', 'Applicable sur MCAR et MAR'], type: 'imputation' },
    { id: 2, name: 'Imputation par la mediane', conditions: ['Distribution asymetrique ou presence d\'outliers', 'Total de NaN faible (< 5-10%)', 'Applicable sur MCAR et MAR'], type: 'imputation' },
    { id: 3, name: 'Imputation par le mode', conditions: ['Variables qualitatives (categories)', 'Total de NaN faible', 'Applicable sur MCAR et MAR'], type: 'imputation' },
    { id: 4, name: 'Imputation par constante', conditions: ['Remplacer par une valeur fixe (ex: 0, "Unknown")', 'Justification metier requise', 'Applicable sur MCAR et MAR'], type: 'imputation' },
    { id: 5, name: 'BFILL / FFILL', conditions: ['Donnees de type series temporelles', 'Dependance temporelle forte', 'Applicable sur MCAR et MAR'], type: 'imputation' },
    { id: 6, name: 'Interpolation lineaire', conditions: ['Series temporelles avec tendance lineaire', 'Pas de sauts brutaux dans les donnees', 'Applicable sur MCAR et MAR'], type: 'imputation' },
];

const advancedImputation: Method[] = [
    { id: 7, name: 'IterativeImputer (MICE)', conditions: ['Variables presentent des dependances multivariees', 'Pourcentage de NaN significatif (jusqu\'a 50%)', 'Modelise chaque colonne en fonction des autres', 'Applicable sur MAR et MNAR'], warnings: ['Couteux en calcul', 'Sensible aux relations non-lineaires'], type: 'advanced' },
    { id: 8, name: 'KNNImputer', conditions: ['Observations similaires ont des valeurs proches', 'Necessite un scaling prealable des donnees', 'Efficace pour les relations locales complexes', 'Applicable sur MAR et MNAR'], warnings: ['Tres lent sur de gros datasets (> 10k lignes)'], type: 'advanced' },
    { id: 9, name: 'Groupes Temporels', conditions: ['Saisonalite marquee', 'Remplissage par la moyenne du meme groupe (ex: meme mois)', 'Donnees structurees dans le temps'], type: 'advanced' },
];

const suppressionMethods: Method[] = [
    { id: 10, name: 'Supprimer uniquement les NaN', conditions: ['NaN eparpilles sur peu de lignes', 'Perte d\'information acceptable'], type: 'suppression' },
    { id: 11, name: 'Supprimer les lignes', conditions: ['Lignes avec plus de 70% de valeurs manquantes', 'Le reste du dataset reste representatif'], type: 'suppression' },
    { id: 12, name: 'Supprimer les colonnes', conditions: ['Colonnes avec plus de 40-50% de NaN', 'Variable non critique pour l\'analyse'], type: 'suppression' },
];

const outlierMethods = [
    { id: 1, name: 'Boxplot (IQR)', description: 'Distribution symetrique ou legerement asymetrique', conditions: ['Donnees numeriques continues', 'Remplace par les bornes [Q1-1.5IQR, Q3+1.5IQR]'], warnings: ['Moins appropriee pour des distributions tres asymetriques'] },
    { id: 2, name: 'Winsorisation', description: 'Distribution asymetrique', conditions: ['Limite les valeurs extremes aux percentiles (ex: 1% et 99%)', 'Garde l\'information de variance sans les pics de bruit'], warnings: ['Peut masquer des realites metier extremes'] },
    { id: 3, name: 'Z-score', description: 'Distribution normale uniquement', conditions: ['Necessite une distribution gaussienne stricte', 'Seuil standard a +/- 3 ecarts-types'], warnings: ['Inefficace sur les distributions non-normales'] },
];

const encodingMethods = [
    { id: 1, name: 'OneHotEncoder', target: 'Variables nominales', description: ' Cree une colonne par categorie. Ideal pour < 15 categories.' },
    { id: 2, name: 'OrdinalEncoder', target: 'Variables ordinales', description: 'Assigne un rang numerique respectant l\'ordre logique.' },
    { id: 3, name: 'LabelEncoder', target: 'Variable cible (Y)', description: 'Transforme les labels de sortie en entiers.' },
];

const scalingMethods = [
    { id: 1, name: 'MinMaxScaler', condition: 'Donnees NON gaussiennes', warning: 'Tres sensible aux outliers', range: '[0, 1]' },
    { id: 2, name: 'StandardScaler', condition: 'Donnees gaussiennes', warning: 'Suppose une moyenne de 0', range: 'Center & Scale' },
    { id: 3, name: 'RobustScaler', condition: 'Presence d\'outliers', warning: 'Base sur les quantiles', range: 'Resiste au bruit' },
];

const TABS = [
    { id: 'missing', label: 'Valeurs manquantes', icon: Database, count: 12 },
    { id: 'outliers', label: 'Valeurs aberrantes', icon: AlertCircle, count: 3 },
    { id: 'encoding', label: 'Encodage', icon: Code2, count: 3 },
    { id: 'scaling', label: 'Feature Scaling', icon: Scaling, count: 3 },
];

const MISSING_SUBTABS = [
    { id: 'simple', label: 'Imputation simple' },
    { id: 'advanced', label: 'Imputation avancee' },
    { id: 'drop', label: 'Suppression' },
];

const MethodDetails = () => {
    const [activeTab, setActiveTab] = useState('missing');
    const [activeSubTab, setActiveSubTab] = useState('simple');

    return (
        <section id="methodes" className="section bg-gradient-to-br from-gray-50 to-white py-24">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary rounded-full text-sm font-medium mb-4">
                        Guide methodologique
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 text-navy">Methodes et conditions d'utilisation</h2>
                    <div className="w-20 h-1 bg-primary rounded-full mx-auto mb-6" />
                    <p className="text-lg text-navy-700">
                        Selectionnez une categorie pour decouvrir les bonnes pratiques et conditions d'application.
                    </p>
                </motion.div>

                <div className="max-w-5xl mx-auto">
                    {/* Main Tabs Navigation */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-primary-50 hover:text-primary'}`}
                                >
                                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-primary'}`} />
                                    <span className="font-bold text-sm whitespace-nowrap">{tab.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Sub-Tabs for Missing Values (Conditional Rendering) */}
                    {activeTab === 'missing' && (
                        <div className="flex justify-center gap-4 mb-10">
                            {MISSING_SUBTABS.map((sub) => {
                                const isActive = activeSubTab === sub.id;
                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => setActiveSubTab(sub.id)}
                                        className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${isActive ? 'bg-navy text-white border-navy shadow-md' : 'bg-white text-navy border-navy/20 hover:border-navy/40'}`}
                                    >
                                        {sub.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab + activeSubTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Missing Values Content */}
                            {activeTab === 'missing' && (
                                <>
                                    <div className="bg-primary-50 border border-primary-100 rounded-2xl p-5 mb-8 text-center">
                                        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-primary font-bold text-sm">
                                            <span>Traiter les valeurs manquantes</span>
                                            <ArrowRight className="h-4 w-4 hidden md:block" />
                                            <div className="flex gap-2 text-[10px] uppercase">
                                                <span className="px-2 py-0.5 bg-white rounded border border-primary/20">MCAR</span>
                                                <span className="px-2 py-0.5 bg-white rounded border border-primary/20">MAR</span>
                                                <span className="px-2 py-0.5 bg-white rounded border border-primary/20">MNAR</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(activeSubTab === 'simple' ? simpleImputation : activeSubTab === 'advanced' ? advancedImputation : suppressionMethods).map((m) => (
                                            <div key={m.id} className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow ${m.type === 'suppression' ? 'border-primary-100' : 'border-gray-100'}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${m.type === 'suppression' ? 'bg-primary-50 text-primary' : 'bg-primary-50 text-primary'}`}>
                                                        {m.id}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="font-bold text-navy-800 text-sm">{m.name}</h4>
                                                            {m.type === 'suppression' && <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full">Precaution</span>}
                                                        </div>
                                                        <ul className="space-y-1.5">
                                                            {m.conditions.map((c, i) => (
                                                                <li key={i} className="flex items-start gap-2 text-[13px] text-gray-600">
                                                                    <Info className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                                                                    <span>{c}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        {m.warnings && (
                                                            <div className="mt-3 flex items-start gap-2 text-[11px] text-primary-700 bg-primary-50 rounded-lg p-2 border border-primary-100">
                                                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                                                <span>{m.warnings.join('. ')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {activeTab === 'outliers' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {outlierMethods.map((m) => (
                                        <div key={m.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center mb-4 font-bold">
                                                {m.id}
                                            </div>
                                            <h4 className="font-bold text-navy-800 text-lg mb-1">{m.name}</h4>
                                            <p className="text-sm text-primary font-bold mb-4">{m.description}</p>
                                            <ul className="space-y-2">
                                                {m.conditions.map((c, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                                        <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                                                        <span>{c}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'encoding' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                    {encodingMethods.map((m) => (
                                        <div key={m.id} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                                                {m.id}
                                            </div>
                                            <h4 className="font-bold text-navy text-xl mb-1">{m.name}</h4>
                                            <p className="text-xs text-primary font-bold uppercase tracking-wider mb-4 px-3 py-1 bg-primary-50 rounded-full inline-block">
                                                {m.target}
                                            </p>
                                            <p className="text-gray-600 text-sm leading-relaxed">{m.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'scaling' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {scalingMethods.map((m) => (
                                        <div key={m.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col">
                                            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center mb-4 font-bold">
                                                {m.id}
                                            </div>
                                            <h4 className="font-bold text-navy-800 text-lg mb-4">{m.name}</h4>
                                            <div className="space-y-4 flex-1">
                                                <div className="bg-gray-50 rounded-xl p-3">
                                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Condition</span>
                                                    <span className="text-sm text-navy-700 font-medium">{m.condition}</span>
                                                </div>
                                                <div className="bg-primary-50 rounded-xl p-3">
                                                    <span className="block text-[10px] font-bold text-primary-400 uppercase tracking-tighter mb-1">Plage</span>
                                                    <span className="text-sm text-primary font-bold">{m.range}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Info */}
                    <div className="mt-16 bg-navy text-white rounded-2xl p-8 relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                                <AlertTriangle className="h-8 w-8 text-primary-300" />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold mb-2 text-white">Conseil d'expert</h4>
                                <p className="text-navy-100 text-sm max-w-2xl leading-relaxed">
                                    Plus vous transformez vos donnees (imputation, scaling), plus vous modifiez la realite du signal initial. Testez toujours vos modeles avec et sans transformations avancées pour valider l'impact.
                                </p>
                            </div>
                        </div>
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MethodDetails;
