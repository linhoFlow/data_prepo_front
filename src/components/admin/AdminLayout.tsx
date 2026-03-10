import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Menu, Shield } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../../contexts/AuthContext';

const AdminLayout = () => {
    const { isAdmin, isAuthenticated } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Guard: Redirect to admin login if not admin or not authenticated
    if (!isAuthenticated || !isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-outfit">
            <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center">
                            <Shield size={18} />
                        </div>
                        <span className="font-bold text-navy text-sm">Admin<span className="text-primary">Panel</span></span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-8 lg:p-12">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
