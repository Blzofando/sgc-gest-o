"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { formatMoney } from "@/app/lib/formatters";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import {
    FileText, CheckCircle, AlertCircle, DollarSign,
    Wallet, TrendingUp, Package, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [selectedND, setSelectedND] = useState<string>("TODAS");
    const [availableNDs, setAvailableNDs] = useState<string[]>([]);

    // Armazena dados brutos para filtragem
    const [rawData, setRawData] = useState<{
        processos: any[],
        empenhos: any[],
        entregas: any[],
        ncs: any[]
    }>({ processos: [], empenhos: [], entregas: [], ncs: [] });

    const [stats, setStats] = useState({
        processosAbertos: 0,
        processosFinalizados: 0,
        // NCs breakdown
        ncsTotal: 0,
        ncsAtivas: 0,
        ncsConcluidas: 0,
        valorNcsRecebidas: 0,
        // Empenhos
        empenhosEmitidos: 0,
        valorEmpenhado: 0,
        // Valores de execução
        valorRecolhido: 0,
        valorLiquidado: 0,
    });

    // 1. Carregar Dados Iniciais
    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setLoading(true);
                const [procSnap, empSnap, entSnap, ncSnap] = await Promise.all([
                    getDocs(collection(db, "processos")),
                    getDocs(collection(db, "empenhos")),
                    getDocs(collection(db, "entregas")),
                    getDocs(collection(db, "ncs"))
                ]);

                const processos = procSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const empenhos = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const entregas = entSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const ncs = ncSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Extrair NDs únicas
                const nds = new Set<string>();
                ncs.forEach((nc: any) => nc.creditos?.forEach((c: any) => { if (c.nd) nds.add(c.nd) }));
                empenhos.forEach((e: any) => { if (e.nd) nds.add(e.nd) });
                setAvailableNDs(Array.from(nds).sort());

                setRawData({ processos, empenhos, entregas, ncs });

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    // 2. Recalcular Estatísticas quando rawData ou selectedND mudar
    useEffect(() => {
        if (loading) return;

        const { processos, empenhos, entregas, ncs } = rawData;

        // --- PROCESSOS (Calcular status dinâmico baseado em entregas) ---
        // Função para calcular status dinâmico de um processo
        const getDynamicStatus = (p: any) => {
            if (p.status === "CANCELADO" || p.status === "SUSPENSO") return p.status;

            // Verificar se tem empenhos vinculados
            const empenhosDoProcesso = empenhos.filter((e: any) => e.id_processo === p.id);
            if (empenhosDoProcesso.length === 0) return p.status; // Mantém status original se não tem empenho

            // Verificar entregas dos empenhos
            const entregasDoProcesso = entregas.filter((ent: any) =>
                empenhosDoProcesso.some((emp: any) => emp.id === ent.id_empenho)
            );

            if (entregasDoProcesso.length === 0) return p.status;

            // Se todas as entregas estiverem concluídas/liquidadas
            const todosConcluidos = entregasDoProcesso.every((ent: any) =>
                ent.status === "LIQUIDADO" || ent.status === "ENTREGUE" || ent.status === "CONCLUIDO"
            );
            if (todosConcluidos && entregasDoProcesso.length > 0) return "CONCLUIDO";

            return p.status;
        };

        // Contar processos usando status dinâmico
        let processosAbertos = 0;
        let processosFinalizados = 0;
        processos.forEach((p: any) => {
            const status = getDynamicStatus(p);
            if (status === "CONCLUIDO") {
                processosFinalizados++;
            } else if (status !== "CANCELADO" && status !== "SUSPENSO") {
                processosAbertos++;
            }
        });

        // --- FILTRAGEM POR ND ---

        // Empenhos: Filtrar por campo ND
        const empenhosFiltrados = selectedND === "TODAS"
            ? empenhos
            : empenhos.filter((e: any) => e.nd === selectedND);

        const empenhosEmitidos = empenhosFiltrados.length;
        const valorEmpenhado = empenhosFiltrados.reduce((acc: number, e: any) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);

        // Entregas: Filtrar pelo empenho vinculado
        const entregasFiltradas = selectedND === "TODAS"
            ? entregas
            : entregas.filter((ent: any) => {
                const emp = empenhos.find((e: any) => e.id === ent.id_empenho);
                return emp && emp.nd === selectedND;
            });

        // NCs: Calcular valores com base na lógica de status
        let valorNcsRecebidas = 0;
        let ncsTotal = 0;
        let ncsAtivas = 0;
        let ncsConcluidas = 0;

        // Criar um mapa de empenhos por NC (usando id_nc, não ncNumero)
        const empenhosPorNcId = new Map<string, number>();
        empenhosFiltrados.forEach((emp: any) => {
            if (emp.id_nc) {
                const current = empenhosPorNcId.get(emp.id_nc) || 0;
                empenhosPorNcId.set(emp.id_nc, current + (parseFloat(emp.valorEmpenhado) || 0));
            }
        });

        // Criar mapa de liquidado/recolhido por empenho
        const liquidadoPorEmpenho = new Map<string, number>();
        const recolhidoPorEmpenho = new Map<string, number>();
        entregasFiltradas.forEach((ent: any) => {
            const empId = ent.id_empenho;
            if (empId) {
                liquidadoPorEmpenho.set(empId, (liquidadoPorEmpenho.get(empId) || 0) + (parseFloat(ent.valores?.liquidado) || 0));
                recolhidoPorEmpenho.set(empId, (recolhidoPorEmpenho.get(empId) || 0) + (parseFloat(ent.valores?.recolhido) || 0));
            }
        });

        // Calcular por NC
        ncs.forEach((nc: any) => {
            const creditosFiltrados = selectedND === "TODAS"
                ? (nc.creditos || [])
                : (nc.creditos || []).filter((c: any) => c.nd === selectedND);

            if (creditosFiltrados.length > 0) {
                ncsTotal++;
                const valorNC = creditosFiltrados.reduce((acc: number, c: any) => acc + (parseFloat(c.valor) || 0), 0);
                valorNcsRecebidas += valorNC;

                // Calcular status da NC usando id da NC
                const totalEmpenhadoNC = empenhosPorNcId.get(nc.id) || 0;
                const valorRecolhidoNC = nc.recolhidoManual
                    ? (nc.valorTotal - totalEmpenhadoNC)
                    : (nc.valorRecolhido || 0);
                const saldoDisponivel = nc.valorTotal - totalEmpenhadoNC - valorRecolhidoNC;

                // Calcular liquidado da NC através dos empenhos vinculados (usando id_nc)
                let totalLiquidadoNC = 0;
                empenhosFiltrados.filter((e: any) => e.id_nc === nc.id).forEach((emp: any) => {
                    totalLiquidadoNC += liquidadoPorEmpenho.get(emp.id) || 0;
                });

                // Determinar se está concluída
                const isConcluido = nc.recolhidoManual ||
                    (totalLiquidadoNC >= totalEmpenhadoNC && totalEmpenhadoNC > 0 && saldoDisponivel < 1);

                if (isConcluido) {
                    ncsConcluidas++;
                } else {
                    ncsAtivas++;
                }
            }
        });

        // Total Liquidado das entregas
        const valorLiquidado = entregasFiltradas.reduce((acc: number, ent: any) => acc + (parseFloat(ent.valores?.liquidado) || 0), 0);

        // Total Recolhido das NCs (soma dos valorRecolhido de NCs que foram recolhidas manualmente)
        let valorRecolhido = 0;
        ncs.forEach((nc: any) => {
            const creditosFiltrados = selectedND === "TODAS"
                ? (nc.creditos || [])
                : (nc.creditos || []).filter((c: any) => c.nd === selectedND);

            if (creditosFiltrados.length > 0) {
                // Usar valorRecolhido salvo na NC ou calcular baseado em recolhidoManual
                if (nc.recolhidoManual) {
                    const totalEmpenhadoNC = empenhosPorNcId.get(nc.id) || 0;
                    valorRecolhido += (parseFloat(nc.valorTotal) || 0) - totalEmpenhadoNC;
                } else if (nc.valorRecolhido) {
                    valorRecolhido += parseFloat(nc.valorRecolhido) || 0;
                }
            }
        });

        setStats({
            processosAbertos,
            processosFinalizados,
            ncsTotal,
            ncsAtivas,
            ncsConcluidas,
            valorNcsRecebidas,
            empenhosEmitidos,
            valorEmpenhado,
            valorRecolhido,
            valorLiquidado,
        });

    }, [rawData, selectedND, loading]);

    if (loading) {
        return <LoadingState text="Carregando dashboard..." className="h-[50vh]" />;
    }

    const totalProcessos = stats.processosAbertos + stats.processosFinalizados;
    const percentAbertos = totalProcessos > 0 ? (stats.processosAbertos / totalProcessos) * 100 : 0;
    const percentFinalizados = totalProcessos > 0 ? (stats.processosFinalizados / totalProcessos) * 100 : 0;

    const processosData = [
        { name: "Abertos", value: stats.processosAbertos, percent: percentAbertos, color: "#60a5fa" },
        { name: "Finalizados", value: stats.processosFinalizados, percent: percentFinalizados, color: "#34d399" }
    ];

    const orcamentoData = [
        { name: "NCs Recebidas", value: stats.valorNcsRecebidas, color: "#a78bfa", icon: Package },
        { name: "Empenhado", value: stats.valorEmpenhado, color: "#60a5fa", icon: Wallet },
        { name: "Recolhido", value: stats.valorRecolhido, color: "#fbbf24", icon: TrendingUp },
        { name: "Liquidado", value: stats.valorLiquidado, color: "#34d399", icon: CheckCircle }
    ];

    const maxOrcamento = Math.max(...orcamentoData.map(d => d.value));

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-500">
            {/* Header */}
            <PageHeader
                title="Dashboard Geral"
                description="Visão clara e intuitiva dos processos e orçamento."
            />

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Processos - Gráfico Pizza */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Processos
                        </CardTitle>
                        <CardDescription>Situação atual dos processos licitatórios</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                            {/* Pie Chart */}
                            <div className="relative w-48 h-48">
                                <svg viewBox="0 0 200 200" className="transform -rotate-90">
                                    {/* Background Circle */}
                                    <circle cx="100" cy="100" r="80" fill="none" stroke="#1e293b" strokeWidth="40" />

                                    {/* Abertos Segment */}
                                    <motion.circle
                                        cx="100" cy="100" r="80"
                                        fill="none"
                                        stroke="#60a5fa"
                                        strokeWidth="40"
                                        strokeDasharray={`${percentAbertos * 5.03} ${100 * 5.03}`}
                                        initial={{ strokeDasharray: "0 503" }}
                                        animate={{ strokeDasharray: `${percentAbertos * 5.03} ${100 * 5.03}` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    />

                                    {/* Finalizados Segment */}
                                    <motion.circle
                                        cx="100" cy="100" r="80"
                                        fill="none"
                                        stroke="#34d399"
                                        strokeWidth="40"
                                        strokeDasharray={`${percentFinalizados * 5.03} ${100 * 5.03}`}
                                        strokeDashoffset={-percentAbertos * 5.03}
                                        initial={{ strokeDasharray: "0 503" }}
                                        animate={{ strokeDasharray: `${percentFinalizados * 5.03} ${100 * 5.03}` }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <span className="text-4xl font-bold text-white">{totalProcessos}</span>
                                    <span className="text-xs text-slate-500 uppercase">Total</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-4">
                                {processosData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-300">{item.name}</p>
                                            <p className="text-2xl font-bold text-white">{item.value}</p>
                                            <p className="text-xs text-slate-500">{item.percent.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Orçamento - Gráfico de Barras */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            Execução Orçamentária
                        </CardTitle>
                        <CardDescription>Fluxo de recursos e pagamentos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-6">
                            <Select value={selectedND} onValueChange={setSelectedND}>
                                <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-slate-500" />
                                        <SelectValue placeholder="Filtrar por Natureza (ND)" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODAS">Todas as Naturezas</SelectItem>
                                    {availableNDs.map(nd => (
                                        <SelectItem key={nd} value={nd}>{nd}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4">
                            {orcamentoData.map((item, idx) => {
                                const percent = maxOrcamento > 0 ? (item.value / maxOrcamento) * 100 : 0;
                                const Icon = item.icon;
                                return (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" style={{ color: item.color }} />
                                                <span className="text-sm font-medium text-slate-300">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-white">{formatMoney(item.value)}</span>
                                        </div>
                                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: item.color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percent}%` }}
                                                transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Detalhamento de Empenhos */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-blue-500" />
                            Empenhos
                        </CardTitle>
                        <CardDescription>Detalhamento dos empenhos emitidos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                <div>
                                    <p className="text-sm text-slate-400">Total de Empenhos</p>
                                    <p className="text-3xl font-bold text-white">{stats.empenhosEmitidos}</p>
                                </div>
                                <Wallet className="h-12 w-12 text-blue-500/20" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                <div>
                                    <p className="text-sm text-slate-400">Valor Total Empenhado</p>
                                    <p className="text-3xl font-bold text-blue-400">{formatMoney(stats.valorEmpenhado)}</p>
                                </div>
                                <DollarSign className="h-12 w-12 text-blue-500/20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detalhamento de NCs */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-purple-500" />
                            Notas de Crédito
                        </CardTitle>
                        <CardDescription>Recursos recebidos via NC</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Grid com contadores */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-900/50 text-center">
                                    <p className="text-xs text-blue-400 uppercase tracking-wider">Ativas</p>
                                    <p className="text-2xl font-bold text-blue-400">{stats.ncsAtivas}</p>
                                </div>
                                <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-900/50 text-center">
                                    <p className="text-xs text-emerald-400 uppercase tracking-wider">Concluídas</p>
                                    <p className="text-2xl font-bold text-emerald-400">{stats.ncsConcluidas}</p>
                                </div>
                                <div className="p-3 bg-purple-950/30 rounded-lg border border-purple-900/50 text-center">
                                    <p className="text-xs text-purple-400 uppercase tracking-wider">Total</p>
                                    <p className="text-2xl font-bold text-purple-400">{stats.ncsTotal}</p>
                                </div>
                            </div>
                            {/* Valor Total */}
                            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                <div>
                                    <p className="text-sm text-slate-400">Valor Total Recebido</p>
                                    <p className="text-3xl font-bold text-purple-400">{formatMoney(stats.valorNcsRecebidas)}</p>
                                </div>
                                <DollarSign className="h-12 w-12 text-purple-500/20" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Processos Abertos"
                    value={stats.processosAbertos}
                    icon={AlertCircle}
                    color="text-blue-400"
                    bgColor="bg-blue-500/10"
                />
                <SummaryCard
                    title="Processos Finalizados"
                    value={stats.processosFinalizados}
                    icon={CheckCircle}
                    color="text-emerald-400"
                    bgColor="bg-emerald-500/10"
                />
                <SummaryCard
                    title="Total Recolhido"
                    value={formatMoney(stats.valorRecolhido)}
                    icon={TrendingUp}
                    color="text-yellow-400"
                    bgColor="bg-yellow-500/10"
                />
                <SummaryCard
                    title="Total Liquidado"
                    value={formatMoney(stats.valorLiquidado)}
                    icon={CheckCircle}
                    color="text-emerald-400"
                    bgColor="bg-emerald-500/10"
                />
            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, color, bgColor }: any) {
    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${bgColor}`}>
                        <Icon className={`h-6 w-6 ${color}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
