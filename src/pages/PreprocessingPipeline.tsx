import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, Upload, FileSpreadsheet, Trash2, AlertTriangle,
    Database, BarChart3, Code2, ArrowLeft,
    History, LogOut, ChevronRight, X, Search, TrendingUp,
    Scissors, Activity, ArrowDown, PlusCircle, Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { datasetsApi, sessionsApi } from '../services/api';
import DashboardView from '../components/dashboard/DashboardView';

// Pipeline steps - V8.0 POLARS COMPLIANCE VERSION
const PipelineStep = {
    UPLOAD: 0,
    OVERVIEW: 1,
    CONFIG: 2,
    AUDIT_INITIAL: 3,   // Section 0
    IMPUTATION: 4,      // Section A
    OUTLIERS: 5,        // Section B
    ENGINEERING: 6,     // Section C
    SPLIT: 7,           // Section D
    SMOTE: 8,           // Section G
    DASHBOARD: 9,       // Result (H)
} as const;

type PipelineStepType = typeof PipelineStep[keyof typeof PipelineStep];

const STEPS = [
    { id: PipelineStep.UPLOAD, name: 'Import', icon: Upload },
    { id: PipelineStep.OVERVIEW, name: 'Analyse', icon: Search },
    { id: PipelineStep.CONFIG, name: 'Objectifs', icon: TrendingUp },
    { id: PipelineStep.AUDIT_INITIAL, name: 'Audit', icon: Trash2 },
    { id: PipelineStep.IMPUTATION, name: 'Imputation', icon: Database },
    { id: PipelineStep.OUTLIERS, name: 'Aberrantes', icon: AlertTriangle },
    { id: PipelineStep.ENGINEERING, name: 'Ingénierie', icon: Code2 },
    { id: PipelineStep.SPLIT, name: 'Séparation', icon: Scissors },
    { id: PipelineStep.SMOTE, name: 'Balançage', icon: Activity },
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
    useEffect(() => {
        if (!isAuthenticated && !isGuest) {
            startGuestSession();
        }
    }, [isAuthenticated, isGuest, startGuestSession]);

    // Restore state from sessionStorage on mount
    useEffect(() => {
        const savedId = sessionStorage.getItem('current_dataset_id');
        const savedName = sessionStorage.getItem('current_file_name');
        const savedStep = sessionStorage.getItem('current_step');

        if (savedId) setDatasetId(savedId);
        if (savedName) setFileName(savedName);
        if (savedStep) setCurrentStep(parseInt(savedStep) as PipelineStepType);

        // If we have an ID but no data, we might need to re-fetch basic info
        // For now, we rely on the fact that if they refresh, 
        // they might need to re-upload or we could try to re-load from a "cache"
        // But the most common case is losing the ID for the export fallback.
    }, []);

    // Persist state to sessionStorage
    useEffect(() => {
        if (datasetId) sessionStorage.setItem('current_dataset_id', datasetId);
        if (fileName) sessionStorage.setItem('current_file_name', fileName);
        if (currentStep !== PipelineStep.UPLOAD) sessionStorage.setItem('current_step', currentStep.toString());
    }, [datasetId, fileName, currentStep]);

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

    // Auto-restore data from backend if we have an ID but no table data
    useEffect(() => {
        if (datasetId && !dataset && !isLoading) {
            const restoreData = async () => {
                setIsLoading(true);
                try {
                    console.log("[RESTORE] Tentative de récupération des données pour:", datasetId);
                    const response = await datasetsApi.getOne(datasetId);
                    const data = response.data;
                    setDataset({
                        data: data.data || [],
                        headers: data.headers || [],
                        rows: data.rows || 0,
                        columns: data.columns || 0,
                        columnInfo: data.columnInfo || []
                    });
                    setOriginalData([...(data.data || [])]);
                    setInitialColumnInfo(data.columnInfo || []);
                    setFileName(data.filename || sessionStorage.getItem('current_file_name') || '');
                    setTransformations(data.pipeline || []);
                } catch (err) {
                    console.error("[RESTORE] Échec de la récupération:", err);
                    // Si le dataset n'existe plus côté serveur, on reset
                    handleResetSession();
                } finally {
                    setIsLoading(false);
                }
            };
            restoreData();
        }
    }, [datasetId]);

    const handleResetSession = useCallback(() => {
        sessionStorage.removeItem('current_dataset_id');
        sessionStorage.removeItem('current_file_name');
        sessionStorage.removeItem('current_step');
        setDatasetId(null);
        setDataset(null);
        setOriginalData([]);
        setFileName('');
        setCurrentStep(PipelineStep.UPLOAD);
        setIsHistorySession(false);
        setTransformations([]);
        console.log("[RESET] Session réinitialisée");
    }, []);

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
            setDatasetId(fullData.dataset_id || session.dataset_id || session.id);
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
            console.log("Upload réussi. Analyse V8.0-POLARS...");

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
            // Les messages d'erreur ont été supprimés à la demande de l'utilisateur
        } finally {
            setIsLoading(false);
        }
    }, []);

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

    const runAutomation = useCallback(async (objective?: string, algorithm?: string | string[], nlp?: string) => {
        if (!datasetId) return;
        setIsLoading(true);
        try {
            // Start the actual backend process
            const response = await datasetsApi.autopilot(datasetId, {
                objective,
                algorithm,
                nlp,
                is_guest: isGuest
            });
            const info = response.data;

            // SIMULATED PROGRESSION for "WOW" effect and transparency
            const stepsToAnimate = [
                PipelineStep.AUDIT_INITIAL,
                PipelineStep.IMPUTATION,
                PipelineStep.OUTLIERS,
                PipelineStep.ENGINEERING,
                PipelineStep.SPLIT,
                PipelineStep.SMOTE
            ];

            for (const step of stepsToAnimate) {
                setCurrentStep(step as PipelineStepType);
                await new Promise(r => setTimeout(r, 800)); // Smooth transition
            }

            setDataset(info);
            if (info.transformations) {
                setTransformations(prev => [...prev, ...info.transformations]);
            }
            setCurrentStep(PipelineStep.DASHBOARD);
        } catch (err: any) {
            console.error("Automation error:", err);
            // Don't show alert for 429/403 — the API interceptor already triggers
            // the ConversionModal ("Limite atteinte") via the tier-blocked event
            const status = err.response?.status;
            if (status !== 429 && status !== 403) {
                alert('Automation Erreur: ' + (err.response?.data?.message || err.message));
            }
        } finally {
            setIsLoading(false);
        }
    }, [datasetId]);

    const handleSaveAndExport = async (format: 'csv' | 'xlsx' | 'json' | 'xml' = 'csv') => {
        if (!dataset || !datasetId) return;
        setIsLoading(true);

        try {
            // Sauvegarder la session (utilisateurs authentifiés uniquement)
            if (isAuthenticated && !isGuest && user) {
                try {
                    await sessionsApi.create({
                        filename: fileName || 'dataset_export',
                        dataset_id: datasetId,
                        rowCount: dataset.rows || 0,
                        columnCount: dataset.columns || 0,
                        pipeline: transformations || []
                    });
                } catch (sessionErr) {
                    console.warn("[EXPORT] Session save failed (non-blocking):", sessionErr);
                }
            }

            const cleanBaseName = fileName
                ? fileName.replace(/\.[^/.]+$/, "")
                : `donnees_pretraitees`;

            console.log(`[EXPORT] Starting export — dataset: ${datasetId}, format: ${format}`);

            // ── Appel API avec responseType: 'blob' ──
            const response = await datasetsApi.export(datasetId, format, cleanBaseName);

            // ── Extraction du nom de fichier ──
            const disposition = response.headers['content-disposition'] || '';
            const customHeader = response.headers['x-suggested-filename'] || '';
            let downloadFileName = `${cleanBaseName}.${format}`;

            if (customHeader) {
                downloadFileName = customHeader;
            } else {
                const rfcMatch = disposition.match(/filename\*=UTF-8''([^;\s]+)/i);
                const simpleMatch = disposition.match(/filename="?([^";\n]+)"?/i);
                if (rfcMatch?.[1]) downloadFileName = decodeURIComponent(rfcMatch[1]);
                else if (simpleMatch?.[1]) downloadFileName = simpleMatch[1].trim();
            }

            console.log(`[EXPORT] Resolved filename: "${downloadFileName}"`);

            // ── Vérifier que c'est bien un Blob ──
            const blob = response.data instanceof Blob
                ? response.data
                : new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' });

            // ── Déclenchement du téléchargement ──
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = downloadFileName;   // ← doit être AVANT appendChild + click
            anchor.style.display = 'none';
            document.body.appendChild(anchor);    // ← requis pour Firefox
            anchor.click();

            console.log(`[EXPORT] Click triggered for: "${anchor.download}"`);

            // Nettoyage différé (laisser le temps au téléchargement de démarrer)
            setTimeout(() => {
                document.body.removeChild(anchor);
                URL.revokeObjectURL(url);
            }, 2000);

            toast.success(`Exporté : ${downloadFileName}`);

        } catch (err: any) {
            console.error("[EXPORT ERROR]", err);

            // Si la réponse blob contient un JSON d'erreur
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    toast.error("Export échoué : " + (json.message || json.error || text));
                    return;
                } catch { /* pas du JSON */ }
            }

            const msg = err.response?.data?.message || err.message || "Erreur inconnue";
            toast.error("Échec de l'exportation : " + msg);
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
                            <button
                                onClick={handleResetSession}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-primary hover:bg-primary-50 transition-all font-bold text-sm border border-primary-100"
                                title="Nouvelle analyse"
                            >
                                <PlusCircle className="h-4 w-4" />
                                <span className="hidden md:inline">Nouveau</span>
                            </button>
                        )}
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

                    <div className="overflow-x-auto custom-scrollbar -mx-4 px-4 pb-2">
                        <div className="relative min-w-[800px] mt-4">
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
                        {currentStep === PipelineStep.CONFIG && (
                            <AutoPilotStep onAuto={runAutomation} />
                        )}
                        {(currentStep >= PipelineStep.AUDIT_INITIAL && currentStep <= PipelineStep.SMOTE) && (
                            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center justify-center space-y-8 min-h-[400px]">
                                <div className="relative">
                                    <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Database className="h-8 w-8 text-primary animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center space-y-3">
                                    <h3 className="text-2xl font-bold text-navy">Auto-Pilot en cours...</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto">
                                        Notre IA applique les protocoles de préparation V8.0 sur votre dataset.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    className="w-2 h-2 bg-primary rounded-full"
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xs font-bold text-primary uppercase tracking-widest">
                                            {STEPS[currentStep].name}
                                        </span>
                                    </div>
                                </div>
                            </div>
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
                                                    <span className="font-bold text-navy text-sm truncate">{s.filename || s.fileName || s.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <History className="h-3 w-3" />
                                                        {new Date(s.created_at || s.date).toLocaleDateString('fr')} - {s.rowCount || 0} lignes
                                                    </div>
                                                    <div className="flex items-center gap-1.5 font-medium text-primary">
                                                        <Code2 className="h-3 w-3" />
                                                        {(s.pipeline || s.transformations)?.length || 0} transformation(s)
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
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-8">
            <h3 className="text-xl font-bold text-navy mb-6">Importer votre dataset</h3>
            <div
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-16 text-center transition-all ${dragOver ? 'border-primary bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
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
    const bottomRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="space-y-6 pb-20">
            {/* FAB: Scroll to Bottom */}
            <button
                onClick={scrollToBottom}
                className="fixed bottom-8 right-8 z-[100] bg-primary text-white p-4 rounded-full shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center animate-bounce border-4 border-white"
                style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.2))' }}
                title="Aller en bas"
            >
                <ArrowDown className="h-6 w-6" />
            </button>


            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-navy mb-4">Apercu du dataset</h3>

                {/* KPI cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Lignes', value: dataset.rows.toLocaleString(), color: 'bg-blue-100 text-blue-600' },
                        { label: 'Colonnes', value: dataset.columns, color: 'bg-navy-100 text-navy' },
                        { label: 'Numeriques', value: (dataset.columnInfo || []).filter((c: any) => c.type === 'numeric').length, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Categoriques', value: (dataset.columnInfo || []).filter((c: any) => c.type === 'categorical').length, color: 'bg-primary-100 text-primary-600' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-row items-center gap-4 sm:flex-col sm:items-start sm:gap-2">
                            <div className={`w-10 h-10 rounded-xl ${color} flex-shrink-0 flex items-center justify-center mb-0 sm:mb-2`}>
                                <Database className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xl font-bold text-navyLeading-tight">{value}</div>
                                <div className="text-sm text-gray-500">{label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Column info table */}
                <div className="overflow-x-auto border border-gray-100 rounded-xl custom-scrollbar">
                    <div className="min-w-[800px]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-50 uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="text-left p-3 font-black text-navy">Colonne</th>
                                    <th className="text-left p-3 font-black text-navy">Type</th>
                                    <th className="text-center p-3 font-black text-navy">NaN</th>
                                    <th className="text-center p-3 font-black text-navy">NaN %</th>
                                    <th className="text-center p-3 font-black text-navy">Uniques</th>
                                    <th className="text-right p-3 font-black text-navy">Diagnostic & Action</th>
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
                                        <td className="p-3 text-right">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight shadow-sm border ${col.severity === 'warning' ? 'bg-[#0A2647] text-white border-navy-900' : // Bleu Navy
                                                col.severity === 'danger' ? 'bg-blue-400 text-white border-blue-500' :   // Bleu moins intense
                                                    'bg-blue-50 text-blue-600 border-blue-100'                                // Bleu Clair (Info/Success)
                                                }`}>
                                                {col.severity === 'danger' && <AlertTriangle className="h-3 w-3" />}
                                                {col.severity === 'success' && <CheckCircle className="h-3 w-3" />}
                                                {col.severity === 'info' && <Database className="h-3 w-3" />}
                                                {col.diagnostic}
                                            </div>
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
                    <div className="overflow-x-auto border border-gray-100 rounded-xl custom-scrollbar">
                        <div className="min-w-[1000px]">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 z-10 bg-primary-50">
                                    <tr>
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

                    <div className="flex justify-end pt-6" ref={bottomRef}>
                        <button onClick={onNext} className="btn-primary rounded-xl gap-2 shadow-lg shadow-blue-200 px-8 py-3">
                            Continuer <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AutoPilotStep: React.FC<{
    onAuto: (obj: string, algos: string[], nlp: string) => void
}> = ({ onAuto }) => {
    const { isGuest } = useAuth();
    const navigate = useNavigate();
    const [objective, setObjective] = useState('classification');
    const [selectedAlgos, setSelectedAlgos] = useState<string[]>(['auto']);
    const [nlpMode, setNlpMode] = useState('none');
    const [showBlockedModal, setShowBlockedModal] = useState<string | null>(null);
    const [showProSoon, setShowProSoon] = useState(false);

    // Features bloquées uniquement pour les invités (Guest)
    const GUEST_BLOCKED_ALGOS = ['knn', 'nn', 'linear'];

    // Groupes mutuellement exclusifs
    const TREE_GROUP = [
        { id: 'rf', name: 'Random Forest / Arbres', desc: 'Robuste, pas de scaling requis' },
        { id: 'xgboost', name: 'XGBoost / Gradient Boosting', desc: 'Haute performance, pas de scaling' },
    ];
    const DISTANCE_GROUP = [
        { id: 'knn', name: 'KNN / SVM', desc: 'Basé sur la distance (Scaling activé)' },
        { id: 'nn', name: 'Réseaux de Neurones', desc: 'Complexe (Scaling + Outliers activés)' },
        { id: 'linear', name: 'Modèles Linéaires', desc: 'Simple et rapide (Scaling activé)' },
    ];

    const TREE_IDS = TREE_GROUP.map(a => a.id);
    const DISTANCE_IDS = DISTANCE_GROUP.map(a => a.id);

    const getActiveGroup = (algos: string[]): 'none' | 'tree' | 'distance' => {
        if (algos.includes('auto') || algos.length === 0) return 'none';
        if (algos.some(a => TREE_IDS.includes(a))) return 'tree';
        if (algos.some(a => DISTANCE_IDS.includes(a))) return 'distance';
        return 'none';
    };

    const activeGroup = getActiveGroup(selectedAlgos);

    const toggleAlgo = (id: string) => {
        if (id === 'auto') {
            setSelectedAlgos(['auto']);
            return;
        }

        // Bloquer les algos selon le tier
        if (isGuest && GUEST_BLOCKED_ALGOS.includes(id)) {
            setShowBlockedModal('feature_blocked');
            return;
        }

        const clickedGroup = TREE_IDS.includes(id) ? 'tree' : 'distance';

        setSelectedAlgos(prev => {
            let next = prev.filter(a => a !== 'auto');
            const currentGroup = getActiveGroup(next);
            if (currentGroup !== 'none' && currentGroup !== clickedGroup) {
                next = [];
            }
            if (next.includes(id)) {
                const filtered = next.filter(a => a !== id);
                return filtered.length === 0 ? ['auto'] : filtered;
            }
            return [...next, id];
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center space-y-4">
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-navy">Configuration du Modèle</h3>
                <p className="text-xs text-gray-500 max-w-xl mx-auto">
                    Optimisez votre pipeline selon vos besoins métier.
                </p>
            </div>

            <div className="max-w-2xl mx-auto">
                <div className="group border-2 border-blue-100 hover:border-blue-300 rounded-xl p-5 transition-all text-left bg-gradient-to-br from-blue-50/10 to-transparent hover:from-blue-50/20 relative flex flex-col shadow-sm border-b-4 border-b-blue-200">
                    <div className="absolute top-0 right-0 p-3">
                        <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">Auto-Pilot Active</span>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue/20">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-navy">Assistant de Modélisation</h4>
                            <p className="text-[10px] text-gray-500">Optimisation multi-algo intelligente</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6 bg-white/40 p-4 rounded-xl border border-white/60 backdrop-blur-sm">
                        <div>
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-3 ml-1 opacity-70">1. Objectif Business</label>
                            <select
                                value={objective}
                                onChange={(e) => setObjective(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all cursor-pointer font-medium"
                            >
                                <option value="classification">Classification (Prédire une catégorie)</option>
                                <option value="regression">Régression (Prédire une valeur numérique)</option>
                                <option value="clustering">Clustering (Identifier des segments / groupes)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black text-blue-700 uppercase tracking-widest mb-2 ml-1 opacity-70">2. Algorithmes Ciblés (Sélection par Famille)</label>

                            {/* Auto-Sélection */}
                            <button
                                onClick={() => toggleAlgo('auto')}
                                className={`w-full text-left p-3 rounded-xl border-2 transition-all mb-3 ${selectedAlgos.includes('auto') ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-100 bg-white hover:border-blue-200'}`}
                            >
                                <div className="font-bold text-sm text-navy">✨ Auto-Sélection Intelligente</div>
                                <div className="text-[10px] text-gray-400">Choix automatique de l'algorithme optimal</div>
                            </button>

                            {/* Groupe A — Arbres */}
                            <div className={`mb-3 rounded-xl border-2 p-3 transition-all ${activeGroup === 'tree' ? 'border-blue-300 bg-blue-50/30' : activeGroup === 'distance' ? 'border-gray-100 bg-gray-50/50 opacity-50' : 'border-gray-100 bg-white'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Famille Arbres — Pas de Scaling</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {TREE_GROUP.map(algo => (
                                        <button
                                            key={algo.id}
                                            onClick={() => toggleAlgo(algo.id)}
                                            disabled={activeGroup === 'distance'}
                                            className={`text-left p-3 rounded-xl border-2 transition-all ${selectedAlgos.includes(algo.id) ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-100 bg-white hover:border-blue-100'} ${activeGroup === 'distance' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <div className="font-bold text-sm text-navy">{algo.name}</div>
                                            <div className="text-[10px] text-gray-400 truncate">{algo.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Groupe B — Distance */}
                            <div className={`rounded-xl border-2 p-3 transition-all ${activeGroup === 'distance' ? 'border-blue-300 bg-blue-50/30' : activeGroup === 'tree' ? 'border-gray-100 bg-gray-50/50 opacity-50' : 'border-gray-100 bg-white'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Famille Distance — Scaling Activé</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {DISTANCE_GROUP.map(algo => (
                                        <button
                                            key={algo.id}
                                            onClick={() => toggleAlgo(algo.id)}
                                            disabled={activeGroup === 'tree'}
                                            className={`text-left p-3 rounded-xl border-2 transition-all ${selectedAlgos.includes(algo.id) ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-100 bg-white hover:border-blue-200'} ${activeGroup === 'tree' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <div className="font-bold text-sm text-navy">{algo.name}</div>
                                            <div className="text-[10px] text-gray-400 truncate">{algo.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {activeGroup !== 'none' && (
                                <p className="text-[10px] text-center mt-2 font-medium text-blue-600">
                                    {activeGroup === 'tree' ? '🌲 Famille Arbres sélectionnée — Scaling désactivé' : '📐 Famille Distance sélectionnée — Scaling activé'}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-3 ml-1 opacity-70">3. Prétraitement NLP (Texte)</label>
                            {isGuest ? (
                                <div
                                    onClick={() => setShowBlockedModal('nlp_tfidf')}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:border-blue-200 transition-all flex items-center justify-between"
                                >
                                    <span>Désactivé (Données tabulaires simples)</span>
                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            ) : (
                                <select
                                    value={nlpMode}
                                    onChange={(e) => setNlpMode(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all cursor-pointer font-medium"
                                >
                                    <option value="none">Désactivé (Données tabulaires simples)</option>
                                    <option value="tfidf">TF-IDF (Sémantique fréquentielle)</option>
                                    <option value="embeddings">Sentence Embeddings (Sémantique profonde)</option>
                                </select>
                            )}
                        </div>
                    </div>

                    <p className="text-[11px] text-gray-400 mb-6 text-center italic border-t border-gray-100 pt-4">
                        * Les familles d'algorithmes sont mutuellement exclusives pour garantir un pipeline cohérent et sans ambiguïté.
                    </p>

                    <button
                        onClick={() => onAuto(objective, selectedAlgos, nlpMode === 'none' ? '' : nlpMode)}
                        className="w-full btn-primary rounded-2xl py-4 shadow-xl shadow-blue-200 flex items-center justify-center gap-3 text-base font-bold transform transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Lancer l'automatisation du Pipeline <ChevronRight className="h-5 w-5" />
                        {isGuest && <span className="ml-2 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Mode Invité</span>}
                    </button>

                    {/* Blocked feature modal */}
                    {showBlockedModal && (
                        <div
                            onClick={() => setShowBlockedModal(null)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center"
                        >
                            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-8 max-w-md w-[90%] shadow-2xl text-center">
                                <h3 className="text-xl font-bold text-navy mb-3">Fonctionnalité Membres</h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    {showBlockedModal === 'nlp_embeddings'
                                        ? 'Le traitement NLP avancé (Word2Vec, BERT) est réservé aux membres enregistrés.'
                                        : 'Cette méthode avancée nécessite un compte pour être activée.'}
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => navigate('/register')}
                                        className="btn-primary rounded-xl py-3 text-center font-bold"
                                    >
                                        Créer un compte
                                    </button>
                                    <button
                                        onClick={() => setShowBlockedModal(null)}
                                        className="mt-1 py-2.5 px-6 rounded-xl border-2 border-gray-200 text-navy font-semibold text-sm hover:bg-gray-50 transition-colors"
                                    >
                                        Continuer
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pro Soon Information Modal */}
                    {showProSoon && (
                        <div
                            onClick={() => setShowProSoon(false)}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                            }}
                        >
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    background: 'white', borderRadius: '24px', padding: '40px',
                                    maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                                    textAlign: 'center', position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                                    <div style={{ padding: '20px', background: '#f0f5ff', borderRadius: '50%' }}>
                                        <Cpu size={48} color="#3c5fa0" />
                                    </div>
                                </div>
                                <h3 style={{ color: '#1a2b6d', fontSize: '22px', fontWeight: 800, margin: '0 0 16px' }}>
                                    Mode Pro Bientôt Disponible
                                </h3>
                                <p style={{ color: '#6b7fa3', fontSize: '15px', lineHeight: 1.6, margin: '0 0 32px' }}>
                                    Le mode Pro n'est pas disponible pour le moment. Nous travaillons activement pour le rendre accessible très bientôt !
                                </p>
                                <button
                                    onClick={() => setShowProSoon(false)}
                                    style={{
                                        width: '100%', background: '#3c5fa0', color: 'white', border: 'none',
                                        borderRadius: '12px', padding: '14px', fontWeight: 700, cursor: 'pointer', fontSize: '16px'
                                    }}
                                >
                                    Compris
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreprocessingPipeline;
