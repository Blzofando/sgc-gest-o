"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { NCForm } from "@/features/ncs/components/NCForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Calendar, DollarSign, Clock, Trash2, Pencil, Archive, RotateCcw, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { exportToExcel } from "@/app/lib/excel";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatMoney } from "@/app/lib/formatters";

export default function NcsPage() {
  const [ncs, setNcs] = useState<any[]>([]);
  const [empenhos, setEmpenhos] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [diarias, setDiarias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ATIVOS");

  // Edit State
  const [editingNc, setEditingNc] = useState<any>(null);

  // Credit Details Modal State
  const [creditDetailsOpen, setCreditDetailsOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);

  // Confirm Dialogs
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [confirmRecolher, setConfirmRecolher] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [confirmReativar, setConfirmReativar] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      const ncsQuery = query(collection(db, "ncs"), orderBy("dataEmissao", "desc"));
      const [ncsSnap, empSnap, entSnap, diaSnap] = await Promise.all([
        getDocs(ncsQuery),
        getDocs(collection(db, "empenhos")),
        getDocs(collection(db, "entregas")),
        getDocs(collection(db, "diarias"))
      ]);

      const ncsList = ncsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const empenhosList = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const entregasList = entSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const diariasList = diaSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setNcs(ncsList);
      setEmpenhos(empenhosList);
      setEntregas(entregasList);
      setDiarias(diariasList);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData() }, []);

  // Query params para abrir NC via notificação
  const searchParams = useSearchParams();
  const openId = searchParams.get('open');

  // Abrir/expandir NC automaticamente via query param
  useEffect(() => {
    if (!loading && openId && ncs.length > 0) {
      const nc = ncs.find(n => n.id === openId);
      if (nc) {
        setExpandedId(openId);
      }
    }
  }, [loading, openId, ncs]);

  const getNCData = (nc: any) => {
    // Calcular total empenhado a partir dos empenhos vinculados a esta NC
    const empenhosDestaNC = empenhos.filter((e: any) => e.id_nc === nc.id);
    const totalEmpenhado = empenhosDestaNC.reduce((acc: number, e: any) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);

    // Calcular total de diárias vinculadas a esta NC
    const diariasDestaNC = diarias.filter((d: any) => d.id_nc === nc.id);
    const totalDiarias = diariasDestaNC.reduce((acc: number, d: any) => acc + (parseFloat(d.valorTotal) || 0), 0);

    // Total utilizado = empenhos + diárias
    const totalUtilizado = totalEmpenhado + totalDiarias;

    // Calcular total liquidado a partir das entregas dos empenhos vinculados
    // Diárias são consideradas liquidadas quando criadas (pagamento direto)
    let totalLiquidado = totalDiarias;
    empenhosDestaNC.forEach((emp: any) => {
      const entregasDoEmpenho = entregas.filter((ent: any) => ent.id_empenho === emp.id);
      entregasDoEmpenho.forEach((ent: any) => {
        totalLiquidado += parseFloat(ent.valores?.liquidado) || 0;
      });
    });

    const valorRecolhido = nc.recolhidoManual ? (nc.valorTotal - totalUtilizado) : (nc.valorRecolhido || 0);
    const saldoDisponivel = nc.valorTotal - totalUtilizado - valorRecolhido;

    // Calcular percentual do saldo
    const percentualSaldo = nc.valorTotal > 0 ? saldoDisponivel / nc.valorTotal : 0;

    let status = "DISPONIVEL";

    // NC com saldo zerado (ou menor que 1%) vai automaticamente para CONCLUIDO
    if (nc.recolhidoManual || saldoDisponivel <= 0.01 || percentualSaldo < 0.01) {
      status = "CONCLUIDO";
    } else if (totalUtilizado > 0 && saldoDisponivel < nc.valorTotal) {
      // Se tem empenho mas ainda tem saldo = EM_UTILIZACAO
      status = "EM_UTILIZACAO";
    }

    // Se totalmente liquidado também é CONCLUIDO
    if (totalLiquidado >= totalUtilizado && totalUtilizado > 0 && saldoDisponivel < 1) {
      status = "CONCLUIDO";
    }

    return { totalEmpenhado, totalDiarias, totalUtilizado, totalLiquidado, saldoDisponivel, valorRecolhido, status, isRecolhido: nc.recolhidoManual, percentualSaldo };
  };

  // Re-implementing the filter logic correctly inside the component
  const ncsFiltradas = ncs.filter(nc => {
    const matchText = nc.numero.toLowerCase().includes(busca.toLowerCase()) ||
      nc.descricao?.toLowerCase().includes(busca.toLowerCase());

    if (!matchText) return false;

    const { status } = getNCData(nc);

    if (statusFilter === "ATIVOS" && status === "CONCLUIDO") return false;
    if (statusFilter === "CONCLUIDOS" && status !== "CONCLUIDO") return false;

    return true;
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDelete({ open: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteDoc(doc(db, "ncs", confirmDelete.id));
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleEdit = (e: React.MouseEvent, nc: any) => {
    e.stopPropagation();
    setEditingNc(nc);
    setOpen(true);
  };

  const handleRecolherSaldo = (id: string) => {
    setConfirmRecolher({ open: true, id });
  };

  const confirmRecolherAction = async () => {
    if (!confirmRecolher.id) return;
    try {
      await updateDoc(doc(db, "ncs", confirmRecolher.id), { recolhidoManual: true });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleReativarSaldo = (id: string) => {
    setConfirmReativar({ open: true, id });
  };

  const confirmReativarAction = async () => {
    if (!confirmReativar.id) return;
    try {
      await updateDoc(doc(db, "ncs", confirmReativar.id), { recolhidoManual: false });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCreditClick = (credit: any, nc: any) => {
    const ncData = getNCData(nc);
    setSelectedCredit({ ...credit, ncData, ncNumero: nc.numero });
    setCreditDetailsOpen(true);
  };

  const handleExport = () => {
    const dados: any[] = [];
    ncsFiltradas.forEach(nc => {
      if (nc.creditos && nc.creditos.length > 0) {
        nc.creditos.forEach((cred: any) => {
          dados.push({
            Numero_NC: nc.numero,
            Data_Emissao: nc.dataEmissao,
            UG_Emitente: nc.ugEmitente || "-",
            Descricao: nc.descricao || "-",
            Prazo: nc.prazo,
            ND: cred.nd,
            Fonte: cred.fonte || "-",
            PTRES: cred.ptres || "-",
            UGR: cred.ugr || "-",
            PI: cred.pi || "-",
            Valor_Credito: cred.valor,
            Total_NC: nc.valorTotal
          });
        });
      } else {
        dados.push({
          Numero_NC: nc.numero,
          Data_Emissao: nc.dataEmissao,
          UG_Emitente: nc.ugEmitente || "-",
          Descricao: nc.descricao || "-",
          Prazo: nc.prazo,
          ND: nc.nd || "-",
          Fonte: nc.fonte || "-",
          Valor_Total: nc.valorTotal
        });
      }
    });
    exportToExcel(dados, "Relatorio_NCs_Detalhado");
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in">
      <PageHeader
        title="Notas de Crédito"
        description="Gestão de Orçamento e Créditos Recebidos."
        onExport={handleExport}
      >
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) setEditingNc(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Nova NC
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingNc ? "Editar Nota de Crédito" : "Lançar Nota de Crédito"}</DialogTitle>
              <DialogDescription>Insira os dados da NC e os créditos recebidos.</DialogDescription>
            </DialogHeader>
            <NCForm
              onSuccess={() => { setOpen(false); fetchData(); setEditingNc(null); }}
              initialData={editingNc}
              ncId={editingNc?.id}
            />
          </DialogContent>
        </Dialog>
      </PageHeader>

      <FilterBar
        searchValue={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar por Número ou Descrição..."
        options={[
          { label: "ATIVOS", value: "ATIVOS" },
          { label: "CONCLUÍDOS", value: "CONCLUIDOS" },
          { label: "TODOS", value: "TODOS" }
        ]}
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <div className="grid grid-cols-1 gap-4">
        {loading ? <LoadingState text="Carregando NCs..." /> :
          ncsFiltradas.length === 0 ? <div className="p-12 text-center text-slate-500">Nenhuma NC encontrada.</div> :
            ncsFiltradas.map((nc) => {
              const { totalEmpenhado, totalLiquidado, saldoDisponivel, valorRecolhido, status, isRecolhido } = getNCData(nc);

              const percentualDisponivel = nc.valorTotal > 0 ? (saldoDisponivel / nc.valorTotal) * 100 : 0;

              let badgeColor = "bg-yellow-900/30 text-yellow-400 border-yellow-900";
              let statusLabel = "Aguardando Empenho";

              if (status === "EM_UTILIZACAO") {
                badgeColor = "bg-blue-900/30 text-blue-400 border-blue-900";
                statusLabel = "Em Utilização";
              } else if (status === "CONCLUIDO") {
                badgeColor = "bg-emerald-900/30 text-emerald-400 border-emerald-900";
                statusLabel = "Concluído";
              }

              return (
                <div key={nc.id} className={`bg-slate-900 border rounded-xl p-6 transition-all ${expandedId === nc.id ? 'border-emerald-600/50 shadow-lg shadow-emerald-900/20' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="cursor-pointer relative" onClick={() => setExpandedId(expandedId === nc.id ? null : nc.id)}>

                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-emerald-500" /> {nc.numero}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded border ${badgeColor} uppercase font-bold`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(nc.dataEmissao).toLocaleDateString('pt-BR')}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Prazo: {nc.prazo === 'IMEDIATO' ? <span className="text-red-400 font-bold">IMEDIATO</span> : new Date(nc.prazo).toLocaleDateString('pt-BR')}</span>
                          {nc.ugEmitente && <span className="flex items-center gap-1 text-slate-300"><Building2 className="h-3 w-3" /> UG: {nc.ugEmitente}</span>}
                        </div>
                        {nc.descricao && <p className="text-slate-500 text-sm mt-2 italic">"{nc.descricao}"</p>}
                      </div>

                      <div className="flex flex-col items-end gap-3 min-w-[200px]">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase font-bold">Saldo Disponível</p>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden min-w-[120px]">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${percentualDisponivel}%` }}></div>
                          </div>
                          <p className={`text-lg font-bold mt-1 ${percentualDisponivel > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{percentualDisponivel.toFixed(1)}% livre</p>
                        </div>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-400" onClick={(e) => handleEdit(e, nc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-500" onClick={(e) => handleDelete(e, nc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedId === nc.id && (
                    <div className="mt-6 border-t border-slate-800 pt-4 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-black/20 p-3 rounded border border-slate-800">
                          <p className="text-xs text-slate-500 uppercase">Total da Nota</p>
                          <p className="text-emerald-400 font-bold">{formatMoney(nc.valorTotal)}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded border border-slate-800">
                          <p className="text-xs text-slate-500 uppercase">Total Empenhado</p>
                          <p className="text-blue-400 font-bold">{formatMoney(totalEmpenhado)}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded border border-slate-800">
                          <p className="text-xs text-slate-500 uppercase">Total Liquidado</p>
                          <p className="text-cyan-400 font-bold">{formatMoney(totalLiquidado)}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded border border-slate-800">
                          <p className="text-xs text-slate-500 uppercase">Total Recolhido</p>
                          <p className="text-slate-400 font-bold">{formatMoney(valorRecolhido)}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Créditos da Nota</h4>
                        {!isRecolhido ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                            onClick={() => handleRecolherSaldo(nc.id)}
                          >
                            <Archive className="mr-2 h-3 w-3" /> Recolher Saldo
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                            onClick={() => handleReativarSaldo(nc.id)}
                          >
                            <RotateCcw className="mr-2 h-3 w-3" /> Reativar Saldo
                          </Button>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-400">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                            <tr>
                              <th className="px-4 py-2">ND</th>
                              <th className="px-4 py-2">Fonte</th>
                              <th className="px-4 py-2">PTRES</th>
                              <th className="px-4 py-2">UGR</th>
                              <th className="px-4 py-2">PI</th>
                              <th className="px-4 py-2 text-right">Saldo Disponível</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nc.creditos?.map((c: any, idx: number) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 cursor-pointer transition-colors"
                                onClick={() => handleCreditClick(c, nc)}
                              >
                                <td className="px-4 py-2 font-bold text-white">{c.nd}</td>
                                <td className="px-4 py-2">{c.fonte || "-"}</td>
                                <td className="px-4 py-2">{c.ptres || "-"}</td>
                                <td className="px-4 py-2">{c.ugr || "-"}</td>
                                <td className="px-4 py-2">{c.pi || "-"}</td>
                                <td className="px-4 py-2 text-right font-mono text-emerald-400">{formatMoney(saldoDisponivel)}</td>
                              </tr>
                            ))}
                            {(!nc.creditos || nc.creditos.length === 0) && (
                              <tr>
                                <td colSpan={6} className="px-4 py-4 text-center text-slate-600">
                                  Nenhum crédito detalhado (Formato Antigo). <br />
                                  <span className="text-xs">ND: {nc.nd} | Fonte: {nc.fonte} | Valor: {formatMoney(nc.valorTotal)}</span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>

      {/* Credit Details Dialog */}
      <Dialog open={creditDetailsOpen} onOpenChange={setCreditDetailsOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>Detalhes do Crédito</DialogTitle>
            <DialogDescription>Informações detalhadas sobre o crédito selecionado.</DialogDescription>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <p className="text-xs text-slate-500 uppercase">ND</p>
                  <p className="font-bold">{selectedCredit.nd}</p>
                </div>
                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <p className="text-xs text-slate-500 uppercase">Fonte</p>
                  <p className="font-bold">{selectedCredit.fonte || "-"}</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h4 className="text-sm font-bold text-slate-300 mb-3">Totais da NC ({selectedCredit.ncNumero})</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Valor do Crédito (Original):</span>
                    <span className="text-white font-bold">{formatMoney(selectedCredit.valor)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Empenhado (NC):</span>
                    <span className="text-blue-400 font-bold">{formatMoney(selectedCredit.ncData.totalEmpenhado)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Liquidado (NC):</span>
                    <span className="text-cyan-400 font-bold">{formatMoney(selectedCredit.ncData.totalLiquidado)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Recolhido (NC):</span>
                    <span className="text-slate-400 font-bold">{formatMoney(selectedCredit.ncData.valorRecolhido)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Saldo Disponível (NC):</span>
                    <span className="text-emerald-400 font-bold">{formatMoney(selectedCredit.ncData.saldoDisponivel)}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-4 italic">
                  * Os valores de empenho, liquidação e recolhimento são calculados sobre o total da NC, pois o vínculo é feito pelo número da NC e não por crédito individual.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ open, id: null })}
        title="Excluir Nota de Crédito"
        description="Tem certeza que deseja excluir esta NC? Esta ação não pode ser desfeita."
        onConfirm={confirmDeleteAction}
        confirmText="Excluir"
        variant="danger"
      />

      <ConfirmDialog
        open={confirmRecolher.open}
        onOpenChange={(open) => setConfirmRecolher({ open, id: null })}
        title="Recolher Saldo"
        description="Tem certeza que deseja recolher o saldo restante? Esta ação concluirá a NC."
        onConfirm={confirmRecolherAction}
        confirmText="Recolher"
        variant="warning"
      />

      <ConfirmDialog
        open={confirmReativar.open}
        onOpenChange={(open) => setConfirmReativar({ open, id: null })}
        title="Reativar Saldo"
        description="Deseja reativar o saldo desta NC? Ela voltará para o status anterior."
        onConfirm={confirmReativarAction}
        confirmText="Reativar"
        variant="default"
      />
    </div>
  );
}