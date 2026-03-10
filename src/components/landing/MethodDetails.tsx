import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
    AlertTriangle, Database, AlertCircle, Code2, Scaling,
    Search, Scissors, Activity, ShieldAlert,
    Binary, Box, ListChecks, Star
} from 'lucide-react';

type TableData = {
    headers: string[];
    rows: string[][];
};

type DetailItem = {
    title: string;
    description?: string;
    bulletPoints?: string[];
    warning?: string;
    table?: TableData;
};

type StepDetail = {
    id: string;
    title: string;
    description: string;
    details: DetailItem[];
    globalWarning?: string;
    icon: any;
};

const DETAILED_STEPS: StepDetail[] = [
    {
        id: 'intro',
        title: 'Introduction & Règles d\'Or',
        description: 'Checklist globale du pipeline et les principes intangibles.',
        icon: Star,
        details: [
            {
                title: 'Récapitulatif des Règles d\'Or',
                table: {
                    headers: ['#', 'Règle d\'Or', 'Impact si non respectée'],
                    rows: [
                        ['1', 'Toujours faire l\'EDA AVANT de choisir une méthode d\'imputation ou de scaling', 'Méthode inadaptée → biais du modèle'],
                        ['2', 'Créer un indicateur binaire AVANT d\'imputer les MNAR', 'Signal perdu → perte d\'information critique'],
                        ['3', 'Comprendre le contexte métier AVANT de traiter un outlier', 'Suppression incorrecte → déformation de la réalité'],
                        ['4', 'Splitter AVANT tout fit de transformateur', 'Data leakage → métriques optimistes non représentatives'],
                        ['5', 'Ne jamais scaler les variables cibles cycliques sans sin/cos', 'Fausse ordinalité → perte de la continuité cyclique'],
                        ['6', 'handle_unknown=\'ignore\' sur OneHotEncoder', 'Erreur en production sur nouvelles modalités'],
                        ['7', 'Rééquilibrage uniquement sur X_train', 'Leakage → recall artificiellement élevé'],
                        ['8', 'Sauvegarder le pipeline fitté avec joblib', 'Impossibilité de reproduire les transformations en production'],
                        ['9', 'Pas de scaling obligatoire sur les modèles arbres', 'Traitement inutile, risque de déformer la réalité'],
                        ['10', 'Utiliser cross_validate() sur le pipeline complet', 'Leakage inter-folds → évaluation biaisée']
                    ]
                }
            },
            {
                title: 'Checklist globale du Pipeline',
                table: {
                    headers: ['Étape', 'Action principale'],
                    rows: [
                        ['0. Audit Initial', 'Types, EDA, doublons, colonnes inutiles'],
                        ['A. Manquants', 'Identifier type (MCAR/MAR/MNAR), imputer ou supprimer'],
                        ['B. Outliers', 'IQR / Winsor / Z-score / méthodes multivariées'],
                        ['C. Engineering', 'Dates, texte, colonnes identifiants, variables cycliques'],
                        ['D. Split', 'OBLIGATOIRE avant encodage et scaling'],
                        ['E. Encodage', 'Nominal → OHE, Ordinal → OrdinalEncoder, Cible → LabelEncoder'],
                        ['F. Scaling', 'MinMax / Standard / Robust selon distribution'],
                        ['G. Déséquilibre', 'SMOTE / undersampling / class_weight (sur train uniquement)'],
                        ['H. Pipeline', 'ColumnTransformer + fit sur train + transform sur test'],
                        ['I. Sauvegarde', 'joblib.dump() du pipeline fitté']
                    ]
                }
            }
        ]
    },
    {
        id: 'audit',
        title: 'Audit Initial',
        description: 'Point de départ obligatoire (0.1 à 0.4).',
        icon: Search,
        details: [
            {
                title: '0.1 Vérification et Correction des Types',
                description: 'Avant toute action, vérifier que chaque colonne a le bon type Python/Pandas.',
                table: {
                    headers: ['Type attendu', 'Problème fréquent', 'Correction'],
                    rows: [
                        ['int / float', 'Stocké en object (chaîne)', '.astype(float)'],
                        ['datetime', 'Stocké en float ou object', 'pd.to_datetime()'],
                        ['category', 'Stocké en object', '.astype(\'category\')'],
                        ['bool', 'Stocké en int (0/1)', '.astype(bool)']
                    ]
                }
            },
            {
                title: '0.2 Suppression des Doublons',
                bulletPoints: [
                    'Exacts : df.drop_duplicates() (toutes colonnes identiques)',
                    'Partiels : même ID, données légèrement différentes (nécessite une règle métier explicite)',
                    'Toujours inspecter les doublons avant suppression : df[df.duplicated(keep=False)]'
                ]
            },
            {
                title: '0.3 Analyse Exploratoire Minimale (EDA)',
                description: 'Sans EDA préalable, impossible de choisir la bonne méthode.',
                bulletPoints: [
                    'Distribution : df.hist(), df.boxplot()',
                    'Taux de valeurs manquantes : df.isnull().mean() * 100',
                    'Corrélations : df.corr() (indispensable pour Iterative/KNN Imputer)',
                    'Identification du type brut (nominale, ordinale, continue, texte, date)'
                ]
            },
            {
                title: '0.4 Suppression des Colonnes Non Pertinentes',
                table: {
                    headers: ['Type de colonne', 'Exemple', 'Action'],
                    rows: [
                        ['Identifiant unique', 'ID client', 'Supprimer'],
                        ['Cardinalité = nb lignes', 'Nom complet', 'Feature Engineeing ou Supprimer'],
                        ['Constante', 'Même valeur partout', 'Supprimer'],
                        ['Quasi-constante', '> 95% même valeur', 'Supprimer'],
                        ['Texte libre brut', 'Commentaires', 'NLP ou Supprimer']
                    ]
                }
            }
        ]
    },
    {
        id: 'imputation',
        title: 'Valeurs Manquantes',
        description: 'Classification et traitement des valeurs manquantes (A.1 à A.4).',
        icon: Database,
        globalWarning: 'Règle critique : Pour les MNAR, créer une colonne binaire (0/1) indiquant si la valeur était manquante AVANT imputation pour capturer le signal.',
        details: [
            {
                title: 'A.1 Classification des Valeurs Manquantes',
                table: {
                    headers: ['Type', 'Définition', 'Exemple'],
                    rows: [
                        ['MCAR', 'Manque aléatoire, indépendant', 'Panne du capteur'],
                        ['MAR', 'Dépendant d\'autres variables', 'Salaire absent si < 25 ans'],
                        ['MNAR', 'Dépendant de la valeur elle-même', 'Revenu absent car très élevé']
                    ]
                }
            },
            {
                title: 'A.2 Méthodes d\'Imputation : Tendance Centrale',
                table: {
                    headers: ['Méthode', 'Applicable si', 'Conditions'],
                    rows: [
                        ['Moyenne', 'MCAR, MAR', 'Distribution symétrique, sans outliers, % faible'],
                        ['Médiane', 'MCAR, MAR', 'Asymétrique ou avec outliers, % faible'],
                        ['Mode', 'MCAR, MAR', 'Données qualitatives, % faible'],
                        ['Constante', 'MCAR, MAR', 'Valeur métier justifiable (0, \'Absent\')']
                    ]
                }
            },
            {
                title: 'A.2 Méthodes d\'Imputation : Temporelles & Multivariées',
                bulletPoints: [
                    'Temps (FFILL / BFILL / Interp) : Données chronologiques ordonnées série temporelle.',
                    'IterativeImputer (MNAR, MAR) : Variables dépendantes, % NaN entre 5% et 50%. Sensible aux outliers.',
                    'KNNImputer (MNAR, MAR) : Colonnes corrélées, % NaN < 30%. Très coûteux en calcul (O(n²)).'
                ]
            },
            {
                title: 'A.3 Suppression (Dernier Recours)',
                warning: 'Si dépasse 40-50% ET non essentielle. Préférer supprimer des lignes plutôt que des colonnes.'
            },
            {
                title: 'A.4 Algorithme de Décision',
                bulletPoints: [
                    'Vérifier % > 50% non-critique → Supprimer colonne.',
                    'Si MNAR → Indicateur binaire + Iterative / KNN.',
                    'Si Temporel + MCAR/MAR → Interpolation / FFILL.',
                    'Si Qualitatif → Mode.',
                    'Si Asymétrique/Outliers → Médiane.',
                    'Si Symétrique strict → Moyenne.'
                ]
            }
        ]
    },
    {
        id: 'outliers',
        title: 'Valeurs Aberrantes',
        description: 'Analyse et plafonnement des données extrêmes (B.1 à B.3).',
        icon: AlertCircle,
        globalWarning: 'Comprendre le contexte métier AVANT de traiter un outlier. Un traitement automatique sans contexte peut gravement biaiser les résultats.',
        details: [
            {
                title: 'B.1 Méthodes Univariées',
                table: {
                    headers: ['Méthode', 'Distribution adaptée', 'Traitement'],
                    rows: [
                        ['IQR (Boxplot)', 'Symétrique / Légèrement Asymétrique', 'Remplacer > Q3+1.5IQR par limite (capping)'],
                        ['Winsorisation', 'Fortement Asymétrique', 'Remplacer extrêmes par percentiles 5% / 95%'],
                        ['Z-Score', 'Normale ou Quasi-Normale', 'Remplacer par moyenne si |z|>3']
                    ]
                }
            },
            {
                title: 'B.2 Méthodes Multivariées',
                description: 'Un outlier peut n\'apparaître qu\'en combinant plusieurs variables (ex: Âge 25 et Salaire 500k).',
                table: {
                    headers: ['Méthode', 'Avantages', 'Application'],
                    rows: [
                        ['Isolation Forest', 'Non paramétrique, rapide, robuste', 'Grands datasets, distribution quelconque'],
                        ['LOF (Local Outlier Factor)', 'Basé sur densité locale', 'Clusters de formes complexes'],
                        ['Elliptic Envelope', 'Statistiquement rigoureux', 'Gaussien multivarié']
                    ]
                }
            },
            {
                title: 'B.3 Règle selon le Modèle Cible',
                bulletPoints: [
                    'OBLIGATOIRE : Régression Linéaire, KNN, SVM, Réseaux de neurones, ACP.',
                    'OPTIONNEL / INUTILE : Decision Tree, Random Forest, XGBoost, LightGBM. L\'application déformerait la réalité à tort.'
                ]
            }
        ]
    },
    {
        id: 'engineering',
        title: 'Feature Engineering',
        description: 'Transformations intelligentes des variables complexes (C.1 à C.5).',
        icon: Code2,
        details: [
            {
                title: 'C.1 Identifiants et Noms',
                description: 'Supprimer ou extraire l\'essentiel. (ex: Adresse -> extraire Code Postal/Ville, Email -> extraire Domaine).'
            },
            {
                title: 'C.2 Variables Temporelles',
                description: 'Ne jamais encoder une date brute en continu.',
                bulletPoints: [
                    'Composantes : année, mois, jour, jour de la semaine...',
                    'Dérivées : jours depuis ref, weekend, férié, saison.'
                ],
                warning: 'Toujours supprimer la colonne originelle après extraction.'
            },
            {
                title: 'C.3 Variables Cycliques (Encodage Sinusoïdal)',
                bulletPoints: [
                    'Appliquer sin/cos sur la période (ex: Heure P=24, Mois P=12).',
                    'Préserve l\'information de continuité (ex: 23h proche de 0h).',
                    'Résultat : 2 colonnes générées (Sin et Cos).'
                ]
            },
            {
                title: 'C.4 Catégories à Haute Cardinalité',
                bulletPoints: [
                    '2-50 modalités : OneHotEncoder() standard.',
                    '> 50 modalités : Frequency Encoding (remplacer par nb d\'occurrences).',
                    '> 50 modalités (Supervisé) : Target Encoding (OBLIGATOIRE avec Cross-Validation).'
                ]
            },
            {
                title: 'C.5 Texte Libre (NLP)',
                bulletPoints: [
                    'TF-IDF : Statistique simple',
                    'Embeddings (Word2Vec) ou Sentence Transformers (BERT) : Sémantique complexe.'
                ]
            }
        ]
    },
    {
        id: 'split',
        title: 'Split Train/Test',
        description: 'Séparation des ensembles et règles Anti-Leakage absolues (D.1 à D.3).',
        icon: Scissors,
        globalWarning: 'Le SPLIT DOIT intervenir AVANT toute imputation, encodage ou scaling. Fitter sur l\'ensemble complet contamine le test et produit des métriques irrémédiablement fausses.',
        details: [
            {
                title: 'D.1 Ordre Obligatoire des Opérations',
                table: {
                    headers: ['N°', 'Étape'],
                    rows: [
                        ['1', 'Nettoyage basique (types, doublons)'],
                        ['2', 'Feature Engineering brut (dates, cyclique)'],
                        ['3', '✂ SPLIT ICI ✂ train_test_split()'],
                        ['4', 'fit_transform UNIQUEMENT sur X_train'],
                        ['5', 'transform sur X_test (JAMAIS re-fit !)'],
                        ['6', 'Modélisation & Évaluation']
                    ]
                }
            },
            {
                title: 'D.2/D.3 Tailles & Séries Temporelles',
                bulletPoints: [
                    'Temporel : Pas de split aléatoire ! X_train = données passées, X_test = futur.',
                    '> 100k lignes : 90/10.',
                    '< 100k lignes : 80/20 Standard.',
                    'Toujours utiliser stratify=y en classification.'
                ]
            }
        ]
    },
    {
        id: 'encoding',
        title: 'Encodage Catégorique',
        description: 'Transformation pour la consommation algorithmique (E.1 à E.2).',
        icon: Binary,
        details: [
            {
                title: 'E.1 Méthodes standard',
                table: {
                    headers: ['Variable', 'Méthode', 'Remarque'],
                    rows: [
                        ['Nominale (<50)', 'OneHotEncoder', 'Ajouter drop=\'first\' si regression linéaire'],
                        ['Ordinale', 'OrdinalEncoder', 'Passer explicitement categories=[[\'S\',\'M\']]'],
                        ['Binaire', 'BinaryEncoder ou map', 'Pas d\'OHE pour éviter redondance'],
                        ['Cible (y)', 'LabelEncoder', 'N\'apparait JAMAIS dans le pipeline X']
                    ]
                }
            },
            {
                title: 'E.2 Configurations Robustes (Production)',
                warning: 'OneHotEncoder(handle_unknown=\'ignore\') garantit l\'absence d\'erreur lors de l\'arrivée d\'une nouvelle modalité jamais vue pendant le train.'
            }
        ]
    },
    {
        id: 'scaling',
        title: 'Feature Scaling',
        description: 'Mises à l\'échelle pour la convergence et l\'espace vectoriel (F.1 à F.3).',
        icon: Scaling,
        details: [
            {
                title: 'F.1 Choisir son Scaler',
                table: {
                    headers: ['Scaler', 'Distribution / Usage'],
                    rows: [
                        ['StandardScaler', 'Gaussienne/Normale. Rend N(0,1)'],
                        ['MinMaxScaler', 'Quelconque. Rend [0, 1] ou [-1, 1].'],
                        ['RobustScaler', 'Gaussienne mais fortement polluée d\'outliers. Utilise Q1/Q3.']
                    ]
                }
            },
            {
                title: 'F.2 Quand NE PAS Scaler',
                bulletPoints: [
                    'Modèles basés sur la distance (KNN, SVM, NN) : Scaling OBLIGATOIRE.',
                    'Modèles basés sur les arbres (RandomForest, XGBoost) : Scaling OPTIONNEL/INUTILE (basés sur les seuils purs).'
                ],
                warning: 'Mettre à l\'échelle un arbre peut nuire à l\'interprétabilité sans gain de performance.'
            }
        ]
    },
    {
        id: 'smote',
        title: 'Déséquilibre / SMOTE',
        description: 'Rétablit l\'équilibre des classes de Classification (G.1 à G.2).',
        icon: Activity,
        globalWarning: 'Tout rééquilibrage SMOTE ou Undersampling ne s\'applique QUE sur le train set. Rééquilibrer avant le split introduit du leakage.',
        details: [
            {
                title: 'G.1 Niveaux d\'Alerte',
                table: {
                    headers: ['Ratio', 'Niveau', 'Impact'],
                    rows: [
                        ['60/40 - 70/30', 'Léger', 'Faible'],
                        ['80/20 - 90/10', 'Modéré', 'Surveiller recall minorité'],
                        ['> 95/5', 'Sévère', 'Traitement OBLIGATOIRE']
                    ]
                }
            },
            {
                title: 'G.2 Stratégies',
                bulletPoints: [
                    'SMOTE : Création synthétique par interpolation. dataset modéré.',
                    'RandomUnderSampler : Réduction aléatoire de la classe max. Big Data.',
                    'class_weight=\'balanced\' : Transparent et natif pour algorithmes.'
                ]
            }
        ]
    },
    {
        id: 'pipeline',
        title: 'Pipeline sklearn & Sauvegarde',
        description: 'Modélisation, Cross-Validation et Export de Production (H et I).',
        icon: Box,
        details: [
            {
                title: 'H.1 Structure ColumnTransformer',
                bulletPoints: [
                    'Num_pipeline : Imputer -> Scaler',
                    'Cat_nominal_pipeline : Imputer -> OHE(handle_unknown=\'ignore\')',
                    'Cat_ordinal_pipeline : Imputer -> OrdinalEncoder(categories)',
                    'Preprocesseur global : ColumnTransformer([num, nominal, ordinal])'
                ]
            },
            {
                title: 'H.3 Cross-Validation',
                description: 'Intégrer le pipeline entier dans la CV (). Chaque Fold réalise son propre fit.',
                warning: 'Leakage prévenu entre les sous-échantillons d\'entrainement/validation.'
            },
            {
                title: 'I.1 Export et Reproductibilité',
                bulletPoints: [
                    'Sauvegarde : joblib.dump(pipeline, "pipe.pkl")',
                    'Inférence Production : model.predict() sur flux brut',
                    'TNR (Non-régression) : Vérifier stabilité par assert allclose()'
                ]
            }
        ]
    }
];

