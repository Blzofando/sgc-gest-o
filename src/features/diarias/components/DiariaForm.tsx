"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Users, DollarSign, AlertCircle } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters";
import type { MilitarFavorecido } from "@/types";

interface DiariaFormProps {
    onSuccess?: () => void;
    initialData?: any;
    diariaId?: string;
}

export function DiariaForm({ onSuccess, initialData, diariaId }: DiariaFormProps) {
    const [loading, setLoading] = useState(false);

    // Cabeçalho
    const [numeroDiex, setNumeroDiex] = useState("");
    const [missao, setMissao] = useState("");
    const [local, setLocal] = useState("");
    const [dataHoraIda, setDataHoraIda] = useState("");
    const [dataHoraVolta, setDataHoraVolta] = useState("");
    const [observacoes, setObservacoes] = useState("");

    // Lista de Militares
    const [militares, setMilitares] = useState<MilitarFavorecido[]>([]);

    // Novo militar
    const [novoMilitar, setNovoMilitar] = useState({
        nome: "",
        numDiarias: "",
        valorUnitario: ""
    });

    // NC
    const [ncId, setNcId] = useState("");
    const [ncs, setNcs] = useState<any[]>([]);
    const [empenhos, setEmpenhos] = useState<any[]>([]);

    // Carregar NCs
    useEffect(() => {
        const loadNcs = async () => {
            const ncsSnap = await getDocs(collection(db, "ncs"));
            const empSnap = await getDocs(collection(db, "empenhos"));
            setNcs(ncsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setEmpenhos(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        loadNcs();
    }, []);

    // Preencher formulário se editando
    useEffect(() => {
        if (initialData) {
            setNumeroDiex(initialData.numeroDiex || "");
            setMissao(initialData.missao || "");
            setLocal(initialData.local || "");
            setObservacoes(initialData.observacoes || "");
            setMilitares(initialData.militares || []);
            setNcId(initialData.id_nc || "");

            // Converter timestamps para datetime-local
            if (initialData.dataHoraIda) {
                const date = initialData.dataHoraIda.seconds
                    ? new Date(initialData.dataHoraIda.seconds * 1000)
                    : new Date(initialData.dataHoraIda);
                setDataHoraIda(date.toISOString().slice(0, 16));
            }
            if (initialData.dataHoraVolta) {
                const date = initialData.dataHoraVolta.seconds
                    ? new Date(initialData.dataHoraVolta.seconds * 1000)
                    : new Date(initialData.dataHoraVolta);
                setDataHoraVolta(date.toISOString().slice(0, 16));
            }
        }
    }, [initialData]);

    // Adicionar militar à lista
    const addMilitar = () => {
        if (!novoMilitar.nome || !novoMilitar.numDiarias || !novoMilitar.valorUnitario) {
            alert("Preencha todos os campos do militar.");
            return;
        }
        const novo: MilitarFavorecido = {
            id: crypto.randomUUID(),
            nome: novoMilitar.nome,
            numDiarias: parseFloat(novoMilitar.numDiarias) || 0,
            valorUnitario: parseFloat(novoMilitar.valorUnitario) || 0
        };
        setMilitares([...militares, novo]);
        setNovoMilitar({ nome: "", numDiarias: "", valorUnitario: "" });
    };

    // Remover militar
    const removeMilitar = (id: string) => {
        setMilitares(militares.filter(m => m.id !== id));
    };

    // Calcular valor total
    const valorTotal = militares.reduce((acc, m) => acc + (m.numDiarias * m.valorUnitario), 0);

    // Calcular saldo da NC selecionada
    const selectedNC = ncs.find(n => n.id === ncId);
    const empenhosNC = empenhos.filter(e => e.id_nc === selectedNC?.id);
    const totalEmpenhado = empenhosNC.reduce((acc, e) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);
    const saldoNCCalculado = selectedNC ? (parseFloat(selectedNC.valorTotal) || 0) - totalEmpenhado : 0;

    // Se editando, considerar valor anterior
    const valorAnterior = initialData?.valorTotal || 0;
    const saldoBase = initialData && initialData.id_nc === ncId
        ? saldoNCCalculado + valorAnterior
        : saldoNCCalculado;
    const saldoRestante = saldoBase - valorTotal;

    // Filtrar NCs com ND 339015 (Diárias) e saldo disponível
    const ncsFiltradas = ncs.filter(n => {
        // Excluir NCs recolhidas
        if (n.recolhidoManual && !(initialData && initialData.id_nc === n.id)) return false;

        // Filtrar por ND de Diárias (339015)
        const temNdDiarias = n.creditos?.some((c: any) => c.nd === "339015") || n.nd === "339015";

        // Calcular saldo
        const empenhosDestaNC = empenhos.filter(e => e.id_nc === n.id);
        const totalEmp = empenhosDestaNC.reduce((acc, e) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);
        const saldoDisponivel = (parseFloat(n.valorTotal) || 0) - totalEmp;
        const temSaldo = saldoDisponivel > 0.01;

        // Se editando e for a mesma NC, sempre mostrar
        const isSameNC = initialData && initialData.id_nc === n.id;

        return temNdDiarias && (temSaldo || isSameNC);
    });

    // Salvar
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!numeroDiex || !missao || !local || !dataHoraIda || !dataHoraVolta) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }
        if (militares.length === 0) {
            alert("Adicione pelo menos um militar favorecido.");
            return;
        }
        if (!ncId) {
            alert("Selecione uma NC de crédito.");
            return;
        }
        if (saldoRestante < 0) {
            if (!confirm("O valor total excede o saldo disponível da NC. Deseja continuar mesmo assim?")) return;
        }

        setLoading(true);
        try {
            const data = {
                numeroDiex,
                missao,
                local,
                dataHoraIda: new Date(dataHoraIda),
                dataHoraVolta: new Date(dataHoraVolta),
                militares,
                id_nc: ncId,
                valorTotal,
                observacoes,
                dataAtualizacao: new Date()
            };

            if (diariaId) {
                // EDIÇÃO
                // 1. Devolver saldo para NC antiga
                if (initialData?.id_nc) {
                    const ncAntigaRef = doc(db, "ncs", initialData.id_nc);
                    const ncAntigaSnap = await getDoc(ncAntigaRef);
                    if (ncAntigaSnap.exists()) {
                        const saldoAtual = parseFloat(ncAntigaSnap.data().saldoDisponivel) || 0;
                        await updateDoc(ncAntigaRef, { saldoDisponivel: saldoAtual + valorAnterior });
                    }
                }

                // 2. Deduzir da nova NC
                const ncNovaRef = doc(db, "ncs", ncId);
                await updateDoc(ncNovaRef, { saldoDisponivel: saldoRestante });

                // 3. Atualizar diária
                await updateDoc(doc(db, "diarias", diariaId), data);
                alert("Diária atualizada com sucesso!");
            } else {
                // CRIAÇÃO
                await addDoc(collection(db, "diarias"), {
                    ...data,
                    dataCriacao: new Date()
                });

                // Deduzir saldo da NC
                const ncRef = doc(db, "ncs", ncId);
                await updateDoc(ncRef, { saldoDisponivel: saldoRestante });

                alert("Diária criada com sucesso!");
            }

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Erro ao salvar diária:", error);
            alert("Erro ao salvar diária.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* Cabeçalho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nº DIEX</Label>
                    <Input
                        value={numeroDiex}
                        onChange={e => setNumeroDiex(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                        placeholder="Ex: 001/2024"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label>Local de Destino</Label>
                    <Input
                        value={local}
                        onChange={e => setLocal(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                        placeholder="Ex: Brasília-DF"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Missão</Label>
                <Input
                    value={missao}
                    onChange={e => setMissao(e.target.value)}
                    className="bg-slate-950 border-slate-700"
                    placeholder="Descrição da missão..."
                    required
                />
            </div>

            {/* Período */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Data/Hora Ida</Label>
                    <Input
                        type="datetime-local"
                        value={dataHoraIda}
                        onChange={e => setDataHoraIda(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label>Data/Hora Volta</Label>
                    <Input
                        type="datetime-local"
                        value={dataHoraVolta}
                        onChange={e => setDataHoraVolta(e.target.value)}
                        className="bg-slate-950 border-slate-700"
                        required
                    />
                </div>
            </div>

            {/* Militares Favorecidos */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-500" />
                        Militares Favorecidos
                    </h3>
                    <span className="text-xs text-slate-500">
                        Total: {formatMoney(valorTotal)}
                    </span>
                </div>

                {/* Formulário de adição */}
                <div className="grid grid-cols-12 gap-2 items-end bg-slate-950 p-3 rounded border border-slate-800/50">
                    <div className="col-span-5 space-y-1">
                        <Label className="text-xs">Nome de Guerra</Label>
                        <Input
                            value={novoMilitar.nome}
                            onChange={e => setNovoMilitar({ ...novoMilitar, nome: e.target.value })}
                            className="h-9 bg-slate-900 border-slate-700 text-sm"
                            placeholder="Ex: Sgt Silva"
                        />
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Nº Diárias</Label>
                        <Input
                            type="number"
                            step="0.5"
                            value={novoMilitar.numDiarias}
                            onChange={e => setNovoMilitar({ ...novoMilitar, numDiarias: e.target.value })}
                            className="h-9 bg-slate-900 border-slate-700 text-sm"
                            placeholder="Ex: 1.5"
                        />
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Valor Unit. (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={novoMilitar.valorUnitario}
                            onChange={e => setNovoMilitar({ ...novoMilitar, valorUnitario: e.target.value })}
                            className="h-9 bg-slate-900 border-slate-700 text-sm text-emerald-400 font-bold"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="col-span-1">
                        <Button
                            type="button"
                            size="sm"
                            onClick={addMilitar}
                            className="h-9 w-full bg-amber-600 hover:bg-amber-500"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Lista de militares */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {militares.map((m) => (
                        <div
                            key={m.id}
                            className="flex items-center justify-between bg-slate-950 p-3 rounded border border-slate-800 text-sm"
                        >
                            <span className="text-slate-200 font-medium">{m.nome}</span>
                            <div className="flex items-center gap-4">
                                <span className="text-emerald-400 font-mono">
                                    {m.numDiarias} × {formatMoney(m.valorUnitario)} = {formatMoney(m.numDiarias * m.valorUnitario)}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeMilitar(m.id)}
                                    className="h-6 w-6 text-slate-500 hover:text-red-400"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {militares.length === 0 && (
                        <p className="text-center text-xs text-slate-600 py-2">
                            Nenhum militar adicionado.
                        </p>
                    )}
                </div>
            </div>

            {/* NC de Crédito */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Fonte de Recurso (NC)
                </h3>

                <div>
                    <Label className="mb-2 block text-xs text-slate-400">
                        Selecione a NC (Filtrado por ND: 339015 - Diárias)
                    </Label>
                    <Select onValueChange={setNcId} value={ncId}>
                        <SelectTrigger className="bg-slate-950 border-slate-700">
                            <SelectValue placeholder="Selecione a NC..." />
                        </SelectTrigger>
                        <SelectContent>
                            {ncsFiltradas.length === 0 ? (
                                <div className="p-2 text-xs text-slate-500 text-center">
                                    Nenhuma NC com ND 339015 e saldo disponível.
                                </div>
                            ) : (
                                ncsFiltradas.map(n => {
                                    const empenhosDestaNC = empenhos.filter(e => e.id_nc === n.id);
                                    const totalEmp = empenhosDestaNC.reduce((acc, e) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);
                                    const saldoReal = (parseFloat(n.valorTotal) || 0) - totalEmp;
                                    return (
                                        <SelectItem key={n.id} value={n.id}>
                                            NC: {n.numero} | Saldo: {formatMoney(saldoReal)}
                                        </SelectItem>
                                    );
                                })
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Exibição de saldo */}
                {ncId && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <Label className="text-emerald-400 font-bold">Total da Diária</Label>
                            <div className="text-2xl font-bold text-emerald-400 mt-1">
                                {formatMoney(valorTotal)}
                            </div>
                        </div>
                        <div className="text-right">
                            <Label className="text-slate-400">Saldo Restante NC</Label>
                            <div className={`text-2xl font-bold mt-1 ${saldoRestante < 0 ? "text-red-500" : "text-slate-200"}`}>
                                {formatMoney(saldoRestante)}
                            </div>
                            {saldoRestante < 0 && (
                                <p className="text-xs text-red-400 flex items-center justify-end gap-1 mt-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Saldo insuficiente
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
                <Label>Observações (Opcional)</Label>
                <Textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    className="bg-slate-950 border-slate-700 min-h-[80px]"
                    placeholder="Informações adicionais sobre a missão..."
                />
            </div>

            {/* Botão Submit */}
            <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-500 text-white h-12 text-lg"
                disabled={loading}
            >
                {loading ? (
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                ) : (
                    diariaId ? "Atualizar Diária" : "Criar Diária"
                )}
            </Button>
        </form>
    );
}
