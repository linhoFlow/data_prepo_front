import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const success = await login(email, password);
            if (success) {
                const userStr = localStorage.getItem('dataprep_user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    if (user.role === 'admin') {
                        navigate('/admin/dashboard');
                        return;
                    }
                }
                // Si pas admin, déconnexion immédiate
                localStorage.removeItem('dataprep_user');
                localStorage.removeItem('dataprep_token');
                setError('Accès refusé : Ce portail est réservé aux administrateurs.');
            } else {
                setError('Identifiants invalides.');
            }
        } catch (err) {
            setError('Une erreur est survenue lors de la connexion.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-outfit">
            {/* Left: Form */}
            <motion.div
                className="flex-1 flex items-center justify-center p-8 bg-white"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="w-full max-w-md space-y-8">
                    {/* Logo specifically for Admin */}
                    <div className="flex items-center gap-2.5 text-2xl font-bold text-navy">
                        <div className="w-10 h-10 bg-navy text-white rounded-lg flex items-center justify-center shadow-md">
                            <Shield className="h-5 w-5" />
                        </div>
                        <span>Admin<span className="text-primary">Portal</span> <span className="text-primary-400 text-xs font-bold uppercase tracking-widest ml-1">Secure</span></span>
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-navy mb-2">Espace Admin</h1>
                        <p className="text-gray-500">Authentification sécurisée requise. Veuillez saisir vos identifiants d'accès privilégié.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm text-primary font-bold flex items-center gap-3"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-navy ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-gray-50/50 font-medium"
                                    placeholder="admin@dataprep.secure"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-navy ml-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    className="w-full pl-12 pr-12 py-4 rounded-2xl border border-gray-100 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-gray-50/50 font-medium"
                                    placeholder="••••••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-navy hover:bg-slate-800 text-white py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-navy/20"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Se connecter
                                    <ArrowRight className="h-5 w-5" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <p className="text-center text-gray-500 text-sm font-medium">
                        Pas encore d'accès ? <Link to="/admin/register" className="text-navy font-bold hover:underline">S'inscrire comme gestionnaire</Link>
                    </p>
                </div>
            </motion.div>

            {/* Right: Illustration (Mirroring Login) */}
            <motion.div
                className="hidden lg:flex flex-1 bg-gradient-to-br from-navy via-slate-900 to-primary-900 items-center justify-center p-12 relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                {/* Decorative circles - specialized for admin (more professional/darker) */}
                <motion.div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white opacity-[0.03]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-primary-400 opacity-[0.05]"
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 6, repeat: Infinity }}
                />

                <div className="relative z-10 w-full max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative"
                    >
                        {/* Glow effect */}
                        <div className="absolute -inset-10 bg-primary/10 blur-[60px] rounded-full opacity-30 animate-pulse" />

                        <img
                            src="/assets/images/image.png"
                            alt="Admin Data Illustration"
                            className="relative z-10 w-full rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-sm grayscale-[20%]"
                        />
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLoginPage;
