"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Plane,
    Plus,
    Search,
    Calendar,
    MapPin,
    Users,
    Trash2,
    Pencil,
    ChevronDown,
    DollarSign
} from "lucide-react";
import { formatMoney } from "@/app/lib/formatters";
import { DiariaForm } from "@/features/diarias/components/DiariaForm";
import type { Diaria } from "@/types";

export default function DiariasPage() {
    const [diarias, setDiarias] = useState<any[]>([]);
    const [ncs, setNcs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDiaria, setEditingDiaria] = useState<Diaria | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Diárias
            const diariasSnap = await getDocs(query(collection(db, "diarias"), orderBy("dataCriacao", "desc")));
            const diariasData = diariasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // NCs para exibir número
            const ncsSnap = await getDocs(collection(db, "ncs"));
            const ncsData = ncsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            setDiarias(diariasData);
            setNcs(ncsData);
        } catch (error) {
            console.error("Erro ao buscar diárias:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSuccess = () => {
        setDialogOpen(false);
        setEditingDiaria(null);
        fetchData();
    };

    const handleEdit = (diaria: any) => {
        setEditingDiaria(diaria);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta diária?")) return;
        try {
            await deleteDoc(doc(db, "diarias", id));
            fetchData();
        } catch (error) {
            console.error("Erro ao excluir diária:", error);
        }
    };

    const getNcNumero = (ncId: string) => {
        const nc = ncs.find(n => n.id === ncId);
        return nc?.numero || "NC não encontrada";
    };

    const toggleCard = (id: string) => {
        setExpandedCard(expandedCard === id ? null : id);
    };

    // Filtro de busca
    const diariasFiltradas = diarias.filter(d =>
        d.numeroDiex?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.missao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.militares?.some((m: any) => m.nome?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Formatar data/hora
    const formatDateTime = (timestamp: any) => {
        if (!timestamp) return "---";
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Plane className="h-6 w-6 text-amber-500" />
                        Diárias
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Controle de diárias de militares
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingDiaria(null); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-amber-600 hover:bg-amber-500">
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Diária
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
                        <DialogHeader>
                            <DialogTitle className="text-white">
                                {editingDiaria ? "Editar Diária" : "Nova Diária"}
                            </DialogTitle>
                        </DialogHeader>
                        <DiariaForm
                            onSuccess={handleSuccess}
                            initialData={editingDiaria}
                            diariaId={editingDiaria?.id}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Buscar por DIEX, missão, local ou militar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-800"
                />
            </div>

            {/* Listagem */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
            ) : diariasFiltradas.length === 0 ? (
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Plane className="h-12 w-12 text-slate-700 mb-4" />
                        <p className="text-slate-500">
                            {searchTerm ? "Nenhuma diária encontrada para essa busca." : "Nenhuma diária cadastrada."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {diariasFiltradas.map((diaria) => (
                        <Card
                            key={diaria.id}
                            className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors"
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-white flex items-center gap-2 text-lg">
                                            <Plane className="h-5 w-5 text-amber-500" />
                                            DIEX: {diaria.numeroDiex}
                                        </CardTitle>
                                        <p className="text-slate-400 text-sm mt-1">{diaria.missao}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">
                                            <DollarSign className="h-3 w-3 mr-1" />
                                            {formatMoney(diaria.valorTotal || 0)}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-white"
                                            onClick={() => handleEdit(diaria)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                                            onClick={() => handleDelete(diaria.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4 text-blue-400" />
                                        {diaria.local}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4 text-purple-400" />
                                        {formatDateTime(diaria.dataHoraIda)} → {formatDateTime(diaria.dataHoraVolta)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="h-4 w-4 text-amber-400" />
                                        {diaria.militares?.length || 0} militar(es)
                                    </span>
                                </div>

                                {/* Botão Expandir */}
                                <button
                                    onClick={() => toggleCard(diaria.id)}
                                    className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-300 py-2 border-t border-slate-800 mt-2 transition-colors"
                                >
                                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedCard === diaria.id ? "rotate-180" : ""}`} />
                                    {expandedCard === diaria.id ? "Ocultar detalhes" : "Ver detalhes"}
                                </button>

                                {/* Detalhes Expandidos */}
                                {expandedCard === diaria.id && (
                                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                                        {/* NC Vinculada */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-500">NC de Crédito:</span>
                                            <Badge variant="outline" className="border-blue-600/30 text-blue-400">
                                                {getNcNumero(diaria.id_nc)}
                                            </Badge>
                                        </div>

                                        {/* Lista de Militares */}
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Militares Favorecidos</p>
                                            <div className="space-y-2">
                                                {diaria.militares?.map((m: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between bg-slate-950 p-3 rounded border border-slate-800"
                                                    >
                                                        <span className="text-slate-200">{m.nome}</span>
                                                        <div className="text-right">
                                                            <span className="text-emerald-400 font-mono">
                                                                {m.numDiarias} × {formatMoney(m.valorUnitario)} = {formatMoney(m.numDiarias * m.valorUnitario)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Observações */}
                                        {diaria.observacoes && (
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Observações</p>
                                                <p className="text-sm text-slate-300">{diaria.observacoes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
