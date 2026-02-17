import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Database, Search, Info, CheckCircle } from 'lucide-react';

const useCounter = (end: number, duration: number = 2, delay: number = 0) => {
    const [count, setCount] = useState(0);
    const nodeRef = useRef(null);
    const inView = useInView(nodeRef, { once: true, amount: 0.5 });

    useEffect(() => {
        if (!inView) return;

        let startTime: number | null = null;
        let animationFrame: number;

        const updateCount = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            if (elapsed < delay * 1000) {
                animationFrame = requestAnimationFrame(updateCount);
                return;
            }

            const progress = Math.min((elapsed - delay * 1000) / (duration * 1000), 1);
            const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setCount(Math.floor(easedProgress * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(updateCount);
            } else {
                setCount(end);
            }
        };

        animationFrame = requestAnimationFrame(updateCount);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration, delay, inView]);

    return { count, ref: nodeRef };
};

const Hero = () => {
    const navigate = useNavigate();

    return (
        <motion.div
            className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-blue-600 overflow-hidden h-auto min-h-[600px] lg:h-screen flex flex-col justify-center pt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            {/* Animated Circles */}
            <motion.div
                className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-white opacity-10"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
                className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-blue-300 opacity-10"
                animate={{ scale: [1.2, 1, 1.2], x: [0, 30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="container-fluid relative z-10 flex-grow flex items-center justify-center px-4 md:px-8 mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full max-w-7xl">
                    {/* Text Section */}
                    <motion.div
                        className="order-2 lg:order-1 space-y-6 text-center lg:text-left"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-sm font-medium">
                                <span className="mr-2 text-primary-200">✨</span>
                                Intelligence Artificielle au service de vos données
                            </span>
                        </motion.div>

                        <h1 className="text-4xl md:text-5xl xl:text-7xl font-bold mb-4 text-white">
                            DataPrep <motion.span
                                className="relative text-blue-200"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                Pro
                                <motion.div
                                    className="absolute bottom-2 left-0 w-full h-1.5 bg-blue-200/50 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1, delay: 0.8 }}
                                />
                            </motion.span>
                        </h1>

                        <h2 className="text-xl md:text-2xl font-medium text-blue-50">
                            Plateforme intelligente de prétraitement de données
                        </h2>

                        <p className="text-base md:text-lg text-blue-50 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                            Nettoyez, transformez et préparez vos datasets pour le Machine Learning en quelques secondes.
                            Une solution complète qui automatise vos workflows analytiques les plus complexes.
                        </p>

                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                            <button
                                onClick={() => navigate('/app')}
                                className="px-8 py-4 bg-white hover:bg-primary-50 text-primary font-bold rounded-full shadow-xl flex items-center gap-2 transition-all duration-300 -translate-y-1 hover:-translate-y-2"
                            >
                                <Search className="h-5 w-5" />
                                Démarrer l'analyse
                            </button>

                            <button
                                onClick={() => document.getElementById('processus')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-4 bg-transparent hover:bg-white/10 text-white border-2 border-white/30 font-bold rounded-full flex items-center gap-2 transition-all duration-300"
                            >
                                <Info className="h-5 w-5" />
                                Découvrir le processus
                            </button>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex justify-center lg:justify-start gap-12 mt-8">
                            <div className="flex flex-col items-center lg:items-start text-white">
                                {(() => {
                                    const { count, ref } = useCounter(30, 2, 0.8);
                                    return <span ref={ref} className="font-bold text-4xl">{count}+</span>;
                                })()}
                                <span className="text-blue-100 text-sm font-medium">Techniques IA</span>
                            </div>
                            <div className="flex flex-col items-center lg:items-start text-white">
                                {(() => {
                                    const { count, ref } = useCounter(95, 2, 1);
                                    return <span ref={ref} className="font-bold text-4xl">{count}%</span>;
                                })()}
                                <span className="text-blue-100 text-sm font-medium">Taux de précision</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Image Section */}
                    <motion.div
                        className="order-1 lg:order-2 relative w-full h-[400px] lg:h-[550px] flex items-center justify-center pt-8 lg:pt-0"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        <div className="relative w-full max-w-2xl flex items-center justify-center p-4">
                            {/* The "Card" base - perfectly centered background blur */}
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-[3rem] border border-white/10 shadow-3xl transform -rotate-1" />

                            {/* Main Image Container - Centered on the card */}
                            <motion.div
                                className="relative z-10 w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-navy-900/40"
                                whileHover={{ scale: 1.03 }}
                                transition={{ duration: 0.4 }}
                            >
                                <img
                                    src="/assets/images/image.png"
                                    alt="Data Analytics Visualization"
                                    className="w-full h-auto block"
                                    onError={(e) => {
                                        e.currentTarget.parentElement!.style.display = 'none';
                                    }}
                                />
                                {/* Glass shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                            </motion.div>

                            {/* Floating Badges - Positioned symmetrically outside the core image area */}
                            <motion.div
                                className="absolute -top-6 -right-6 bg-white px-6 py-3 rounded-full shadow-2xl z-20 flex items-center gap-2 hidden xl:flex"
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Database className="text-primary h-5 w-5" />
                                <span className="font-bold text-navy text-sm whitespace-nowrap">Gestion MCAR/MAR/MNAR</span>
                            </motion.div>

                            <motion.div
                                className="absolute -bottom-6 -left-6 bg-white px-6 py-3 rounded-full shadow-2xl z-20 flex items-center gap-2 hidden xl:flex"
                                animate={{ y: [0, 10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <CheckCircle className="text-primary h-5 w-5" />
                                <span className="font-bold text-navy text-sm whitespace-nowrap">100% Automatisé</span>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Wave */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] translate-y-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" className="fill-gray-50">
                    <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"></path>
                </svg>
            </div>
        </motion.div>
    );
};

export default Hero;
