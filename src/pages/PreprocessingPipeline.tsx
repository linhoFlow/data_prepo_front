import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Upload, FileSpreadsheet, Trash2, AlertTriangle, Database, BarChart3, Code2, Scaling, Filter, ArrowLeft, History, LogOut, ChevronRight, X, Search, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { datasetsApi, sessionsApi } from '../services/api';
import DashboardView from '../components/dashboard/DashboardView';

// Pipeline steps
const PipelineStep = {
    UPLOAD: 0,
    OVERVIEW: 1,
    AUTO_PILOT: 2,
    DUPLICATES: 3,
    MISSING: 4,
    OUTLIERS: 5,
    ENCODING: 6,
    SCALING: 7,
    SELECTION: 8,
    DASHBOARD: 9,
} as const;

type PipelineStepType = typeof PipelineStep[keyof typeof PipelineStep];

const STEPS = [
    { id: PipelineStep.UPLOAD, name: 'Import', icon: Upload },
    { id: PipelineStep.OVERVIEW, name: 'Apercu', icon: Search },
    { id: PipelineStep.AUTO_PILOT, name: 'Mode', icon: TrendingUp },
    { id: PipelineStep.DUPLICATES, name: 'Doublons', icon: Trash2 },
    { id: PipelineStep.MISSING, name: 'Manquantes', icon: Database },
    { id: PipelineStep.OUTLIERS, name: 'Aberrantes', icon: AlertTriangle },
    { id: PipelineStep.ENCODING, name: 'Encodage', icon: Code2 },
    { id: PipelineStep.SCALING, name: 'Scaling', icon: Scaling },
    { id: PipelineStep.SELECTION, name: 'Selection', icon: Filter },
    { id: PipelineStep.DASHBOARD, name: 'Dashboard', icon: BarChart3 },
];

