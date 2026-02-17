import { Database, Mail, Phone, MapPin, Github, Linkedin, Twitter, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-navy text-white pt-24 pb-12 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary opacity-50" />

            <div className="container mx-auto px-4 md:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 group-hover:rotate-6 transition-transform">
                                <Database className="text-primary h-7 w-7" />
                            </div>
                            <span className="text-3xl font-bold tracking-tight">
                                DataPrep <span className="text-primary-400">Pro</span>
                            </span>
                        </Link>
                        <p className="text-navy-100 text-lg leading-relaxed opacity-80">
                            La plateforme leader pour le nettoyage et la préparation automatisée de données par IA.
                            Préparez vos assets analytiques avec une précision inégalée.
                        </p>
                        <div className="flex gap-4 pt-4">
                            {[
                                { icon: Twitter, href: '#' },
                                { icon: Github, href: '#' },
                                { icon: Linkedin, href: '#' },
                                { icon: Globe, href: '#' },
                            ].map((social, idx) => (
                                <a
                                    key={idx}
                                    href={social.href}
                                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300"
                                >
                                    <social.icon className="h-5 w-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="lg:pl-8">
                        <h4 className="text-xl font-bold mb-8 flex items-center gap-2">
                            Navigation
                        </h4>
                        <ul className="space-y-4">
                            {['Accueil', 'Processus', 'Méthodes'].map((item) => (
                                <li key={item}>
                                    <a
                                        href={`#${item.toLowerCase()}`}
                                        className="text-navy-100 hover:text-primary-400 flex items-center gap-2 group transition-all"
                                    >
                                        <ArrowRight className="h-4 w-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                                        {item}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="text-xl font-bold mb-8 flex items-center gap-2">
                            Ressources
                        </h4>
                        <ul className="space-y-4">
                            <li><Link to="/app" className="text-navy-100 hover:text-primary-400 flex items-center gap-2 transition-colors">Pipeline Analytics</Link></li>
                            <li><Link to="/login" className="text-navy-100 hover:text-primary-400 flex items-center gap-2 transition-colors">Portail Utilisateur</Link></li>
                            <li><a href="#" className="text-navy-100 hover:text-primary-400 flex items-center gap-2 transition-colors">Base de Connaissance</a></li>
                            <li><a href="#" className="text-navy-100 hover:text-primary-400 flex items-center gap-2 transition-colors">Tarification Pro</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-xl font-bold mb-8 flex items-center gap-2">
                            Contact
                        </h4>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                    <Mail className="h-5 w-5 text-primary-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-navy-400 font-bold uppercase tracking-wider mb-1">Email</div>
                                    <span className="text-navy-50 font-medium">contact@datapreppro.com</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                    <Phone className="h-5 w-5 text-primary-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-navy-400 font-bold uppercase tracking-wider mb-1">Téléphone</div>
                                    <span className="text-navy-50 font-medium">+221 33 800 12 34</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-5 w-5 text-primary-400" />
                                </div>
                                <div>
                                    <div className="text-xs text-navy-400 font-bold uppercase tracking-wider mb-1">Siège</div>
                                    <span className="text-navy-50 font-medium">Dakar, Sénégal - Tech Hub</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 text-navy-300 font-medium">
                        <span>© 2024 DataPrep Pro. Une solution ISI Group.</span>
                    </div>
                    <div className="flex gap-10 text-sm font-bold">
                        <a href="#" className="text-navy-400 hover:text-white transition-colors">Politique de Confidentialité</a>
                        <a href="#" className="text-navy-400 hover:text-white transition-colors">Mentions Légales</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
