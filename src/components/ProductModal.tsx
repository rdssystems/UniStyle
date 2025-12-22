import React, { useState, useEffect } from 'react';
import { Product } from '../types';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Omit<Product, 'id' | 'tenantId'>) => void;
    productToEdit?: Product;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, productToEdit }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [sellingPrice, setSellingPrice] = useState(''); // Renomeado
    const [costPrice, setCostPrice] = useState(''); // Novo estado
    const [stock, setStock] = useState('');
    const [minStock, setMinStock] = useState('');

    useEffect(() => {
        if (productToEdit) {
            setName(productToEdit.name);
            setCategory(productToEdit.category);
            setSellingPrice(productToEdit.sellingPrice.toString()); // Usar sellingPrice
            setCostPrice(productToEdit.costPrice.toString()); // Usar costPrice
            setStock(productToEdit.stock.toString());
            setMinStock(productToEdit.minStock.toString());
        } else {
            setName('');
            setCategory('');
            setSellingPrice('');
            setCostPrice('');
            setStock('');
            setMinStock('');
        }
    }, [productToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            category,
            sellingPrice: Number(sellingPrice), // Enviar sellingPrice
            costPrice: Number(costPrice), // Enviar costPrice
            stock: Number(stock),
            minStock: Number(minStock)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-surface-dark p-6 border border-border-dark shadow-glow-primary">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-primary-dark">
                        {productToEdit ? 'Editar Produto' : 'Novo Produto'}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary-dark hover:text-primary">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Nome do Produto</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: Pomada Matte"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Categoria</label>
                        <input
                            type="text"
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: Cabelo, Barba"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex flex-col gap-2 flex-1">
                            <label className="text-sm font-medium text-text-secondary-dark">Preço de Venda (R$)</label> {/* Renomeado */}
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                                className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            <label className="text-sm font-medium text-text-secondary-dark">Preço de Custo (R$)</label> {/* Novo campo */}
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={costPrice}
                                onChange={(e) => setCostPrice(e.target.value)}
                                className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex flex-col gap-2 flex-1">
                            <label className="text-sm font-medium text-text-secondary-dark">Estoque Atual</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="0"
                            />
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            <label className="text-sm font-medium text-text-secondary-dark">Estoque Mínimo</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={minStock}
                                onChange={(e) => setMinStock(e.target.value)}
                                className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="5"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-border-dark bg-transparent py-3 font-bold text-text-primary-dark hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded-lg bg-primary py-3 font-bold text-background-dark hover:opacity-90 transition-opacity"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