const PreprocessingPipeline: React.FC = () => {
    const { user, isAuthenticated, isGuest, logout, startGuestSession } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState<PipelineStepType>(PipelineStep.UPLOAD);
    const [dataset, setDataset] = useState<any | null>(null);
    const [datasetId, setDatasetId] = useState<string | null>(null);
    const [originalData, setOriginalData] = useState<any[]>([]);
    const [initialColumnInfo, setInitialColumnInfo] = useState<any[]>([]);
    const [transformations, setTransformations] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [isHistorySession, setIsHistorySession] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Ensure guest session is started if not authenticated
    React.useEffect(() => {
        if (!isAuthenticated && !isGuest) {
            startGuestSession();
        }
    }, [isAuthenticated, isGuest, startGuestSession]);

    // History
    const fetchHistory = useCallback(async () => {
        if (isAuthenticated) {
            setIsLoading(true);
            try {
                const response = await sessionsApi.getAll();
                setHistory(response.data);
            } catch (err) {
                console.error("Error fetching history", err);
            } finally {
                setIsLoading(false);
            }
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (showHistory) fetchHistory();
    }, [showHistory, fetchHistory]);

    const handleDeleteSession = useCallback(async (id: string) => {
        try {
            await sessionsApi.delete(id);
            fetchHistory();
        } catch (err) {
            alert("Erreur lors de la suppression");
        }
    }, [fetchHistory]);

    const handleSelectSession = useCallback(async (session: any) => {
        setIsLoading(true);
        try {
            const response = await sessionsApi.getOne(session.id);
            const fullData = response.data;
            // Note: In a real app, we might need to load the dataframe into the backend's active memory again
            // For now, we simulate by setting the UI state with the saved data
            setDataset({
                data: fullData.data || [],
                headers: fullData.headers || (fullData.data?.length > 0 ? Object.keys(fullData.data[0]) : []),
                rows: fullData.rowCount,
                columns: fullData.columnCount,
                columnInfo: [], // Server could provide this
            });
            setOriginalData([...(fullData.data || [])]);
            setFileName(fullData.filename);
            setTransformations(fullData.pipeline || []);
            setIsHistorySession(true);
            setCurrentStep(PipelineStep.DASHBOARD);
            setShowHistory(false);
        } catch (err) {
            alert("Erreur: Impossible de charger les données de cette session.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleFileUpload = useCallback(async (file: File) => {
        setIsLoading(true);
        try {
            console.log("Démarrage de l'upload pour:", file.name, "taille:", file.size);
            const response = await datasetsApi.upload(file);
            let info = response.data;
            console.log("Upload réussi. Analyse V3.3...");

            // Correction pour les NaN/Infinity si le serveur a envoyé du texte brut
            if (typeof info === 'string') {
                try {
                    const cleaned = info.replace(/\bNaN\b/g, "null").replace(/\bInfinity\b/g, "null");
                    info = JSON.parse(cleaned);
                } catch (e) {
                    console.warn("Échec du parsing manuel.");
                }
            }

            // Fallback d'identifiant ultra-permissif
            let actualId = info?.id || info?._id || info?.dataset_id || info?.FORCE_VERSION;

            if (!actualId && info?.data && Array.isArray(info.data)) {
                actualId = `id_auto_${Date.now()}`;
                console.warn("ID manquant, génération d'un ID auto.");
            }

            if (!info || typeof info !== 'object' || Array.isArray(info) || !actualId || !info.data) {
                console.error("Structure invalide:", info);
                throw new Error("Impossible de lire les données du serveur (Format JSON invalide).");
            }

            const resilientInfo = {
                ...info,
                id: info.id || actualId,
                dataset_id: info.dataset_id || actualId
            };

            setDataset(resilientInfo);
            setDatasetId(actualId);
            setOriginalData([...(info.data || [])]);
            setInitialColumnInfo([...(info.columnInfo || [])]);
            setFileName(file.name);
            setTransformations([]);
            setIsHistorySession(false);
            setCurrentStep(PipelineStep.OVERVIEW);
        } catch (err: any) {
            console.error("Upload error details:", err);
            let errorMsg = "Erreur inconnue lors de l'import.";

            if (err.response?.status === 401 || err.response?.status === 403) {
                errorMsg = "Votre session a expiré ou est invalide. Veuillez vous RE-CONNECTER (déconnexion puis connexion) pour continuer.";
            } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                errorMsg = "Le serveur a mis trop de temps à répondre (Timeout). Votre fichier est très gros, le traitement est peut-être toujours en cours côté serveur. Réessayez dans un moment ou avec un fichier plus petit.";
            } else if (err.response?.status === 413) {
                errorMsg = "Le fichier est trop volumineux pour le serveur (Limite 100Mo).";
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            } else if (err.message) {
                errorMsg = err.message;
            }

            alert('IMPORTATION ECHOUEE: ' + errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const applyTransformation = useCallback(async (type: string, params: any, description: string) => {
        if (!datasetId) return;
        setIsLoading(true);
        try {
            const response = await datasetsApi.process(datasetId, type, params);
            setDataset(response.data);
            setTransformations((prev) => [...prev, description]);
        } catch (err: any) {
            alert('Erreur: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    }, [datasetId]);

    const goToStep = (step: PipelineStepType) => {
        if (isHistorySession) return; // Disable navigation in history mode
        if (step <= currentStep || (step === currentStep + 1 && dataset)) {
            setCurrentStep(step);
        }
    };

    const nextStep = () => {
        if (currentStep < PipelineStep.DASHBOARD) {
            setCurrentStep((currentStep + 1) as PipelineStepType);
        }
    };

    const runAutomation = useCallback(async () => {
        if (!datasetId) return;
        setIsLoading(true);
        try {
            const response = await datasetsApi.autopilot(datasetId);
            const info = response.data;
            setDataset(info);
            if (info.transformations) {
                setTransformations(prev => [...prev, ...info.transformations]);
            }
            setCurrentStep(PipelineStep.DASHBOARD);
        } catch (err: any) {
            alert('Automation Erreur: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    }, [datasetId]);

    const handleSaveAndExport = async (format: 'csv' | 'xlsx' | 'json' | 'xml' = 'csv') => {
        if (!dataset || !datasetId) return;

        setIsLoading(true);
        try {
            await sessionsApi.create({
                filename: fileName,
                dataset_id: datasetId,
                rowCount: dataset.rows,
                columnCount: dataset.columns,
                pipeline: transformations
            });

            // Export handling - call backend
            const response = await datasetsApi.export(datasetId, format);
            const blob = new Blob([response.data], {
                type: response.headers['content-type']
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const baseName = fileName.replace(/\.[^/.]+$/, "");
            link.setAttribute('download', `preprocessed_${baseName}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            alert("Session sauvegardée et fichier exporté avec succès!");
        } catch (err: any) {
            alert("Erreur lors de la sauvegarde ou de l'export: " + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
                                <Database className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-navy text-lg">DataPrep <span className="text-primary">Pro</span></span>
                        </div>
                        {fileName && (
                            <span className="text-sm text-gray-500 hidden sm:block">
                                <ChevronRight className="h-4 w-4 inline" /> {fileName}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isAuthenticated && (
                            <>
                                <button onClick={() => setShowHistory(!showHistory)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Historique">
                                    <History className="h-5 w-5 text-gray-600" />
                                </button>
                                <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
                            </>
                        )}
                        {isGuest && !isAuthenticated && (
                            <span className="text-xs bg-primary-50 text-primary px-2.5 py-1 rounded-full font-medium border border-primary-100">
                                Mode Invite
                            </span>
                        )}
                        {isAuthenticated && (
                            <button onClick={() => { logout(); navigate('/'); }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Deconnexion">
                                <LogOut className="h-5 w-5 text-gray-600" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {/* Pipeline stepper */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-navy">Pipeline de Pretraitement</h2>
                        {dataset && (
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                {isHistorySession && (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                        <History className="h-3 w-3" /> ARCHIVE (LECTURE SEULE)
                                    </span>
                                )}
                                <span>{dataset.rows} lignes</span>
                                <span>{dataset.columns} colonnes</span>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        {/* Progress line */}
                        <div className="absolute top-6 left-[5%] right-[5%] h-0.5 bg-gray-200">
                            <motion.div
                                className="h-full bg-primary"
                                animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>

                        {/* Steps */}
                        <div className="relative flex justify-between">
                            {STEPS.map((step) => {
                                const Icon = step.icon;
                                const isComplete = step.id < currentStep;
                                const isActive = step.id === currentStep;
                                const isAccessible = step.id <= currentStep;

                                return (
                                    <button
                                        key={step.id}
                                        onClick={() => goToStep(step.id)}
                                        className={`flex flex-col items-center flex-1 ${isAccessible && !isHistorySession ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                                        disabled={!isAccessible || isHistorySession}
                                    >
                                        <div className={`step-indicator ${isComplete ? 'step-complete' : isActive ? 'step-active' : 'step-pending'}`}>
                                            {isComplete ? <CheckCircle className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                                        </div>
                                        <span className={`mt-2 text-xs font-medium ${isActive ? 'text-primary' : isComplete ? 'text-navy' : 'text-gray-400'}`}>
                                            {step.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep === PipelineStep.UPLOAD && (
                            <UploadStep onUpload={handleFileUpload} isLoading={isLoading} />
                        )}
                        {currentStep === PipelineStep.OVERVIEW && dataset && (
                            <OverviewStep dataset={dataset} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.AUTO_PILOT && (
                            <AutoPilotStep onManual={nextStep} onAuto={runAutomation} />
                        )}
                        {currentStep === PipelineStep.DUPLICATES && dataset && (
                            <DuplicatesStep dataset={dataset} onApply={applyTransformation} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.MISSING && dataset && (
                            <MissingValuesStep dataset={dataset} onApply={applyTransformation} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.OUTLIERS && dataset && (
                            <OutliersStep dataset={dataset} onApply={applyTransformation} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.ENCODING && dataset && (
                            <EncodingStep dataset={dataset} onApply={applyTransformation} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.SCALING && dataset && (
                            <ScalingStep dataset={dataset} onApply={applyTransformation} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.SELECTION && dataset && (
                            <SelectionStep dataset={dataset} onApply={applyTransformation} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.DASHBOARD && dataset && (
                            <DashboardView dataset={dataset} originalData={originalData} initialColumnInfo={initialColumnInfo} transformations={transformations} onExport={handleSaveAndExport} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* History sidebar */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        className="fixed inset-0 z-50 flex justify-end"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="absolute inset-0 bg-black/30" onClick={() => setShowHistory(false)} />
                        <motion.div
                            className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30 }}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-navy">Historique</h3>
                                    <button onClick={() => setShowHistory(false)} className="p-2 rounded-lg hover:bg-gray-100">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                {history.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">Aucun historique disponible</p>
                                ) : (
                                    <div className="space-y-3">
                                        {history.map((s) => (
                                            <div
                                                key={s.id}
                                                onClick={() => handleSelectSession(s)}
                                                className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-primary/30 hover:bg-primary-50/50 transition-all cursor-pointer group relative shadow-sm hover:shadow-md"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteSession(s.id);
                                                    }}
                                                    className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>

                                                <div className="flex items-center gap-2 mb-2 pr-8">
                                                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                                                    <span className="font-bold text-navy text-sm truncate">{s.fileName}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <History className="h-3 w-3" />
                                                        {new Date(s.date).toLocaleDateString('fr')} - {s.rowCount} lignes
                                                    </div>
                                                    <div className="flex items-center gap-1.5 font-medium text-primary">
                                                        <Code2 className="h-3 w-3" />
                                                        {s.transformations.length} transformation(s)
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// === SUB-COMPONENTS ===

// Upload Step
const UploadStep: React.FC<{ onUpload: (f: File) => void; isLoading: boolean }> = ({ onUpload, isLoading }) => {
    const [dragOver, setDragOver] = useState(false);

    return (
        <div className="bg-white rounded-2xl shadow-sm p-8">
            <h3 className="text-xl font-bold text-navy mb-6">Importer votre dataset</h3>
            <div
                className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all ${dragOver ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}
            >
                {isLoading ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-600">Analyse en cours...</p>
                    </div>
                ) : (
                    <>
                        <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-navy mb-2">Glissez-deposez votre fichier ici</p>
                        <p className="text-gray-500 mb-4 text-sm font-medium">CSV, TSV, XLS, XLSX, JSON ou XML</p>
                        <label className="btn-primary rounded-xl cursor-pointer inline-flex gap-2 px-6 py-3 shadow-lg shadow-blue-200">
                            <FileSpreadsheet className="h-5 w-5" />
                            Parcourir les fichiers
                            <input type="file" accept=".csv,.tsv,.xlsx,.xls,.json,.xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
                        </label>
                    </>
                )}
            </div>
        </div>
    );
};

// Overview Step
const OverviewStep: React.FC<{ dataset: any; onNext: () => void }> = ({ dataset, onNext }) => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-navy mb-4">Apercu du dataset</h3>

                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Lignes', value: dataset.rows.toLocaleString(), color: 'bg-blue-100 text-blue-600' },
                        { label: 'Colonnes', value: dataset.columns, color: 'bg-navy-100 text-navy' },
                        { label: 'Numeriques', value: (dataset.columnInfo || []).filter((c: any) => c.type === 'numeric').length, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Categoriques', value: (dataset.columnInfo || []).filter((c: any) => c.type === 'categorical').length, color: 'bg-primary-100 text-primary-600' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-2`}>
                                <Database className="h-5 w-5" />
                            </div>
                            <div className="text-2xl font-bold text-navy">{value}</div>
                            <div className="text-sm text-gray-500">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Column info table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="text-left p-3 font-semibold text-navy rounded-l-lg">Colonne</th>
                                <th className="text-left p-3 font-semibold text-navy">Type</th>
                                <th className="text-center p-3 font-semibold text-navy">NaN</th>
                                <th className="text-center p-3 font-semibold text-navy">NaN %</th>
                                <th className="text-center p-3 font-semibold text-navy">Uniques</th>
                                <th className="text-right p-3 font-semibold text-navy rounded-r-lg">Moyenne/Mode</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(dataset.columnInfo || []).map((col: any, i: number) => (
                                <tr key={col.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                    <td className="p-3 font-medium text-navy-800">{col.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${col.type === 'numeric' ? 'bg-blue-100 text-blue-700' : 'bg-primary-50 text-primary-700'}`}>
                                            {col.type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">{col.nullCount}</td>
                                    <td className="p-3 text-center">
                                        <span className={col.nullPercentage > 30 ? 'text-primary font-bold' : col.nullPercentage > 5 ? 'text-blue-600' : 'text-blue-400'}>
                                            {col.nullPercentage.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">{col.uniqueCount}</td>
                                    <td className="p-3 text-right text-gray-600 font-mono text-[10px]">
                                        {String(col.sampleValues?.[0] ?? '-')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Data preview */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h4 className="font-semibold text-navy mb-3">Premieres lignes du dataset</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-primary-50">
                                {(dataset.headers || []).slice(0, 10).map((h: string) => (
                                    <th key={h} className="p-2 text-left font-semibold text-primary-700 whitespace-nowrap">{h}</th>
                                ))}
                                {dataset.headers.length > 10 && <th className="p-2 text-gray-400">...</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {(dataset.data || []).slice(0, 8).map((row: any, i: number) => (
                                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                                    {(dataset.headers || []).slice(0, 10).map((h: string) => (
                                        <td key={h} className={`p-2 whitespace-nowrap ${row[h] === null || row[h] === undefined || row[h] === '' ? 'text-primary/60 italic' : ''}`}>
                                            {row[h] === null || row[h] === undefined || row[h] === '' ? 'NaN' : String(row[h]).substring(0, 30)}
                                        </td>
                                    ))}
                                    {dataset.headers.length > 10 && <td className="p-2 text-gray-400">...</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={onNext} className="btn-primary rounded-xl gap-2">
                    Continuer <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

const AutoPilotStep: React.FC<{ onManual: () => void; onAuto: () => void }> = ({ onManual, onAuto }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center space-y-8">
            <div className="space-y-3">
                <h3 className="text-2xl font-bold text-navy">Choisissez votre mode de traitement</h3>
                <p className="text-gray-600 max-w-xl mx-auto">
                    Souhaitez-vous contrôler chaque étape manuellement ou laisser notre système intelligent appliquer les meilleures pratiques automatiquement ?
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Manual Mode */}
                <button
                    onClick={onManual}
                    className="group border-2 border-gray-100 hover:border-blue-200 rounded-2xl p-6 transition-all text-left hover:bg-blue-50/50"
                >
                    <div className="w-12 h-12 bg-gray-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
                        <Search className="h-6 w-6 text-gray-500 group-hover:text-blue-600" />
                    </div>
                    <h4 className="text-lg font-bold text-navy mb-2">Mode Manuel</h4>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                        Gardez le contrôle total. Validez chaque suppression de doublon, choisissez vos méthodes d'imputation et vos scalers étape par étape.
                    </p>
                    <div className="flex items-center text-blue-600 font-bold text-sm">
                        Continuer manuellement <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                </button>

                {/* Automation Mode */}
                <button
                    onClick={onAuto}
                    className="group border-2 border-primary-100 hover:border-primary-300 rounded-2xl p-6 transition-all text-left bg-primary-50/30 hover:bg-primary-50 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-3">
                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Recommandé</span>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 group-hover:bg-primary-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
                        <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="text-lg font-bold text-navy mb-2">Mode Auto-Piloté</h4>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                        Laissez l'IA décider. Le système applique les règles optimales pour les valeurs manquantes, les outliers et le scaling en un instant.
                    </p>
                    <div className="flex items-center text-primary font-bold text-sm">
                        Lancer l'automatisation <TrendingUp className="h-4 w-4 ml-1" />
                    </div>
                </button>
            </div>
        </div>
    );
};

// Duplicates Step
const DuplicatesStep: React.FC<{ dataset: any; onApply: (t: string, p: any, d: string) => Promise<void>; onNext: () => void }> = ({ dataset, onApply, onNext }) => {
    const [detectClicked, setDetectClicked] = useState(false);

    const handleApply = async () => {
        await onApply('remove_duplicates', {}, 'Suppression des doublons');
        setDetectClicked(true);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Suppression des doublons</h3>
            <p className="text-gray-600">Identifiez et supprimez les lignes identiques pour eviter les biais dans votre analyse.</p>

            {!detectClicked ? (
                <button onClick={handleApply} className="btn-primary rounded-xl gap-2">
                    <Trash2 className="h-5 w-5" /> Supprimer les doublons
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-xl p-4 border bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-6 w-6 text-blue-600" />
                            <div>
                                <p className="font-bold text-blue-800">Doublons supprimés.</p>
                                <p className="text-sm text-gray-600">{dataset.rows} lignes restantes.</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onNext} className="btn-outline rounded-xl gap-2">
                        Continuer <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

// Missing Values Step
const MissingValuesStep: React.FC<{ dataset: any; onApply: (t: string, p: any, d: string) => Promise<void>; onNext: () => void }> = ({ dataset, onApply, onNext }) => {
    const columnsWithNaN = useMemo(() => dataset.columnInfo.filter((c: any) => c.nullCount > 0), [dataset]);
    const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());

    const handleApply = async (colName: string) => {
        const method = selectedMethods[colName] || 'mode'; // Simplified fallback
        await onApply(`impute_${method}`, { column: colName }, `${colName}: imputation par ${method.toUpperCase()}`);
        setTreatedColumns(prev => new Set(prev).add(colName));
    };

    const methods = [
        { value: 'mean', label: 'Moyenne' },
        { value: 'median', label: 'Médiane' },
        { value: 'mode', label: 'Mode' },
        { value: 'drop', label: 'Suppression' },
    ];

    if (columnsWithNaN.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
                <h3 className="text-xl font-bold text-navy">Valeurs manquantes</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                    <p className="text-blue-800 font-medium">Aucune valeur manquante detectee.</p>
                </div>
                <button onClick={onNext} className="btn-primary rounded-xl gap-2">
                    Continuer <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Traitement des valeurs manquantes</h3>
            <div className="space-y-4">
                {columnsWithNaN.map((col: any) => {
                    const current = selectedMethods[col.name] || 'mode';
                    return (
                        <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-navy">{col.name}</span>
                                <span className="text-sm font-medium text-primary">
                                    {treatedColumns.has(col.name) ? 0 : col.nullCount} ({treatedColumns.has(col.name) ? '0.0' : col.nullPercentage.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {methods.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => setSelectedMethods((prev) => ({ ...prev, [col.name]: m.value }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${current === m.value ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            {treatedColumns.has(col.name) ? (
                                <div className="text-sm text-primary font-bold">Nettoyée ✓</div>
                            ) : (
                                <button onClick={() => handleApply(col.name)} className="btn-primary rounded-lg text-sm transition-all">Appliquer</button>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">Continuer <ChevronRight className="h-5 w-5" /></button>
            </div>
        </div>
    );
};

// Outliers Step
const OutliersStep: React.FC<{ dataset: any; onApply: (t: string, p: any, d: string) => Promise<void>; onNext: () => void }> = ({ dataset, onApply, onNext }) => {
    const numericCols = useMemo(() => dataset.columnInfo.filter((c: any) => c.type === 'numeric'), [dataset]);
    const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());

    const handleApply = async (colName: string) => {
        const method = selectedMethods[colName] || 'iqr';
        // Note: backend needs to support these types
        await onApply(`treat_outliers_${method}`, { column: colName }, `${colName}: outliers traités par ${method.toUpperCase()}`);
        setTreatedColumns(prev => new Set(prev).add(colName));
    };

    const outlierMethods = [
        { value: 'iqr', label: 'IQR (Boxplot)' },
        { value: 'zscore', label: 'Z-score' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Traitement des valeurs aberrantes</h3>
            <div className="space-y-4">
                {numericCols.map((col: any) => {
                    const currentMethod = selectedMethods[col.name] || 'iqr';
                    return (
                        <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-navy">{col.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {outlierMethods.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => setSelectedMethods((prev) => ({ ...prev, [col.name]: m.value }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentMethod === m.value ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            {treatedColumns.has(col.name) ? (
                                <div className="text-sm text-primary font-bold">Traitée ✓</div>
                            ) : (
                                <button onClick={() => handleApply(col.name)} className="btn-primary rounded-lg text-sm transition-all">Appliquer</button>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">Continuer <ChevronRight className="h-5 w-5" /></button>
            </div>
        </div>
    );
};

// Encoding Step
const EncodingStep: React.FC<{ dataset: any; onApply: (t: string, p: any, d: string) => Promise<void>; onNext: () => void }> = ({ dataset, onApply, onNext }) => {
    const catCols = useMemo(() => dataset.columnInfo.filter((c: any) => c.type === 'categorical'), [dataset]);
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());

    const handleApply = async (colName: string, type: string) => {
        await onApply(`encode_${type}`, { column: colName }, `${colName}: encodage ${type.toUpperCase()}`);
        setTreatedColumns(prev => new Set(prev).add(colName));
    };

    if (catCols.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
                <h3 className="text-xl font-bold text-navy">Encodage des variables</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                    <p className="text-blue-800 font-medium">Aucune variable categorique a encoder.</p>
                </div>
                <button onClick={onNext} className="btn-primary rounded-xl gap-2">Continuer <ChevronRight className="h-5 w-5" /></button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Encodage des variables</h3>
            <div className="space-y-4">
                {catCols.map((col: any) => (
                    <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3 text-navy font-semibold">{col.name}</div>
                        <div className="flex gap-2">
                            {!treatedColumns.has(col.name) ? (
                                <>
                                    <button onClick={() => handleApply(col.name, 'onehot')} className="btn-outline text-xs px-3 py-1.5 rounded-lg">OneHot</button>
                                    <button onClick={() => handleApply(col.name, 'label')} className="btn-outline text-xs px-3 py-1.5 rounded-lg">Label</button>
                                </>
                            ) : (
                                <span className="text-primary font-bold text-sm">Encodée ✓</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">Continuer <ChevronRight className="h-5 w-5" /></button>
            </div>
        </div>
    );
};


// Scaling Step
const ScalingStep: React.FC<{ dataset: any; onApply: (t: string, p: any, d: string) => Promise<void>; onNext: () => void }> = ({ dataset, onApply, onNext }) => {
    const numericCols = useMemo(() => dataset.columnInfo.filter((c: any) => c.type === 'numeric'), [dataset]);
    const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());

    const handleApply = async (colName: string) => {
        const method = selectedMethods[colName] || 'minmax';
        await onApply(`${method}_scale`, { column: colName }, `${colName}: scaling ${method.toUpperCase()}`);
        setTreatedColumns(prev => new Set(prev).add(colName));
    };

    const scalingMethods = [
        { value: 'min_max', label: 'MinMax' },
        { value: 'standard', label: 'Standard' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Mise à l'échelle</h3>
            <div className="space-y-4">
                {numericCols.map((col: any) => {
                    const currentMethod = selectedMethods[col.name] || 'min_max';
                    return (
                        <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                            <div className="text-navy font-semibold mb-3">{col.name}</div>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {scalingMethods.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => setSelectedMethods((prev) => ({ ...prev, [col.name]: m.value }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentMethod === m.value ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            {treatedColumns.has(col.name) ? (
                                <span className="text-primary font-bold text-sm">Appliqué ✓</span>
                            ) : (
                                <button onClick={() => handleApply(col.name)} className="btn-primary rounded-lg text-sm transition-all">Appliquer</button>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">Continuer <ChevronRight className="h-5 w-5" /></button>
            </div>
        </div>
    );
};

// Selection Step
const SelectionStep: React.FC<{ dataset: any; onApply: (t: string, p: any, d: string) => Promise<void>; onNext: () => void }> = ({ dataset, onApply, onNext }) => {
    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(dataset.headers));

    const toggleCol = (c: string) => {
        setSelectedCols((prev) => {
            const next = new Set(prev);
            if (next.has(c)) next.delete(c); else next.add(c);
            return next;
        });
    };

    const handleApply = async () => {
        const cols = Array.from(selectedCols);
        await onApply('select_columns', { columns: cols }, `Selection de ${cols.length} colonnes`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-navy mb-4">Selection des caracteristiques</h3>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-navy">Colonnes selectionnees ({selectedCols.size}/{dataset.headers.length})</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                    {dataset.headers.map((h: string) => (
                        <button
                            key={h}
                            onClick={() => toggleCol(h)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCols.has(h) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 line-through'}`}
                        >
                            {h}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                <button onClick={handleApply} className="btn-primary rounded-xl gap-2">
                    <Filter className="h-5 w-5" /> Confirmer la selection
                </button>
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">
                    Dashboard <BarChart3 className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default PreprocessingPipeline;
