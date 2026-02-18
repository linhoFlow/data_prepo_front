import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, BarChart3, TrendingUp, Database, CheckCircle, ArrowDown, ArrowLeft, ChevronRight } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    AreaChart, Area, ScatterChart, Scatter, ZAxis,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Treemap
} from 'recharts';
import type { DatasetInfo, DataRow } from '../../utils/dataProcessor';
import { computeColumnStats, correlationMatrix } from '../../utils/dataProcessor';

interface DashboardViewProps {
    dataset: DatasetInfo;
    originalData: DataRow[];
    transformations: string[];
    onExport: (format: 'csv' | 'xlsx' | 'json' | 'xml') => void;
}

const COLORS = ['#3c5fa0', '#5178c0', '#7fa3e0', '#a6c1f0', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const DashboardView: React.FC<DashboardViewProps> = ({ dataset, originalData, transformations, onExport }) => {
    const [activeTab, setActiveTab] = useState<'journal' | 'preview' | 'viz'>('journal');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const numericCols = useMemo(() => dataset.columnInfo.filter((c) => c.type === 'numeric'), [dataset]);

    // Distribution data for first few numeric columns
    const distributionData = useMemo(() => {
        return numericCols.slice(0, 4).map((col) => {
            const values = dataset.data.map((r) => Number(r[col.name])).filter((v) => !isNaN(v));
            const stats = computeColumnStats(dataset.data, col.name);
            if (!stats) return null;
            // Create histogram bins
            const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
            const range = stats.max - stats.min;
            const binWidth = range / binCount || 1;
            const bins: { range: string; count: number }[] = [];
            for (let i = 0; i < binCount; i++) {
                const lo = stats.min + i * binWidth;
                const hi = lo + binWidth;
                const count = values.filter((v) => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
                bins.push({ range: lo.toFixed(1), count });
            }
            return { name: col.name, bins, stats };
        }).filter(Boolean);
    }, [dataset, numericCols]);

    // Column type distribution
    const typeDistribution = useMemo(() => {
        const types: Record<string, number> = {};
        dataset.columnInfo.forEach((c) => { types[c.type] = (types[c.type] || 0) + 1; });
        return Object.entries(types).map(([name, value]) => ({ name, value }));
    }, [dataset]);

    // Correlation heatmap data for top correlated pairs
    const topCorrelations = useMemo(() => {
        if (numericCols.length < 2) return [];
        const numCols = numericCols.map((c) => c.name);
        const corr = correlationMatrix(dataset.data, numCols);
        const pairs: { pair: string; correlation: number }[] = [];
        for (let i = 0; i < corr.columns.length; i++) {
            for (let j = i + 1; j < corr.columns.length; j++) {
                pairs.push({
                    pair: `${corr.columns[i].substring(0, 6)}-${corr.columns[j].substring(0, 6)}`,
                    correlation: corr.matrix[i][j],
                });
            }
        }
        return pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 10);
    }, [dataset, numericCols]);

    // Missing values comparison
    const missingComparison = useMemo(() => {
        return dataset.headers.slice(0, 12).map((h) => {
            const origCol = originalData.filter((r) => r[h] === null || r[h] === undefined || r[h] === '').length;
            const currCol = dataset.data.filter((r) => r[h] === null || r[h] === undefined || r[h] === '').length;
            return { name: h.substring(0, 12), avant: origCol, apres: currCol };
        }).filter((d) => d.avant > 0 || d.apres > 0);
    }, [dataset, originalData]);

    // Data for Scatter Plot (top 2 correlated columns)
    const scatterData = useMemo(() => {
        if (topCorrelations.length === 0) return null;
        const [col1, col2] = topCorrelations[0].pair.split('-');
        // Find full names
        const name1 = numericCols.find(c => c.name.startsWith(col1))?.name || numericCols[0].name;
        const name2 = numericCols.find(c => c.name.startsWith(col2))?.name || numericCols[1].name;

        const data = dataset.data.slice(0, 500).map(r => ({
            x: Number(r[name1]),
            y: Number(r[name2])
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));

        return { xName: name1, yName: name2, data };
    }, [dataset, topCorrelations, numericCols]);

    // Data for Radar Chart (Metrics comparison)
    const radarData = useMemo(() => {
        const topNumeric = numericCols.slice(0, 6);
        return topNumeric.map(col => {
            const stats = computeColumnStats(dataset.data, col.name);
            if (!stats) return null;
            return {
                subject: col.name.substring(0, 10),
                A: stats.mean,
                fullMark: stats.max
            };
        }).filter(Boolean);
    }, [dataset, numericCols]);

    // Data for Treemap (Categorical distribution)
    const treemapData = useMemo(() => {
        const catCols = dataset.columnInfo.filter(c => c.type === 'categorical' && c.uniqueCount < 20);
        if (catCols.length === 0) return null;
        const col = catCols[0];
        const counts: Record<string, number> = {};
        dataset.data.forEach(r => {
            const val = String(r[col.name] || 'N/A');
            counts[val] = (counts[val] || 0) + 1;
        });
        return {
            name: col.name,
            children: Object.entries(counts).map(([name, size]) => ({ name, size }))
        };
    }, [dataset]);

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
                        <motion.button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="btn-primary rounded-xl gap-2 px-6 py-3 shadow-lg shadow-blue-200/50"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Download className="h-5 w-5" /> Exporter le résultat
                        </motion.button>

                        <AnimatePresence>
                            {showExportMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-20"
                                    >
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
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Lignes finales', value: dataset.rows.toLocaleString(), icon: Database, color: 'bg-blue-100/50 text-blue-600', delta: originalData.length > dataset.rows ? `${originalData.length - dataset.rows} supprimées` : null },
                    { label: 'Colonnes finales', value: dataset.columns, icon: BarChart3, color: 'bg-blue-100/50 text-blue-600', delta: null },
                    { label: 'Transformations', value: transformations.length, icon: TrendingUp, color: 'bg-primary-100/50 text-primary-600', delta: null },
                    { label: 'Qualité', value: `${Math.round((1 - dataset.columnInfo.reduce((s, c) => s + c.nullPercentage, 0) / (dataset.columns * 100)) * 100)}%`, icon: CheckCircle, color: 'bg-blue-50 text-blue-600', delta: null },
                ].map(({ label, value, icon: Icon, color, delta }, i) => (
                    <motion.div
                        key={label}
                        className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100/50 hover:border-primary-200 transition-all hover:shadow-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-3`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="text-2xl font-bold text-navy">{value}</div>
                        <div className="text-sm text-gray-500 font-medium">{label}</div>
                        {delta && <div className="text-xs text-primary mt-1 flex items-center gap-1 font-bold"><ArrowDown className="h-3 w-3" />{delta}</div>}
                    </motion.div>
                ))}
            </div>

            {/* Tabs Navigation */}
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
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="min-h-[400px]"
                >
                    {activeTab === 'journal' && (
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                            <h4 className="font-bold text-navy mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Journal des transformations
                            </h4>
                            {transformations.length === 0 ? (
                                <div className="py-12 text-center text-gray-400">
                                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    Aucune transformation enregistrée
                                </div>
                            ) : (
                                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="space-y-3">
                                        {transformations.map((t, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center gap-4 bg-gray-50 hover:bg-blue-50 transition-colors rounded-xl p-4 text-sm border border-gray-100/50"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">{i + 1}</div>
                                                <span className="text-navy font-medium leading-tight">{t}</span>
                                                <div className="ml-auto text-[10px] text-gray-400 font-bold uppercase tracking-wider">Appliqué</div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                                <h4 className="font-bold text-navy flex items-center gap-2">
                                    <Database className="h-5 w-5 text-primary" />
                                    Aperçu des données finales
                                </h4>

                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                    <button
                                        onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                    >
                                        <ArrowLeft className="h-4 w-4 text-navy" />
                                    </button>
                                    <span className="text-xs font-bold text-navy px-4 border-x border-gray-200">
                                        Page {currentPage} sur {Math.ceil(dataset.data.length / 10)}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((prev: number) => Math.min(Math.ceil(dataset.data.length / 10), prev + 1))}
                                        disabled={currentPage >= Math.ceil(dataset.data.length / 10)}
                                        className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                    >
                                        <ChevronRight className="h-4 w-4 text-navy" />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-100 scrollbar-thin mb-4">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="bg-navy text-white sticky top-0">
                                            {dataset.headers.map((h) => (
                                                <th key={h} className="p-3 font-bold whitespace-nowrap border-r border-white/10 uppercase tracking-tighter">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {dataset.data.slice((currentPage - 1) * 10, currentPage * 10).map((row, i) => (
                                            <tr key={i} className={`hover:bg-blue-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                                                {dataset.headers.map((h) => (
                                                    <td key={h} className="p-3 whitespace-nowrap text-navy border-r border-gray-50 max-w-[200px] truncate">{String(row[h] ?? '-')}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Affichage de {(currentPage - 1) * 10 + 1} à {Math.min(currentPage * 10, dataset.data.length)} sur {dataset.data.length} lignes
                            </div>
                        </div>
                    )}

                    {activeTab === 'viz' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Column types pie chart */}
                                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                                    <h4 className="font-bold text-navy mb-4">Répartition des types</h4>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={typeDistribution}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                innerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, value }) => `${name} (${value})`}
                                            >
                                                {typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Missing values comparison */}
                                {missingComparison.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                                        <h4 className="font-bold text-navy mb-4">Réduction des valeurs manquantes</h4>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={missingComparison} barGap={2}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Legend iconType="circle" />
                                                <Bar dataKey="avant" name="Avant Nettoyage" fill="#7fa3e0" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="apres" name="Après Nettoyage" fill="#3c5fa0" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Top correlations */}
                                {topCorrelations.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                                        <h4 className="font-bold text-navy mb-4 text-center">Top Corrélations (Positives & Négatives)</h4>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={topCorrelations} layout="vertical" barSize={20} margin={{ left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={true} horizontal={false} />
                                                <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                                                <YAxis dataKey="pair" type="category" width={120} tick={{ fontSize: 10, fill: '#1e3a8a', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Bar dataKey="correlation" name="Indice de Corrélation" radius={[0, 4, 4, 0]}>
                                                    {topCorrelations.map((entry, i) => (
                                                        <Cell key={i} fill={entry.correlation >= 0 ? '#3c5fa0' : '#7fa3e0'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Scatter Plot */}
                                {scatterData && (
                                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                                        <h4 className="font-bold text-navy mb-4">Analyse de Relation (Nuage de points)</h4>
                                        <p className="text-[10px] text-gray-400 mb-4 font-bold uppercase tracking-widest">{scatterData.xName} vs {scatterData.yName}</p>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis type="number" dataKey="x" name={scatterData.xName} unit="" tick={{ fontSize: 10 }} label={{ value: scatterData.xName, position: 'bottom', offset: 0, fontSize: 10 }} />
                                                <YAxis type="number" dataKey="y" name={scatterData.yName} unit="" tick={{ fontSize: 10 }} label={{ value: scatterData.yName, angle: -90, position: 'left', fontSize: 10 }} />
                                                <ZAxis type="number" range={[50, 400]} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                <Scatter name="Data Point" data={scatterData.data} fill="#3c5fa0" fillOpacity={0.6} />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Radar Chart */}
                                {radarData.length >= 3 && (
                                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                                        <h4 className="font-bold text-navy mb-4">Profil Statistique (Radar)</h4>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                <PolarGrid stroke="#f0f0f0" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: 8 }} />
                                                <Radar name="Moyenne" dataKey="A" stroke="#3c5fa0" fill="#3c5fa0" fillOpacity={0.5} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Treemap */}
                                {treemapData && treemapData.children.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50 lg:col-span-2">
                                        <h4 className="font-bold text-navy mb-4 text-center">Répartition Hiérarchique: {treemapData.name} (Treemap)</h4>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <Treemap
                                                data={treemapData.children}
                                                dataKey="size"
                                                aspectRatio={4 / 3}
                                                stroke="#fff"
                                                fill="#3c5fa0"
                                            >
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            </Treemap>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Distributions */}
                                {distributionData.map((dist) => dist && (
                                    <div key={dist.name} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100/50">
                                        <h4 className="font-bold text-navy mb-1 flex items-center justify-between">
                                            <span>Distribution: {dist.name}</span>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-gray-50 px-2 py-1 rounded">
                                                Gaussienne
                                            </div>
                                        </h4>
                                        <div className="text-[10px] text-gray-400 mb-4 font-bold uppercase tracking-widest">
                                            Moy: {dist.stats.mean.toFixed(2)} | Méd: {dist.stats.median.toFixed(2)} | Std: {dist.stats.std.toFixed(2)}
                                        </div>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <AreaChart data={dist.bins}>
                                                <defs>
                                                    <linearGradient id={`gradient_${dist.name}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3c5fa0" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3c5fa0" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
                                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} hide />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Area type="monotone" dataKey="count" stroke="#3c5fa0" fill={`url(#gradient_${dist.name})`} strokeWidth={3} animationDuration={1000} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default DashboardView;
