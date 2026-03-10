import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    UserCog,
    Shield,
    LogOut,
    X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const AdminSidebar = ({ isOpen, onClose }: AdminSidebarProps) => {
    const { logout } = useAuth();

    const menuItems = [
        {
            title: 'Tableau de bord',
            path: '/admin/dashboard',
            icon: LayoutDashboard
        },
        {
            title: 'Gestion Clients',
            path: '/admin/clients',
            icon: Users
        },
        {
            title: 'Gestionnaires',
            path: '/admin/managers',
            icon: UserCog
        }
    ];

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-navy/40 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col border-r border-gray-200 shadow-xl transition-transform duration-300 transform
                lg:translate-x-0 lg:static lg:inset-auto lg:shadow-lg
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo Section */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary text-white rounded-lg flex items-center justify-center shadow-sm">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-navy tracking-tight">Admin<span className="text-primary">Panel</span></h1>
                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">DataPrep Pro</p>
                        </div>
                    </div>
                    {/* Mobile Close Button */}
                    <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-navy hover:bg-gray-50 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }: { isActive: boolean }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                                ${isActive
                                    ? 'bg-navy text-white font-medium shadow-md'
                                    : 'text-gray-700 hover:bg-gray-100'}
                            `}
                        >
                            {({ isActive }: { isActive: boolean }) => (
                                <>
                                    <item.icon size={18} className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                                    <span className="text-sm">{item.title}</span>
                                    {isActive && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-gray-100 space-y-4">
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] text-navy font-bold uppercase tracking-wider">Session Live</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium italic">Accès Administrateur</p>
                    </div>

                    <div className="space-y-1">
                        <button
                            onClick={() => { logout(); onClose?.(); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-navy transition-all duration-200 text-sm font-medium group"
                        >
                            <LogOut size={16} className="text-gray-400 group-hover:text-primary" />
                            Déconnexion
                        </button>
                        <div className="pt-4 text-center">
                            <p className="text-[10px] text-gray-400 font-medium">DataPrep Pro v1.2</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
