import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Download, BarChart3, TrendingUp, Database, ArrowDown, CheckCircle } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area, ScatterChart, Scatter,
    Treemap, FunnelChart, Funnel, LabelList, ComposedChart
} from 'recharts';
import type { DatasetInfo, DataRow } from '../../utils/dataProcessor';
import { datasetsApi } from '../../services/api';
import { PremiumGuard } from '../PremiumGuard';

interface DashboardViewProps {
    dataset: DatasetInfo;
    originalData: DataRow[];
    initialColumnInfo: any[];
    transformations: string[];
    onExport: (format: 'csv' | 'xlsx' | 'json' | 'xml') => void;
}

const COLORS = ['#3c5fa0', '#5178c0', '#7fa3e0', '#a6c1f0', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, index, name, size } = props;
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: COLORS[index % COLORS.length],
                    stroke: '#fff',
                    strokeWidth: 2,
                    strokeOpacity: 1,
                }}
            />
            {width > 30 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={10}
                    fontWeight="bold"
                >
                    {name}
                </text>
            )}
            {width > 30 && height > 45 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2 + 15}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={9}
                    fillOpacity={0.8}
                >
                    {size}
                </text>
            )}
        </g>
    );
};

const DashboardView: React.FC<DashboardViewProps> = ({ dataset, originalData, initialColumnInfo, transformations, onExport }) => {
    const { isGuest, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<'journal' | 'preview' | 'viz'>('viz');
    const [vizFilter, setVizFilter] = useState<'all' | 'health' | 'analytics' | 'composition' | 'impact' | 'distribution'>('all');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [correlation, setCorrelation] = useState<{ matrix: number[][]; columns: string[] } | null>(null);
    const [distributions, setDistributions] = useState<any[]>([]);
    const [treemapData, setTreemapData] = useState<any>(null);
    const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
    const [scatterData, setScatterData] = useState<any>(null);
    const [missingComparison, setMissingComparison] = useState<any[]>([]);
    const [funnelData, setFunnelData] = useState<any[]>([]);
    const [waterfallData, setWaterfallData] = useState<any[]>([]);
    const [gaugeData, setGaugeData] = useState<any>(null);
    const [loadingStates, setLoadingStates] = useState({
        basic: true,
        numeric: true,
        categorical: true,
        scatter: true,
        advanced: true
    });

    const numericCols = useMemo(() => dataset.columnInfo.filter((c) => c.type === 'numeric'), [dataset]);
    const catCols = useMemo(() => {
        // Inclure les catégorielles et les numériques à faible cardinalité (ex: encodées)
        return dataset.columnInfo.filter(c =>
            c.type === 'categorical' ||
            (c.type === 'numeric' && c.uniqueCount > 1 && c.uniqueCount <= 10)
        );
    }, [dataset]);

    useEffect(() => {
        if (!dataset.id) return;

        const fetchData = async () => {
            const id = dataset.id!;

            // 1. Parallel basic fetches
            setLoadingStates(prev => ({ ...prev, basic: true }));
            try {
                const [typesRes, qualityRes, corrRes] = await Promise.all([
                    datasetsApi.getTypes(id).catch(() => ({ data: [] })),
                    datasetsApi.getQuality(id).catch(() => ({ data: [] })),
                    datasetsApi.getCorrelation(id).catch(() => ({ data: null }))
                ]);

                if (typesRes.data) setTypeDistribution(typesRes.data);

                if (qualityRes.data) {
                    const currentQuality = qualityRes.data;
                    const comparison = currentQuality.map((cq: any) => {
                        const ic = initialColumnInfo.find(i => i.name === cq.name);
                        return {
                            name: cq.name,
                            avant: ic ? ic.nullCount : cq.nullCount,
                            apres: cq.nullCount
                        };
                    }).filter((d: any) => d.avant > 0 || d.apres > 0);
                    setMissingComparison(comparison);
                }

                if (corrRes.data) setCorrelation(corrRes.data);
            } catch (err) {
                console.error("Error in primary parallel fetch", err);
            } finally {
                setLoadingStates(prev => ({ ...prev, basic: false }));
            }

            // 2. Distributions & Stats (Numeric dependencies)
            if (numericCols.length > 0) {
                setLoadingStates(prev => ({ ...prev, numeric: true }));
                try {
                    const dists = await Promise.all(
                        numericCols.slice(0, 4).map(async (col) => {
                            try {
                                const [dRes, sRes] = await Promise.all([
                                    datasetsApi.getDistribution(id, col.name),
                                    datasetsApi.getStats(id, col.name)
                                ]);
                                return { name: col.name, bins: dRes.data, stats: sRes.data };
                            } catch { return null; }
                        })
                    );
                    setDistributions(dists.filter((d): d is any => d !== null && d.bins && d.stats));

                    // Radar Chart fetching removed

                } catch (err) {
                    console.error("Error fetching numeric analytics", err);
                } finally {
                    setLoadingStates(prev => ({ ...prev, numeric: false }));
                }
            } else {
                setLoadingStates(prev => ({ ...prev, numeric: false }));
            }

            // 3. Categories (Treemap)
            if (catCols.length > 0) {
                setLoadingStates(prev => ({ ...prev, categorical: true }));
                try {
                    const col = catCols[0];
                    const res = await datasetsApi.getCategories(id, col.name);
                    setTreemapData({
                        name: col.name,
                        children: res.data
                    });
                } catch (err) {
                    console.error("Error fetching categorical analytics", err);
                } finally {
                    setLoadingStates(prev => ({ ...prev, categorical: false }));
                }
            } else {
                setLoadingStates(prev => ({ ...prev, categorical: false }));
            }

            // 4. Advanced Visuals (Funnel, Boxplot, Waterfall)
            setLoadingStates(prev => ({ ...prev, advanced: true }));
            try {
                const advancedPromises = [];

                // Funnel (Premier champ catégoriel ou spécifique)
                if (catCols.length > 0) {
                    advancedPromises.push(
                        datasetsApi.getFunnel(id, catCols[0].name)
                            .then(res => setFunnelData(res.data))
                            .catch(err => console.error("Funnel error", err))
                    );
                }

                // Waterfall

                advancedPromises.push(
                    datasetsApi.getWaterfall(id, originalData.length || dataset.rows, transformations)
                        .then(res => setWaterfallData(res.data))
                        .catch(err => console.error("Waterfall error", err))
                );

                // Gauge Quality
                advancedPromises.push(
                    datasetsApi.getGauge(id)
                        .then(res => setGaugeData(res.data))
                        .catch(err => console.error("Gauge error", err))
                );

                await Promise.all(advancedPromises);
            } catch (err) {
                console.error("Error fetching advanced visuals", err);
            } finally {
                setLoadingStates(prev => ({ ...prev, advanced: false }));
            }
        };

        fetchData();
    }, [dataset.id, numericCols, catCols, initialColumnInfo]);

    // Fetch scatter plot data separately when correlation is ready
    useEffect(() => {
        if (!dataset.id || !correlation || !correlation.matrix || !correlation.columns || !correlation.columns.length) return;

        const fetchScatter = async () => {
            setLoadingStates(prev => ({ ...prev, scatter: true }));
            try {
                const pairs: { c1: string, c2: string, corr: number }[] = [];
                for (let i = 0; i < correlation.columns.length; i++) {
                    for (let j = i + 1; j < correlation.columns.length; j++) {
                        pairs.push({ c1: correlation.columns[i], c2: correlation.columns[j], corr: Math.abs(correlation.matrix[i][j]) });
                    }
                }
                const best = pairs.sort((a, b) => b.corr - a.corr)[0];
                if (best) {
                    const res = await datasetsApi.getScatter(dataset.id!, best.c1, best.c2);
                    setScatterData({ xName: best.c1, yName: best.c2, data: res.data });
                }
            } catch (err) {
                console.error("Error fetching scatter data", err);
            } finally {
                setLoadingStates(prev => ({ ...prev, scatter: false }));
            }
        };

        fetchScatter();
    }, [dataset.id, correlation]);

    // Correlation heatmap data for top correlated pairs
    const topCorrelations = useMemo(() => {
        if (!correlation || !correlation.matrix || correlation.matrix.length < 2) return [];
        const pairs: { pair: string; correlation: number }[] = [];
        for (let i = 0; i < correlation.columns.length; i++) {
            for (let j = i + 1; j < correlation.columns.length; j++) {
                pairs.push({
                    pair: `${correlation.columns[i].substring(0, 6)}-${correlation.columns[j].substring(0, 6)}`,
                    correlation: correlation.matrix[i][j],
                });
            }
        }
        return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 10);
    }, [correlation]);

    const allTabs = [
        { id: 'journal', label: 'Journal des transformations', icon: TrendingUp },
        { id: 'preview', label: 'Aperçu des données finales', icon: Database },
        { id: 'viz', label: 'Visualisation', icon: BarChart3 },
    ] as const;

    // Hide "Journal des transformations" for guest users
    const tabs = isGuest && !isAuthenticated
        ? allTabs.filter(t => t.id !== 'journal')
        : allTabs;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-navy">Dashboard de Visualisation</h3>
                        <p className="text-gray-500 mt-1">Résumé des transformations et analyses statistiques</p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="btn-primary rounded-xl gap-2 px-6 py-3 shadow-lg shadow-blue-200/50"
                        >
                            <Download className="h-5 w-5" /> Exporter le résultat
                        </button>

                        {showExportMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-20">
                                    {[
                                        { id: 'csv', label: 'Format CSV (.csv)', icon: 'CSV' },
                                        { id: 'xlsx', label: 'Format Excel (.xlsx)', icon: 'XLS' },
                                        { id: 'json', label: 'Format JSON (.json)', icon: 'JS' },
                                        { id: 'xml', label: 'Format XML (.xml)', icon: 'XML' },
                                    ].map((format) => (
                                        <button
                                            key={format.id}
                                            onClick={() => {
                                                onExport(format.id as any);
                                                setShowExportMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:bg-primary group-hover:text-white transition-colors">
                                                {format.icon}
                                            </div>
                                            <span className="text-sm font-bold text-navy">{format.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* KPIs & Global Health - Professional Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Indicateur Qualité', value: `${gaugeData?.value || 0}%`, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', progress: gaugeData?.value || 0 },
                    { label: 'Lignes Finales', value: (dataset.rows ?? 0).toLocaleString(), icon: Database, color: 'text-blue-600', bg: 'bg-blue-50', delta: originalData.length > (dataset.rows ?? 0) ? `-${originalData.length - (dataset.rows ?? 0)}` : null },
                    { label: 'Nombre de Variables', value: dataset.columns ?? 0, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Opérations Appliquées', value: transformations?.length ?? 0, icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50' },
                ].map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100/50 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                <kpi.icon className="h-6 w-6" />
                            </div>
                            {kpi.delta && <span className="text-xs font-bold text-primary bg-primary-50 px-2 py-1 rounded-full">{kpi.delta}</span>}
                        </div>
                        <div className="text-2xl font-black text-navy">{loadingStates.advanced && kpi.label.includes('Qualité') ? '...' : kpi.value}</div>
                        <div className="text-sm text-gray-500 font-bold uppercase tracking-tight opacity-70">{kpi.label}</div>
                        {kpi.progress !== undefined && (
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${kpi.progress}%` }}
                                    className={`h-full ${kpi.color.replace('text', 'bg')}`}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-white shadow-sm rounded-2xl p-1 gap-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                ? 'bg-primary text-white shadow-lg shadow-blue-200'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-navy'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'journal' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                        <h4 className="font-bold text-navy mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Journal des transformations
                        </h4>
                        {transformations.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">Aucune transformation enregistrée</div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {transformations.map((t, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 text-sm border border-gray-100/50 hover:bg-white hover:shadow-md transition-all duration-300">
                                        <div className="w-8 h-8 shrink-0 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold shadow-sm">{i + 1}</div>
                                        <span className="text-navy font-semibold">{t}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                        <h4 className="font-bold text-navy mb-4 flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            Aperçu des données finales
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-[500px]">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-navy text-white sticky top-0">
                                    <tr>
                                        {dataset.headers.map((h) => (
                                            <th key={h} className="p-3 font-bold whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(dataset.data || []).slice(0, 100).map((row, i) => (
                                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                            {dataset.headers.map((h) => (
                                                <td key={h} className="p-3 whitespace-nowrap text-navy border-r border-gray-50">{String(row[h] ?? '-')}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* Sub-navigation for Visualization Sections */}
                {activeTab === 'viz' && (
                    <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-100/50 rounded-2xl w-fit mb-6">
                        {[
                            { id: 'all', label: 'Tous', icon: Database },
                            { id: 'health', label: 'Santé', icon: CheckCircle },
                            { id: 'analytics', label: 'Analyse', icon: TrendingUp },
                            { id: 'composition', label: 'Structure', icon: BarChart3 },
                            { id: 'impact', label: 'Impact', icon: ArrowDown },
                            { id: 'distribution', label: 'Distributions', icon: TrendingUp },
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setVizFilter(filter.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${vizFilter === filter.id
                                    ? 'bg-white text-navy shadow-sm'
                                    : 'text-gray-500 hover:text-navy hover:bg-white/50'
                                    }`}
                            >
                                <filter.icon className={`h-3.5 w-3.5 ${vizFilter === filter.id ? 'text-primary' : 'text-gray-400'}`} />
                                {filter.label}
                            </button>
                        ))}
                    </div>
                )}

                {activeTab === 'viz' && (
                    <div className="space-y-8">
                        {/* Section 1: Santé & Aperçu Global */}
                        {(vizFilter === 'all' || vizFilter === 'health') && (
                            <section className="space-y-4">
                                <h4 className="flex items-center gap-2 text-lg font-bold text-navy px-2">
                                    <Database className="h-5 w-5 text-primary" /> Santé & Aperçu Global
                                </h4>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Pie Chart */}
                                    <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100/50 min-h-[400px] flex flex-col hover:shadow-md transition-shadow">
                                        <h5 className="font-bold text-navy mb-6 flex justify-between items-center">
                                            Répartition des types
                                            <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-400 font-normal italic">Volume par type</span>
                                        </h5>
                                        {loadingStates.basic ? (
                                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : typeDistribution.length > 0 ? (
                                            <div className="flex-1 min-h-[300px]">
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <PieChart>
                                                        <Pie
                                                            data={typeDistribution}
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={100}
                                                            innerRadius={70}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                                        >
                                                            {typeDistribution.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-gray-400 italic">Aucune donnée trouvée</div>
                                        )}
                                    </div>

                                    {/* Missing Values Bar Chart */}
                                    <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100/50 min-h-[400px] flex flex-col hover:shadow-md transition-shadow">
                                        <h5 className="font-bold text-navy mb-6 flex justify-between items-center">
                                            Qualité des Données (Valeurs Manquantes)
                                            <span className="text-[10px] bg-blue-50 px-2 py-1 rounded text-primary font-bold">Health Check</span>
                                        </h5>
                                        {loadingStates.basic ? (
                                            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : missingComparison.length > 0 ? (
                                            <div className="flex-1 min-h-[300px]">
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={missingComparison} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                                                        <Legend verticalAlign="top" align="right" height={36} />
                                                        <Bar dataKey="avant" name="Avant (Initial)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="apres" name="Après (Nettoyage)" fill="#3c5fa0" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center bg-primary rounded-2xl p-6 shadow-inner animate-in fade-in zoom-in duration-500">
                                                <div className="flex items-center gap-3 text-white">
                                                    <CheckCircle className="h-6 w-6" />
                                                    <span className="text-lg font-black italic tracking-tight">100% de complétude détectée</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Section 2: Analyse Prédictive & Corrélations */}
                        {(vizFilter === 'all' || vizFilter === 'analytics') && (
                            <PremiumGuard
                                feature="correlation_heatmap"
                                blur={true}
                                fallbackMessage={isAuthenticated ? "Passez au mode Pro pour accéder aux corrélations et analyses avancées." : "Créez un compte pour accéder aux visualisations avancées (corrélations, scatter plot)."}
                            >
                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-lg font-bold text-navy px-2">
                                        <TrendingUp className="h-5 w-5 text-primary" /> Analyse Prédictive & Corrélations
                                    </h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Correlation Bar Chart */}
                                        <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100/50 min-h-[450px] flex flex-col hover:shadow-md transition-shadow">
                                            <h5 className="font-bold text-navy mb-6">Top Corrélations Statistiques</h5>
                                            {loadingStates.basic ? (
                                                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : topCorrelations.length > 0 ? (
                                                <div className="flex-1 min-h-[350px]">
                                                    <ResponsiveContainer width="100%" height={350}>
                                                        <BarChart data={topCorrelations} layout="vertical" margin={{ left: 20 }}>
                                                            <XAxis type="number" domain={[-1, 1]} hide />
                                                            <YAxis dataKey="pair" type="category" width={120} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} />
                                                            <Tooltip />
                                                            <Bar dataKey="correlation" radius={[0, 4, 4, 0]}>
                                                                {topCorrelations.map((entry, index) => (
                                                                    <Cell key={index} fill={Math.abs(entry.correlation) > 0.7 ? '#1e3a8a' : '#3c5fa0'} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-gray-400 italic">Pas assez de données numériques pour corréler</div>
                                            )}
                                        </div>

                                        {/* Scatter Chart */}
                                        <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100/50 min-h-[450px] flex flex-col hover:shadow-md transition-shadow">
                                            <h5 className="font-bold text-navy mb-2">Nuage de Points (Relationship)</h5>
                                            <p className="text-[11px] text-gray-400 mb-6 italic">Analyse automatique du couple de variables le plus influent</p>
                                            {loadingStates.scatter ? (
                                                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : scatterData ? (
                                                <div className="flex-1 min-h-[300px]">
                                                    <div className="flex items-center gap-2 mb-4 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                                        <span className="px-2 py-0.5 bg-navy text-white text-[10px] font-bold rounded uppercase">X</span>
                                                        <span className="text-xs font-bold text-navy">{scatterData.xName}</span>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded uppercase">Y</span>
                                                        <span className="text-xs font-bold text-navy">{scatterData.yName}</span>
                                                    </div>
                                                    <ResponsiveContainer width="100%" height={280}>
                                                        <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                            <XAxis type="number" dataKey="x" name="X" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                            <YAxis type="number" dataKey="y" name="Y" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                            <Scatter data={scatterData.data} fill="#3b82f6" fillOpacity={0.6} />
                                                        </ScatterChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-gray-400 italic">Données de relation non disponibles</div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </PremiumGuard>
                        )}

                        {/* Section 3: Structure & Comportement */}
                        {(vizFilter === 'all' || vizFilter === 'composition') && (
                            <PremiumGuard
                                feature="funnel_chart"
                                blur={true}
                                fallbackMessage={isAuthenticated ? "Le graphique funnel et le treemap sont réservés au mode Pro." : "Créez un compte pour accéder aux graphiques avancés (Funnel, Treemap)."}
                            >
                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-lg font-bold text-navy px-2">
                                        <BarChart3 className="h-5 w-5 text-primary" /> Structure & Comportement
                                    </h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Funnel */}
                                        <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100/50 min-h-[450px] flex flex-col hover:shadow-md transition-shadow">
                                            <h5 className="font-bold text-navy mb-6">Entonnoir Categoriel (Funnel)</h5>
                                            {loadingStates.advanced ? (
                                                <div className="flex-1 flex items-center justify-center text-gray-400">
                                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : funnelData.length > 0 ? (
                                                <div className="flex-1 min-h-[350px]">
                                                    <ResponsiveContainer width="100%" height={350}>
                                                        <FunnelChart>
                                                            <Tooltip />
                                                            <Funnel
                                                                dataKey="value"
                                                                data={funnelData}
                                                                isAnimationActive
                                                            >
                                                                {funnelData.map((_, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                                                ))}
                                                                <LabelList position="right" fill="#1e3a8a" stroke="none" dataKey="name" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                                            </Funnel>
                                                        </FunnelChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-gray-400 italic">Pas de colonnes catégorielles détectées</div>
                                            )}
                                        </div>

                                        {/* Treemap */}
                                        <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100/50 min-h-[450px] flex flex-col hover:shadow-md transition-shadow">
                                            <h5 className="font-bold text-navy mb-2">Répartition Hiérarchique (Treemap)</h5>
                                            <p className="text-[11px] text-gray-400 mb-6 italic">{treemapData?.name ? `Colonnes: ${treemapData.name}` : 'Aperçu des densités par catégorie'}</p>
                                            {loadingStates.categorical ? (
                                                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : treemapData && treemapData.children?.length > 0 ? (
                                                <div className="flex-1 min-h-[350px]">
                                                    <ResponsiveContainer width="100%" height={350}>
                                                        <Treemap
                                                            data={treemapData.children}
                                                            dataKey="size"
                                                            stroke="#fff"
                                                            fill="#3c5fa0"
                                                            content={<CustomTreemapContent />}
                                                        >
                                                            <Tooltip />
                                                        </Treemap>
                                                    </ResponsiveContainer>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex items-center justify-center text-gray-400 italic">Complexité catégorielle insuffisante</div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </PremiumGuard>
                        )}

                        {/* Section 4: Impact du Nettoyage */}
                        {(vizFilter === 'all' || vizFilter === 'impact') && (
                            <PremiumGuard
                                feature="advanced_visuals"
                                blur={true}
                                fallbackMessage={isAuthenticated ? "L'analyse d'impact Waterfall nécessite un abonnement Pro." : "Créez un compte pour accéder à l'analyse d'impact (Waterfall)."}
                            >
                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-lg font-bold text-navy px-2">
                                        <ArrowDown className="h-5 w-5 text-primary" /> Impact du Nettoyage (Variance)
                                    </h4>
                                    <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100/50 min-h-[450px] flex flex-col hover:shadow-md transition-shadow">
                                        <h5 className="font-bold text-navy mb-8">Analyse en Cascade (Waterfall)</h5>
                                        {loadingStates.advanced ? (
                                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : waterfallData.length > 0 ? (
                                            <div className="flex-1 min-h-[350px]">
                                                <ResponsiveContainer width="100%" height={350}>
                                                    <ComposedChart data={waterfallData} margin={{ bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} />
                                                        <YAxis axisLine={false} tick={{ fontSize: 10 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" barSize={60}>
                                                            {waterfallData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.type === 'total' ? '#1e3a8a' : entry.value < 0 ? '#ef4444' : '#3c5fa0'} fillOpacity={0.9} />
                                                            ))}
                                                            <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e3a8a' }} />
                                                        </Bar>
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-gray-400 italic">En attente de transformations...</div>
                                        )}
                                    </div>
                                </section>
                            </PremiumGuard>
                        )}

                        {/* Section 5: Distributions & Densités Numériques */}
                        {(vizFilter === 'all' || vizFilter === 'distribution') && (
                            <PremiumGuard
                                feature="advanced_visuals"
                                blur={true}
                                fallbackMessage={isAuthenticated ? "Les analyses de distribution détaillées sont réservées au mode Pro." : "Créez un compte pour accéder aux distributions et densités numériques."}
                            >
                                <section className="space-y-4">
                                    <h4 className="flex items-center gap-2 text-lg font-bold text-navy px-2">
                                        <BarChart3 className="h-5 w-5 text-primary" /> Distributions & Densités Numériques
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {loadingStates.numeric ? (
                                            <div className="bg-white rounded-3xl shadow-sm p-12 border border-gray-100/50 flex flex-col items-center justify-center gap-4 text-gray-400 col-span-full">
                                                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                                <span className="font-bold text-sm">Calcul des densités statistiques...</span>
                                            </div>
                                        ) : distributions.length > 0 ? (
                                            distributions.map((dist: any) => dist && (
                                                <div key={dist.name} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[300px] flex flex-col hover:border-primary transition-colors group">
                                                    <h5 className="font-bold text-navy text-sm mb-4 border-b pb-2 group-hover:text-primary transition-colors">{dist.name}</h5>
                                                    <div className="flex-1 min-h-[150px]">
                                                        <ResponsiveContainer width="100%" height={150}>
                                                            <AreaChart data={dist.bins}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                                                <XAxis dataKey="range" fontSize={8} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                                <YAxis hide />
                                                                <Tooltip cursor={{ stroke: '#3b82f6', strokeWidth: 2 }} />
                                                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-2">
                                                        <div className="text-[10px] text-gray-400">Moyenne: <span className="text-navy font-bold">{dist.stats?.mean?.toFixed(2)}</span></div>
                                                        <div className="text-[10px] text-gray-400">Médiane: <span className="text-navy font-bold">{dist.stats?.median?.toFixed(2)}</span></div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="lg:col-span-4 bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400 italic">
                                                Aucune variable numérique détectée pour l'analyse de distribution
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </PremiumGuard>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardView;
