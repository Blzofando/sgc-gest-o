"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Package, Truck, CheckCircle, Search, Clock, AlertCircle, Lock, CalendarPlus } from "lucide-react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "firebase/firestore";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/app/lib/utils";
import { EntregaCard } from "@/features/entregas/components/EntregaCard";
import { EntregaWizard } from "@/features/entregas/components/EntregaWizard";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatMoney } from "@/app/lib/formatters";
import { ContactEmailModal } from "@/features/email/components";

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

    // Prorrogação Modal State
    const [showProrrogacaoModal, setShowProrrogacaoModal] = useState(false);
    const [motivoProrrogacaoModal, setMotivoProrrogacaoModal] = useState("");
    const [diasProrrogacaoModal, setDiasProrrogacaoModal] = useState<number | null>(null);
    const [dataProrrogacaoCustomModal, setDataProrrogacaoCustomModal] = useState("");

    // Contact Modal State
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [contactContext, setContactContext] = useState<any>(null);

    // Query params para abrir modal via notificação
    const searchParams = useSearchParams();
    const openId = searchParams.get('open');

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Empenhos (Aguardando)
            const empenhosSnap = await getDocs(query(collection(db, "empenhos"), orderBy("dataEmissao", "desc")));
            const empenhosRaw = empenhosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. Fetch Auxiliaries (Fornecedores, Processos, NCs) to enrich data
            const [fornSnap, procSnap, ncSnap, entregasSnap] = await Promise.all([
                getDocs(collection(db, "fornecedores")),
                getDocs(collection(db, "processos")),
                getDocs(collection(db, "ncs")),
                getDocs(collection(db, "entregas"))
            ]);

            const fornMap: any = {};
            fornSnap.docs.forEach(d => fornMap[d.id] = d.data());

            const procMap: any = {};
            procSnap.docs.forEach(d => procMap[d.id] = d.data());

            const ncMap: any = {};
            ncSnap.docs.forEach(d => ncMap[d.id] = d.data());

            const entregasData = entregasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 3. Enrich Empenhos
            const empenhosData = empenhosRaw.map((e: any) => {
                const fornecedor = fornMap[e.id_fornecedor];
                const processo = procMap[e.id_processo];
                const nc = ncMap[e.id_nc];

                return {
                    ...e,
                    fornecedorNome: fornecedor?.empresa || "Desconhecido",
                    fornecedorContato: fornecedor?.telefone || "---",
                    fornecedorEmail: fornecedor?.email || "",
                    fornecedorCnpj: fornecedor?.cnpj || "",
                    processoNumero: processo?.numero || "---",
                    processoModalidade: processo?.modalidade || "",
                    notaCredito: nc?.numero || "---"
                };
            });

            setEmpenhos(empenhosData);
            setEntregas(entregasData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData() }, []);

    // Abrir modal automaticamente via query param (ex: notificação)
    useEffect(() => {
        if (!loading && openId) {
            // Tentar encontrar a entrega
            const entrega = entregas.find(e => e.id === openId);
            if (entrega) {
                // Abrir modal de visualização da entrega
                const contextEmpenho = empenhos.find(emp => emp.id === entrega.id_empenho);
                setViewItemsData({
                    itemsData: entrega,
                    contextEmpenho: contextEmpenho,
                    isDelivery: true,
                    isResidue: false
                });
                setItemsModalOpen(true);
            } else {
                // Pode ser um empenho aguardando início
                const empenho = empenhos.find(e => e.id === openId);
                if (empenho) {
                    setViewItemsData({
                        itemsData: empenho,
                        contextEmpenho: empenho,
                        isDelivery: false,
                        isResidue: false
                    });
                    setItemsModalOpen(true);
                }
            }
        }
    }, [loading, openId, entregas, empenhos]);


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
        let contextEmpenho = null;
        let isResidue = false;

        if (data.id_empenho) { // Is a Delivery
            contextEmpenho = empenhos.find(e => e.id === data.id_empenho);
        } else { // Is an Empenho
            // Check if it's a "Residue Empenho" (has _residueItems attached)
            if ((data as any)._residueItems) {
                isResidue = true;
                contextEmpenho = data; // The data itself has the context, but we want to render based on residue items
            } else {
                contextEmpenho = data;
            }
        }

        setViewItemsData({
            itemsData: data,
            contextEmpenho: contextEmpenho,
            isDelivery: !!data.id_empenho,
            isResidue: isResidue
        });
        setItemsModalOpen(true);
    };

    const handleWizardSuccess = () => {
        setWizardOpen(false);
        fetchData();
    };

    // Handle prorrogação from Items Modal
    const handleProrrogacaoModal = async () => {
        if (!motivoProrrogacaoModal.trim() || !viewItemsData?.itemsData?.id) return;

        const entregaId = viewItemsData.itemsData.id;
        const prazoAtual = viewItemsData.itemsData.prazo;

        let novoPrazo = "";
        let dias = 0;

        if (diasProrrogacaoModal) {
            const d = new Date(prazoAtual);
            d.setDate(d.getDate() + diasProrrogacaoModal);
            novoPrazo = d.toISOString().split('T')[0];
            dias = diasProrrogacaoModal;
        } else if (dataProrrogacaoCustomModal) {
            novoPrazo = dataProrrogacaoCustomModal;
            const original = new Date(prazoAtual);
            const custom = new Date(dataProrrogacaoCustomModal);
            dias = Math.ceil((custom.getTime() - original.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (!novoPrazo) return;

        const novoRegistro = {
            dataProrrogacao: new Date().toISOString(),
            prazoAnterior: prazoAtual,
            prazoNovo: novoPrazo,
            diasAdicionados: dias,
            motivo: motivoProrrogacaoModal.trim()
        };

        const historicoAtual = viewItemsData.itemsData.historicoProrrogacoes || [];
        const novoHistorico = [...historicoAtual, novoRegistro];

        try {
            await updateDoc(doc(db, "entregas", entregaId), {
                prazo: new Date(novoPrazo).toISOString(),
                historicoProrrogacoes: novoHistorico
            });

            // Reset states
            setShowProrrogacaoModal(false);
            setMotivoProrrogacaoModal("");
            setDiasProrrogacaoModal(null);
            setDataProrrogacaoCustomModal("");
            setItemsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Erro ao prorrogar:", error);
        }
    };

    // Filter Logic
    const filteredEmpenhos = empenhos.filter(e => {
        const isPending = e.status === "EMPENHADO" || e.status === "AGUARDANDO_ENTREGA";

        // Partial Delivery Logic
        const deliveries = entregas.filter(ent => ent.id_empenho === e.id);
        let isFullyDelivered = false;
        let pendingValue = e.valorEmpenhado; // Start with total

        if (deliveries.length > 0) {
            if (e.itens && e.itens.length > 0) {
                const totalPledged = e.itens.reduce((acc: number, i: any) => acc + (parseFloat(i.quantidade) || 0), 0);

                // Calculate delivered quantity and value
                let totalDeliveredQty = 0;
                let totalDeliveredValue = 0;

                // Track delivered qty per item description to calculate residue
                const deliveredQtyMap = new Map<string, number>();

                deliveries.forEach((d: any) => {
                    // Check if liquidado value exists, otherwise calculate from items
                    if (d.valores?.liquidado) {
                        totalDeliveredValue += parseFloat(d.valores.liquidado);
                    } else {
                        const dlVal = d.itens?.reduce((acc2: number, i: any) => acc2 + ((parseFloat(i.valorGanho) || 0) * (parseFloat(i.quantidadeSolicitada || i.quantidade) || 0)), 0) || 0;
                        totalDeliveredValue += dlVal;
                    }

                    const dlQty = d.itens?.reduce((acc2: number, i: any) => {
                        const q = (parseFloat(i.quantidadeSolicitada || i.quantidade) || 0);
                        const current = deliveredQtyMap.get(i.descricao) || 0;
                        deliveredQtyMap.set(i.descricao, current + q);
                        return acc2 + q;
                    }, 0) || 0;
                    totalDeliveredQty += dlQty;
                });

                isFullyDelivered = totalDeliveredQty >= totalPledged - 0.01; // Tolerance
                pendingValue = Math.max(0, e.valorEmpenhado - totalDeliveredValue);

                // Create "Residue Items" list where quantities are adjusted to remaining
                if (!isFullyDelivered) {
                    const residueItems = e.itens.map((item: any) => {
                        const delivered = deliveredQtyMap.get(item.descricao) || 0;
                        const originalInfo = parseFloat(item.quantidade);
                        const remaining = Math.max(0, originalInfo - delivered);
                        return {
                            ...item,
                            quantidade: remaining, // Update to remaining for Wizard/Display
                            _originalQty: originalInfo, // Keep track of original
                            _deliveredQty: delivered,
                            _isResidue: true
                        };
                    });
                    // Attach residue items to a temporary property to pass to Wizard/Card
                    (e as any)._residueItems = residueItems;
                }

            } else {
                // If no items, assume one-shot delivery for now
                isFullyDelivered = true;
                pendingValue = 0;
            }
        }

        const matchSearch = e.numero.toLowerCase().includes(busca.toLowerCase()) ||
            e.fornecedorNome?.toLowerCase().includes(busca.toLowerCase());

        // Attach the calculated pending value
        (e as any)._pendingValue = pendingValue;

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
            <PageHeader
                title="Entregas e Recebimentos"
                description="Gerencie o ciclo de vida do material, do pedido à liquidação."
            >
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
            </PageHeader>

            {loading ? (
                <LoadingState text="Carregando entregas..." />
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
                                        onAction={() => handleStartDelivery(
                                            // Pass a modified object to Wizard if we have residue items, so it sees the correct limits
                                            (e as any)._residueItems ? { ...e, itens: (e as any)._residueItems } : e
                                        )}
                                        onViewItems={handleViewItems}
                                        customValue={(e as any)._pendingValue}
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
                <DialogContent className="sm:max-w-[700px] bg-slate-950 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle className="flex flex-col gap-1 pr-8">
                            <div className="flex justify-between items-start">
                                <span>Itens do Empenho {viewItemsData?.contextEmpenho?.numero}</span>
                                {(viewItemsData?.isDelivery || viewItemsData?.isResidue) && (
                                    <span className="text-xs font-normal text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                                        {viewItemsData?.isDelivery ? "Visualizando Entrega Específica" : "Itens Restantes a Entregar"}
                                    </span>
                                )}
                            </div>

                            {/* Provider & Action Row */}
                            <div className="flex items-center justify-between mt-2 mr-6">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-500 uppercase">Fornecedor</span>
                                    <span className="text-sm font-medium text-slate-200 truncate max-w-[300px]" title={viewItemsData?.contextEmpenho?.fornecedorNome}>
                                        {viewItemsData?.contextEmpenho?.fornecedorNome || "---"}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs border-slate-700 hover:bg-slate-800"
                                    onClick={() => {
                                        const emp = viewItemsData?.contextEmpenho;
                                        setContactContext({
                                            fornecedorNome: emp?.fornecedorNome,
                                            fornecedorCnpj: emp?.fornecedorCnpj,
                                            fornecedorEmail: emp?.fornecedorEmail,
                                            empenhoNumero: emp?.numero,
                                            ncNumero: emp?.notaCredito,
                                            processoNumero: emp?.processoNumero,
                                            modalidade: emp?.processoModalidade,
                                            valorEmpenhado: parseFloat(emp?.valorEmpenhado) || 0,
                                            prazo: viewItemsData?.itemsData?.prazo || emp?.prazo
                                        });
                                        setContactModalOpen(true);
                                    }}
                                >
                                    Entrar em Contato
                                </Button>
                            </div>

                            {/* Status/Deadline Row */}
                            <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                        {viewItemsData?.itemsData?.prazo
                                            ? `Prazo: ${new Date(viewItemsData?.itemsData.prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                                            : viewItemsData?.contextEmpenho?.prazo
                                                ? `Prazo: ${new Date(viewItemsData?.contextEmpenho.prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                                                : `Status: ${viewItemsData?.itemsData?.status || viewItemsData?.contextEmpenho?.status || 'Aguardando Início'}`
                                        }
                                    </span>
                                    {viewItemsData?.itemsData?.prazoTravado && (
                                        <Lock className="w-3 h-3 text-emerald-400 ml-1" />
                                    )}
                                </div>
                                {viewItemsData?.isDelivery && viewItemsData?.itemsData?.prazoTravado && viewItemsData?.itemsData?.status !== 'LIQUIDADO' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                                        onClick={() => setShowProrrogacaoModal(true)}
                                    >
                                        <CalendarPlus className="w-3 h-3 mr-1" /> Prorrogar
                                    </Button>
                                )}
                            </div>

                            {/* Prorrogação inline do modal */}
                            {showProrrogacaoModal && viewItemsData?.itemsData?.prazo && (
                                <div className="mt-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg space-y-3 animate-in fade-in">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-300">Prorrogar Prazo</span>
                                        <button onClick={() => {
                                            setShowProrrogacaoModal(false);
                                            setMotivoProrrogacaoModal("");
                                            setDiasProrrogacaoModal(null);
                                            setDataProrrogacaoCustomModal("");
                                        }} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                                    </div>

                                    {/* Quick options */}
                                    <div className="flex gap-2">
                                        {[5, 15, 30].map((dias) => (
                                            <button
                                                key={dias}
                                                onClick={() => {
                                                    setDiasProrrogacaoModal(dias);
                                                    setDataProrrogacaoCustomModal("");
                                                }}
                                                className={cn(
                                                    "flex-1 py-1.5 px-2 rounded border text-xs font-bold transition-all",
                                                    diasProrrogacaoModal === dias
                                                        ? "border-orange-500 bg-orange-500/20 text-orange-400"
                                                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                                                )}
                                            >
                                                +{dias}
                                            </button>
                                        ))}
                                        <div className="relative flex-1">
                                            <input
                                                type="date"
                                                value={dataProrrogacaoCustomModal}
                                                onChange={(e) => {
                                                    setDataProrrogacaoCustomModal(e.target.value);
                                                    setDiasProrrogacaoModal(null);
                                                }}
                                                className={cn(
                                                    "w-full py-1.5 px-2 rounded border text-xs bg-transparent transition-all",
                                                    dataProrrogacaoCustomModal
                                                        ? "border-orange-500 text-orange-400"
                                                        : "border-slate-700 text-slate-400"
                                                )}
                                                min={viewItemsData?.itemsData?.prazo ? new Date(viewItemsData.itemsData.prazo).toISOString().split('T')[0] : ""}
                                            />
                                        </div>
                                    </div>

                                    {/* Motivo obrigatório */}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-slate-500">Motivo *</Label>
                                        <Textarea
                                            value={motivoProrrogacaoModal}
                                            onChange={(e) => setMotivoProrrogacaoModal(e.target.value)}
                                            placeholder="Descreva o motivo..."
                                            className="bg-slate-950 border-slate-700 text-xs resize-none h-12"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleProrrogacaoModal}
                                        disabled={!motivoProrrogacaoModal.trim() || (!diasProrrogacaoModal && !dataProrrogacaoCustomModal)}
                                        size="sm"
                                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 h-7 text-xs"
                                    >
                                        Confirmar
                                    </Button>
                                </div>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Value Summary Header */}
                    {(() => {
                        const isOrdinarioOrEstimativo = !viewItemsData?.isDelivery && !viewItemsData?.isResidue;

                        return (
                            <div className="grid grid-cols-2 gap-4 mb-2">
                                <div className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded">
                                    <p className="text-xs text-emerald-500 uppercase font-bold">
                                        {viewItemsData?.isDelivery ? "Valor desta Entrega" :
                                            viewItemsData?.isResidue ? "Valor Restante a Entregar" :
                                                "Valor Total da Entrega"}
                                    </p>
                                    <p className="text-xl font-bold text-emerald-400">
                                        {viewItemsData?.isDelivery ?
                                            formatMoney(
                                                viewItemsData.itemsData?.valores?.liquidado ||
                                                viewItemsData.itemsData?.itens?.reduce((acc: number, i: any) => acc + ((parseFloat(i.valorGanho) || 0) * (parseFloat(i.quantidadeSolicitada || i.quantidade) || 0)), 0) || 0
                                            ) :
                                            viewItemsData?.isResidue ?
                                                formatMoney(viewItemsData.itemsData?._pendingValue || 0) :
                                                formatMoney(viewItemsData?.contextEmpenho?.valorEmpenhado || 0)
                                        }
                                    </p>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-3 rounded opacity-75">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Valor Total Empenho</p>
                                    <p className="text-xl font-bold text-slate-400">
                                        {formatMoney(viewItemsData?.contextEmpenho?.valorEmpenhado || 0)}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="max-h-[400px] overflow-y-auto space-y-2 mt-2 pr-1">
                        {/* Iterate over the ORIGINAL EMPENHO items to show everything */}
                        {(() => {
                            const itemsToMap = viewItemsData?.contextEmpenho?.itens || [];
                            return itemsToMap.map((item: any, idx: number) => {
                                // Find matching item in Delivery if applicable
                                let isIncluded = false;
                                let displayQty = item.quantidade;
                                let totalQty = item.quantidade;
                                let subText = "";

                                if (viewItemsData?.isDelivery) {
                                    const deliveryItem = viewItemsData.itemsData.itens.find((di: any) => di.descricao === item.descricao);
                                    isIncluded = !!deliveryItem;
                                    displayQty = deliveryItem ? (deliveryItem.quantidadeSolicitada || deliveryItem.quantidade) : item.quantidade;
                                    subText = isIncluded ? `/ ${totalQty}` : "";
                                }
                                else if (viewItemsData?.isResidue) {
                                    // Find this item in the residue list attached to the main data object
                                    const residueItem = viewItemsData.itemsData._residueItems?.find((ri: any) => ri.descricao === item.descricao);

                                    const remaining = residueItem ? residueItem.quantidade : 0;
                                    isIncluded = remaining > 0;
                                    displayQty = remaining;
                                    totalQty = residueItem ? residueItem._originalQty : item.quantidade;
                                    subText = isIncluded ? `/ ${totalQty} (Restante)` : "(Concluído)";
                                }
                                else {
                                    // Fallback for simple view (Ordinario/Estimativo)
                                    isIncluded = true;
                                }

                                const unitValue = item.valorGanho;
                                const totalValueDisplay = unitValue * displayQty;

                                return (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded border flex justify-between items-start transition-all ${isIncluded
                                            ? "bg-slate-900 border-emerald-500/30 ring-1 ring-emerald-500/20"
                                            : "bg-slate-900/30 border-slate-800 opacity-50 grayscale-[0.5]"
                                            }`}
                                    >
                                        <div className="flex-1 mr-4">
                                            <div className="flex items-center gap-2">
                                                {isIncluded && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                <p className={`text-sm font-medium ${isIncluded ? "text-slate-200" : "text-slate-500"}`}>
                                                    {item.descricao}
                                                </p>
                                            </div>
                                            <div className="text-xs mt-1 flex gap-3 text-slate-500">
                                                <span>
                                                    Unit: <span className="text-slate-300">{formatMoney(unitValue)}</span>
                                                </span>
                                                <span>|</span>
                                                <span>
                                                    Qtd: <span className={isIncluded ? "text-emerald-400 font-bold" : ""}>{displayQty}</span>
                                                    <span className="text-slate-600"> {subText}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${isIncluded ? "text-emerald-400" : "text-slate-600"}`}>
                                                {formatMoney(totalValueDisplay)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    {/* Footer IDs */}
                    <div className="border-t border-slate-800 pt-4 mt-2 flex justify-between items-center text-[10px] text-slate-600 uppercase tracking-wider font-mono">
                        <div>Proc: {viewItemsData?.contextEmpenho?.processoNumero || "---"}</div>
                        <div>Emp: {viewItemsData?.contextEmpenho?.numero || "---"}</div>
                        <div>NC: {viewItemsData?.contextEmpenho?.notaCredito || "---"}</div>
                    </div>

                </DialogContent>
            </Dialog>

            {/* Contact Email Modal */}
            {contactContext && (
                <ContactEmailModal
                    open={contactModalOpen}
                    onOpenChange={setContactModalOpen}
                    context={contactContext}
                />
            )}
        </div>
    );
}
