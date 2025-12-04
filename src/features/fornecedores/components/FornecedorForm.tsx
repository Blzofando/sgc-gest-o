"use client";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/app/lib/firebase";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, SearchCheck } from "lucide-react";
import { ProcessoLinker } from "./ProcessoLinker";

interface Props {
    onSuccess?: () => void;
    dataToEdit?: any;
}

export function FornecedorForm({ onSuccess, dataToEdit }: Props) {
    const [loading, setLoading] = useState(false);

    // Estados de Busca Individuais (Visual)
    const [searchingCNPJ, setSearchingCNPJ] = useState(false);
    const [searchingName, setSearchingName] = useState(false);

    // Dados Globais
    const [todosProcessos, setTodosProcessos] = useState<any[]>([]);
    const [processosDisponiveis, setProcessosDisponiveis] = useState<any[]>([]);

    // Mapa de itens que já têm ganhadores: { "processoId": Set(["itemId1", "itemId2"]) }
    const [itensOcupadosMap, setItensOcupadosMap] = useState<Record<string, Set<string>>>({});

    // Controles de Vinculação
    const [selectedProc, setSelectedProc] = useState("");
    const [itensDisponiveis, setItensDisponiveis] = useState<any[]>([]);
    const [mostrarTodosProcessos, setMostrarTodosProcessos] = useState(false);

    // Campos do Fornecedor
    const [empresa, setEmpresa] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [telefone, setTelefone] = useState("");
    const [email, setEmail] = useState("");

    const [existingId, setExistingId] = useState<string | null>(null);
    const [itensGanhos, setItensGanhos] = useState<Record<string, { selecionado: boolean, valorGanho: number }>>({});

    // --- BUSCA INTELIGENTE ---
    const performSearch = useCallback(async (field: string, value: string) => {
        if (!value || value.length < 4) return;
        if (existingId) return;

        if (field === "cnpj") setSearchingCNPJ(true);
        if (field === "empresa") setSearchingName(true);

        try {
            const q = query(collection(db, "fornecedores"), where(field, "==", value));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const found = snap.docs[0].data();
                setExistingId(snap.docs[0].id);
                if (!empresa) setEmpresa(found.empresa);
                if (!cnpj) setCnpj(found.cnpj);
                setTelefone(found.telefone || "");
                setEmail(found.email || "");
            }
        } catch (error) {
            console.error("Erro na busca:", error);
        } finally {
            setSearchingCNPJ(false);
            setSearchingName(false);
        }
    }, [existingId, empresa, cnpj]);

    // Efeitos de Digitação
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!dataToEdit && cnpj.length >= 14) performSearch('cnpj', cnpj);
        }, 800);
        return () => clearTimeout(timer);
    }, [cnpj, performSearch, dataToEdit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!dataToEdit && empresa.length > 4) performSearch('empresa', empresa);
        }, 1000);
        return () => clearTimeout(timer);
    }, [empresa, performSearch, dataToEdit]);

    // --- CARREGAMENTO INICIAL ---
    useEffect(() => {
        const loadData = async () => {
            if (dataToEdit) {
                setExistingId(dataToEdit.id);
                setEmpresa(dataToEdit.empresa);
                setCnpj(dataToEdit.cnpj);
                setTelefone(dataToEdit.telefone);
                setEmail(dataToEdit.email);
            }

            // 1. Carrega Processos
            const pSnap = await getDocs(collection(db, "processos"));
            const listaProcessos = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTodosProcessos(listaProcessos);

            // 2. Carrega Fornecedores para mapear itens já ocupados
            const fSnap = await getDocs(collection(db, "fornecedores"));
            const ocupadosMap: Record<string, Set<string>> = {};

            fSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.processosVinculados) {
                    data.processosVinculados.forEach((v: any) => {
                        if (!ocupadosMap[v.processoId]) {
                            ocupadosMap[v.processoId] = new Set();
                        }
                        // Adiciona os IDs dos itens que esse fornecedor ganhou
                        v.itens?.forEach((i: any) => ocupadosMap[v.processoId].add(i.itemId));
                    });
                }
            });
            setItensOcupadosMap(ocupadosMap);

            // 3. Filtra Processos Disponíveis (Aqueles que tem pelo menos 1 item livre ou nenhum item ocupado)
            const disponiveis = listaProcessos.filter((p: any) => {
                // Se o processo for cancelado ou concluido, remove da lista disponível principal
                if (p.status === "CONCLUIDO" || p.status === "CANCELADO") return false;

                const itensDoProcesso = p.itens || [];
                // Se não tem itens (Valor Global), verifica apenas se já existe vinculo
                if (itensDoProcesso.length === 0) {
                    return !(ocupadosMap[p.id] && ocupadosMap[p.id].size > 0);
                }

                const itensOcupadosDeste = ocupadosMap[p.id] || new Set();

                // Se o número de itens ocupados for menor que o total, ainda tem item livre
                return itensOcupadosDeste.size < itensDoProcesso.length;
            });

            setProcessosDisponiveis(disponiveis);
        };
        loadData();
    }, [dataToEdit]);

    // Máscara CNPJ
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 14) value = value.slice(0, 14);
        value = value.replace(/^(\d{2})(\d)/, "$1.$2");
        value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
        value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
        value = value.replace(/(\d{4})(\d)/, "$1-$2");
        setCnpj(value);
    };

    // Seleção de Processo
    useEffect(() => {
        if (selectedProc) {
            if (selectedProc === "SHOW_ALL_TRIGGER") {
                setMostrarTodosProcessos(true);
                setSelectedProc("");
                return;
            }
            const proc = todosProcessos.find(p => p.id === selectedProc);
            if (proc && proc.modo === "DETALHADO" && proc.itens) {
                setItensDisponiveis(proc.itens);
                setItensGanhos({});
            } else {
                setItensDisponiveis([]);
            }
        }
    }, [selectedProc, todosProcessos]);

    const toggleItem = (itemId: string, valorRef: number) => {
        setItensGanhos(prev => ({
            ...prev,
            [itemId]: { selecionado: !prev[itemId]?.selecionado, valorGanho: prev[itemId]?.valorGanho || valorRef }
        }));
    };

    const updateValorGanho = (itemId: string, novoValor: number) => {
        setItensGanhos(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], valorGanho: novoValor }
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const itensSalvar = Object.keys(itensGanhos)
                .filter(key => itensGanhos[key].selecionado)
                .map(key => ({ itemId: key, valorGanho: itensGanhos[key].valorGanho }));

            const payloadBase = { empresa, cnpj, telefone, email };

            // Recupera informações extras do processo para salvar junto
            let processoExtraInfo = {};
            if (selectedProc && selectedProc !== "SHOW_ALL_TRIGGER") {
                const procInfo = todosProcessos.find(p => p.id === selectedProc);
                // IMPORTANTE: Aqui pegamos o tipo definido no cadastro do processo
                processoExtraInfo = {
                    tipoFornecimento: procInfo?.tipoFornecimento || "REMESSA_UNICA",
                    modalidade: procInfo?.modalidade || ""
                };
            }

            if (existingId) {
                // --- ATUALIZAR ---
                const docRef = doc(db, "fornecedores", existingId);
                const updateData: any = { ...payloadBase };

                if (selectedProc && selectedProc !== "SHOW_ALL_TRIGGER" && itensSalvar.length > 0) {
                    updateData.processosVinculados = arrayUnion({
                        processoId: selectedProc,
                        itens: itensSalvar,
                        ...processoExtraInfo // Salva o tipo junto com o vínculo
                    });

                    // Atualiza status do processo
                    const procRef = doc(db, "processos", selectedProc);
                    const procSnap = await getDoc(procRef);
                    // Se estava aguardando fornecedor, agora aguarda empenho
                    if (procSnap.exists() && (procSnap.data().status === "AGUARDANDO_FORNECEDOR")) {
                        await updateDoc(procRef, { status: "AGUARDANDO_EMPENHO" });
                    }
                }
                await updateDoc(docRef, updateData);
                alert("Dados da empresa atualizados!");
            } else {
                // --- CRIAR ---
                await addDoc(collection(db, "fornecedores"), {
                    ...payloadBase,
                    processosVinculados: selectedProc && selectedProc !== "SHOW_ALL_TRIGGER" ? [{
                        processoId: selectedProc,
                        itens: itensSalvar,
                        ...processoExtraInfo
                    }] : [],
                    dataCadastro: new Date()
                });

                if (selectedProc && selectedProc !== "SHOW_ALL_TRIGGER") {
                    const procRef = doc(db, "processos", selectedProc);
                    const procSnap = await getDoc(procRef);
                    if (procSnap.exists() && (procSnap.data().status === "AGUARDANDO_FORNECEDOR")) {
                        await updateDoc(procRef, { status: "AGUARDANDO_EMPENHO" });
                    }
                }
                alert("Fornecedor cadastrado!");
            }
            if (onSuccess) onSuccess();
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const listaDropdown = mostrarTodosProcessos ? todosProcessos : processosDisponiveis;

    // Prepara o Set de itens ocupados para o processo selecionado atualmente
    const itensOcupadosDoSelecionado = selectedProc ? (itensOcupadosMap[selectedProc] || new Set()) : new Set<string>();

    return (
        <form onSubmit={handleSave} className="space-y-5">

            {/* Feedback de Encontrado */}
            {existingId && !dataToEdit && (
                <div className="bg-blue-900/30 border border-blue-800 p-3 rounded-md flex items-center gap-3 text-blue-400 text-sm animate-in slide-in-from-top-2">
                    <SearchCheck className="h-5 w-5" />
                    <div>
                        <strong className="block">Empresa Identificada na Base</strong>
                        <span className="text-xs opacity-80">As informações foram carregadas. Ao salvar, atualizaremos o cadastro existente.</span>
                    </div>
                </div>
            )}

            {/* CAMPOS DE IDENTIFICAÇÃO */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Razão Social *</Label>
                    <div className="relative">
                        <Input
                            value={empresa}
                            onChange={e => setEmpresa(e.target.value)}
                            className="bg-slate-950 border-slate-700 pr-8"
                            required
                            placeholder="Digite para buscar..."
                            disabled={!!dataToEdit}
                        />
                        {searchingName && <div className="absolute right-2 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-blue-500" /></div>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>CNPJ *</Label>
                    <div className="relative">
                        <Input
                            value={cnpj}
                            onChange={handleCnpjChange}
                            className={`bg-slate-950 border-slate-700 pr-8 ${existingId ? 'border-blue-500 text-blue-400' : ''}`}
                            placeholder="00.000.000/0000-00"
                            required
                            disabled={!!dataToEdit}
                        />
                        {searchingCNPJ && <div className="absolute right-2 top-2.5"><Loader2 className="h-4 w-4 animate-spin text-blue-500" /></div>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} className="bg-slate-950 border-slate-700" /></div>
                <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-950 border-slate-700" /></div>
            </div>

            <div className="h-px bg-slate-800 my-2"></div>

            <ProcessoLinker
                selectedProc={selectedProc}
                setSelectedProc={setSelectedProc}
                listaDropdown={listaDropdown}
                mostrarTodosProcessos={mostrarTodosProcessos}
                itensDisponiveis={itensDisponiveis}
                itensOcupados={itensOcupadosDoSelecionado} // Passamos quais itens já tem dono
                itensGanhos={itensGanhos}
                toggleItem={toggleItem}
                updateValorGanho={updateValorGanho}
                isEditing={!!dataToEdit}
            />

            <div className="pt-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : (existingId ? "Salvar Alterações" : "Cadastrar Fornecedor")}
                </Button>
            </div>
        </form>
    );
}