"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { formatMoney } from "@/app/lib/formatters";
import { motion } from "framer-motion";
import {
    FileText, CheckCircle, AlertCircle, DollarSign,
    Wallet, TrendingUp, Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        processosAbertos: 0,
        processosFinalizados: 0,
        ncsRecebidas: 0,
        valorNcsRecebidas: 0,
        empenhosEmitidos: 0,
        valorEmpenhado: 0,
        valorRecolhido: 0,
        valorLiquidado: 0,
    });

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

                // Processos
                const processosAbertos = processos.filter((p: any) =>
                    p.status !== "CONCLUIDO" && p.status !== "CANCELADO" && p.status !== "SUSPENSO"
                ).length;
                const processosFinalizados = processos.filter((p: any) => p.status === "CONCLUIDO").length;

                // Notas de Crédito
                const ncsRecebidas = ncs.length;
                const valorNcsRecebidas = ncs.reduce((acc: number, nc: any) => acc + (parseFloat(nc.valorTotal) || 0), 0);

                // Empenhos
                const empenhosEmitidos = empenhos.length;
                const valorEmpenhado = empenhos.reduce((acc: number, e: any) => acc + (parseFloat(e.valorEmpenhado) || 0), 0);

                // Recolhimento e Liquidação
                const valorRecolhido = entregas.reduce((acc: number, ent: any) => acc + (parseFloat(ent.valores?.recolhido) || 0), 0);
                const valorLiquidado = entregas.reduce((acc: number, ent: any) => acc + (parseFloat(ent.valores?.liquidado) || 0), 0);

                setStats({
                    processosAbertos,
                    processosFinalizados,
                    ncsRecebidas,
                    valorNcsRecebidas,
                    empenhosEmitidos,
                    valorEmpenhado,
                    valorRecolhido,
                    valorLiquidado,
                });

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Geral</h1>
                    <p className="text-slate-400">Visão clara e intuitiva dos processos e orçamento.</p>
                </div>
            </div>

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
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                <div>
                                    <p className="text-sm text-slate-400">Total de NCs</p>
                                    <p className="text-3xl font-bold text-white">{stats.ncsRecebidas}</p>
                                </div>
                                <Package className="h-12 w-12 text-purple-500/20" />
                            </div>
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
