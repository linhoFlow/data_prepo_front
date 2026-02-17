import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate registration
        setTimeout(() => {
            login(email, name);
            navigate('/app');
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen flex bg-white font-outfit">
            {/* Left: Form */}
            <motion.div
                className="flex-1 flex flex-col justify-center px-8 lg:px-24"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="max-w-md w-full mx-auto">
                    <Link to="/" className="flex items-center gap-3 mb-12 group">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                            <Database className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-navy">DataPrep <span className="text-primary-500">Pro</span></span>
                    </Link>

                    <h1 className="text-4xl font-bold text-navy mb-3">Créer un compte</h1>
                    <p className="text-gray-500 mb-10 leading-relaxed">
                        Rejoignez-nous pour sauvegarder vos pipelines de données et accéder à vos analyses avancées.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-navy ml-1">Nom complet</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl py-4 pl-12 pr-4 text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="Ex: Babacar Diop"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-navy ml-1">Email professionnel</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl py-4 pl-12 pr-4 text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="nom@entreprise.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-navy ml-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl py-4 pl-12 pr-12 text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full bg-primary hover:bg-primary-600 text-white rounded-2xl py-4 font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group mt-4 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    S'inscrire <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-gray-500 mt-8 text-sm font-medium">
                        Déjà un compte ? <Link to="/login" className="text-primary font-bold hover:underline">Se connecter</Link>
                    </p>
                </div>
            </motion.div>

            {/* Right: Illustration (Matching Login) */}
            <motion.div
                className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 via-primary-500 to-blue-600 items-center justify-center p-12 relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                {/* Decorative circles */}
                <motion.div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white opacity-[0.07]"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 8, repeat: Infinity }}
                />
                <motion.div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-blue-300 opacity-[0.1]"
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
                        <div className="absolute -inset-10 bg-white/20 blur-[60px] rounded-full opacity-40 animate-pulse" />

                        <img
                            src="/assets/images/image.png"
                            alt="Data Analysis Illustration"
                            className="relative z-10 w-full rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 backdrop-blur-sm"
                        />

                        <motion.div
                            className="absolute -bottom-6 -right-6 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl hidden md:block"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 1, duration: 0.5 }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-white text-xs font-bold uppercase tracking-wider">Traitement Temps Réel</span>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
