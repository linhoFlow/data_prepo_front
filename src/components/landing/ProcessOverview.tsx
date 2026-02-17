import { motion } from 'framer-motion';
import { Database, ShieldCheck, Zap, BarChart3, CloudIcon } from 'lucide-react';

const ProcessOverview = () => {
    return (
        <section id="processus" className="section bg-gradient-to-br from-primary-50 to-blue-50 py-24 overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white/40 skew-x-12 translate-x-1/4 z-0" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Text Section (Left) */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="space-y-6"
                    >
                        <div className="inline-block px-3 py-1 bg-primary-100 text-primary rounded-full text-xs font-bold">
                            Solution Intelligente
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-navy leading-tight">
                            Plateforme de Prétraitement Autonomisée par l'IA
                        </h2>

                        <div className="w-20 h-1 bg-gradient-to-r from-primary to-blue-400 rounded-full" />

                        <p className="text-lg text-navy-800 font-bold">
                            Un pipeline complet pour transformer vos datasets bruts.
                        </p>

                        <div className="space-y-4 text-navy-700 leading-relaxed text-base">
                            <p>
                                DataPrep Pro automatise les tâches chronophages.
                                Notre IA analyse vos fichiers pour recommander
                                les meilleures stratégies de nettoyage en temps réel.
                            </p>
                            <p>
                                De la détection des outliers à l'encodage,
                                chaque étape est optimisée pour le Machine Learning.
                            </p>
                        </div>

                        <div className="pt-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-3.5 bg-primary hover:bg-primary-600 text-white font-bold rounded-full shadow-xl shadow-primary/20 flex items-center gap-2 transition-all duration-300 text-sm"
                            >
                                <Zap className="h-5 w-5" />
                                Découvrir la technologie
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Features Card Section (Right) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 50 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="relative max-w-lg mx-auto lg:max-w-md lg:ml-auto"
                    >
                        {/* Decorative background shadow */}
                        <div className="absolute inset-0 bg-primary/10 rounded-[2.5rem] transform rotate-3 scale-105 blur-2xl" />

                        <div className="relative bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-primary-50">
                            <h3 className="text-2xl font-bold text-navy border-b border-primary-50 pb-5 mb-8 flex items-center gap-4">
                                <div className="p-2.5 bg-primary-50 rounded-xl">
                                    <CloudIcon className="text-primary h-6 w-6" />
                                </div>
                                Pourquoi DataPrep Pro ?
                            </h3>

                            <div className="space-y-6">
                                {[
                                    { icon: Database, title: "Centralisation des flux", color: "text-blue-600", bg: "bg-blue-50" },
                                    { icon: Zap, title: "Prétraitement par IA", color: "text-primary-600", bg: "bg-primary-50" },
                                    { icon: ShieldCheck, title: "Validation & Intégrité", color: "text-blue-600", bg: "bg-blue-50" },
                                    { icon: BarChart3, title: "Visualisation immédiate", color: "text-primary-700", bg: "bg-primary-100" },
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ x: 8 }}
                                        className="flex items-center gap-5 group transition-all"
                                    >
                                        <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:shadow-md transition-all`}>
                                            <item.icon className={`${item.color} h-6 w-6`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-navy text-lg group-hover:text-primary transition-colors">{item.title}</h4>
                                            <p className="text-xs text-gray-500">Optimisé pour la performance.</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default ProcessOverview;