const MethodDetails = () => {
    const [selectedStep, setSelectedStep] = useState<string>('intro');

    const activeStep = DETAILED_STEPS.find(s => s.id === selectedStep) || DETAILED_STEPS[0];

    return (
        <section id="methodes" className="section bg-gradient-to-br from-gray-50 to-white py-24 overflow-hidden">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <span className="inline-block px-4 py-1.5 bg-primary-100 text-primary rounded-full text-sm font-medium mb-4">
                        Guide méthodologique complet
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black mb-4 text-navy">Processus de Prétraitement Intelligent</h2>
                    <div className="w-24 h-1.5 bg-primary rounded-full mx-auto mb-6" />
                    <p className="text-lg text-navy-700 font-medium">
                        Découvrez la méthodologie exhaustive employée pour nettoyer, transformer et optimiser vos données.
                    </p>
                </motion.div>

                <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Sidebar navigation */}
                    <div className="lg:col-span-4 flex flex-col gap-2 relative z-10 max-h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-4">
                        {DETAILED_STEPS.map((step) => {
                            const Icon = step.icon;
                            const isActive = selectedStep === step.id;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => setSelectedStep(step.id)}
                                    className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 text-left border-2 ${isActive
                                        ? 'bg-navy text-white border-navy shadow-lg scale-[1.01]'
                                        : 'bg-white text-navy border-gray-100 hover:border-primary/30 hover:bg-primary-50'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white/10' : 'bg-primary-50 text-primary'}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-extrabold text-[15px]">{step.title}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-8 min-h-[600px] h-[700px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10 relative h-full flex flex-col overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

                                {/* Header de la section */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 border-b border-gray-100 pb-5 shrink-0">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shrink-0">
                                            <activeStep.icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl md:text-3xl font-black text-navy">{activeStep.title}</h3>
                                            <p className="text-primary font-bold text-sm">{activeStep.description}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contenu Scrollable */}
                                <div className="overflow-y-auto flex-1 pr-4 custom-scrollbar">
                                    {/* Avertissement Global Optionnel */}
                                    {activeStep.globalWarning && (
                                        <div className="mb-6 mx-1 border-l-[3px] border-blue-600 bg-blue-50 p-4 rounded-r-lg flex items-start gap-4">
                                            <ShieldAlert className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
                                            <p className="text-navy-900 text-[13px] font-semibold leading-relaxed">
                                                {activeStep.globalWarning}
                                            </p>
                                        </div>
                                    )}

                                    {/* Contenu Détaillé (Règles métiers) */}
                                    <div className="space-y-6">
                                        {activeStep.details.map((detail, idx) => (
                                            <div key={idx} className="bg-white border-2 border-gray-50 p-5 rounded-xl transition-colors hover:border-primary/20 hover:shadow-sm">
                                                <h4 className="font-extrabold text-navy-900 text-[15px] mb-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                                    {detail.title}
                                                </h4>

                                                {detail.description && (
                                                    <p className="text-[13px] text-gray-600 mb-4 ml-4 leading-relaxed font-medium">{detail.description}</p>
                                                )}

                                                {detail.bulletPoints && (
                                                    <ul className="space-y-2.5 ml-4 mb-4">
                                                        {detail.bulletPoints.map((bp, i) => (
                                                            <li key={i} className="flex items-start gap-2.5 text-[13px] text-gray-700 font-medium">
                                                                <span className="text-primary font-bold mt-0.5 shrink-0">•</span>
                                                                <span className="leading-relaxed">{bp}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}

                                                {detail.table && (
                                                    <div className="ml-4 mb-4 overflow-x-auto rounded-lg border border-gray-200">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead>
                                                                <tr className="bg-navy-50 border-b border-gray-200">
                                                                    {detail.table.headers.map((h, i) => (
                                                                        <th key={i} className="px-3 py-2 text-[12px] font-bold text-navy-800 uppercase tracking-wider">
                                                                            {h}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {detail.table.rows.map((row, i) => (
                                                                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                                        {row.map((cell, j) => (
                                                                            <td key={j} className={`px-3 py-2.5 text-[13px] text-gray-700 ${j === 0 ? 'font-semibold text-navy-700' : ''}`}>
                                                                                {cell}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {detail.warning && (
                                                    <div className="ml-4 mt-2 bg-blue-50/80 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                                                        <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                                        <span className="text-navy-800 font-medium text-[12px] leading-relaxed italic">{detail.warning}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-4" /> {/* Spacer pour le bas du scroll */}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Legend / Tip */}
                <div className="mt-12 bg-navy rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white/10 rounded-xl backdrop-blur-xl flex items-center justify-center">
                                <ListChecks className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black tracking-tight mb-1 text-white">Prêt à appliquer ces règles sur vos données ?</h4>
                                <p className="text-navy-100 text-[13px] max-w-xl font-medium leading-relaxed">
                                    L'Assistant de Modélisation respecte scrupuleusement la totalité de ce guide, en mode manuel comme en Auto-Pilote.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-primary hover:bg-primary-600 text-white px-7 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap"
                        >
                            Démarrer l'Analyse
                        </button>
                    </div>
                    {/* Decorative arcs */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />
                </div>
            </div>
        </section>
    );
};

export default MethodDetails;
