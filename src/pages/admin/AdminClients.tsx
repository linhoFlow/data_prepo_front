import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    Trash2,
    Search,
    Loader2,
    Mail,
    Calendar
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { toast } from 'sonner';
import ConfirmDeleteModal from '../../components/admin/ConfirmDeleteModal';

interface Client {
    id: string;
    name: string;
    email: string;
    tier: string;
    created_at?: string;
}

const AdminClients = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
        isOpen: false,
        id: '',
        name: ''
    });

    const fetchClients = async () => {
        try {
            const response = await adminApi.getUsers();
            setClients(response.data);
        } catch (error) {
            console.error("Clients fetch error:", error);
            toast.error("Erreur lors du chargement des clients");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleDelete = async () => {
        if (!deleteModal.id) return;

        try {
            await adminApi.deleteUser(deleteModal.id);
            toast.success("Client supprimé");
            fetchClients();
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Erreur lors de la suppression");
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-gray-500 font-medium italic">Chargement des clients...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-navy tracking-tight flex items-center gap-4">
                        Clients
                        <span className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full font-bold">
                            {clients.length} inscrits
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Visualisez et gérez la base d'utilisateurs de la plateforme.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none rounded-2xl py-4 pl-12 pr-4 text-navy transition-all shadow-sm font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => (
                    <motion.div
                        key={client.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-navy group-hover:bg-primary group-hover:text-white transition-colors duration-500 shadow-inner">
                                <Users size={28} />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${client.tier === 'enterprise'
                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                : 'bg-gray-50 text-gray-400 border border-gray-100'
                                }`}>
                                {client.tier === 'enterprise' ? 'Premium' : (client.tier || 'Membre')}
                            </div>
                        </div>

                        <div className="space-y-1 mb-6">
                            <h3 className="text-lg font-bold text-navy truncate">{client.name}</h3>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Mail size={14} />
                                <span className="truncate">{client.email}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold">
                                <Calendar size={14} />
                                {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Date inconnue'}
                            </div>

                            <button
                                onClick={() => setDeleteModal({ isOpen: true, id: client.id, name: client.name })}
                                className="p-2.5 text-gray-400 hover:text-navy hover:bg-blue-50 rounded-xl transition-all"
                                title="Supprimer le client"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                    </motion.div>
                ))}
            </div>

            {filteredClients.length === 0 && (
                <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 italic text-gray-400 font-medium">
                    Aucun client ne correspond à votre recherche.
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                onConfirm={handleDelete}
                title="Supprimer le client"
                itemName={deleteModal.name}
            />
        </div>
    );
};

export default AdminClients;
