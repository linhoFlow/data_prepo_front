import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    UserCheck,
    UserMinus,
    Trash2,
    Search,
    Loader2,
    CheckCircle2,
    ShieldAlert,
    ShieldPlus
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { toast } from 'sonner';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

interface Manager {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    tier: string;
    role: string;
}

const AdminManagers = () => {
    const [managers, setManagers] = useState<Manager[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
        isOpen: false,
        id: '',
        name: ''
    });

    const fetchManagers = async () => {
        try {
            const response = await adminApi.getManagers();
            setManagers(response.data);
        } catch (error) {
            console.error("Managers fetch error:", error);
            toast.error("Erreur lors du chargement des gestionnaires");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    const handleToggleStatus = async (id: string) => {
        try {
            await adminApi.toggleManagerStatus(id);
            toast.success("Statut mis à jour");
            fetchManagers();
        } catch (error) {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    const handlePromote = async (id: string, name: string) => {
        if (!window.confirm(`Promouvoir ${name} au rang d'Administrateur ?`)) return;

        try {
            await adminApi.updateManagerRole(id, 'admin');
            toast.success(`${name} est maintenant Administrateur`);
            fetchManagers();
        } catch (error) {
            toast.error("Erreur lors de la promotion");
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.id) return;

        try {
            await adminApi.deleteManager(deleteModal.id);
            toast.success("Gestionnaire supprimé");
            fetchManagers();
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Erreur lors de la suppression");
        }
    };

    const filteredManagers = managers.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-gray-500 font-medium italic">Chargement du personnel...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-navy tracking-tight flex items-center gap-4">
                        Gestionnaires
                        <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-bold">
                            {managers.length} comptes
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Contrôlez les accès et gérez le personnel habilité.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none rounded-2xl py-4 pl-12 pr-4 text-navy transition-all shadow-sm font-medium"
                    />
                </div>
            </div>

            {/* List */}
            {filteredManagers.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-4">
                    <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mx-auto">
                        <Users size={40} />
                    </div>
                    <p className="text-gray-500 font-medium">Aucun gestionnaire trouvé.</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100/10">
                                <th className="px-8 py-6 text-xs font-black text-navy uppercase tracking-widest">Identité</th>
                                <th className="px-8 py-6 text-xs font-black text-navy uppercase tracking-widest">Statut</th>
                                <th className="px-8 py-6 text-xs font-black text-navy uppercase tracking-widest">Type</th>
                                <th className="px-8 py-6 text-xs font-black text-navy uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredManagers.map((m) => (
                                <motion.tr
                                    key={m.id}
                                    layout
                                    className="hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-navy text-white flex items-center justify-center font-bold text-lg shadow-inner">
                                                {m.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-navy text-base leading-tight">{m.name}</p>
                                                <p className="text-gray-400 text-sm">{m.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {m.is_active ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-wider border border-blue-100">
                                                <CheckCircle2 size={14} /> Actif
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 text-xs font-black uppercase tracking-wider border border-sky-100">
                                                <ShieldAlert size={14} /> En attente
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${m.role === 'admin' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {m.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-3">
                                            {m.role !== 'admin' && (
                                                <button
                                                    onClick={() => handlePromote(m.id, m.name)}
                                                    title="Promouvoir Admin"
                                                    className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl hover:bg-primary hover:text-white transition-all duration-300 shadow-sm"
                                                >
                                                    <ShieldPlus size={20} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleToggleStatus(m.id)}
                                                title={m.is_active ? "Désactiver" : "Activer"}
                                                className={`p-3 rounded-2xl transition-all duration-300 shadow-sm border ${m.is_active
                                                    ? 'bg-sky-50 border-sky-100 text-sky-600 hover:bg-sky-600 hover:text-white'
                                                    : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                                                    }`}
                                            >
                                                {m.is_active ? <UserMinus size={20} /> : <UserCheck size={20} />}
                                            </button>

                                            <button
                                                onClick={() => setDeleteModal({ isOpen: true, id: m.id, name: m.name })}
                                                title="Supprimer"
                                                className="p-3 bg-navy-50 border border-navy-100 text-navy rounded-2xl hover:bg-navy hover:text-white transition-all duration-300 shadow-sm"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleDelete}
                title="Supprimer le compte"
                itemName={deleteModal.name}
                message="Êtes-vous sûr de vouloir supprimer ce compte gestionnaire ?"
            />
        </div>
    );
};

export default AdminManagers;
