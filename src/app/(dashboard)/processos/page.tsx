"use client";

import React, { useState, useEffect } from "react";
import { ProcessoForm } from "@/features/processos/components/ProcessoForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Edit, Trash2, ChevronDown, ChevronUp, Box, Layers, AlertCircle, Wallet, CheckCircle, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Processo } from "@/types";
import { exportToExcel } from "@/app/lib/excel";
import { formatMoney } from "@/app/lib/formatters";

export default function ProcessosPage() {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [fornecedoresList, setFornecedoresList] = useState<any[]>([]);
  const [empenhosList, setEmpenhosList] = useState<any[]>([]);
  const [entregasList, setEntregasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Processo | null>(null);
  const [busca, setBusca] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingItemsId, setViewingItemsId] = useState<string | null>(null);

  // Filtros atualizados
  const [statusFilter, setStatusFilter] = useState<"ATIVOS" | "CONCLUIDOS" | "TODOS">("ATIVOS");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Processos
      const pSnap = await getDocs(query(collection(db, "processos"), orderBy("createdAt", "desc")));
      const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Processo[];

      // 2. Fetch Fornecedores
      const fSnap = await getDocs(collection(db, "fornecedores"));
      const fList = fSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFornecedoresList(fList);

      // 3. Fetch Empenhos
      const eSnap = await getDocs(collection(db, "empenhos"));
      const eList = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmpenhosList(eList);

      // 4. Fetch Entregas
      const entSnap = await getDocs(collection(db, "entregas"));
      const entList = entSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEntregasList(entList);

      setProcessos(pList);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Função para calcular status dinâmico
  const getDynamicStatus = (p: Processo) => {
    // 1. Se cancelado ou suspenso, mantém
    if (p.status === "CANCELADO" || p.status === "SUSPENSO") return p.status;

    // 2. Verifica Fornecedores
    const fornecedoresVinculados = fornecedoresList.filter(f => f.processosVinculados?.some((v: any) => v.processoId === p.id));
    if (fornecedoresVinculados.length === 0) return "AGUARDANDO_FORNECEDOR";

    // 3. Verifica Empenhos
    const empenhosDoProcesso = empenhosList.filter(e => e.id_processo === p.id);
    if (empenhosDoProcesso.length === 0) return "AGUARDANDO_EMPENHO";

    // 4. Verifica Entregas e Status Intermediários
    // Se tem empenho, vamos ver o status das entregas
    const entregasDoProcesso = entregasList.filter(ent => empenhosDoProcesso.some(emp => emp.id === ent.id_empenho));

    if (entregasDoProcesso.length === 0) return "AGUARDANDO_INICIO_ENTREGA";

    // Prioridade de Status Intermediários (Se qualquer entrega estiver nestes status, o processo assume)
    const statusIntermediarios = ["AGUARDANDO_ENVIO_ARTE", "AGUARDANDO_APROVACAO_ARTE", "EM_PRODUCAO", "ENVIADO", "AGUARDANDO_RECEBIMENTO"];
    for (const status of statusIntermediarios) {
      if (entregasDoProcesso.some(ent => ent.status === status)) return status;
    }

    // Se todas as entregas estiverem concluídas/liquidadas
    const todosConcluidos = entregasDoProcesso.every(ent => ent.status === "LIQUIDADO" || ent.status === "ENTREGUE" || ent.status === "CONCLUIDO");
    if (todosConcluidos && entregasDoProcesso.length > 0) return "CONCLUIDO";

    return "EM_ANDAMENTO";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este processo?")) return;
    try {
      await deleteDoc(doc(db, "processos", id));
      loadData();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir processo.");
    }
  };

  const handleEdit = (processo: Processo) => {
    setEditingProcess(processo);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingProcess(null);
  };

  // Filtragem
  const filteredProcessos = processos.filter(p => {
    const dynamicStatus = getDynamicStatus(p);
    const matchesSearch = p.numero.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao?.toLowerCase().includes(busca.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ATIVOS") return dynamicStatus !== "CONCLUIDO" && dynamicStatus !== "CANCELADO";
    if (statusFilter === "CONCLUIDOS") return dynamicStatus === "CONCLUIDO";

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Processos</h1>
          <p className="text-slate-400">Gestão de Processos de Compra e Contratação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredProcessos, "Processos")} className="border-slate-700"><Layers className="mr-2 h-4 w-4" /> Exportar</Button>
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) handleCloseDialog();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white"><Plus className="mr-2 h-4 w-4" /> Novo Processo</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProcess ? "Editar Processo" : "Novo Processo"}</DialogTitle>
                <DialogDescription>Preencha os dados do processo.</DialogDescription>
              </DialogHeader>
              <ProcessoForm
                onSuccess={() => { handleCloseDialog(); loadData(); }}
                initialData={editingProcess}
                processoId={editingProcess?.id}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <FilterBar
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar por Número ou Descrição..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        options={[
          { label: "ATIVOS", value: "ATIVOS" },
          { label: "CONCLUÍDOS", value: "CONCLUIDOS" },
          { label: "TODOS", value: "TODOS" }
        ]}
      />

      <div className="rounded-md border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : filteredProcessos.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Nenhum processo encontrado.</div>
        ) : (
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Modalidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProcessos.map((proc) => {
                const dynamicStatus = getDynamicStatus(proc);
                const isExpanded = expandedId === proc.id;

                // Dados calculados para o detalhe
                const valorTotal = proc.valorTotal || 0;

                // Calcular Total Ganho (Soma dos itens vinculados a fornecedores)
                // Simplificação: Se tiver itens, soma valorRef * qtd. Se tiver fornecedores vinculados, assumimos que ganharam.
                // Melhor: Usar dados reais se disponíveis.
                const totalGanho = proc.itens?.reduce((acc, item) => acc + (item.valorUnitarioRef * item.quantidade), 0) || 0;

                // Calcular Total Empenhado
                const empenhosProc = empenhosList.filter(e => e.id_processo === proc.id);
                const totalEmpenhado = empenhosProc.reduce((acc, e) => acc + (e.valorEmpenhado || 0), 0);

                // Contadores
                const qtdEmpresas = fornecedoresList.filter(f => f.processosVinculados?.some((v: any) => v.processoId === proc.id)).length;
                const qtdEmpenhos = empenhosProc.length;

                return (
                  <React.Fragment key={proc.id}>
                    <tr className={`hover:bg-slate-900/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-900/80' : ''}`} onClick={() => setExpandedId(isExpanded ? null : proc.id!)}>
                      <td className="px-4 py-3 font-medium text-white">{proc.numero}</td>
                      <td className="px-4 py-3 max-w-[300px] truncate" title={proc.descricao}>{proc.descricao}</td>
                      <td className="px-4 py-3">{proc.modalidade}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded border uppercase font-bold ${dynamicStatus === 'CONCLUIDO' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900' :
                          dynamicStatus === 'CANCELADO' ? 'bg-red-900/30 text-red-400 border-red-900' :
                            'bg-blue-900/30 text-blue-400 border-blue-900'
                          }`}>
                          {dynamicStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">{formatMoney(valorTotal)}</td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-400" onClick={() => handleEdit(proc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={() => handleDelete(proc.id!)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setExpandedId(isExpanded ? null : proc.id!)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* LINHA EXPANDIDA (ACCORDION) */}
                    {isExpanded && (
                      <tr className="bg-slate-950/50 animate-in fade-in">
                        <td colSpan={6} className="p-0 border-b border-slate-800">
                          <div className="p-6 bg-black/20 shadow-inner">
                            <div className="flex flex-col gap-6">

                              {/* Cabeçalho do Detalhe */}
                              <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Categoria</p>
                                    <p className="text-white font-bold flex items-center gap-2">
                                      <Box className="h-4 w-4 text-blue-500" /> {proc.categoria}
                                    </p>
                                  </div>
                                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Fornecimento</p>
                                    <p className="text-white font-bold flex items-center gap-2">
                                      <Package className="h-4 w-4 text-purple-500" /> {proc.tipoFornecimento?.replace("_", " ")}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  {proc.itens && proc.itens.length > 0 ? (
                                    <Button variant="outline" className={`border-slate-700 hover:text-white bg-slate-900 ${viewingItemsId === proc.id ? 'text-blue-400 border-blue-500' : 'text-slate-300'}`} onClick={() => setViewingItemsId(viewingItemsId === proc.id ? null : proc.id!)}>
                                      <Box className="mr-2 h-4 w-4" /> {viewingItemsId === proc.id ? "Ocultar Itens" : "Exibir Itens"}
                                    </Button>
                                  ) : (
                                    <Button className="bg-blue-600 hover:bg-blue-500 text-white" onClick={() => handleEdit(proc)}>
                                      <Plus className="mr-2 h-4 w-4" /> Vincular Itens
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Estatísticas Detalhadas */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Inicial</p>
                                  <p className="text-xl font-bold text-slate-300">{formatMoney(valorTotal)}</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Ganho</p>
                                  <p className="text-xl font-bold text-emerald-400">{formatMoney(totalGanho)}</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Empenhado</p>
                                  <p className="text-xl font-bold text-blue-400">{formatMoney(totalEmpenhado)}</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Liquidado</p>
                                  <p className="text-xl font-bold text-purple-400">{formatMoney(0)}</p>
                                </div>
                              </div>

                              {/* Estatísticas de Vínculos (Contadores) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 p-4 rounded border border-slate-800 flex items-center justify-between">
                                  <div>
                                    <p className="text-2xl font-bold text-white">{qtdEmpresas}</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Empresas Vinculadas</p>
                                  </div>
                                  <Layers className="h-8 w-8 text-slate-700" />
                                </div>

                                <div className="bg-slate-900/50 p-4 rounded border border-slate-800 flex items-center justify-between">
                                  <div>
                                    <p className="text-2xl font-bold text-white">{qtdEmpenhos}</p>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Empenhos Emitidos</p>
                                  </div>
                                  <Wallet className="h-8 w-8 text-slate-700" />
                                </div>
                              </div>

                              {/* Tabela de Itens (Toggle) */}
                              {viewingItemsId === proc.id && proc.itens && (
                                <div className="mt-6 animate-in slide-in-from-top-2">
                                  <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase">Itens do Processo</h4>
                                  <div className="rounded-md border border-slate-800 overflow-hidden">
                                    <table className="w-full text-sm text-left text-slate-400">
                                      <thead className="bg-slate-900 text-slate-200 uppercase text-xs">
                                        <tr>
                                          <th className="px-4 py-2">Descrição</th>
                                          <th className="px-4 py-2 text-center">Qtd</th>
                                          <th className="px-4 py-2 text-right">Valor Ref.</th>
                                          <th className="px-4 py-2 text-right">Total Ref.</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800 bg-slate-950/30">
                                        {proc.itens.map((item, idx) => (
                                          <tr key={idx}>
                                            <td className="px-4 py-2">{item.descricao}</td>
                                            <td className="px-4 py-2 text-center">{item.quantidade}</td>
                                            <td className="px-4 py-2 text-right">{formatMoney(item.valorUnitarioRef)}</td>
                                            <td className="px-4 py-2 text-right text-slate-300">{formatMoney(item.quantidade * item.valorUnitarioRef)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}