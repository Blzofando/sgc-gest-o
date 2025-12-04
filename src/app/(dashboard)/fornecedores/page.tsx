"use client";

import { useState, useEffect } from "react";
import { FornecedorForm } from "@/features/fornecedores/components/FornecedorForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatMoney, formatPhone } from "@/app/lib/formatters";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Mail, ChevronDown, ChevronUp, ExternalLink, Loader2, Copy, Layers, Box, CheckCircle, AlertCircle, Wallet, Package, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { exportToExcel } from "@/app/lib/excel";
import Link from "next/link";

export default function FornecedoresPage() {
    const [fornecedores, setFornecedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingData, setEditingData] = useState<any>(null);
    const [busca, setBusca] = useState("");

    // Filtro de Status
    const [statusFilter, setStatusFilter] = useState<"ATIVOS" | "CONCLUIDOS" | "TODOS">("ATIVOS");

    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedProcessItems, setExpandedProcessItems] = useState<string | null>(null);

    const [processoMap, setProcessoMap] = useState<any>({});
    const [empenhosList, setEmpenhosList] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const fSnap = await getDocs(collection(db, "fornecedores"));
            const fList = fSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setFornecedores(fList);

            const pSnap = await getDocs(collection(db, "processos"));
            const pMap: any = {};
            pSnap.docs.forEach(d => { pMap[d.id] = { id: d.id, ...d.data() }; });
            setProcessoMap(pMap);

            const eSnap = await getDocs(collection(db, "empenhos"));
            const eList = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setEmpenhosList(eList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // --- AÇÕES ---
    const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        alert(`${label} copiado!`);
    };

    const handleEdit = (e: React.MouseEvent, fornecedor: any) => {
        e.stopPropagation();
        setEditingData(fornecedor);
        setOpen(true);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja EXCLUIR este fornecedor? Isso não pode ser desfeito.")) {
            try {
                await deleteDoc(doc(db, "fornecedores", id));
                alert("Fornecedor excluído.");
                loadData();
            } catch (error) {
                console.error(error);
                alert("Erro ao excluir.");
            }
        }
    };

    const handleNew = () => {
        setEditingData(null);
        setOpen(true);
    }

    const handleExport = () => {
        const dados = fornecedoresFiltrados.map(f => {
            const totalEmp = empenhosList
                .filter(e => e.id_fornecedor === f.id)
                .reduce((acc, curr) => acc + (parseFloat(curr.valorEmpenhado) || 0), 0);

            let disponiveis = 0;
            let empenhados = 0;
            let concluidos = 0;

            f.processosVinculados?.forEach((v: any) => {
                const pid = v.processoId;
                const p = processoMap[pid];
                if (p) {
                    const empenhadoNeste = empenhosList
                        .filter(e => e.id_fornecedor === f.id && e.id_processo === pid)
                        .reduce((acc, curr) => acc + (parseFloat(curr.valorEmpenhado) || 0), 0);

                    if (p.status === "CONCLUIDO") {
                        concluidos++;
                    } else {
                        if (empenhadoNeste === 0) disponiveis++;
                        else empenhados++;
                    }
                }
            });

            return {
                EMPRESA: f.empresa.toUpperCase(),
                CNPJ: f.cnpj,
                TELEFONE: f.telefone || '',
                EMAIL: f.email || '',
                PROCESSOS_DISPONIVEIS: disponiveis,
                PROCESSOS_EMPENHADOS: empenhados,
                PROCESSOS_CONCLUIDOS: concluidos,
                TOTAL_EMPENHADO: totalEmp
            };
        });
        exportToExcel(dados, "Relatorio_Fornecedores_Completo");
    };

    // --- FILTROS (LÓGICA CORRIGIDA) ---
    const fornecedoresFiltrados = fornecedores.filter(f => {
        const matchText = f.empresa.toLowerCase().includes(busca.toLowerCase()) || f.cnpj.includes(busca);
        if (!matchText) return false;

        if (statusFilter === "TODOS") return true;

        const vinculos = f.processosVinculados || [];

        // 1. Se não tem nenhum processo vinculado, ele é considerado "ATIVO" (cadastro novo)
        if (vinculos.length === 0) {
            return statusFilter === "ATIVOS";
        }

        // 2. Se tem vínculos, verificamos se existe pelo menos UM que NÃO esteja concluído/cancelado
        const temProcessoAtivo = vinculos.some((v: any) => {
            const p = processoMap[v.processoId];
            // Se o processo existe E o status dele é diferente de CONCLUIDO ou CANCELADO, conta como ativo
            return p && p.status !== "CONCLUIDO" && p.status !== "CANCELADO";
        });

        if (statusFilter === "ATIVOS") return temProcessoAtivo;
        if (statusFilter === "CONCLUIDOS") return !temProcessoAtivo; // Só exibe aqui se TODOS estiverem concluídos

        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            <PageHeader
                title="Fornecedores"
                description="Gestão de empresas e controle de saldo."
                onExport={handleExport}
            >
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white w-full md:w-auto" onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> Novo Fornecedor</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[800px] bg-slate-950 border-slate-800 text-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <DialogTitle>{editingData ? "Editar Fornecedor" : "Cadastrar Empresa"}</DialogTitle>
                            <Link href="/processos" className="text-xs text-blue-400 flex items-center hover:underline">
                                <ExternalLink className="h-3 w-3 mr-1" /> Processos
                            </Link>
                        </div>
                        <FornecedorForm onSuccess={() => { setOpen(false); loadData(); }} dataToEdit={editingData} />
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <FilterBar
                searchValue={busca}
                onSearchChange={setBusca}
                searchPlaceholder="Buscar por Razão Social ou CNPJ..."
                filterValue={statusFilter}
                onFilterChange={setStatusFilter}
                options={[
                    { label: "ATIVOS", value: "ATIVOS" },
                    { label: "CONCLUÍDOS", value: "CONCLUIDOS" },
                    { label: "TODOS", value: "TODOS" }
                ]}
            />

            <div className="grid grid-cols-1 gap-4">
                {loading ? <div className="p-12 text-center"><Loader2 className="animate-spin inline text-blue-500" /> Carregando...</div> :
                    fornecedoresFiltrados.length === 0 ? <div className="p-12 text-center text-slate-500">Nenhum fornecedor encontrado.</div> :
                        fornecedoresFiltrados.map((f) => {
                            const totalEmpenhadoReais = empenhosList
                                .filter(e => e.id_fornecedor === f.id)
                                .reduce((acc, curr) => acc + (parseFloat(curr.valorEmpenhado) || 0), 0);

                            const processosVinculadosIds = f.processosVinculados
                                ?.map((v: any) => v.processoId)
                                .sort((a: string, b: string) => {
                                    const numA = processoMap[a]?.numero || "";
                                    const numB = processoMap[b]?.numero || "";
                                    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
                                }) || [];

                            const qtdProcessos = processosVinculadosIds.length;
                            let disponiveis = 0;
                            let emAndamento = 0;
                            let concluidos = 0;

                            processosVinculadosIds.forEach((pid: string) => {
                                const p = processoMap[pid];
                                if (p) {
                                    const empenhadoNeste = empenhosList
                                        .filter(e => e.id_fornecedor === f.id && e.id_processo === pid)
                                        .reduce((acc, curr) => acc + (parseFloat(curr.valorEmpenhado) || 0), 0);

                                    if (p.status === "CONCLUIDO") { concluidos++; }
                                    else {
                                        if (empenhadoNeste === 0) disponiveis++;
                                        else emAndamento++;
                                    }
                                }
                            });

                            return (
                                <div key={f.id} className={`bg-slate-900 border rounded-xl p-6 transition-all ${expandedId === f.id ? 'border-blue-600/50 shadow-lg shadow-blue-900/20' : 'border-slate-800 hover:border-slate-700'}`}>
                                    <div className="cursor-pointer relative" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}>

                                        {/* ESTRUTURA PRINCIPAL */}
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">

                                            {/* COLUNA ESQUERDA: Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                        {f.empresa}
                                                    </h3>
                                                    {expandedId === f.id ? <ChevronUp className="h-5 w-5 text-blue-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                                                </div>
                                                <p className="text-sm text-slate-400 font-mono mt-1"><span className="text-slate-600 font-bold select-none">CNPJ:</span> {f.cnpj}</p>

                                                <div className="flex flex-wrap gap-4 mt-3">
                                                    {f.telefone && (
                                                        <span className="flex items-center gap-1 text-sm text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:border-blue-500 transition-colors" onClick={(e) => handleCopy(e, f.telefone, "Telefone")}>
                                                            <Phone className="h-3 w-3 text-blue-400" /> {formatPhone(f.telefone)} <Copy className="h-2 w-2 opacity-50 ml-1" />
                                                        </span>
                                                    )}
                                                    {f.email && (
                                                        <span className="flex items-center gap-1 text-sm text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:border-blue-500 transition-colors" onClick={(e) => handleCopy(e, f.email, "Email")}>
                                                            <Mail className="h-3 w-3 text-blue-400" /> {f.email} <Copy className="h-2 w-2 opacity-50 ml-1" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* COLUNA DIREITA: Ações e Valor */}
                                            <div className="flex flex-col items-end gap-2 min-w-[180px]">
                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="text-slate-500 hover:text-blue-400 hover:bg-blue-900/20"
                                                        onClick={(e) => handleEdit(e, f)}
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="text-slate-500 hover:text-red-500 hover:bg-red-900/20"
                                                        onClick={(e) => handleDelete(e, f.id)}
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">TOTAL EMPENHADO</p>
                                                    <p className="text-2xl font-bold text-blue-400">{formatMoney(totalEmpenhadoReais)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Barra de Estatísticas */}
                                        <div className="flex gap-6 mt-6 border-t border-slate-800 pt-4">
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-bold text-white">{qtdProcessos}</span>
                                                <span className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Layers className="h-3 w-3" /> Processos</span>
                                            </div>
                                            <div className="w-px bg-slate-800 h-10"></div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-yellow-500">{disponiveis}</span>
                                                <span className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1" title="Sem empenho"><AlertCircle className="h-3 w-3" /> Disponíveis</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-blue-500">{emAndamento}</span>
                                                <span className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><Wallet className="h-3 w-3" /> Em Execução</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-lg font-bold text-emerald-500">{concluidos}</span>
                                                <span className="text-xs text-slate-500 uppercase font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Concluídos</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Área Expandida */}
                                    {expandedId === f.id && (
                                        <div className="mt-6 bg-black/20 rounded-lg p-4 animate-in slide-in-from-top-2 border border-slate-800">
                                            <h4 className="text-sm font-bold text-slate-300 mb-3">Detalhamento dos Processos</h4>

                                            {processosVinculadosIds.length === 0 && <p className="text-xs text-slate-500">Nenhum processo vinculado.</p>}

                                            <div className="space-y-3">
                                                {processosVinculadosIds.map((pid: string, idx: number) => {
                                                    const vinc = f.processosVinculados.find((v: any) => v.processoId === pid);
                                                    const procData = processoMap[pid];
                                                    if (!procData || !vinc) return null;

                                                    // Cálculo do Valor Ganho
                                                    const valorGanhoTotal = vinc.itens?.reduce((acc: number, i: any) => {
                                                        const itemOriginal = procData.itens?.find((orig: any) => orig.id === i.itemId);
                                                        const qtd = itemOriginal?.quantidade || 0;
                                                        return acc + (qtd * (parseFloat(i.valorGanho) || 0));
                                                    }, 0);

                                                    const empenhadoNeste = empenhosList
                                                        .filter(e => e.id_fornecedor === f.id && e.id_processo === pid)
                                                        .reduce((acc, curr) => acc + (parseFloat(curr.valorEmpenhado) || 0), 0);

                                                    const isTotalmenteEmpenhado = empenhadoNeste >= valorGanhoTotal && valorGanhoTotal > 0;

                                                    // RECUPERAR TIPO (Prioridade: do Vínculo, senão do Processo)
                                                    const tipoFornecimento = vinc.tipoFornecimento || procData.tipoFornecimento || "REMESSA_UNICA";

                                                    // Estilo da Badge
                                                    const badgeColor = isTotalmenteEmpenhado ? "bg-purple-900/30 text-purple-400 border-purple-900" : "bg-blue-900/30 text-blue-400 border-blue-900";
                                                    const isItemsOpen = expandedProcessItems === `${f.id}-${pid}`;

                                                    return (
                                                        <div key={idx} className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col gap-4">
                                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-bold bg-slate-800 px-2 py-0.5 rounded text-white border border-slate-700">{procData.modalidade}</span>
                                                                        <span className="text-white font-bold text-lg">{procData.numero}</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-400">{procData.objetoResumo}</p>
                                                                    <div className="mt-2 flex gap-2">
                                                                        <span className={`text-xs px-2 py-0.5 rounded border ${badgeColor} flex items-center gap-1 uppercase`}>
                                                                            <Box className="h-3 w-3" /> {tipoFornecimento.replace("_", " ")}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-right">
                                                                    {isTotalmenteEmpenhado ? (
                                                                        <div>
                                                                            <p className="text-xs text-slate-500 uppercase">Valor Total Ganho</p>
                                                                            <p className="text-xl font-bold text-purple-400">{formatMoney(valorGanhoTotal)}</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div>
                                                                            <p className="text-xs text-slate-500 uppercase">Empenhado até agora</p>
                                                                            <p className="text-xl font-bold text-blue-400">{formatMoney(empenhadoNeste)}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-end border-t border-slate-900 pt-2">
                                                                <Button
                                                                    variant="ghost" size="sm"
                                                                    onClick={(e) => { e.stopPropagation(); setExpandedProcessItems(isItemsOpen ? null : `${f.id}-${pid}`); }}
                                                                    className="text-slate-400 hover:text-white hover:bg-blue-900/20 h-8 text-xs"
                                                                >
                                                                    {isItemsOpen ? <ChevronUp className="mr-1 h-3 w-3" /> : <Package className="mr-1 h-3 w-3" />}
                                                                    {isItemsOpen ? "Ocultar Itens" : "Ver Itens Ganho"}
                                                                </Button>
                                                            </div>

                                                            {isItemsOpen && (
                                                                <div className="bg-black/30 border border-slate-800 rounded p-3 animate-in fade-in">
                                                                    <table className="w-full text-sm text-left text-slate-400">
                                                                        <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
                                                                            <tr>
                                                                                <th className="px-4 py-2">Descrição do Item</th>
                                                                                <th className="px-4 py-2 text-center">Qtd. Ata</th>
                                                                                <th className="px-4 py-2 text-right">Unitário (Ganho)</th>
                                                                                <th className="px-4 py-2 text-right">Total (Item)</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {vinc.itens?.map((item: any, iIdx: number) => {
                                                                                const itemOriginal = procData?.itens?.find((i: any) => i.id === item.itemId);
                                                                                const qtd = itemOriginal?.quantidade || 0;
                                                                                const totalItem = qtd * (parseFloat(item.valorGanho) || 0);

                                                                                return (
                                                                                    <tr key={iIdx} className="border-b border-slate-800/50 last:border-0">
                                                                                        <td className="px-4 py-2 text-white">{itemOriginal?.descricao || "Item não encontrado"}</td>
                                                                                        <td className="px-4 py-2 text-center">{qtd}</td>
                                                                                        <td className="px-4 py-2 text-right font-mono text-slate-400">{formatMoney(item.valorGanho)}</td>
                                                                                        <td className="px-4 py-2 text-right font-mono text-emerald-500 font-bold">{formatMoney(totalItem)}</td>
                                                                                    </tr>
                                                                                )
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
            </div>
        </div>
    );
}