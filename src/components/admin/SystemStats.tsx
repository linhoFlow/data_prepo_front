import React from 'react';

interface StatsProps {
    stats: {
        total_users: number;
        tier_distribution: Record<string, number>;
        status: string;
    } | null;
}

const SystemStats: React.FC<StatsProps> = ({ stats }) => {
    if (!stats) return <div className="text-center py-10 text-slate-400">Calcul des statistiques...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Utilisateurs Totaux</p>
                <p className="text-3xl font-bold text-white">{stats.total_users}</p>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Services</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-xl font-bold text-white uppercase">{stats.status}</p>
                </div>
            </div>

            <div className="col-span-1 md:col-span-3 bg-slate-900/50 p-6 rounded-xl border border-slate-700 mt-4">
                <p className="text-slate-400 text-sm mb-4">Répartition des Tiers</p>
                <div className="space-y-4">
                    {Object.entries(stats.tier_distribution).map(([tier, count]) => {
                        const percent = (count / stats.total_users) * 100;
                        return (
                            <div key={tier}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="capitalize">{tier}</span>
                                    <span className="text-slate-400">{count} ({percent.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${tier === 'enterprise' ? 'bg-purple-500' : 'bg-blue-500'}`}
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SystemStats;
