"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Truck, CheckCircle, Search, Clock, AlertCircle } from "lucide-react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { EntregaCard } from "@/features/entregas/components/EntregaCard";
import { EntregaWizard } from "@/features/entregas/components/EntregaWizard";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatMoney } from "@/app/lib/formatters";

export default function EntregasPage() {
    const [loading, setLoading] = useState(true);
    const [empenhos, setEmpenhos] = useState<any[]>([]);
    const [entregas, setEntregas] = useState<any[]>([]);

    // Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isNewDelivery, setIsNewDelivery] = useState(false);

    // Items Modal State
    const [itemsModalOpen, setItemsModalOpen] = useState(false);
    const [viewItemsData, setViewItemsData] = useState<any>(null);

    // Filters
    const [busca, setBusca] = useState("");
    const [statusFilter, setStatusFilter] = useState("ATIVOS");

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Empenhos (Aguardando)
            const empenhosSnap = await getDocs(query(collection(db, "empenhos"), orderBy("dataEmissao", "desc")));
            const empenhosData = empenhosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. Fetch Entregas (Em Produção)
            const entregasSnap = await getDocs(collection(db, "entregas"));
            const entregasData = entregasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            setEmpenhos(empenhosData);
            setEntregas(entregasData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData() }, []);

    const handleStartDelivery = (empenho: any) => {
        setSelectedItem(empenho);
        setIsNewDelivery(true);
        setWizardOpen(true);
    };

    const handleContinueDelivery = (entrega: any) => {
        setSelectedItem(entrega);
        setIsNewDelivery(false);
        setWizardOpen(true);
    };

    const handleViewItems = (data: any) => {
        setViewItemsData(data);
        setItemsModalOpen(true);
    };

    const handleWizardSuccess = () => {
        setWizardOpen(false);
        fetchData();
    };

    // Filter Logic
    const filteredEmpenhos = empenhos.filter(e => {
        const isPending = e.status === "EMPENHADO" || e.status === "AGUARDANDO_ENTREGA";

        // Partial Delivery Logic
        const deliveries = entregas.filter(ent => ent.id_empenho === e.id);
        let isFullyDelivered = false;

        if (deliveries.length > 0) {
            if (e.itens && e.itens.length > 0) {
                const totalPledged = e.itens.reduce((acc: number, i: any) => acc + (parseFloat(i.quantidade) || 0), 0);
                const totalDelivered = deliveries.reduce((acc: number, d: any) => {
                    // Check both quantidadeSolicitada (new) and quantidade (legacy/fallback)
                    return acc + (d.itens?.reduce((acc2: number, i: any) => acc2 + (parseFloat(i.quantidadeSolicitada || i.quantidade) || 0), 0) || 0);
                }, 0);
                isFullyDelivered = totalDelivered >= totalPledged;
            } else {
                // If no items, assume one-shot delivery for now
                isFullyDelivered = true;
            }
        }

        const matchSearch = e.numero.toLowerCase().includes(busca.toLowerCase()) ||
            e.fornecedorNome?.toLowerCase().includes(busca.toLowerCase());
        return isPending && !isFullyDelivered && matchSearch;
    });

    const filteredEntregas = entregas.filter(e => {
        const matchSearch = e.empenhoNumero?.toLowerCase().includes(busca.toLowerCase());

        if (statusFilter === "ATIVOS") return e.status !== "LIQUIDADO";
        if (statusFilter === "CONCLUIDOS") return e.status === "LIQUIDADO";

        return matchSearch;
    });

    // Grouping Logic
    const groupedEntregas = {
        'AGUARDANDO_ENVIO_EMPENHO': filteredEntregas.filter(e => e.status === 'AGUARDANDO_ENVIO_EMPENHO'),
        'AGUARDANDO_RECEBIMENTO_EMPENHO': filteredEntregas.filter(e => e.status === 'AGUARDANDO_RECEBIMENTO_EMPENHO'),
        'AGUARDANDO_DEFINICAO_ARTE': filteredEntregas.filter(e => e.status === 'AGUARDANDO_DEFINICAO_ARTE'),
        'AGUARDANDO_APROVACAO_ARTE': filteredEntregas.filter(e => e.status === 'AGUARDANDO_APROVACAO_ARTE'),
        'AGUARDANDO_ENVIO_ARTE': filteredEntregas.filter(e => e.status === 'AGUARDANDO_ENVIO_ARTE'),
        'EM_PRODUCAO': filteredEntregas.filter(e => e.status === 'EM_PRODUCAO'),
        'ENVIADO': filteredEntregas.filter(e => e.status === 'ENVIADO'),
        'ENTREGUE': filteredEntregas.filter(e => e.status === 'ENTREGUE'),
        'LIQUIDADO': filteredEntregas.filter(e => e.status === 'LIQUIDADO'),
    };

    const renderGroup = (title: string, items: any[], colorClass: string) => {
        if (items.length === 0) return null;
        return (
            <div className="space-y-3">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${colorClass} flex items-center gap-2 border-b border-slate-800 pb-2`}>
                    <div className={`w-2 h-2 rounded-full bg-current`} />
                    {title} ({items.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(e => (
                        <EntregaCard
                            key={e.id}
                            data={e}
                            type="ENTREGA"
                            onAction={handleContinueDelivery}
                            onViewItems={handleViewItems}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Entregas e Recebimentos</h1>
                    <p className="text-slate-400">Gerencie o ciclo de vida do material, do pedido à liquidação.</p>
                </div>
                <div className="w-full md:w-auto">
                    <FilterBar
                        searchValue={busca}
                        onSearchChange={setBusca}
                        options={[
                            { label: "Ativos", value: "ATIVOS" },
                            { label: "Concluídos", value: "CONCLUIDOS" },
                            { label: "Todos", value: "TODOS" }
                        ]}
                        filterValue={statusFilter}
                        onFilterChange={setStatusFilter}
                    />
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center"><Loader2 className="animate-spin inline text-blue-500" /></div>
            ) : (
                <div className="space-y-12">
                    {/* Aguardando Início Section */}
                    {filteredEmpenhos.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="text-blue-500" />
                                Aguardando Início ({filteredEmpenhos.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredEmpenhos.map(e => (
                                    <EntregaCard
                                        key={e.id}
                                        data={e}
                                        type="EMPENHO"
                                        onAction={handleStartDelivery}
                                        onViewItems={handleViewItems}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Deliveries Groups */}
                    <div className="space-y-8">
                        {filteredEntregas.length === 0 && filteredEmpenhos.length === 0 && (
                            <p className="text-slate-500 text-center py-12">Nenhum registro encontrado.</p>
                        )}

                        {renderGroup("Aguardando Envio de Empenho", groupedEntregas['AGUARDANDO_ENVIO_EMPENHO'], "text-slate-400")}
                        {renderGroup("Aguardando Recebimento de Empenho", groupedEntregas['AGUARDANDO_RECEBIMENTO_EMPENHO'], "text-blue-400")}
                        {renderGroup("Aguardando Definição de Arte", groupedEntregas['AGUARDANDO_DEFINICAO_ARTE'], "text-purple-400")}
                        {renderGroup("Aguardando Aprovação de Arte", groupedEntregas['AGUARDANDO_APROVACAO_ARTE'], "text-yellow-400")}
                        {renderGroup("Aguardando Envio de Arte", groupedEntregas['AGUARDANDO_ENVIO_ARTE'], "text-orange-400")}
                        {renderGroup("Em Produção / Trânsito", groupedEntregas['EM_PRODUCAO'], "text-blue-400")}
                        {renderGroup("Enviado / Rastreável", groupedEntregas['ENVIADO'], "text-indigo-400")}
                        {renderGroup("Entregue / Conferência", groupedEntregas['ENTREGUE'], "text-emerald-400")}

                        {statusFilter !== 'ATIVOS' && renderGroup("Liquidado", groupedEntregas['LIQUIDADO'], "text-slate-500")}
                    </div>
                </div>
            )}

            {/* Wizard Modal */}
            <Dialog open={wizardOpen} onOpenChange={(open) => {
                setWizardOpen(open);
                if (!open) fetchData();
            }}>
                <DialogContent className="sm:max-w-[700px] bg-slate-950 border-slate-800 text-slate-100 h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 bg-slate-900/50 border-b border-slate-800">
                        <DialogTitle>Gerenciar Entrega</DialogTitle>
                        <DialogDescription>Siga as etapas para concluir o recebimento.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden p-6">
                        {selectedItem && (
                            <EntregaWizard
                                data={selectedItem}
                                isNew={isNewDelivery}
                                onClose={() => setWizardOpen(false)}
                                onSuccess={handleWizardSuccess}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Items Modal */}
            <Dialog open={itemsModalOpen} onOpenChange={setItemsModalOpen}>
                <DialogContent className="sm:max-w-[600px] bg-slate-950 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Itens do Empenho/Entrega</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-y-auto space-y-2 mt-2">
                        {viewItemsData?.itens?.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{item.descricao}</p>
                                    <p className="text-xs text-slate-500 mt-1">Qtd: {item.quantidade} | Valor Unit: {formatMoney(item.valorGanho)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-400">{formatMoney(item.valorGanho * item.quantidade)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
