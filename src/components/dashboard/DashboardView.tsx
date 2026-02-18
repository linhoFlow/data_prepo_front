import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, BarChart3, TrendingUp, Database, CheckCircle, ArrowDown, ArrowLeft, ChevronRight } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area, ScatterChart, Scatter, ZAxis,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Treemap
} from 'recharts';
import type { DatasetInfo, DataRow } from '../../utils/dataProcessor';
import { datasetsApi } from '../../services/api';

interface DashboardViewProps {
    dataset: DatasetInfo;
    originalData: DataRow[];
    initialColumnInfo: any[];
    transformations: string[];
    onExport: (format: 'csv' | 'xlsx' | 'json' | 'xml') => void;
}

const COLORS = ['#3c5fa0', '#5178c0', '#7fa3e0', '#a6c1f0', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const DashboardView: React.FC<DashboardViewProps> = ({ dataset, originalData, initialColumnInfo, transformations, onExport }) => {
    const [activeTab, setActiveTab] = useState<'journal' | 'preview' | 'viz'>('viz');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [correlation, setCorrelation] = useState<{ matrix: number[][]; columns: string[] } | null>(null);
    const [distributions, setDistributions] = useState<any[]>([]);
    const [radarData, setRadarData] = useState<any[]>([]);
    const [treemapData, setTreemapData] = useState<any>(null);
    const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
    const [scatterData, setScatterData] = useState<any>(null);
    const [missingComparison, setMissingComparison] = useState<any[]>([]);
    const [loadingStates, setLoadingStates] = useState({
        basic: true,
        numeric: true,
        categorical: true,
        scatter: true
    });

    const numericCols = useMemo(() => dataset.columnInfo.filter((c) => c.type === 'numeric'), [dataset]);
    const catCols = useMemo(() => dataset.columnInfo.filter(c => c.type === 'categorical' && c.uniqueCount < 50), [dataset]);

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

                    const radar = await Promise.all(
                        numericCols.slice(0, 6).map(async (col) => {
                            try {
                                const res = await datasetsApi.getStats(id, col.name);
                                const stats = res.data;
                                if (!stats) return null;
                                return {
                                    subject: col.name.substring(0, 10),
                                    A: stats.mean,
                                    fullMark: stats.max
                                };
                            } catch { return null; }
                        })
                    );
                    setRadarData(radar.filter((r): r is any => r !== null));
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
        };

        fetchData();
    }, [dataset.id, numericCols, catCols, initialColumnInfo]);

    // Fetch scatter plot data separately when correlation is ready
    useEffect(() => {
        if (!dataset.id || !correlation || !correlation.columns.length) return;

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
        if (!correlation || correlation.matrix.length < 2) return [];
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

    const tabs = [
        { id: 'journal', label: 'Journal des transformations', icon: TrendingUp },
        { id: 'preview', label: 'Aperçu des données finales', icon: Database },
        { id: 'viz', label: 'Visualisation', icon: BarChart3 },
    ] as const;

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

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Lignes finales', value: dataset.rows.toLocaleString(), icon: Database, color: 'bg-blue-100/50 text-blue-600', delta: originalData.length > dataset.rows ? `${originalData.length - dataset.rows} supprimées` : null },
                    { label: 'Colonnes finales', value: dataset.columns, icon: BarChart3, color: 'bg-blue-100/50 text-blue-600', delta: null },
                    { label: 'Transformations', value: transformations.length, icon: TrendingUp, color: 'bg-primary-100/50 text-primary-600', delta: null },
                    { label: 'Qualité', value: `${Math.round((1 - dataset.columnInfo.reduce((s, c) => s + c.nullPercentage, 0) / (dataset.columns * 100)) * 100)}%`, icon: CheckCircle, color: 'bg-blue-50 text-blue-600', delta: null },
                ].map(({ label, value, icon: Icon, color, delta }, i) => (
                    <div key={label} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100/50">
                        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-3`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-2xl font-bold text-navy">{value}</div>
                        <div className="text-sm text-gray-500 font-medium">{label}</div>
                        {delta && <div className="text-xs text-primary mt-1 flex items-center gap-1 font-bold"><ArrowDown className="h-3 w-3" />{delta}</div>}
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
                            <div className="space-y-3">
                                {transformations.map((t, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 text-sm border border-gray-100/50">
                                        <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold">{i + 1}</div>
                                        <span className="text-navy font-medium">{t}</span>
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

                {activeTab === 'viz' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Pie Chart */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[350px] flex flex-col">
                                <h4 className="font-bold text-navy mb-4">Répartition des types</h4>
                                {loadingStates.basic ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span>Chargement...</span>
                                    </div>
                                ) : typeDistribution.length > 0 ? (
                                    <div className="flex-1 min-h-[300px]">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={typeDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    innerRadius={50}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                >
                                                    {typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[350px] flex flex-col">
                                <h4 className="font-bold text-navy mb-4">Valeurs manquantes</h4>
                                {loadingStates.basic ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span>Analyse...</span>
                                    </div>
                                ) : missingComparison.length > 0 ? (
                                    <div className="flex-1 min-h-[300px]">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={missingComparison}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 10 }} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="avant" name="Avant" fill="#7fa3e0" />
                                                <Bar dataKey="apres" name="Après" fill="#3c5fa0" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">Tout est propre !</div>
                                )}
                            </div>

                            {/* Correlation Bar Chart */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[400px] flex flex-col">
                                <h4 className="font-bold text-navy mb-4">Top Corrélations</h4>
                                {loadingStates.basic ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span>Calculs...</span>
                                    </div>
                                ) : topCorrelations.length > 0 ? (
                                    <div className="flex-1 min-h-[350px]">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={topCorrelations} layout="vertical">
                                                <XAxis type="number" domain={[-1, 1]} />
                                                <YAxis dataKey="pair" type="category" width={100} tick={{ fontSize: 10 }} />
                                                <Tooltip />
                                                <Bar dataKey="correlation" fill="#3c5fa0" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">Pas assez de données numériques</div>
                                )}
                            </div>

                            {/* Scatter Chart */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[350px] flex flex-col">
                                <h4 className="font-bold text-navy mb-4">Analyse de Relation</h4>
                                {loadingStates.scatter ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span>Échantillonnage...</span>
                                    </div>
                                ) : scatterData ? (
                                    <div className="flex-1 min-h-[300px]">
                                        <p className="text-[10px] text-gray-500 mb-2">{scatterData.xName} vs {scatterData.yName}</p>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <ScatterChart>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="x" name={scatterData.xName} type="number" tick={{ fontSize: 10 }} />
                                                <YAxis dataKey="y" name={scatterData.yName} type="number" tick={{ fontSize: 10 }} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                <Scatter data={scatterData.data} fill="#3c5fa0" fillOpacity={0.6} />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">Données insuffisantes</div>
                                )}
                            </div>

                            {/* Radar Chart */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[350px] flex flex-col">
                                <h4 className="font-bold text-navy mb-4">Profil Statistique</h4>
                                {loadingStates.numeric ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span>Analyse...</span>
                                    </div>
                                ) : radarData.length >= 3 ? (
                                    <div className="flex-1 min-h-[300px]">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                                                <Radar name="Moyenne" dataKey="A" stroke="#3c5fa0" fill="#3c5fa0" fillOpacity={0.6} />
                                                <Tooltip />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">Moins de 3 colonnes numériques</div>
                                )}
                            </div>

                            {/* Treemap */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[400px] flex flex-col lg:col-span-2">
                                <h4 className="font-bold text-navy mb-4">Répartition Catégorielle {treemapData?.name ? `(${treemapData.name})` : ''}</h4>
                                {loadingStates.categorical ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span>Analyse...</span>
                                    </div>
                                ) : treemapData && treemapData.children?.length > 0 ? (
                                    <div className="flex-1 min-h-[350px]">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <Treemap data={treemapData.children} dataKey="size" stroke="#fff" fill="#3c5fa0">
                                                <Tooltip />
                                            </Treemap>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 italic">Pas de colonnes catégorielles adaptées</div>
                                )}
                            </div>

                            {/* Distributions Area Charts */}
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {loadingStates.numeric ? (
                                    <div className="bg-white rounded-2xl shadow-sm p-10 border border-gray-100/50 flex flex-col items-center justify-center gap-4 text-gray-400 col-span-full">
                                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="font-bold">Analyse des distributions...</span>
                                    </div>
                                ) : distributions.map((dist: any) => dist && (
                                    <div key={dist.name} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 min-h-[300px] flex flex-col">
                                        <h4 className="font-bold text-navy mb-2">Distribution: {dist.name}</h4>
                                        <div className="flex-1 min-h-[200px]">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <AreaChart data={dist.bins}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                                                    <YAxis hide />
                                                    <Tooltip />
                                                    <Area type="monotone" dataKey="count" stroke="#3c5fa0" fill="#3c5fa0" fillOpacity={0.2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardView;
