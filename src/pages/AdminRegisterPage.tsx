import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import axios from 'axios';

const AdminRegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/auth/register', {
                name,
                email,
                password,
                role: 'manager' // Managers by default
            });
            setSuccess(true);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-outfit">
            {/* Left: Form or Success Message */}
            <motion.div
                className="flex-1 flex flex-col justify-center px-8 lg:px-24"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="max-w-md w-full mx-auto">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-navy text-white rounded-xl flex items-center justify-center shadow-lg shadow-navy/20">
                            <Shield className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold text-navy">Admin<span className="text-primary">Portal</span> <span className="text-primary-400 text-[10px] font-black uppercase tracking-widest ml-1 bg-primary/5 px-2 py-1 rounded-lg">Manager Registration</span></span>
                    </div>

                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center"
                            >
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-sm">
                                    <Shield className="h-10 w-10" />
                                </div>
                                <h2 className="text-3xl font-bold text-navy mb-4">Demande envoyée !</h2>
                                <p className="text-gray-500 mb-10 leading-relaxed">
                                    Merci <span className="text-navy font-bold">{name}</span>. Votre demande d'accès en tant que gestionnaire a été transmise. Un administrateur doit activer votre compte avant que vous ne puissiez vous connecter.
                                </p>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="inline-flex items-center justify-center gap-2 w-full bg-navy hover:bg-slate-800 text-white rounded-2xl py-4 font-bold transition-all shadow-lg shadow-navy/20 group"
                                >
                                    Retour à la connexion <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div key="form" exit={{ opacity: 0, y: -20 }}>
                                <h1 className="text-4xl font-bold text-navy mb-3">Rejoindre l'équipe</h1>
                                <p className="text-gray-500 mb-10 leading-relaxed">
                                    Créez un compte gestionnaire pour commencer à administrer la plateforme. Votre accès sera soumis à validation.
                                </p>

                                <form onSubmit={handleRegister} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-navy ml-1">Nom complet</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-navy placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy transition-all font-medium"
                                                placeholder="Babacar Diop"
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
                                                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-navy placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy transition-all font-medium"
                                                placeholder="nom@dataprep.secure"
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
                                                className="w-full bg-slate-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 text-navy placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy transition-all font-medium"
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
                                        disabled={loading}
                                        className={`w-full bg-navy hover:bg-slate-800 text-white rounded-2xl py-4 font-bold transition-all shadow-lg shadow-navy/20 flex items-center justify-center gap-2 group mt-4 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                S'inscrire <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <p className="text-center text-gray-500 mt-8 text-sm font-medium">
                                    Déjà un accès ? <Link to="/admin" className="text-navy font-bold hover:underline">Se connecter</Link>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Right: Illustration */}
            <motion.div
                className="hidden lg:flex flex-1 bg-gradient-to-br from-navy via-slate-900 to-primary-900 items-center justify-center p-12 relative overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                <div className="relative z-10 w-full max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <div className="absolute -inset-10 bg-primary/10 blur-[60px] rounded-full opacity-30 animate-pulse" />
                        <img
                            src="/assets/images/image.png"
                            alt="Admin Registration Illustration"
                            className="relative z-10 w-full rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-sm grayscale-[20%]"
                        />
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminRegisterPage;
