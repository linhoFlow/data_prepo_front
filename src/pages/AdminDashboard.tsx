import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import UserManagement from '../components/admin/UserManagement';
import SystemStats from '../components/admin/SystemStats';
import { adminApi } from '../services/api';

const AdminDashboard: React.FC = () => {
    const { isAdmin, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'users' | 'stats'>('users');
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (!isAuthenticated || !isAdmin) {
            navigate('/');
        }
    }, [isAdmin, isAuthenticated, navigate]);

    useEffect(() => {
        if (isAdmin) {
            adminApi.getStats().then(res => setStats(res.data)).catch(console.error);
        }
    }, [isAdmin]);

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        Espace Administrateur
                    </h1>
                    <p className="text-slate-400 mt-2">Gestion globale de la plateforme DataPrep Pro</p>
                </header>

                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-2 rounded-lg transition-all ${activeTab === 'users' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
                    >
                        Utilisateurs
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`px-6 py-2 rounded-lg transition-all ${activeTab === 'stats' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
                    >
                        Statistiques
                    </button>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl">
                    {activeTab === 'users' ? (
                        <UserManagement />
                    ) : (
                        <SystemStats stats={stats} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
