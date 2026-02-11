"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters";

interface EmpenhoFormProps {
    onSuccess?: () => void;
    initialData?: any;
    empenhoId?: string;
}

const NDS_DISPONIVEIS = ["339030", "339039", "449052", "339015", "339033"];

export function EmpenhoForm({ onSuccess, initialData, empenhoId }: EmpenhoFormProps) {
    const [loading, setLoading] = useState(false);
    const [listas, setListas] = useState<{ processos: any[], fornecedores: any[], ncs: any[], empenhos: any[] }>({
        processos: [],
        fornecedores: [],
        ncs: [],
        empenhos: []
    });

    // A. Cabeçalho
    const [numero, setNumero] = useState("");
    const [nd, setNd] = useState("");
    const [tipo, setTipo] = useState("ORDINARIO");
    const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);

    // B. Objeto
    const [procId, setProcId] = useState("");
    const [fornId, setFornId] = useState("");
    const [showAllProcesses, setShowAllProcesses] = useState(false); // Toggle para exibir todos os processos

    // C. Fonte
    const [ncId, setNcId] = useState("");

    // D. Valores e Itens
    const [valor, setValor] = useState("");
    const [itensEmpenho, setItensEmpenho] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            const p = await getDocs(collection(db, "processos"));
            const f = await getDocs(collection(db, "fornecedores"));
            const n = await getDocs(collection(db, "ncs"));
            const e = await getDocs(collection(db, "empenhos"));

            setListas({
                processos: p.docs.map(d => ({ id: d.id, ...d.data() })) as any,
                fornecedores: f.docs.map(d => ({ id: d.id, ...d.data() })) as any,
                ncs: n.docs.map(d => ({ id: d.id, ...d.data() })) as any,
                empenhos: e.docs.map(d => ({ id: d.id, ...d.data() })) as any
            });
        };
        load();
    }, []);

    // Populate form if editing
    useEffect(() => {
        if (initialData) {
            setNumero(initialData.numero || "");
            setNd(initialData.nd || "");
            setTipo(initialData.tipo || "ORDINARIO");

            // Handle date format (timestamp or string)
            if (initialData.dataEmissao) {
                const dateVal = initialData.dataEmissao.seconds
                    ? new Date(initialData.dataEmissao.seconds * 1000)
                    : new Date(initialData.dataEmissao);
                setDataEmissao(dateVal.toISOString().split('T')[0]);
            }

            setProcId(initialData.id_processo || "");
            setFornId(initialData.id_fornecedor || "");
            setNcId(initialData.id_nc || "");
            setValor(initialData.valorEmpenhado?.toString() || "");
            setItensEmpenho(initialData.itens || []);

            // Se estiver editando, pode ser necessário mostrar todos os processos para encontrar o atual se ele já estiver concluído
            setShowAllProcesses(true);
        }
    }, [initialData]);

    // Lógica de Autopreenchimento ao selecionar Fornecedor
    // Só executa se NÃO estiver editando ou se o usuário mudar o fornecedor manualmente
    useEffect(() => {
        if (procId && fornId && !initialData) {
            const fornecedor = listas.fornecedores.find((f: any) => f.id === fornId);
            if (fornecedor) {
                // Encontrar o vínculo com o processo selecionado
                const vinculo = fornecedor.processosVinculados?.find((v: any) => v.processoId === procId);

                // FIX: A propriedade correta é 'itens', não 'itensGanhos'
                if (vinculo && vinculo.itens) {
                    const itensDoVinculo = vinculo.itens;

                    // Enriquecer itens com a descrição e quantidade do processo original
                    const processo = listas.processos.find((p: any) => p.id === procId);
                    let itensDetalhados: any[] = [];

                    if (processo && processo.itens) {
                        itensDetalhados = itensDoVinculo.map((itemVinculo: any) => {
                            const itemOriginal = processo.itens.find((i: any) => i.id === itemVinculo.itemId);

                            // Lógica SRP: Se for Remessa Contínua (legacy) ou SRP, inicia com 0.
                            const isSRP = processo.tipoFornecimento === "SRP" || processo.tipoFornecimento === "REMESSA_CONTINUA";
                            const qtdInicial = isSRP ? 0 : (itemOriginal ? (itemOriginal.quantidade || 1) : 1);

                            let saldoDisponivel = itemOriginal ? (itemOriginal.quantidade || 0) : 0;

                            if (isSRP) {
                                // Calcular quanto já foi empenhado deste item em OUTROS empenhos deste processo
                                // Filtrar empenhos do mesmo processo (excluindo o atual se estiver editando)
                                const outrosEmpenhos = listas.empenhos.filter(e =>
                                    e.id_processo === procId &&
                                    (!empenhoId || e.id !== empenhoId)
                                );

                                // Somar a quantidade deste item em outros empenhos
                                let qtdJaEmpenhada = 0;
                                outrosEmpenhos.forEach(emp => {
                                    const itemNoEmpenho = emp.itens?.find((i: any) => i.itemId === itemVinculo.itemId || i.descricao === itemVinculo.descricao);
                                    if (itemNoEmpenho) {
                                        qtdJaEmpenhada += (parseFloat(itemNoEmpenho.quantidade) || 0);
                                    }
                                });

                                saldoDisponivel = (itemOriginal?.quantidade || 0) - qtdJaEmpenhada;
                                if (saldoDisponivel < 0) saldoDisponivel = 0;
                            }

                            return {
                                ...itemVinculo,
                                descricao: itemOriginal ? itemOriginal.descricao : "Item não encontrado",
                                quantidade: qtdInicial,
                                saldoDisponivel: isSRP ? saldoDisponivel : undefined // Guardar o saldo disponível para validação
                            };
                        });
                    } else {
                        // Fallback
                        itensDetalhados = itensDoVinculo.map((i: any) => ({ ...i, quantidade: 1, descricao: "Item (descrição indisponível)" }));
                    }

                    setItensEmpenho(itensDetalhados);

                    // Calcular total ganho neste processo (Valor Ganho * Quantidade)
                    const totalGanho = itensDetalhados.reduce((acc: number, item: any) => {
                        const qtd = parseFloat(item.quantidade) || 1;
                        const val = parseFloat(item.valorGanho) || 0;
                        return acc + (qtd * val);
                    }, 0);

                    setValor(totalGanho.toString()); // Preenche valor sugerido

                } else {
                    setValor("");
                    setItensEmpenho([]);
                }
            }
        }
    }, [procId, fornId, listas.fornecedores, listas.processos, initialData]);

    // Cálculo do Saldo Restante da NC - usando saldoDisponivel calculado dinamicamente
    const selectedNC = listas.ncs.find((n: any) => n.id === ncId);

    // Pegar o saldo da NC e recalcular dinamicamente
    const empenhosNC = listas.empenhos.filter((e: any) => e.id_nc === selectedNC?.id);
    const totalEmpenhado = empenhosNC.reduce((acc: number, e: any) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);
    const saldoNCCalculado = selectedNC ? (parseFloat(selectedNC.valorTotal) || 0) - totalEmpenhado : 0;

    const valorEmpenhoNum = parseFloat(valor) || 0;

    // Se estiver editando, precisamos considerar que o valor atual já foi descontado do saldo
    const valorAnterior = initialData ? (parseFloat(initialData.valorEmpenhado) || 0) : 0;
    const saldoBase = initialData && initialData.id_nc === ncId ? saldoNCCalculado + valorAnterior : saldoNCCalculado;

    const saldoRestante = saldoBase - valorEmpenhoNum;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!procId || !fornId || !ncId || !nd) return alert("Preencha todos os campos obrigatórios!");

        if (saldoRestante < 0) {
            if (!confirm("O valor do empenho excede o saldo disponível da NC. Deseja continuar mesmo assim?")) return;
        }

        setLoading(true);
        try {
            const data = {
                numero,
                nd,
                tipo,
                dataEmissao: new Date(dataEmissao),
                id_processo: procId,
                id_fornecedor: fornId,
                id_nc: ncId,
                valorEmpenhado: valorEmpenhoNum,
                valorEmpenhado: valorEmpenhoNum,
                itens: itensEmpenho.map((i: any) => ({ ...i, quantidade: parseFloat(i.quantidade) || 0 })),
                status: initialData?.status || "EMPENHADO"
            };

            if (empenhoId) {
                // Ao atualizar, precisamos atualizar o saldo da NC antiga e da nova (se mudou)

                // 1. Devolver saldo para NC antiga
                if (initialData.id_nc) {
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

                await updateDoc(doc(db, "empenhos", empenhoId), data);
                alert("Empenho Atualizado com Sucesso!");
            } else {
                await addDoc(collection(db, "empenhos"), data);

                // Deduzir saldo da NC
                if (ncId) {
                    const ncRef = doc(db, "ncs", ncId);
                    // Atualiza com o saldo restante calculado
                    await updateDoc(ncRef, { saldoDisponivel: saldoRestante });
                }

                alert("Empenho Gerado com Sucesso!"); // AUTOMAÇÃO DE STATUS: Se gerar empenho, muda para AGUARDANDO_ENTREGA
                const procRef = doc(db, "processos", procId);
                const procSnap = await getDoc(procRef);
                if (procSnap.exists() && (procSnap.data().status === "AGUARDANDO_EMPENHO" || procSnap.data().status === "AGUARDANDO_FORNECEDOR")) {
                    await updateDoc(procRef, { status: "AGUARDANDO_ENTREGA" });
                }
            }

            if (onSuccess) onSuccess();
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // Filtros de Processos - apenas mostrar processos que TÊM fornecedores vinculados SEM empenho
    const processosFiltrados = listas.processos.filter((p: any) => {
        if (showAllProcesses) return true; // Se toggle ativado, mostra todos

        // Filtro padrão: Mostra processos que NÃO estão concluídos ou cancelados
        if (p.status === "CONCLUIDO" || p.status === "CANCELADO" || p.status === "SUSPENSO") return false;

        // Verificar se o processo tem fornecedores vinculados que ainda NÃO têm empenho
        const fornecedoresDoProcesso = listas.fornecedores.filter((f: any) =>
            f.processosVinculados?.some((v: any) => v.processoId === p.id)
        );

        if (fornecedoresDoProcesso.length === 0) return false; // Sem fornecedores, não mostrar

        // Verificar se é SRP (ou legado REMESSA_CONTINUA)
        const isSRP = p.tipoFornecimento === "SRP" || p.tipoFornecimento === "REMESSA_CONTINUA";

        // Se for SRP, mostramos se ainda NÃO estiver concluído/cancelado (independente de ter empenho)
        if (isSRP) return true;

        // Se NÃO for SRP (Remessa Única), verificamos se já tem empenho
        // Verificar se algum fornecedor NÃO tem empenho para esse processo
        const algumFornecedorSemEmpenho = fornecedoresDoProcesso.some((f: any) => {
            const temEmpenho = listas.empenhos.some((emp: any) =>
                emp.id_processo === p.id && emp.id_fornecedor === f.id
            );
            return !temEmpenho; // Se não tem empenho, retorna true
        });

        return algumFornecedorSemEmpenho;
    });

    const fornecedoresFiltrados = listas.fornecedores.filter((f: any) =>
        f.processosVinculados?.some((v: any) => v.processoId === procId)
    );

    const ncsFiltradas = listas.ncs.filter((n: any) => {
        // IMPORTANTE: Excluir NCs que já foram recolhidas (marcadas como concluídas manualmente)
        if (n.recolhidoManual) {
            // Se estiver editando e for a mesma NC, permite aparecer (para poder visualizar o empenho existente)
            const isSameNC = initialData && initialData.id_nc === n.id;
            if (!isSameNC) return false;
        }

        // Filtra por ND (se preenchida)
        const matchND = nd ? n.creditos?.some((c: any) => c.nd.includes(nd)) || n.nd?.includes(nd) : true;

        // Calcular saldo disponível dinamicamente
        const empenhosDestaNC = listas.empenhos.filter((e: any) => e.id_nc === n.id);
        const totalEmpenhado = empenhosDestaNC.reduce((acc: number, e: any) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);
        const saldoDisponivel = (parseFloat(n.valorTotal) || 0) - totalEmpenhado;

        const temSaldo = saldoDisponivel > 0.01; // Margem de erro para float

        // Se estiver editando e for a mesma NC, permite aparecer mesmo sem saldo (pois vamos devolver o valor)
        const isSameNC = initialData && initialData.id_nc === n.id;

        return matchND && (temSaldo || isSameNC);
    });

    const handleQuantityChange = (index: number, newQty: string) => {
        const novosItens = [...itensEmpenho];
        // Guarda string para permitir digitação de decimais (ex: "1.")
        novosItens[index].quantidade = newQty;

        setItensEmpenho(novosItens);

        // Recalcular valor total
        const novoTotal = novosItens.reduce((acc: number, item: any) => {
            const qtd = parseFloat(item.quantidade) || 0;
            const val = parseFloat(item.valorGanho) || 0;
            return acc + (qtd * val);
        }, 0);
        setValor(novoTotal.toFixed(2));
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">

            {/* A. Cabeçalho */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <Label>Nº Empenho</Label>
                    <Input value={numero} onChange={e => setNumero(e.target.value)} className="bg-slate-950 border-slate-700" placeholder="Ex: 2024NE..." required />
                </div>
                <div>
                    <Label>ND (Natureza)</Label>
                    <Select onValueChange={setNd} value={nd}>
                        <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            {NDS_DISPONIVEIS.map(n => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Tipo</Label>
                    <Select onValueChange={setTipo} value={tipo}>
                        <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ORDINARIO">Ordinário</SelectItem>
                            <SelectItem value="GLOBAL">Global</SelectItem>
                            <SelectItem value="ESTIMATIVO">Estimativo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Data Emissão</Label>
                    <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} className="bg-slate-950 border-slate-700" />
                </div>
            </div>

            {/* B. Seleção do Objeto */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" /> Seleção do Objeto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <Label className="text-xs text-slate-400">1. Processo (Pendente Empenho)</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] px-2 text-blue-400 hover:text-blue-300"
                                onClick={() => setShowAllProcesses(!showAllProcesses)}
                            >
                                {showAllProcesses ? <><EyeOff className="w-3 h-3 mr-1" /> Ocultar Concluídos</> : <><Eye className="w-3 h-3 mr-1" /> Ver Todos</>}
                            </Button>
                        </div>
                        <Select onValueChange={setProcId} value={procId}>
                            <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder="Selecione o Processo..." /></SelectTrigger>
                            <SelectContent>
                                {processosFiltrados.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.numero} - {p.objetoResumo}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="mb-1 block text-xs text-slate-400">2. Fornecedor (Vencedor)</Label>
                        <Select onValueChange={setFornId} value={fornId} disabled={!procId}>
                            <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder={procId ? "Selecione a Empresa..." : "Selecione o Processo primeiro"} /></SelectTrigger>
                            <SelectContent>
                                {fornecedoresFiltrados.map((f: any) => (
                                    <SelectItem key={f.id} value={f.id}>{f.empresa}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* C. Fonte de Recurso */}
            <div className={`bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4 transition-opacity ${!nd ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" /> Fonte de Recurso (NC)
                </h3>
                <div>
                    <Label className="mb-1 block text-xs text-slate-400">Selecione a NC (Filtrado por ND: {nd} e Saldo Disponível)</Label>
                    <Select onValueChange={setNcId} value={ncId} disabled={!nd}>
                        <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue placeholder={nd ? "Selecione a NC..." : "Preencha a ND acima"} /></SelectTrigger>
                        <SelectContent>
                            {ncsFiltradas.map((n: any) => {
                                // Calcular saldo real
                                const empenhosDestaNC = listas.empenhos.filter((e: any) => e.id_nc === n.id);
                                const totalEmp = empenhosDestaNC.reduce((acc: number, e: any) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);
                                const saldoReal = (parseFloat(n.valorTotal) || 0) - totalEmp;

                                // Formatação personalizada: NC: XXX | ND: ...XX | Saldo: R$ XXX
                                const ndFinal = n.nd ? n.nd.slice(-2) : "??";
                                return (
                                    <SelectItem key={n.id} value={n.id}>
                                        NC: {n.numero} | Saldo: {formatMoney(saldoReal)}
                                    </SelectItem>
                                );
                            })}
                            {ncsFiltradas.length === 0 && <div className="p-2 text-xs text-slate-500 text-center">Nenhuma NC com saldo para esta ND.</div>}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* D. Rodapé e Cálculos */}
            <div className="bg-black/20 p-4 rounded-lg border border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label className="text-emerald-400 font-bold">Total Empenhado (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={valor}
                            onChange={e => setValor(e.target.value)}
                            className="bg-slate-950 border-emerald-900/50 text-2xl text-emerald-400 font-bold h-12"
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">Sugerido com base nos itens ganhos.</p>
                    </div>
                    <div className="text-right">
                        <Label className="text-slate-400">Saldo Restante da NC</Label>
                        <div className={`text-2xl font-bold mt-1 ${saldoRestante < 0 ? 'text-red-500' : 'text-slate-200'}`}>
                            {ncId ? formatMoney(saldoRestante) : "---"}
                        </div>
                        <p className="text-xs text-slate-500">Após dedução deste empenho</p>
                    </div>
                </div>

                {/* Lista de Itens (Editável) */}
                {itensEmpenho.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Itens do Empenho (Defina as Quantidades)</p>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {itensEmpenho.map((item: any, idx: number) => (
                                <div key={item.itemId || idx} className="flex flex-col md:flex-row gap-2 md:items-center p-3 bg-slate-900 rounded border border-slate-800/50">
                                    <div className="flex-1 text-xs">
                                        <p className="font-bold text-slate-300">{item.descricao}</p>
                                        <p className="text-slate-500">Valor Unit.: {formatMoney(item.valorGanho)}</p>
                                    </div>
                                    <div className="w-full md:w-32">
                                        <Label className="text-[10px] text-slate-500">Quantidade</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max={item.saldoDisponivel} // Limitar ao saldo disponível se existir
                                            step="0.01"
                                            value={item.quantidade}
                                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                            className="h-8 text-right bg-slate-950 border-slate-700"
                                        />
                                        {item.saldoDisponivel !== undefined && (
                                            <p className="text-[10px] text-slate-500 text-right mt-1">
                                                Max: {item.saldoDisponivel}
                                            </p>
                                        )}
                                    </div>
                                    <div className="w-full md:w-32 text-right">
                                        <Label className="text-[10px] text-slate-500">Subtotal</Label>
                                        <div className="font-mono text-emerald-400 font-bold text-sm">
                                            {formatMoney((item.quantidade || 0) * (item.valorGanho || 0))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-lg" disabled={loading}>
                {loading ? <Loader2 className="animate-spin mr-2" /> : (empenhoId ? "Atualizar Empenho" : "Confirmar e Gerar Empenho")}
            </Button>
        </form>
    );
}