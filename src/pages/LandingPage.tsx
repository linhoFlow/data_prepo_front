import { useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import Hero from '../components/landing/Hero';
import ProcessOverview from '../components/landing/ProcessOverview';
import MethodDetails from '../components/landing/MethodDetails';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const LandingPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = 'DataPrep Pro - Automatisation du Pretraitement de Donnees';
    }, []);

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

    return (
        <>
            <Navbar />
            {/* Scroll progress bar */}
            <motion.div className="fixed top-[56px] left-0 right-0 h-1 bg-primary z-50 origin-left" style={{ scaleX }} />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="pt-14"
            >
                <Hero />
                <ProcessOverview />
                <MethodDetails />
                <Footer />

                {/* Back to top */}
                <motion.button
                    className="fixed bottom-6 right-6 bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-50 hover:bg-primary-700 transition-colors"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <ArrowUp size={24} />
                </motion.button>
            </motion.div>
        </>
    );
};

export default LandingPage;
