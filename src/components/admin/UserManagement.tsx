import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await adminApi.getUsers();
            setUsers(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleTierChange = async (userId: string, currentTier: string) => {
        const newTier = currentTier === 'starter' ? 'enterprise' : 'starter';
        try {
            await adminApi.updateUserTier(userId, newTier);
            fetchUsers();
        } catch (e) {
            alert("Erreur lors du changement de tier");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm("Supprimer cet utilisateur définitivement ?")) {
            try {
                await adminApi.deleteUser(userId);
                fetchUsers();
            } catch (e) {
                alert("Erreur lors de la suppression");
            }
        }
    };

    if (loading) return <div className="text-center py-10">Chargement des utilisateurs...</div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                        <th className="py-4 px-2">Nom</th>
                        <th className="py-4 px-2">Email</th>
                        <th className="py-4 px-2">Tier</th>
                        <th className="py-4 px-2">Rôle</th>
                        <th className="py-4 px-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                    {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="py-4 px-2 font-medium">{u.name}</td>
                            <td className="py-4 px-2 text-slate-300">{u.email}</td>
                            <td className="py-4 px-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                    }`}>
                                    {u.tier === 'enterprise' ? 'Premium' : u.tier}
                                </span>
                            </td>
                            <td className="py-4 px-2 text-slate-400 text-sm">{u.role}</td>
                            <td className="py-4 px-2 text-right">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => handleTierChange(u.id, u.tier)}
                                        className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors"
                                    >
                                        Changer Tier
                                    </button>
                                    {u.role !== 'admin' && (
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1 rounded transition-colors border border-red-900/50"
                                        >
                                            Supprimer
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserManagement;
