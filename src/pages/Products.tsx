import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Product } from '../types';
import ProductModal from '../components/ProductModal';

const Products = () => {
    const { tenant, isLoading: isLoadingTenant } = useTenant();
    const { products, addProduct, updateProduct, deleteProduct, isLoadingData } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Produtos...</div>;
    }

    const tenantProducts = products.filter(p => p.tenantId === tenant?.id);

    const handleSave = async (productData: Omit<Product, 'id' | 'tenantId'>) => {
        if (!tenant) return;

        if (productToEdit) {
            await updateProduct({ ...productToEdit, ...productData });
        } else {
            await addProduct(productData);
        }
        setIsModalOpen(false);
        setProductToEdit(undefined);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            await deleteProduct(id);
        }
    };

    const openEditModal = (product: Product) => {
        setProductToEdit(product);
        setIsModalOpen(true);
    };

    const openNewModal = () => {
        setProductToEdit(undefined);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-text-primary-dark text-4xl font-black">Produtos</h1>
                <button
                    onClick={openNewModal}
                    className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                    Adicionar Produto
                </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {tenantProducts.map((product) => (
                    <div key={product.id} className="bg-card-dark rounded-xl p-6 border border-border-dark hover:border-primary hover:shadow-glow-primary/20 transition-all group cursor-pointer relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs font-bold text-primary uppercase tracking-wider">{product.category}</span>
                                <h3 className="font-bold text-lg text-text-primary-dark mt-1">{product.name}</h3>
                            </div>
                            <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-card-dark p-1 rounded-lg border border-border-dark">
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEditModal(product); }}
                                    className="text-text-secondary-dark hover:text-primary p-1"
                                >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                                    className="text-text-secondary-dark hover:text-red-500 p-1"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary-dark text-sm">Preço de Venda</span> {/* Atualizado */}
                                <span className="text-text-primary-dark font-bold">R$ {product.sellingPrice.toFixed(2)}</span> {/* Atualizado */}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary-dark text-sm">Estoque</span>
                                <span className={`font-bold ${product.stock <= product.minStock ? 'text-red-500' : 'text-green-500'}`}>
                                    {product.stock} un
                                </span>
                            </div>
                            <div className="w-full bg-surface-dark h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                    className={`h-full rounded-full ${product.stock <= product.minStock ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min((product.stock / (product.minStock * 3)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                productToEdit={productToEdit}
            />
        </div>
    );
};

export default Products;