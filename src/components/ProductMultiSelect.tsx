import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';

interface ProductMultiSelectProps {
    availableProducts: Product[];
    selectedProductIds: string[]; // Apenas IDs para gerenciar o estado dos checkboxes
    onSelectionChange: (productId: string, isSelected: boolean) => void;
}

const ProductMultiSelect: React.FC<ProductMultiSelectProps> = ({
    availableProducts,
    selectedProductIds,
    onSelectionChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggle = () => setIsOpen(prev => !prev);

    const handleCheckboxChange = (productId: string, isChecked: boolean) => {
        onSelectionChange(productId, isChecked);
    };

    const filteredProducts = availableProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={handleToggle}
                className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all flex items-center justify-between"
            >
                <span>{selectedProductIds.length > 0 ? `${selectedProductIds.length} produto(s) selecionado(s)` : 'Selecionar Produtos'}</span>
                <span className="material-symbols-outlined text-text-secondary-dark">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-20 w-full bg-surface-dark border border-border-dark rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="sticky top-0 bg-surface-dark p-2 border-b border-border-dark z-10">
                        <input
                            type="text"
                            placeholder="Buscar produto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-input-dark border border-border-dark rounded px-3 py-2 text-sm text-text-primary-dark outline-none focus:border-primary"
                            autoFocus
                        />
                    </div>
                    {filteredProducts.length === 0 ? (
                        <p className="p-3 text-center text-text-secondary-dark text-sm">Nenhum produto encontrado.</p>
                    ) : (
                        filteredProducts.map(product => (
                            <label
                                key={product.id}
                                className="flex items-center justify-between px-4 py-3 text-left text-text-primary-dark hover:bg-input-dark transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                                        checked={selectedProductIds.includes(product.id)}
                                        onChange={(e) => handleCheckboxChange(product.id, e.target.checked)}
                                        onClick={(e) => e.stopPropagation()} // Evita fechar o dropdown ao clicar no checkbox
                                    />
                                    <div className="flex flex-col">
                                        <span className={`${product.stock <= 0 ? 'text-red-500 font-bold' : ''}`}>
                                            {product.name} {product.stock <= 0 && '(Sem Estoque)'}
                                        </span>
                                        <span className={`text-xs ${product.stock <= 0 ? 'text-red-400' : 'text-text-secondary-dark'}`}>
                                            Estoque: {product.stock}
                                        </span>
                                    </div>
                                </div>
                                <span className={`font-bold ${product.stock <= 0 ? 'text-red-500' : ''}`}>R$ {product.sellingPrice.toFixed(2)}</span>
                            </label>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductMultiSelect;