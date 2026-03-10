import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ShieldCheck, ArrowRight, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Timer states
    const [timer, setTimer] = useState(0);
    const [canResend, setCanResend] = useState(false);

    const API_URL = 'http://localhost:5000/api/auth';

    const startTimer = () => {
        setTimer(120); // 2 minutes
        setCanResend(false);
    };

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSendCode = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`${API_URL}/forgot-password`, { email });
            setStep(2);
            startTimer();
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur lors de l'envoi du code");
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!canResend) return;
        setLoading(true);
        setError('');
        setCode(''); // Vider le champ du code précédent
        try {
            await axios.post(`${API_URL}/forgot-password`, { email });
            startTimer();
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur lors du renvoi du code");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`${API_URL}/verify-code`, { email, code });
            setStep(3);
        } catch (err: any) {
            setError(err.response?.data?.message || "Code invalide");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas");
            return;
        }
        setLoading(true);
        setError('');
        try {
            await axios.post(`${API_URL}/reset-password`, { email, code, password, confirm_password: confirmPassword });
            setSuccess("Votre mot de passe a été réinitialisé avec succès !");
            setTimeout(() => {
                onClose();
                setStep(1);
                setSuccess('');
                setEmail('');
                setCode('');
                setPassword('');
                setConfirmPassword('');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || "Erreur lors de la réinitialisation");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                        <X size={24} />
                    </button>

                    <div className="p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
                                {step === 1 && <Mail size={32} />}
                                {step === 2 && <ShieldCheck size={32} />}
                                {step === 3 && <Lock size={32} />}
                            </div>
                            <h2 className="text-2xl font-bold text-navy">
                                {step === 1 && "Mot de passe oublié"}
                                {step === 2 && "Vérification"}
                                {step === 3 && "Nouveau mot de passe"}
                            </h2>
                            <p className="text-gray-500 mt-2 text-sm px-4">
                                {step === 1 && "Entrez votre email pour recevoir un code de vérification à 6 chiffres."}
                                {step === 2 && `Nous avons envoyé un code à ${email}`}
                                {step === 3 && "Créez un mot de passe robuste pour sécuriser votre compte."}
                            </p>
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-6 p-4 bg-primary-50 border border-primary-100 rounded-xl flex items-center gap-3 text-primary text-sm font-medium"
                            >
                                <AlertCircle size={18} />
                                {error}
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-6 p-4 bg-primary-50 border border-primary-100 rounded-xl flex items-center gap-3 text-primary text-sm font-medium"
                            >
                                <CheckCircle2 size={18} />
                                {success}
                            </motion.div>
                        )}

                        {/* Forms */}
                        {!success && (
                            <div className="space-y-6">
                                {step === 1 && (
                                    <form onSubmit={handleSendCode} className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-navy-700 ml-1">Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none rounded-2xl py-3.5 pl-12 pr-4 text-navy transition-all"
                                                    placeholder="votre@email.com"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 group"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : "Envoyer le code"}
                                            {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                                        </button>
                                    </form>
                                )}

                                {step === 2 && (
                                    <form onSubmit={handleVerifyCode} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-navy-700 ml-1 text-center block">Code à 6 chiffres</label>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    required
                                                    value={code}
                                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none rounded-2xl py-4 text-center text-3xl font-bold tracking-[0.5em] text-primary transition-all"
                                                    placeholder="••••••"
                                                />
                                            </div>

                                            {/* Timer UI */}
                                            <div className="text-center">
                                                {!canResend ? (
                                                    <p className="text-xs text-gray-400 font-medium">
                                                        Renvoyer le code dans <span className="text-primary font-bold">{formatTime(timer)}</span>
                                                    </p>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleResendCode}
                                                        className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary-600 transition-colors uppercase tracking-wider"
                                                    >
                                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                                        Renvoyer le code
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : "Vérifier le code"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="w-full text-sm text-gray-500 hover:text-primary font-medium transition-colors"
                                        >
                                            Modifier l'email
                                        </button>
                                    </form>
                                )}

                                {step === 3 && (
                                    <form onSubmit={handleResetPassword} className="space-y-5">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-navy-700 ml-1">Nouveau mot de passe</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                    <input
                                                        type="password"
                                                        required
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none rounded-2xl py-3.5 pl-12 pr-4 text-navy transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-navy-700 ml-1">Confirmer le mot de passe</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                    <input
                                                        type="password"
                                                        required
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none rounded-2xl py-3.5 pl-12 pr-4 text-navy transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full btn-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : "Réinitialiser"}
                                        </button>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ForgotPasswordModal;
