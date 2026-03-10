import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Activity,
    PieChart,
    Loader2,
    Calendar,
    Bell,
    TrendingUp,
    Briefcase,
    Shield,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { toast } from 'sonner';

interface Stats {
    total_users: number;
    clients_count: number;
    managers_count: number;
    tier_distribution: Record<string, number>;
    system_health: string;
    db_latency: string;
    recent_activities: Array<{
        title: string;
        desc: string;
        time: string;
        icon: string;
        color: string;
    }>;
    recent_messages: Array<{
        user: string;
        name: string;
        msg: string;
        time: string;
    }>;
    upcoming_events: Array<{
        title: string;
        date: string;
        type: string;
    }>;
    user_trend: { value: string; up: boolean };
    client_trend: { value: string; up: boolean };
    status: string;
}

const iconMap: Record<string, any> = {
    Users,
    Shield,
    TrendingUp,
    Activity,
    Bell,
    Briefcase
};

const DashboardCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 p-6 flex items-center rounded-xl shadow-sm"
    >
        <div className={`rounded-full p-4 ${color} text-white mr-4`}>
            <Icon className="h-6 w-6" />
        </div>
        <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
            <p className="text-2xl font-bold text-navy">{value}</p>
            {trend && (
                <div className={`text-xs flex items-center mt-1 ${trend.up ? 'text-navy-600' : 'text-navy-400'}`}>
                    <TrendingUp className={`h-3 w-3 mr-1 ${!trend.up ? 'transform rotate-180' : ''}`} />
                    <span>{trend.value}</span>
                </div>
            )}
        </div>
    </motion.div>
);

const AdminStats = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await adminApi.getStats();
                setStats(response.data);
            } catch (error) {
                console.error("Stats fetch error:", error);
                toast.error("Échec de la récupération des statistiques");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-gray-500 font-medium">Synchronisation des données...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy">Tableau de bord</h1>
                    <p className="text-sm text-gray-500 mt-1">Données d'administration du portail DataPrep Pro.</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center text-sm text-gray-600 bg-white px-4 py-2 border border-gray-200 rounded-lg">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Mis à jour le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                    title="Total Utilisateurs"
                    value={stats?.total_users.toString() || "0"}
                    icon={Users}
                    color="bg-primary"
                    trend={stats?.user_trend}
                />
                <DashboardCard
                    title="Clients Actifs"
                    value={stats?.clients_count.toString() || "0"}
                    icon={Briefcase}
                    color="bg-primary"
                    trend={stats?.client_trend}
                />
                <DashboardCard
                    title="Gestionnaires"
                    value={stats?.managers_count.toString() || "0"}
                    icon={Shield}
                    color="bg-primary"
                    trend={{ value: "Stable", up: true }}
                />
                <DashboardCard
                    title="Santé Système"
                    value={stats?.system_health || "100%"}
                    icon={Activity}
                    color="bg-primary"
                    trend={{ value: "Normal", up: true }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Statistics & Tiers */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-200 p-8 rounded-xl"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <PieChart className="text-primary h-6 w-6" />
                        <h2 className="text-xl font-bold">Répartition des Tiers</h2>
                    </div>

                    <div className="space-y-8">
                        {Object.entries(stats?.tier_distribution || {}).map(([tier, count]) => (
                            <div key={tier} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-gray-600 uppercase tracking-tighter">{tier === 'enterprise' ? 'Premium' : tier}</span>
                                    <span className="text-sm font-bold text-navy">{count} utilisateurs</span>
                                </div>
                                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(count / (stats?.total_users || 1)) * 100}%` }}
                                        className={`h-full rounded-full ${tier === 'enterprise' ? 'bg-navy-800' : 'bg-primary'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-gray-100 grid grid-cols-2 gap-8">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-primary">98%</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Taux de rétention</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400">{stats?.db_latency || '12ms'}</div>
                            <div className="text-xs text-gray-500 uppercase mt-1">Latence DB</div>
                        </div>
                    </div>
                </motion.div>

                {/* Recent Activities */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-200 p-8 rounded-xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Activités récentes</h2>
                        <button className="text-sm text-primary hover:underline font-medium">Voir tout</button>
                    </div>

                    <div className="space-y-6">
                        {(stats?.recent_activities || []).map((activity, i) => {
                            const IconComp = iconMap[activity.icon] || Activity;
                            return (
                                <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                    <div className={`p-2 rounded-lg ${activity.color}`}>
                                        <IconComp size={20} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-navy text-sm">{activity.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{activity.desc}</p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{activity.time}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Messages récents */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 p-8 rounded-xl"
                >
                    <h2 className="text-xl font-bold mb-6">Messages Support</h2>
                    <div className="space-y-6">
                        {(stats?.recent_messages || []).map((msg, i) => (
                            <div key={i} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-white">
                                    {msg.user}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-sm text-navy">{msg.name}</p>
                                        <span className="text-[10px] text-gray-400 font-bold">{msg.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px] md:max-w-md">{msg.msg}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="mt-8 w-full py-2.5 text-center text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors">
                        Ouvrir la messagerie
                    </button>
                </motion.div>

                {/* Calendar View Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 p-8 rounded-xl"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Calendar className="text-primary h-6 w-6" />
                        <h2 className="text-xl font-bold">Maintenance & Événements</h2>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-navy">Mars 2026</span>
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-xs">&lt;</div>
                                <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-xs">&gt;</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                            <span>Lu</span><span>Ma</span><span>Me</span><span>Je</span><span>Ve</span><span>Sa</span><span>Di</span>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {[...Array(31)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold ${(i + 1) === new Date().getDate()
                                        ? 'bg-primary text-white shadow-md'
                                        : [15, 22].includes(i + 1)
                                            ? 'bg-blue-100 text-primary border border-blue-200'
                                            : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        {(stats?.upcoming_events || []).length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Aucun événement prévu.</p>
                        ) : (
                            (stats?.upcoming_events || []).map((ev, i) => (
                                <div key={i} className={`flex items-center gap-3 text-xs p-2 rounded-lg border italic ${ev.type === 'maintenance' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-primary/5 text-primary border-primary/10'}`}>
                                    <div className={`w-2 h-2 rounded-full ${ev.type === 'maintenance' ? 'bg-blue-500' : 'bg-primary'}`} />
                                    <span>{new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} : {ev.title}</span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminStats;
