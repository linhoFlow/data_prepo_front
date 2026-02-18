import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Database, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Veuillez remplir tous les champs');
            return;
        }
        const success = await login(email, password);
        if (success) navigate('/app');
        else setError('Identifiants incorrects');
    };

    return (
        <div className="min-h-screen flex">
            {/* Left: Form */}
            <motion.div
                className="flex-1 flex items-center justify-center p-8 bg-white"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 text-2xl font-bold text-navy">
                        <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center shadow-md">
                            <Database className="h-5 w-5" />
                        </div>
                        <span>Data<span className="text-primary">Prep</span> <span className="text-primary-400 text-lg font-semibold">Pro</span></span>
                    </Link>

                    <div>
                        <h1 className="text-3xl font-bold text-navy mb-2">Connexion</h1>
                        <p className="text-gray-500">Connectez-vous pour persister vos analyses et acceder a votre historique.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                className="bg-primary-50 border border-primary-200 rounded-xl p-3 text-sm text-primary font-bold"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-navy-700">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-gray-50/50"
                                    placeholder="votre@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-navy-700">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-gray-50/50"
                                    placeholder="Votre mot de passe"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            className="w-full btn-primary py-3.5 rounded-xl text-base font-semibold gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Se connecter
                            <ArrowRight className="h-5 w-5" />
                        </motion.button>
                    </form>

                    <div className="text-center">
                        <p className="text-gray-500 text-sm">
                            Pas de compte ?{' '}
                            <Link to="/register" className="text-primary font-bold hover:underline">
                                Créer un compte
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Right: Illustration */}
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
                        {/* Glow effect */}
                        <div className="absolute -inset-10 bg-white/20 blur-[60px] rounded-full opacity-40 animate-pulse" />

                        <img
                            src="/assets/images/image.png"
                            alt="Data Analysis Illustration"
                            className="relative z-10 w-full rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 backdrop-blur-sm"
                        />

                        {/* Optional subtle text badge if needed, but per request just the image is primary */}
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

export default LoginPage;
