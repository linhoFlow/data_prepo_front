import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Upload, FileSpreadsheet, Trash2, AlertTriangle, Database, BarChart3, Code2, Scaling, Filter, ArrowLeft, History, LogOut, ChevronRight, X, Search, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { DatasetInfo, DataRow, DataColumn } from '../utils/dataProcessor';
import {
    parseFile,
    computeColumnStats, removeDuplicates,
    imputeByMean, imputeByMedian, imputeByMode, imputeByConstant,
    imputeByFFill, imputeBFill, imputeByInterpolation, imputeKNN,
    detectOutliersIQR, treatOutliersIQR, treatOutliersWinsor, treatOutliersZScore,
    oneHotEncode, ordinalEncode, labelEncode,
    minMaxScale, standardScale, robustScale,
    correlationMatrix, exportToCSV, exportToExcel, exportToJSON, exportToXML
} from '../utils/dataProcessor';
import type { PreprocessingSession } from '../utils/storageService';
import { saveSession, getSessions, deleteSession, getSessionData } from '../utils/storageService';
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
    const [dataset, setDataset] = useState<DatasetInfo | null>(null);
    const [originalData, setOriginalData] = useState<DataRow[]>([]);
    const [transformations, setTransformations] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [isHistorySession, setIsHistorySession] = useState(false);

    // Ensure guest session is started if not authenticated
    React.useEffect(() => {
        if (!isAuthenticated && !isGuest) {
            startGuestSession();
        }
    }, [isAuthenticated, isGuest, startGuestSession]);

    // History
    // History refresh trigger
    const [historyUpdate, setHistoryUpdate] = useState(0);
    const history = useMemo(() => getSessions(isAuthenticated), [isAuthenticated, showHistory, historyUpdate]);

    const handleDeleteSession = useCallback((id: string) => {
        deleteSession(id, isAuthenticated);
        setHistoryUpdate(prev => prev + 1);
    }, [isAuthenticated]);

    const handleSelectSession = useCallback((session: PreprocessingSession) => {
        const fullData = getSessionData(session.id, isAuthenticated);
        if (!fullData) {
            alert("Erreur: Impossible de charger les données de cette session.");
            return;
        }

        setDataset({
            data: fullData,
            headers: fullData.length > 0 ? Object.keys(fullData[0]) : [],
            rows: session.rowCount,
            columns: session.columnCount,
            columnInfo: [], // Optional: Recompute if needed
        });
        setOriginalData([...fullData]);
        setFileName(session.fileName);
        setTransformations(session.transformations);
        setIsHistorySession(true);
        setCurrentStep(PipelineStep.DASHBOARD);
        setShowHistory(false);
    }, [isAuthenticated]);

    const handleFileUpload = useCallback(async (file: File) => {
        setIsLoading(true);
        try {
            const info = await parseFile(file);
            setDataset(info);
            setOriginalData([...info.data]);
            setFileName(file.name);
            setTransformations([]);
            setIsHistorySession(false);
            setCurrentStep(PipelineStep.OVERVIEW);
        } catch (err) {
            alert('Erreur: ' + (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateDataset = useCallback((newData: DataRow[], transformation: string) => {
        if (!dataset) return;
        const headers = newData.length > 0 ? Object.keys(newData[0]) : dataset.headers;
        const columnInfo: DataColumn[] = headers.map((name) => {
            const values = newData.map((row) => row[name]);
            const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
            return {
                name,
                type: dataset.columnInfo.find((c) => c.name === name)?.type || 'unknown',
                nullCount: values.length - nonNull.length,
                nullPercentage: newData.length > 0 ? ((values.length - nonNull.length) / newData.length) * 100 : 0,
                uniqueCount: new Set(nonNull.map(String)).size,
                sampleValues: nonNull.slice(0, 5),
            };
        });
        setDataset({ ...dataset, data: newData, headers, columns: headers.length, rows: newData.length, columnInfo });
        setTransformations((prev) => [...prev, transformation]);
    }, [dataset]);

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
        if (!dataset) return;
        setIsLoading(true);
        try {
            let currentData = [...dataset.data];
            let newTransformations: string[] = [];

            // 1. Duplicates
            const dupResult = removeDuplicates(currentData);
            if (dupResult.removed > 0) {
                currentData = dupResult.cleaned;
                newTransformations.push(`Autopilot: Suppression de ${dupResult.removed} doublons`);
            }

            // Helpers for logic (mirroring suggestsMethod etc)
            const numericCols = dataset.columnInfo.filter(c => c.type === 'numeric').map(c => c.name);
            const catCols = dataset.columnInfo.filter(c => c.type === 'categorical');

            // 2. Missing Values
            dataset.columnInfo.filter(c => c.nullCount > 0).forEach(col => {
                const stats = col.type === 'numeric' ? computeColumnStats(currentData, col.name) : null;
                const outliers = col.type === 'numeric' ? detectOutliersIQR(currentData, col.name).outlierIndices : [];

                // Mirror MissingValuesStep suggestMethod
                let method = 'mode';
                if (col.nullPercentage > 40) method = 'drop';
                else if (col.type === 'categorical') method = 'mode';
                else if (stats) {
                    if (stats.isSymmetric && outliers.length === 0 && col.nullPercentage < 10) method = 'mean';
                    else method = 'median';
                }

                switch (method) {
                    case 'mean': currentData = imputeByMean(currentData, col.name); break;
                    case 'median': currentData = imputeByMedian(currentData, col.name); break;
                    case 'mode': currentData = imputeByMode(currentData, col.name); break;
                    case 'drop': currentData = currentData.filter(r => r[col.name] !== null && r[col.name] !== undefined && r[col.name] !== ''); break;
                }
                newTransformations.push(`Autopilot: ${col.name} (Missing) -> ${method.toUpperCase()}`);
            });

            // 3. Outliers
            numericCols.forEach(colName => {
                const stats = computeColumnStats(currentData, colName);
                if (!stats) return;
                const outliers = detectOutliersIQR(currentData, colName);
                if (outliers.outlierIndices.length === 0) return;

                // Rule-based: Winsor if asymmetric, IQR if sym, Z-score if normal
                if (stats.isNormal) {
                    currentData = treatOutliersZScore(currentData, colName);
                    newTransformations.push(`Autopilot: ${colName} (Outliers) -> Z-Score`);
                } else if (stats.isSymmetric) {
                    currentData = treatOutliersIQR(currentData, colName);
                    newTransformations.push(`Autopilot: ${colName} (Outliers) -> IQR`);
                } else {
                    currentData = treatOutliersWinsor(currentData, colName);
                    newTransformations.push(`Autopilot: ${colName} (Outliers) -> Winsorization`);
                }
            });

            // 4. Encoding
            catCols.forEach(col => {
                const name = col.name.toLowerCase();
                const targetKey = ['target', 'label', 'outcome', 'y', 'class', 'churn', 'survived', 'price_range'].some(k => name.includes(k));

                if (targetKey) {
                    currentData = labelEncode(currentData, col.name).data;
                    newTransformations.push(`Autopilot: ${col.name} (Encoding) -> Label`);
                } else if (col.uniqueCount > 15) {
                    // Ordinal fallback for high cardinality
                    const order = Array.from(new Set(currentData.map(r => String(r[col.name])))).sort();
                    currentData = ordinalEncode(currentData, col.name, order);
                    newTransformations.push(`Autopilot: ${col.name} (Encoding) -> Ordinal (Auto-order)`);
                } else {
                    currentData = oneHotEncode(currentData, [col.name]).data;
                    newTransformations.push(`Autopilot: ${col.name} (Encoding) -> OneHot`);
                }
            });

            // 5. Scaling
            numericCols.forEach(colName => {
                const stats = computeColumnStats(currentData, colName);
                if (!stats) return;
                const outliers = detectOutliersIQR(currentData, colName).outlierIndices;

                if (stats.isNormal && outliers.length === 0) {
                    currentData = standardScale(currentData, [colName]);
                    newTransformations.push(`Autopilot: ${colName} (Scaling) -> Standard`);
                } else if (outliers.length > 0) {
                    currentData = robustScale(currentData, [colName]);
                    newTransformations.push(`Autopilot: ${colName} (Scaling) -> Robust`);
                } else {
                    currentData = minMaxScale(currentData, [colName]);
                    newTransformations.push(`Autopilot: ${colName} (Scaling) -> MinMax`);
                }
            });

            // Final Update
            const finalHeaders = currentData.length > 0 ? Object.keys(currentData[0]) : dataset.headers;
            const finalColumnInfo: DataColumn[] = finalHeaders.map(name => {
                const vals = currentData.map(r => r[name]);
                const nonNull = vals.filter(v => v !== null && v !== undefined && v !== '');
                return {
                    name,
                    type: (isNaN(Number(nonNull[0])) ? 'categorical' : 'numeric') as "boolean" | "numeric" | "categorical" | "datetime" | "unknown",
                    nullCount: vals.length - nonNull.length,
                    nullPercentage: ((vals.length - nonNull.length) / currentData.length) * 100,
                    uniqueCount: new Set(nonNull.map(String)).size,
                    sampleValues: nonNull.slice(0, 5),
                };
            });

            setDataset({
                ...dataset,
                data: currentData,
                headers: finalHeaders,
                columns: finalHeaders.length,
                rows: currentData.length,
                columnInfo: finalColumnInfo
            });
            setTransformations(prev => [...prev, ...newTransformations]);
            setCurrentStep(PipelineStep.DASHBOARD);
        } catch (err) {
            alert('Automation Erreur: ' + (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [dataset]);

    const handleSaveAndExport = (format: 'csv' | 'xlsx' | 'json' | 'xml' = 'csv') => {
        if (!dataset) return;
        const session: PreprocessingSession = {
            id: crypto.randomUUID(),
            fileName,
            date: new Date().toISOString(),
            rowCount: dataset.rows,
            columnCount: dataset.columns,
            transformations,
            data: dataset.data,
        };
        saveSession(session, isAuthenticated);

        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const exportName = `preprocessed_${baseName}`;

        switch (format) {
            case 'xlsx': exportToExcel(dataset.data, exportName); break;
            case 'json': exportToJSON(dataset.data, exportName); break;
            case 'xml': exportToXML(dataset.data, exportName); break;
            default: exportToCSV(dataset.data, exportName);
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
                            <DuplicatesStep dataset={dataset} onUpdate={updateDataset} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.MISSING && dataset && (
                            <MissingValuesStep dataset={dataset} onUpdate={updateDataset} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.OUTLIERS && dataset && (
                            <OutliersStep dataset={dataset} onUpdate={updateDataset} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.ENCODING && dataset && (
                            <EncodingStep dataset={dataset} onUpdate={updateDataset} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.SCALING && dataset && (
                            <ScalingStep dataset={dataset} onUpdate={updateDataset} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.SELECTION && dataset && (
                            <SelectionStep dataset={dataset} onUpdate={updateDataset} onNext={nextStep} />
                        )}
                        {currentStep === PipelineStep.DASHBOARD && dataset && (
                            <DashboardView dataset={dataset} originalData={originalData} transformations={transformations} onExport={handleSaveAndExport} />
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
const OverviewStep: React.FC<{ dataset: DatasetInfo; onNext: () => void }> = ({ dataset, onNext }) => {
    const stats = useMemo(() => {
        return dataset.columnInfo.map((col) => ({
            ...col,
            stats: col.type === 'numeric' ? computeColumnStats(dataset.data, col.name) : null,
        }));
    }, [dataset]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-navy mb-4">Apercu du dataset</h3>

                {/* KPI cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Lignes', value: dataset.rows.toLocaleString(), color: 'bg-blue-100 text-blue-600' },
                        { label: 'Colonnes', value: dataset.columns, color: 'bg-navy-100 text-navy' },
                        { label: 'Numeriques', value: dataset.columnInfo.filter((c) => c.type === 'numeric').length, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Categoriques', value: dataset.columnInfo.filter((c) => c.type === 'categorical').length, color: 'bg-primary-100 text-primary-600' },
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
                            {stats.map((col, i) => (
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
                                    <td className="p-3 text-right text-gray-600">
                                        {col.stats ? col.stats.mean.toFixed(2) : String(col.sampleValues[0] ?? '-')}
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
                                {dataset.headers.slice(0, 10).map((h) => (
                                    <th key={h} className="p-2 text-left font-semibold text-primary-700 whitespace-nowrap">{h}</th>
                                ))}
                                {dataset.headers.length > 10 && <th className="p-2 text-gray-400">...</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {dataset.data.slice(0, 8).map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                                    {dataset.headers.slice(0, 10).map((h) => (
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
const DuplicatesStep: React.FC<{ dataset: DatasetInfo; onUpdate: (d: DataRow[], t: string) => void; onNext: () => void }> = ({ dataset, onUpdate, onNext }) => {
    const [result, setResult] = useState<{ cleaned: DataRow[]; removed: number } | null>(null);

    const handleDetect = () => {
        const r = removeDuplicates(dataset.data);
        setResult(r);
    };

    const handleApply = () => {
        if (result) {
            onUpdate(result.cleaned, `Suppression de ${result.removed} doublons`);
            setResult(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Suppression des doublons</h3>
            <p className="text-gray-600">Identifiez et supprimez les lignes identiques pour eviter les biais dans votre analyse.</p>

            {!result ? (
                <button onClick={handleDetect} className="btn-primary rounded-xl gap-2">
                    <Search className="h-5 w-5" /> Detecter les doublons
                </button>
            ) : (
                <div className="space-y-4">
                    <div className={`rounded-xl p-4 border ${result.removed > 0 ? 'bg-primary-50 border-primary-200' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex items-center gap-3">
                            {result.removed > 0 ? <AlertTriangle className="h-6 w-6 text-primary" /> : <CheckCircle className="h-6 w-6 text-blue-600" />}
                            <div>
                                <p className={`font-bold ${result.removed > 0 ? 'text-primary' : 'text-blue-800'}`}>
                                    {result.removed > 0 ? `${result.removed} doublons supprimes.` : 'Aucun doublon detecte.'}
                                </p>
                                <p className="text-sm text-gray-600">{result.cleaned.length} lignes uniques sur {dataset.rows}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {result.removed > 0 && (
                            <button onClick={handleApply} className="btn-primary rounded-xl gap-2">
                                <Trash2 className="h-5 w-5" /> Supprimer les doublons
                            </button>
                        )}
                        <button onClick={onNext} className="btn-outline rounded-xl gap-2">
                            {result.removed === 0 ? 'Continuer' : 'Passer'} <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Missing Values Step
const MissingValuesStep: React.FC<{ dataset: DatasetInfo; onUpdate: (d: DataRow[], t: string) => void; onNext: () => void }> = ({ dataset, onUpdate, onNext }) => {
    const columnsWithNaN = useMemo(() =>
        dataset.columnInfo.filter((c) => c.nullCount > 0).map((c) => {
            const stats = c.type === 'numeric' ? computeColumnStats(dataset.data, c.name) : null;
            const outliers = c.name && c.type === 'numeric' ? detectOutliersIQR(dataset.data, c.name).outlierIndices : [];
            return { ...c, stats, outlierCount: outliers.length };
        }),
        [dataset]
    );

    const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
    const [constants, setConstants] = useState<Record<string, string>>({});
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());
    const [lastAction, setLastAction] = useState<string | null>(null);

    const suggestMethod = (col: typeof columnsWithNaN[0]): { method: string; reason: string } => {
        if (col.nullPercentage > 40) return { method: 'drop', reason: 'Plus de 40% de données manquantes (Perte d\'information critique)' };
        if (col.type === 'categorical') return { method: 'mode', reason: 'Variable qualitative (Type catégorique)' };
        if (col.stats) {
            if (col.stats.isSymmetric && col.outlierCount === 0 && col.nullPercentage < 10) {
                return { method: 'mean', reason: 'Distribution symétrique et sans valeurs aberrantes' };
            }
            if (!col.stats.isSymmetric || col.outlierCount > 0) {
                return { method: 'median', reason: 'Distribution asymétrique ou présence d\'outliers' };
            }
            return { method: 'median', reason: 'Recommandé pour préserver la structure statistique' };
        }
        return { method: 'mode', reason: 'Méthode par défaut pour ce type de données' };
    };

    const methods = [
        { value: 'mean', label: 'Moyenne', desc: 'Suggéré si distribution symétrique et sans outliers' },
        { value: 'median', label: 'Médiane', desc: 'Suggéré si distribution asymétrique ou outliers' },
        { value: 'mode', label: 'Mode', desc: 'Suggéré pour les variables qualitatives' },
        { value: 'constant', label: 'Constante', desc: 'Zéro, "Absent" ou valeur personnalisée' },
        { value: 'ffill', label: 'Forward Fill', desc: 'Suggéré pour les séries temporelles' },
        { value: 'bfill', label: 'Backward Fill', desc: 'Suggéré pour les séries temporelles' },
        { value: 'interpolation', label: 'Interpolation', desc: 'Séries temporelles (linéaire)' },
        { value: 'knn', label: 'KNN Imputer', desc: 'Suggéré si colonnes corrélées et NaN < 30%' },
        { value: 'drop', label: 'Suppression', desc: 'Dernier recours (> 40% de NaN)' },
    ];

    const handleApply = (colName: string) => {
        const col = columnsWithNaN.find((c) => c.name === colName)!;
        const method = selectedMethods[colName] || suggestMethod(col).method;
        let newData = dataset.data;
        const numericCols = dataset.columnInfo.filter((c) => c.type === 'numeric').map((c) => c.name);

        switch (method) {
            case 'mean': newData = imputeByMean(newData, colName); break;
            case 'median': newData = imputeByMedian(newData, colName); break;
            case 'mode': newData = imputeByMode(newData, colName); break;
            case 'constant': newData = imputeByConstant(newData, colName, constants[colName] || 0); break;
            case 'ffill': newData = imputeByFFill(newData, colName); break;
            case 'bfill': newData = imputeBFill(newData, colName); break;
            case 'interpolation': newData = imputeByInterpolation(newData, colName); break;
            case 'knn': newData = imputeKNN(newData, colName, numericCols); break;
            case 'drop':
                newData = newData.filter((row) => row[colName] !== null && row[colName] !== undefined && row[colName] !== '');
                break;
        }
        onUpdate(newData, `${colName}: imputation par ${method.toUpperCase()}`);
        setTreatedColumns(prev => new Set(prev).add(colName));
        setLastAction(`Imputation ${method.toUpperCase()} appliquée sur ${colName}`);
        setTimeout(() => setLastAction(null), 3000);
    };

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
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-start gap-3 text-sm">
                <AlertTriangle className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-primary-800">Sélectionnez la méthode de traitement pour chaque colonne ayant des valeurs manquantes.</p>
                </div>
                <AnimatePresence>
                    {lastAction && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                        >
                            <CheckCircle className="h-3.5 w-3.5 text-blue-300" />
                            {lastAction}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="space-y-4">
                {columnsWithNaN.map((col) => {
                    const suggested = suggestMethod(col);
                    const current = selectedMethods[col.name] || suggested;
                    return (
                        <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <span className="font-semibold text-navy">{col.name}</span>
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${col.type === 'numeric' ? 'bg-blue-100 text-blue-700' : 'bg-primary-50 text-primary-700'}`}>
                                        {col.type}
                                    </span>
                                </div>
                                <span className={`text-sm font-medium ${treatedColumns.has(col.name) ? 'text-blue-600' : col.nullPercentage > 30 ? 'text-primary' : 'text-blue-600'}`}>
                                    {treatedColumns.has(col.name) ? 0 : col.nullCount} ({treatedColumns.has(col.name) ? '0.0' : col.nullPercentage.toFixed(1)}%)
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {methods.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => setSelectedMethods((prev: any) => ({ ...prev, [col.name]: m.value }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${current === m.value ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${m.value === suggested.method ? 'ring-2 ring-primary/30 border-primary/50' : ''}`}
                                        title={m.desc}
                                    >
                                        {m.label}
                                        {m.value === suggested.method && <span className="ml-1 text-[10px] opacity-75">(suggéré)</span>}
                                    </button>
                                ))}
                            </div>

                            {current === suggested.method && (
                                <div className="text-[11px] text-primary-600 font-medium mb-3 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 w-fit flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    {suggested.reason}
                                </div>
                            )}

                            {current === 'constant' && (
                                <input
                                    type="text"
                                    value={constants[col.name] || ''}
                                    onChange={(e) => setConstants((prev) => ({ ...prev, [col.name]: e.target.value }))}
                                    className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-200 text-sm mb-3"
                                    placeholder="Valeur de remplacement"
                                />
                            )}

                            {treatedColumns.has(col.name) ? (
                                <div className="text-sm text-primary font-bold flex items-center gap-2 mt-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 w-fit">
                                    <CheckCircle className="h-4 w-4" /> Colonne nettoyée avec succès
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleApply(col.name)}
                                    className="btn-primary rounded-lg text-sm py-2 px-4 gap-2 transition-all"
                                >
                                    Appliquer
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">
                    Continuer <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

// Outliers Step
const OutliersStep: React.FC<{ dataset: DatasetInfo; onUpdate: (d: DataRow[], t: string) => void; onNext: () => void }> = ({ dataset, onUpdate, onNext }) => {
    const numericCols = useMemo(() => dataset.columnInfo.filter((c) => c.type === 'numeric'), [dataset]);
    const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());
    const [lastAction, setLastAction] = useState<string | null>(null);

    const handleApply = (colName: string) => {
        const method = selectedMethods[colName] || 'iqr';
        let newData = dataset.data;
        switch (method) {
            case 'iqr': newData = treatOutliersIQR(newData, colName); break;
            case 'winsor': newData = treatOutliersWinsor(newData, colName, 5, 95); break;
            case 'zscore': newData = treatOutliersZScore(newData, colName); break;
        }
        onUpdate(newData, `${colName}: outliers traités par ${method.toUpperCase()}`);
        setTreatedColumns(prev => new Set(prev).add(colName));
        setLastAction(`Traitement ${method.toUpperCase()} appliqué sur ${colName}`);
        setTimeout(() => setLastAction(null), 3000);
    };

    const outlierMethods = [
        { value: 'iqr', label: 'IQR (Boxplot)', desc: 'Remplacer par bornes (Q1-1.5IQR, Q3+1.5IQR)' },
        { value: 'winsor', label: 'Winsorisation', desc: 'Remplacer par percentiles (5% et 95%)' },
        { value: 'zscore', label: 'Z-score', desc: 'Remplacer par moyenne (Normal) ou médiane (Quasi-normal)' },
    ];

    const suggestOutlierMethod = (stats: any): { method: string; reason: string } => {
        if (!stats) return { method: 'iqr', reason: 'Méthode par défaut' };
        if (stats.isNormal) return { method: 'zscore', reason: 'Distribution normale : Z-score est recommandé' };
        if (stats.isSymmetric) return { method: 'iqr', reason: 'Distribution symétrique : IQR (Boxplot) est idéal' };
        return { method: 'winsor', reason: 'Distribution asymétrique : Winsorisation recommandée' };
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Traitement des valeurs aberrantes</h3>
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-start gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-primary-800">Comprendre le contexte métier avant de supprimer un outlier. Un traitement inadapté peut affecter les résultats.</p>
                </div>
                <AnimatePresence>
                    {lastAction && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                        >
                            <CheckCircle className="h-3.5 w-3.5 text-blue-300" />
                            {lastAction}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="space-y-4">
                {numericCols.map((col) => {
                    const stats = computeColumnStats(dataset.data, col.name);
                    const { outlierIndices } = detectOutliersIQR(dataset.data, col.name);
                    const suggested = suggestOutlierMethod(stats);
                    const currentMethod = selectedMethods[col.name] || suggested.method;

                    return (
                        <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-navy">{col.name}</span>
                                <span className={`text-sm font-medium ${treatedColumns.has(col.name) ? 'text-blue-600' : outlierIndices.length > 0 ? 'text-primary' : 'text-blue-600'}`}>
                                    {treatedColumns.has(col.name) ? 0 : outlierIndices.length} outliers detectes
                                </span>
                            </div>

                            {stats && (
                                <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Min:</span> <span className="font-medium">{stats.min.toFixed(2)}</span></div>
                                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Q1:</span> <span className="font-medium">{stats.q1.toFixed(2)}</span></div>
                                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Q3:</span> <span className="font-medium">{stats.q3.toFixed(2)}</span></div>
                                    <div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-500">Max:</span> <span className="font-medium">{stats.max.toFixed(2)}</span></div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mb-3">
                                {outlierMethods.map((m) => (
                                    <button
                                        key={m.value}
                                        onClick={() => setSelectedMethods((prev) => ({ ...prev, [col.name]: m.value }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentMethod === m.value ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${m.value === suggested.method ? 'ring-2 ring-primary/30 border-primary/50' : ''}`}
                                        title={m.desc}
                                    >
                                        {m.label}
                                        {m.value === suggested.method && <span className="ml-1 text-[10px] opacity-75">(suggéré)</span>}
                                    </button>
                                ))}
                            </div>

                            {currentMethod === suggested.method && (
                                <div className="text-[11px] text-primary-600 font-medium mb-3 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 w-fit flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    {suggested.reason}
                                </div>
                            )}

                            {treatedColumns.has(col.name) ? (
                                <div className="text-sm text-primary font-bold flex items-center gap-2 mt-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 w-fit">
                                    <CheckCircle className="h-4 w-4" /> Colonne nettoyée avec succès
                                </div>
                            ) : outlierIndices.length > 0 && (
                                <button
                                    onClick={() => handleApply(col.name)}
                                    className="btn-primary rounded-lg text-sm py-2 px-4 gap-2 transition-all"
                                >
                                    Appliquer le traitement
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">
                    Continuer <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

// Encoding Step
const EncodingStep: React.FC<{ dataset: DatasetInfo; onUpdate: (d: DataRow[], t: string) => void; onNext: () => void }> = ({ dataset, onUpdate, onNext }) => {
    const catCols = useMemo(() => dataset.columnInfo.filter((c) => c.type === 'categorical'), [dataset]);
    const [colTypes, setColTypes] = useState<Record<string, 'nominal' | 'ordinal' | 'target'>>({});
    const [ordinalOrders, setOrdinalOrders] = useState<Record<string, string>>({});
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());
    const [lastAction, setLastAction] = useState<string | null>(null);

    const suggestEncoding = (col: typeof catCols[0]): { method: 'nominal' | 'ordinal' | 'target'; reason: string } => {
        const name = col.name.toLowerCase();
        const targetKeywords = ['target', 'label', 'outcome', 'y', 'class', 'churn', 'survived', 'price_range', 'satisfaction'];

        if (targetKeywords.some(k => name.includes(k))) {
            return { method: 'target', reason: 'Détecté comme variable cible (LabelEncoder recommandé)' };
        }

        const ordinalKeywords = ['level', 'grade', 'rank', 'degree', 'priority', 'size', 'rating', 'tranche'];
        if (ordinalKeywords.some(k => name.includes(k))) {
            return { method: 'ordinal', reason: 'Nom suggère une hiérarchie (OrdinalEncoder recommandé)' };
        }

        if (col.uniqueCount > 15) {
            return { method: 'ordinal', reason: 'Haute cardinalité : OneHot risque de créer trop de colonnes' };
        }

        return { method: 'nominal', reason: 'Variable qualitative standard (OneHotEncoder recommandé)' };
    };

    const handleApply = (colName: string) => {
        const col = catCols.find(c => c.name === colName)!;
        const type = colTypes[colName] || suggestEncoding(col).method;
        let newData = dataset.data;
        let transformation = '';

        switch (type) {
            case 'nominal': {
                const result = oneHotEncode(newData, [colName]);
                newData = result.data;
                transformation = `${colName}: OneHotEncoder (${result.newColumns.length} colonnes)`;
                break;
            }
            case 'ordinal': {
                const order = (ordinalOrders[colName] || '').split(',').map((s) => s.trim()).filter(Boolean);
                if (order.length === 0) { alert('Definissez l\'ordre des categories'); return; }
                newData = ordinalEncode(newData, colName, order);
                transformation = `${colName}: OrdinalEncoder`;
                break;
            }
            case 'target': {
                const result = labelEncode(newData, colName);
                newData = result.data;
                transformation = `${colName}: LabelEncoder`;
                break;
            }
        }
        onUpdate(newData, transformation);
        setTreatedColumns(prev => new Set(prev).add(colName));
        setLastAction(`Encodage ${type.toUpperCase()} appliqué sur ${colName}`);
        setTimeout(() => setLastAction(null), 3000);
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
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-start gap-3 text-sm mb-6">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-primary-800">Classez chaque variable et appliquez l'encodage approprié.</p>
                </div>
                <AnimatePresence>
                    {lastAction && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                        >
                            <CheckCircle className="h-3.5 w-3.5 text-blue-300" />
                            {lastAction}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="space-y-4">
                {catCols.map((col) => {
                    const type = colTypes[col.name] || 'nominal';
                    const currentOrder = (ordinalOrders[col.name] || '').split(',').map(s => s.trim()).filter(Boolean);
                    const sampleValues = (col.sampleValues || []) as string[];
                    const remainingCats = sampleValues.filter(v => !currentOrder.includes(v));

                    return (
                        <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-navy">{col.name}</span>
                                <span className="text-sm text-gray-500">{col.uniqueCount} categories</span>
                            </div>

                            <div className="flex gap-2 mb-3">
                                {[
                                    { v: 'nominal', l: 'Nominale (OneHot)', desc: 'Type qualitatif sans ordre particulier' },
                                    { v: 'ordinal', l: 'Ordinale', desc: 'Type qualitatif avec un ordre logique' },
                                    { v: 'target', l: 'Cible (Label)', desc: 'Variable à prédire' },
                                ].map(({ v, l, desc }) => {
                                    const suggested = suggestEncoding(col);
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => setColTypes((prev) => ({ ...prev, [col.name]: v as 'nominal' | 'ordinal' | 'target' }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${type === v ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${v === suggested.method ? 'ring-2 ring-primary/30 border-primary/50' : ''}`}
                                            title={desc}
                                        >
                                            {l}
                                            {v === suggested.method && <span className="ml-1 text-[10px] opacity-75">(suggéré)</span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {type === (suggestEncoding(col).method) && (
                                <div className="text-[11px] text-primary-600 font-medium mb-3 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 w-fit flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    {suggestEncoding(col).reason}
                                </div>
                            )}

                            {type === 'ordinal' && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="text-xs font-bold text-navy mb-2">Définir l'ordre (cliquez pour ajouter) :</p>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {currentOrder.map((cat: string, idx: number) => (
                                            <button
                                                key={cat}
                                                onClick={() => setOrdinalOrders(prev => ({
                                                    ...prev,
                                                    [col.name]: currentOrder.filter((c: string) => c !== cat).join(',')
                                                }))}
                                                className="bg-primary text-white px-2 py-1 rounded text-[10px] flex items-center gap-1"
                                            >
                                                {idx + 1}. {cat} <X className="h-3 w-3" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {remainingCats.map((cat: string) => (
                                            <button
                                                key={cat}
                                                onClick={() => setOrdinalOrders(prev => ({
                                                    ...prev,
                                                    [col.name]: [...currentOrder, cat].join(',')
                                                }))}
                                                className="bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] hover:border-primary hover:text-primary"
                                            >
                                                + {cat}
                                            </button>
                                        ))}
                                    </div>
                                    {col.uniqueCount > col.sampleValues.length && (
                                        <p className="text-[10px] text-gray-400 mt-2 italic">* Seules les premières catégories sont affichées</p>
                                    )}
                                </div>
                            )}

                            <div className="text-[10px] text-gray-500 mb-2 truncate">Valeurs: {col.sampleValues.join(', ')}</div>

                            {treatedColumns.has(col.name) ? (
                                <div className="text-sm text-primary font-bold flex items-center gap-2 mt-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 w-fit">
                                    <CheckCircle className="h-4 w-4" /> Colonne encodée avec succès
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleApply(col.name)}
                                    className="btn-primary rounded-lg text-sm py-2 px-4 gap-2 transition-all"
                                >
                                    Appliquer l'encodage
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">Continuer <ChevronRight className="h-5 w-5" /></button>
            </div>
        </div>
    );
};

// Scaling Step
const ScalingStep: React.FC<{ dataset: DatasetInfo; onUpdate: (d: DataRow[], t: string) => void; onNext: () => void }> = ({ dataset, onUpdate, onNext }) => {
    const numericCols = useMemo(() => dataset.columnInfo.filter((c) => c.type === 'numeric'), [dataset]);
    const [selectedMethods, setSelectedMethods] = useState<Record<string, 'minmax' | 'standard' | 'robust'>>({});
    const [treatedColumns, setTreatedColumns] = useState<Set<string>>(new Set());
    const [lastAction, setLastAction] = useState<string | null>(null);

    const suggestScaling = (colName: string): { method: 'minmax' | 'standard' | 'robust'; reason: string } => {
        const stats = computeColumnStats(dataset.data, colName);
        const outliers = detectOutliersIQR(dataset.data, colName).outlierIndices;

        if (!stats) return { method: 'minmax', reason: 'Méthode par défaut' };

        if (stats.isNormal && outliers.length === 0) {
            return { method: 'standard', reason: 'Distribution normale et pas d\'outliers (StandardScaler)' };
        }

        if (outliers.length > 0) {
            return { method: 'robust', reason: 'Présence d\'outliers détectée (RobustScaler)' };
        }

        return { method: 'minmax', reason: 'Distribution non-gaussienne sans outliers (MinMaxScaler)' };
    };

    const handleApply = (colName: string) => {
        const method = selectedMethods[colName] || suggestScaling(colName).method;
        let newData = dataset.data;
        let summary = "";

        switch (method) {
            case 'minmax': newData = minMaxScale(newData, [colName]); summary = `${colName}: MinMaxScaler`; break;
            case 'standard': newData = standardScale(newData, [colName]); summary = `${colName}: StandardScaler`; break;
            case 'robust': newData = robustScale(newData, [colName]); summary = `${colName}: RobustScaler`; break;
        }

        onUpdate(newData, summary);
        setTreatedColumns(prev => new Set(prev).add(colName));
        setLastAction(`Scaling ${method.toUpperCase()} appliqué sur ${colName}`);
        setTimeout(() => setLastAction(null), 3000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="text-xl font-bold text-navy">Mise à l'échelle (Scaling)</h3>

            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex items-start gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-primary-800">Normalisez ou standardisez vos variables pour améliorer la performance des algorithmes sensibles aux échelles.</p>
                </div>
                <AnimatePresence>
                    {lastAction && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"
                        >
                            <CheckCircle className="h-3.5 w-3.5 text-blue-300" />
                            {lastAction}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="space-y-4">
                {numericCols.map((col) => {
                    const stats = computeColumnStats(dataset.data, col.name);
                    const outliers = col.name ? detectOutliersIQR(dataset.data, col.name).outlierIndices : [];
                    const suggested = suggestScaling(col.name);
                    const currentMethod = selectedMethods[col.name] || suggested.method;

                    return (
                        <div key={col.name} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-navy">{col.name}</span>
                                <div className="flex gap-2">
                                    {stats?.isNormal && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">Gaussienne</span>}
                                    {outliers.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{outliers.length} Outliers</span>}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {[
                                    { v: 'minmax', l: 'MinMaxScaler', desc: 'Met à l\'échelle entre [0, 1]' },
                                    { v: 'standard', l: 'StandardScaler', desc: 'Centre sur 0 avec écart-type 1' },
                                    { v: 'robust', l: 'RobustScaler', desc: 'Moins sensible aux valeurs aberrantes' },
                                ].map(({ v, l, desc }) => (
                                    <button
                                        key={v}
                                        onClick={() => setSelectedMethods((prev) => ({ ...prev, [col.name]: v as 'minmax' | 'standard' | 'robust' }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${currentMethod === v ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} ${v === suggested.method ? 'ring-2 ring-primary/30 border-primary/50' : ''}`}
                                        title={desc}
                                    >
                                        {l}
                                        {v === suggested.method && <span className="ml-1 text-[10px] opacity-75">(suggéré)</span>}
                                    </button>
                                ))}
                            </div>

                            {currentMethod === suggested.method && (
                                <div className="text-[11px] text-primary-600 font-medium mb-3 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 w-fit flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    {suggested.reason}
                                </div>
                            )}

                            {treatedColumns.has(col.name) ? (
                                <div className="text-sm text-primary font-bold flex items-center gap-2 mt-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 w-fit">
                                    <CheckCircle className="h-4 w-4" /> Mise à l'échelle appliquée
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleApply(col.name)}
                                    className="btn-primary rounded-lg text-sm py-2 px-4 gap-2 transition-all"
                                >
                                    Appliquer le scaling
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end pt-4">
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">
                    Continuer <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

// Selection Step
const SelectionStep: React.FC<{ dataset: DatasetInfo; onUpdate: (d: DataRow[], t: string) => void; onNext: () => void }> = ({ dataset, onUpdate, onNext }) => {
    const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(dataset.headers));
    const numericCols = useMemo(() => dataset.columnInfo.filter((c) => c.type === 'numeric').map((c) => c.name), [dataset]);
    const corrMatrix = useMemo(() => {
        if (numericCols.length < 2) return null;
        return correlationMatrix(dataset.data, numericCols);
    }, [dataset, numericCols]);

    const toggleCol = (c: string) => {
        setSelectedCols((prev) => {
            const next = new Set(prev);
            if (next.has(c)) next.delete(c); else next.add(c);
            return next;
        });
    };

    const handleApply = () => {
        const cols = Array.from(selectedCols);
        const newData = dataset.data.map((row) => {
            const newRow: DataRow = {};
            cols.forEach((c) => { newRow[c] = row[c]; });
            return newRow;
        });
        onUpdate(newData, `Selection de ${cols.length}/${dataset.headers.length} colonnes`);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-navy mb-4">Selection des caracteristiques</h3>

                {/* Correlation matrix */}
                {corrMatrix && corrMatrix.columns.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold text-navy mb-3">Matrice de correlation</h4>
                        <div className="overflow-x-auto">
                            <table className="text-xs">
                                <thead>
                                    <tr>
                                        <th className="p-1" />
                                        {corrMatrix.columns.map((c) => (
                                            <th key={c} className="p-1 font-medium text-navy-700 whitespace-nowrap max-w-[60px] truncate" title={c}>{c.substring(0, 8)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {corrMatrix.columns.map((row, i) => (
                                        <tr key={row}>
                                            <td className="p-1 font-medium text-navy-700 whitespace-nowrap max-w-[80px] truncate" title={row}>{row.substring(0, 10)}</td>
                                            {corrMatrix.matrix[i].map((val, j) => {
                                                const abs = Math.abs(val);
                                                const bg = val >= 0
                                                    ? `rgba(59, 130, 246, ${abs * 0.6})`
                                                    : `rgba(239, 68, 68, ${abs * 0.6})`;
                                                return (
                                                    <td key={j} className="p-1 text-center font-medium rounded" style={{ backgroundColor: bg, color: abs > 0.4 ? 'white' : '#374151' }}>
                                                        {val.toFixed(2)}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Column selector */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-navy">Colonnes selectionnees ({selectedCols.size}/{dataset.headers.length})</h4>
                        <div className="flex gap-2">
                            <button onClick={() => setSelectedCols(new Set(dataset.headers))} className="text-xs text-primary hover:underline">Tout selectionner</button>
                            <button onClick={() => setSelectedCols(new Set())} className="text-xs text-gray-500 hover:underline">Tout deselectionner</button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {dataset.headers.map((h) => (
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
            </div>

            <div className="flex gap-3 justify-end">
                {selectedCols.size < dataset.headers.length && (
                    <button onClick={handleApply} className="btn-primary rounded-xl gap-2">
                        <Filter className="h-5 w-5" /> Appliquer la selection
                    </button>
                )}
                <button onClick={onNext} className="btn-outline rounded-xl gap-2">
                    Voir le Dashboard <BarChart3 className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default PreprocessingPipeline;
