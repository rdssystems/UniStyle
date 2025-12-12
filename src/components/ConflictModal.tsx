import React from 'react';

interface ConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

const ConflictModal: React.FC<ConflictModalProps> = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-surface-dark p-6 border border-red-500/50 shadow-glow-red animate-fade-in">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                        <span className="material-symbols-outlined text-3xl">warning</span>
                    </div>

                    <h3 className="text-xl font-bold text-text-primary-dark">Atenção!</h3>

                    <p className="text-text-secondary-dark">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full rounded-lg bg-red-500 py-3 font-bold text-white hover:bg-red-600 transition-colors mt-2"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictModal;
