import { useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import Hero from '../components/landing/Hero';
import ProcessOverview from '../components/landing/ProcessOverview';
import MethodDetails from '../components/landing/MethodDetails';
import Pricing from '../components/landing/Pricing';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import DataBot from '../components/DataBot';

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
                <Pricing />
                <Footer />
            </motion.div>

            {/* DataBot floating chatbot */}
            <DataBot />
        </>
    );
};

export default LandingPage;
