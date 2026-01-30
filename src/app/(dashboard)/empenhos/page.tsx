"use client";
import { useState, useEffect } from "react";
import { EmpenhoForm } from "@/features/empenhos/components/EmpenhoForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, Link as LinkIcon, DollarSign, Building2, FileText, Trash2, Pencil, Phone, Mail, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import Link from "next/link";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { exportToExcel } from "@/app/lib/excel";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatMoney } from "@/app/lib/formatters";

export default function EmpenhosPage() {
    const [empenhos, setEmpenhos] = useState<any[]>([]);
    const [entregas, setEntregas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [busca, setBusca] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState("TODOS");

    // Edit State
    const [editingEmpenho, setEditingEmpenho] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

    // Precisamos buscar Empenhos + Nomes dos Processos e Fornecedores para exibir na tabela
    const fetchEmpenhos = async () => {
        setLoading(true);
        try {
            // 1. Buscar Empenhos
            const q = query(collection(db, "empenhos"), orderBy("dataEmissao", "desc"));
            const empSnap = await getDocs(q);
            const empenhosRaw = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. Buscar auxiliares para pegar os nomes (Poderia ser otimizado, mas funciona bem)
            const procSnap = await getDocs(collection(db, "processos"));
            const fornSnap = await getDocs(collection(db, "fornecedores"));
            const entSnap = await getDocs(collection(db, "entregas"));

            // Criar dicionários para busca rápida
            const procMap: any = {};
            procSnap.docs.forEach(d => procMap[d.id] = d.data());

            const fornMap: any = {};
            fornSnap.docs.forEach(d => fornMap[d.id] = d.data());

            setEntregas(entSnap.docs.map(d => d.data()));

            // 3. Unir tudo
            const empenhosCompletos = empenhosRaw.map((e: any) => {
                const fornecedor = fornMap[e.id_fornecedor];
                return {
                    ...e,
                    nomeProcesso: procMap[e.id_processo]?.numero || "Desconhecido",
                    nomeFornecedor: fornecedor?.empresa || "Desconhecido",
                    cnpjFornecedor: fornecedor?.cnpj || "Não informado",
                    telefoneFornecedor: fornecedor?.telefone || "Não informado",
                    emailFornecedor: fornecedor?.email || "Não informado"
                };
            });

            setEmpenhos(empenhosCompletos);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEmpenhos() }, []);

    const empenhosFiltrados = empenhos.filter(e => {
        const matchesSearch = e.numero.toLowerCase().includes(busca.toLowerCase()) ||
            e.nomeFornecedor.toLowerCase().includes(busca.toLowerCase()) ||
            e.nomeProcesso.toLowerCase().includes(busca.toLowerCase());

        if (!matchesSearch) return false;

        // Dynamic Status Calculation for Filter
        const linkedEntregas = entregas.filter(ent => ent.id_empenho === e.id);
        let dynamicStatus = e.status;
        if (linkedEntregas.length > 0) {
            if (linkedEntregas.every(ent => ent.status === "LIQUIDADO" || ent.status === "ENTREGUE")) {
                dynamicStatus = "CONCLUIDO";
            }
        }

        if (statusFilter === "ATIVOS" && dynamicStatus === "CONCLUIDO") return false;
        if (statusFilter === "CONCLUIDOS" && dynamicStatus !== "CONCLUIDO") return false;

        return true;
    });

    const handleExport = () => {
        const dados = empenhosFiltrados.map(e => ({
            NE: e.numero,
            Processo: e.nomeProcesso,
            Fornecedor: e.nomeFornecedor,
            Tipo: e.tipo,
            Valor: e.valorEmpenhado,
            Status: e.status
        }));
        exportToExcel(dados, "Relatorio_Empenhos");
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmDelete({ open: true, id });
    };

    const confirmDeleteAction = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteDoc(doc(db, "empenhos", confirmDelete.id));
            fetchEmpenhos();
        } catch (err) { console.error(err); }
    };

    const handleEdit = (e: React.MouseEvent, empenho: any) => {
        e.stopPropagation();
        setEditingEmpenho(empenho);
        setOpen(true);
    };

    const handleCloseDialog = () => {
        setOpen(false);
        setEditingEmpenho(null);
    };

    return (
        <div className="space-y-6 pb-10 animate-in fade-in">
            <PageHeader
                title="Empenhos"
                description="Controle de emissão de Notas de Empenho."
                onExport={handleExport}
            >
                <Dialog open={open} onOpenChange={(isOpen) => {
                    setOpen(isOpen);
                    if (!isOpen) handleCloseDialog();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white w-full md:w-auto"><Plus className="mr-2 h-4 w-4" /> Novo Empenho</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px] bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between mb-4 items-center">
                            <div>
                                <DialogTitle>{editingEmpenho ? "Editar Nota de Empenho" : "Emitir Nota de Empenho"}</DialogTitle>
                                <DialogDescription>{editingEmpenho ? "Atualize os dados da NE." : "Preencha os dados para gerar uma nova NE."}</DialogDescription>
                            </div>
                            <Link href="/ncs" className="text-xs text-blue-400 flex items-center hover:underline bg-blue-900/20 px-2 py-1 rounded border border-blue-900">
                                Faltou a NC? <LinkIcon className="ml-1 h-3 w-3" />
                            </Link>
                        </div>
                        <EmpenhoForm
                            onSuccess={() => { handleCloseDialog(); fetchEmpenhos(); }}
                            initialData={editingEmpenho}
                            empenhoId={editingEmpenho?.id}
                        />
                    </DialogContent>
                </Dialog>
            </PageHeader>

            {/* Filtro */}
            <FilterBar
                searchValue={busca}
                onSearchChange={setBusca}
                searchPlaceholder="Buscar por NE, Processo ou Fornecedor..."
                filterValue={statusFilter}
                onFilterChange={setStatusFilter}
                options={[
                    { label: "TODOS", value: "TODOS" },
                    { label: "ATIVOS", value: "ATIVOS" },
                    { label: "CONCLUÍDOS", value: "CONCLUIDOS" }
                ]}
            />

            {/* Lista de Cards */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? <LoadingState text="Carregando empenhos..." /> :
                    empenhosFiltrados.length === 0 ? <div className="p-12 text-center text-slate-500">Nenhum empenho encontrado.</div> :
                        empenhosFiltrados.map(e => {
                            // Dynamic Status Calculation
                            const linkedEntregas = entregas.filter(ent => ent.id_empenho === e.id);
                            let dynamicStatus = e.status;
                            let totalLiquidado = 0;

                            if (linkedEntregas.length > 0) {
                                // Calculate Liquidated
                                totalLiquidado = linkedEntregas.reduce((acc, ent) => acc + (parseFloat(ent.valores?.liquidado) || 0), 0);

                                // Determine Status
                                if (linkedEntregas.every(ent => ent.status === "LIQUIDADO" || ent.status === "ENTREGUE")) {
                                    dynamicStatus = "CONCLUIDO";
                                } else {
                                    // Prioritize specific statuses
                                    const priority = ["ENVIADO", "EM_PRODUCAO", "AGUARDANDO_ENVIO_ARTE", "AGUARDANDO_APROVACAO_ARTE", "AGUARDANDO_DEFINICAO_ARTE", "AGUARDANDO_RECEBIMENTO_EMPENHO", "AGUARDANDO_ENVIO_EMPENHO"];
                                    for (const p of priority) {
                                        if (linkedEntregas.some(ent => ent.status === p)) {
                                            dynamicStatus = p;
                                            break;
                                        }
                                    }
                                }
                            }

                            return (
                                <div key={e.id} className={`bg-slate-900 border rounded-xl p-6 transition-all ${expandedId === e.id ? 'border-blue-600/50 shadow-lg shadow-blue-900/20' : 'border-slate-800 hover:border-slate-700'}`}>
                                    <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                        <Wallet className="h-5 w-5 text-blue-500" /> {e.numero}
                                                    </h3>
                                                    <span className={`text-xs px-2 py-0.5 rounded border uppercase font-bold ${dynamicStatus === 'CONCLUIDO' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900' : 'bg-blue-900/30 text-blue-400 border-blue-900'}`}>
                                                        {dynamicStatus.replace(/_/g, " ")}
                                                    </span>
                                                    {e.tipo && (
                                                        <span className="text-xs px-2 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700 uppercase font-bold">
                                                            {e.tipo}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 gap-y-1 text-sm text-slate-400 mt-3">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-slate-500" />
                                                        <span>Processo: <span className="text-slate-300">{e.nomeProcesso}</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-slate-500" />
                                                        <span className="truncate max-w-[300px]">Fornecedor: <span className="text-slate-300">{e.nomeFornecedor}</span></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-3 min-w-[150px]">
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 uppercase font-bold">Valor Empenhado</p>
                                                    <p className="text-xl font-bold text-blue-400">{formatMoney(e.valorEmpenhado)}</p>
                                                </div>

                                                <div className="flex items-center gap-2" onClick={ev => ev.stopPropagation()}>
                                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-400" onClick={(ev) => handleEdit(ev, e)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-500" onClick={(ev) => handleDelete(ev, e.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {expandedId === e.id && (
                                        <div className="mt-6 border-t border-slate-800 pt-4 animate-in slide-in-from-top-2">

                                            {/* Detalhes Extras do Fornecedor */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-950/50 p-4 rounded border border-slate-800/50">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard className="h-5 w-5 text-slate-500" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold">CNPJ</p>
                                                        <p className="text-slate-300 text-sm">{e.cnpjFornecedor}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Phone className="h-5 w-5 text-slate-500" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold">Telefone</p>
                                                        <p className="text-slate-300 text-sm">{e.telefoneFornecedor}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-5 w-5 text-slate-500" />
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold">Email</p>
                                                        <p className="text-slate-300 text-sm truncate max-w-[200px]" title={e.emailFornecedor}>{e.emailFornecedor}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                <div className="bg-black/20 p-3 rounded border border-slate-800">
                                                    <p className="text-xs text-slate-500 uppercase">Natureza da Despesa (ND)</p>
                                                    <p className="text-slate-200 font-bold">{e.nd || "Não Informado"}</p>
                                                </div>
                                                <div className="bg-black/20 p-3 rounded border border-slate-800">
                                                    <p className="text-xs text-slate-500 uppercase">Data de Emissão</p>
                                                    <p className="text-slate-200 font-bold">{e.dataEmissao ? new Date(e.dataEmissao.seconds ? e.dataEmissao.seconds * 1000 : e.dataEmissao).toLocaleDateString('pt-BR') : "-"}</p>
                                                </div>
                                                <div className="bg-black/20 p-3 rounded border border-slate-800">
                                                    <p className="text-xs text-slate-500 uppercase">Total Liquidado</p>
                                                    <p className="text-cyan-400 font-bold">{formatMoney(totalLiquidado)}</p>
                                                </div>
                                            </div>

                                            {e.itens && e.itens.length > 0 ? (
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Itens do Empenho</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm text-left text-slate-400">
                                                            <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                                                                <tr>
                                                                    <th className="px-4 py-2">Item</th>
                                                                    <th className="px-4 py-2">Descrição</th>
                                                                    <th className="px-4 py-2 text-right">Valor Unit.</th>
                                                                    <th className="px-4 py-2 text-center">Qtd</th>
                                                                    <th className="px-4 py-2 text-right">Valor Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {e.itens.map((item: any, idx: number) => (
                                                                    <tr key={idx} className="border-b border-slate-800/50 last:border-0">
                                                                        <td className="px-4 py-2">{idx + 1}</td>
                                                                        <td className="px-4 py-2">{item.descricao}</td>
                                                                        <td className="px-4 py-2 text-right font-mono text-slate-300">{formatMoney(item.valorGanho)}</td>
                                                                        <td className="px-4 py-2 text-center font-mono text-slate-300">{item.quantidade || 1}</td>
                                                                        <td className="px-4 py-2 text-right font-mono text-emerald-400">{formatMoney((item.valorGanho || 0) * (item.quantidade || 1))}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-4 text-slate-500 italic">
                                                    Nenhum item detalhado neste empenho.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                }
            </div>

            <ConfirmDialog
                open={confirmDelete.open}
                onOpenChange={(open) => setConfirmDelete({ open, id: null })}
                title="Excluir Empenho"
                description="Tem certeza que deseja excluir este empenho? Esta ação não pode ser desfeita."
                onConfirm={confirmDeleteAction}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
}