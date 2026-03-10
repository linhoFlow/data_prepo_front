import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    itemName: string;
    message?: string;
    confirmText?: string;
}

const ConfirmDeleteModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    itemName,
    message,
    confirmText = "Supprimer définitivement"
}: ConfirmDeleteModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative z-10 border border-gray-100"
                    >
                        {/* Header with Icon */}
                        <div className="bg-blue-50/50 p-6 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-navy shadow-lg mb-4 border border-blue-100">
                                <AlertCircle size={32} />
                            </div>
                            <h2 className="text-xl font-black text-navy leading-tight">{title}</h2>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <p className="text-gray-500 font-medium text-center leading-relaxed text-sm">
                                {message || `Voulez-vous supprimer `}
                                <span className="text-navy font-bold">{itemName}</span> ?
                                <br />
                                <span className="text-xs italic opacity-75">Cette action est irréversible.</span>
                            </p>

                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className="w-full bg-navy hover:bg-navy/90 text-white font-black py-3.5 rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    {confirmText}
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full bg-slate-50 hover:bg-slate-100 text-gray-500 font-bold py-3.5 rounded-xl transition-all active:scale-95"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>

                        {/* Close Button X */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDeleteModal;
