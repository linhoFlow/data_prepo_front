import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Menu, X, User, LogOut } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, logout } = useAuth();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Accueil', href: '/' },
        { name: 'Processus', href: '#processus' },
        { name: 'Méthodes', href: '#methodes' },
    ];

    const handleAction = () => {
        navigate('/app');
        setMobileMenuOpen(false);
    };

    const isActive = (path: string) => {
        if (path.startsWith('#')) {
            return location.hash === path;
        }
        return location.pathname === path;
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-white py-4'
                }`}
        >
            <div className="container-fluid flex items-center justify-between px-4 md:px-8">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                        <Database className="text-white h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-navy">
                        DataPrep <span className="text-primary">Pro</span>
                        <div className="h-1 bg-primary/20 w-full rounded-full mt-[-4px]"></div>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden lg:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className={`text-sm font-semibold transition-all duration-300 relative py-1 ${isActive(link.href) ? 'text-primary' : 'text-navy-800 hover:text-primary'
                                }`}
                        >
                            {link.name}
                            {isActive(link.href) && (
                                <motion.div
                                    layoutId="nav-underline"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                />
                            )}
                        </a>
                    ))}
                </div>

                {/* Auth Actions */}
                <div className="hidden lg:flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-navy-700 flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                                <User className="h-4 w-4 text-primary" /> {user?.name}
                            </span>
                            <button
                                onClick={logout}
                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                title="Déconnexion"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                            <button onClick={handleAction} className="btn-primary">
                                Mon Pipeline
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to="/login" className="text-sm font-bold text-navy-800 hover:text-primary px-4 py-2">
                                Se connecter
                            </Link>
                            <button onClick={handleAction} className="btn-primary px-8 rounded-full shadow-lg shadow-primary/20">
                                Démarrer
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="lg:hidden p-2 text-navy"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
                    >
                        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`text-lg font-bold py-2 border-b border-gray-50 ${isActive(link.href) ? 'text-primary pl-2' : 'text-navy-800'
                                        }`}
                                >
                                    {link.name}
                                </a>
                            ))}
                            <div className="flex flex-col gap-3 mt-4">
                                {isAuthenticated ? (
                                    <>
                                        <div className="flex items-center gap-2 py-2 text-navy-700 font-bold border-b border-gray-50">
                                            <User className="h-5 w-5 text-primary" /> {user?.name}
                                        </div>
                                        <button onClick={handleAction} className="btn-primary w-full py-4 rounded-xl">
                                            Mon Pipeline
                                        </button>
                                        <button onClick={logout} className="btn-outline w-full py-4 rounded-xl">
                                            Se déconnecter
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to="/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="btn-outline w-full py-4 rounded-xl text-center font-bold"
                                        >
                                            Se connecter
                                        </Link>
                                        <button onClick={handleAction} className="btn-primary w-full py-4 rounded-xl shadow-lg shadow-primary/20">
                                            Démarrer gratuitement
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
