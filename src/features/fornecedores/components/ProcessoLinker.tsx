import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Eye, Link as LinkIcon, Filter, Layers } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
    selectedProc: string;
    setSelectedProc: (val: string) => void;
    listaDropdown: any[];
    mostrarTodosProcessos: boolean;
    itensDisponiveis: any[];
    itensOcupados: Set<string>; // IDs dos itens que já foram ganhos por outros
    itensGanhos: Record<string, { selecionado: boolean, valorGanho: number }>;
    toggleItem: (itemId: string, valorRef: number) => void;
    updateValorGanho: (itemId: string, novoValor: number) => void;
    isEditing: boolean;
}

export function ProcessoLinker({
    selectedProc, setSelectedProc, listaDropdown, mostrarTodosProcessos,
    itensDisponiveis, itensOcupados, itensGanhos, toggleItem, updateValorGanho, isEditing
}: Props) {

    // Estado local para controlar se mostra itens já ganhos na tabela
    const [mostrarItensOcupados, setMostrarItensOcupados] = useState(false);

    // Filtra visualmente os itens
    const itensParaExibir = itensDisponiveis.filter(item => {
        if (mostrarItensOcupados) return true; // Se mandou mostrar tudo, retorna tudo
        return !itensOcupados.has(item.id); // Senão, só retorna quem NÃO está no set de ocupados
    });

    const temItensOcultos = itensDisponiveis.length > itensParaExibir.length;

    return (
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center mb-2">
                <Label className="text-blue-400 font-bold flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Vincular Novo Processo (Opcional)
                </Label>
                {!isEditing && (
                    <Link href="/processos" className="text-xs text-slate-500 flex items-center hover:text-blue-400 transition-colors">
                        <LinkIcon className="h-3 w-3 mr-1" /> Criar Processo
                    </Link>
                )}
            </div>

            <Select onValueChange={setSelectedProc} value={selectedProc}>
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1">
                    <SelectValue placeholder="Selecione o Processo Ganho..." />
                </SelectTrigger>
                <SelectContent>
                    {/* Lista Padrão (Processos com itens livres) */}
                    {listaDropdown.length > 0 && listaDropdown.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.numero} - {p.objetoResumo.substring(0, 30)}...
                        </SelectItem>
                    ))}

                    {/* Mensagem caso lista vazia */}
                    {listaDropdown.length === 0 && !mostrarTodosProcessos && (
                        <div className="p-2 text-xs text-slate-500 text-center">Nenhum processo livre encontrado.</div>
                    )}

                    {/* Botão de Expandir no final */}
                    {!mostrarTodosProcessos && (
                        <SelectItem value="SHOW_ALL_TRIGGER" className="font-bold text-blue-400 border-t border-slate-800 mt-1 focus:bg-blue-900/20 cursor-pointer">
                            <span className="flex items-center gap-2"><Eye className="h-3 w-3" /> Mostrar Todos os Processos</span>
                        </SelectItem>
                    )}
                </SelectContent>
            </Select>

            {selectedProc && selectedProc !== "SHOW_ALL_TRIGGER" && itensDisponiveis.length > 0 && (
                <div className="mt-4 animate-in fade-in space-y-2">
                    <div className="flex justify-between items-end">
                        <Label className="text-xs text-slate-400">Selecione os itens ganhos:</Label>

                        {temItensOcultos && !mostrarItensOcupados && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMostrarItensOcupados(true)}
                                className="h-6 text-[10px] text-slate-500 hover:text-blue-400 px-2"
                            >
                                <Filter className="h-3 w-3 mr-1" /> Exibir itens já vinculados a outros
                            </Button>
                        )}
                        {mostrarItensOcupados && temItensOcultos && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMostrarItensOcupados(false)}
                                className="h-6 text-[10px] text-blue-400 hover:text-blue-300 px-2"
                            >
                                Ocultar itens já vinculados
                            </Button>
                        )}
                    </div>

                    <div className="max-h-[250px] overflow-y-auto border border-slate-800 rounded">
                        <Table>
                            <TableHeader className="bg-slate-950 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[10%] text-center">Ganho</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Valor Ref.</TableHead>
                                    <TableHead>Valor Ganho</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="bg-slate-900">
                                {itensParaExibir.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-slate-500 py-4">
                                            Todos os itens deste processo já têm ganhadores.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    itensParaExibir.map(item => {
                                        const selecionado = itensGanhos[item.id]?.selecionado;
                                        const isOcupado = itensOcupados.has(item.id);

                                        return (
                                            <TableRow key={item.id} className={`${selecionado ? "bg-blue-900/20" : ""} ${isOcupado ? "opacity-60 bg-red-900/10" : ""}`}>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={selecionado}
                                                        onCheckedChange={() => toggleItem(item.id, item.valorUnitarioRef)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {item.descricao}
                                                    {isOcupado && <span className="ml-2 text-[10px] text-red-400 font-bold border border-red-900 bg-red-950 px-1 rounded">JÁ VINCULADO</span>}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-400">R$ {item.valorUnitarioRef}</TableCell>
                                                <TableCell>
                                                    {selecionado && (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={itensGanhos[item.id]?.valorGanho}
                                                            onChange={(e) => updateValorGanho(item.id, parseFloat(e.target.value))}
                                                            className="h-7 w-24 bg-slate-950 border-slate-700 text-green-400 text-xs font-bold focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}