"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
    CheckCircle, Circle, ArrowRight, ArrowLeft, Package, Truck,
    FileCheck, DollarSign, AlertCircle, Send, Palette, Calendar, Trash2, MailCheck,
    Lock, Check, CalendarPlus
} from "lucide-react";
import { formatMoney } from "@/app/lib/formatters";
import { db } from "@/app/lib/firebase";
import { doc, updateDoc, addDoc, collection, getDoc, deleteDoc } from "firebase/firestore";
import { cn } from "@/app/lib/utils";

interface EntregaWizardProps {
    data: any; // Empenho (new) or Entrega (existing)
    isNew: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Granular Steps
const STEPS = [
    { id: 0, title: "Seleção", icon: Package, key: 'selecao' },
    { id: 1, title: "Envio", icon: Send, key: 'envio_empenho' },
    { id: 2, title: "Recebimento", icon: MailCheck, key: 'recebimento_empenho' },
    { id: 3, title: "Arte?", icon: Palette, key: 'req_arte' },
    { id: 4, title: "Aprovação", icon: FileCheck, key: 'aprovacao_arte' },
    { id: 5, title: "Envio Arte", icon: Send, key: 'envio_arte' },
    { id: 6, title: "Rastreio", icon: Truck, key: 'rastreio' },
    { id: 7, title: "Conferência", icon: CheckCircle, key: 'conferencia' },
];

export function EntregaWizard({ data, isNew, onClose, onSuccess }: EntregaWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(isNew ? null : data.id);

    // Form State
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [enviadoEmpenho, setEnviadoEmpenho] = useState(false);
    const [recebidoEmpenho, setRecebidoEmpenho] = useState(false);
    const [dataRecebimentoEmpenho, setDataRecebimentoEmpenho] = useState("");
    const [reqArte, setReqArte] = useState<boolean | null>(null);
    const [arteAprovada, setArteAprovada] = useState(false);
    const [arteEnviada, setArteEnviada] = useState(false);
    const [codigoRastreio, setCodigoRastreio] = useState("");
    const [semRastreio, setSemRastreio] = useState(false);
    const [prazo, setPrazo] = useState("");
    const [conferido, setConferido] = useState(false);

    // Prazo Lock State
    const [prazoTravado, setPrazoTravado] = useState(false);
    const [dataPrazoTravado, setDataPrazoTravado] = useState("");
    const [historicoProrrogacoes, setHistoricoProrrogacoes] = useState<any[]>([]);

    // Prorrogação Modal State
    const [showProrrogacao, setShowProrrogacao] = useState(false);
    const [motivoProrrogacao, setMotivoProrrogacao] = useState("");
    const [diasProrrogacao, setDiasProrrogacao] = useState<number | null>(null);
    const [dataProrrogacaoCustom, setDataProrrogacaoCustom] = useState("");

    // Debounce Ref for Text Inputs
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize
    useEffect(() => {
        if (isNew) {
            if (data.tipo === 'ORDINARIO') {
                setSelectedItems(data.itens.map((i: any) => ({ ...i, quantidadeSolicitada: i.quantidade })));
                setCurrentStep(1);
            } else {
                setSelectedItems(data.itens.map((i: any) => ({ ...i, quantidadeSolicitada: 0 })));
                setCurrentStep(0);
            }
        } else {
            // Existing Delivery
            setSelectedItems(data.itens || []);
            setCodigoRastreio(data.rastreio || "");
            setSemRastreio(data.semRastreio || false);
            setPrazo(data.prazo ? new Date(data.prazo).toISOString().split('T')[0] : "");

            if (data.etapas) {
                setEnviadoEmpenho(data.etapas.enviadoEmpenho || false);
                setRecebidoEmpenho(data.etapas.recebidoEmpenho || false);
                setDataRecebimentoEmpenho(data.etapas.dataRecebimentoEmpenho ? new Date(data.etapas.dataRecebimentoEmpenho).toISOString().split('T')[0] : "");
                setReqArte(data.etapas.reqArte);
                setArteAprovada(data.etapas.arteAprovada || false);
                setArteEnviada(data.etapas.arteEnviada || false);
                setConferido(data.etapas.conferido || false);
            }

            // Load prazo lock state
            setPrazoTravado(data.prazoTravado || false);
            setDataPrazoTravado(data.dataPrazoTravado || "");
            setHistoricoProrrogacoes(data.historicoProrrogacoes || []);

            const calculatedStep = determineStepFromData(data);
            setCurrentStep(calculatedStep);
        }
    }, [data, isNew]);

    // Auto-Save Effect for Boolean/Selection Changes
    // We use a separate function to trigger saves explicitly on user interaction to avoid loops
    // But for simplicity in this wizard, we can use a useEffect that listens to critical state changes
    // IF activeId exists.

    // However, to be safe and efficient, we will call `autoSave()` in the event handlers.

    const determineStepFromData = (data: any) => {
        if (data.status === 'LIQUIDADO') return 7;
        if (data.status === 'ENTREGUE') return 7;
        if (data.status === 'ENVIADO') return 6;
        if (data.status === 'EM_PRODUCAO') return 6;
        if (data.status === 'AGUARDANDO_ENVIO_ARTE') return 5;
        if (data.status === 'AGUARDANDO_APROVACAO_ARTE') return 4;
        if (data.status === 'AGUARDANDO_DEFINICAO_ARTE') return 3;
        if (data.status === 'AGUARDANDO_RECEBIMENTO_EMPENHO') return 2;
        if (data.status === 'AGUARDANDO_ENVIO_EMPENHO') return 1;
        return 0;
    };

    const calculateStatus = (values: any) => {
        if (values.conferido) return 'LIQUIDADO';
        if (values.codigoRastreio || values.semRastreio) return 'ENVIADO';
        if (values.arteEnviada) return 'EM_PRODUCAO';
        if (values.arteAprovada) return 'AGUARDANDO_ENVIO_ARTE';
        if (values.reqArte === true) return 'AGUARDANDO_APROVACAO_ARTE';
        if (values.reqArte === false) return 'EM_PRODUCAO';
        if (values.recebidoEmpenho) return 'AGUARDANDO_DEFINICAO_ARTE';
        if (values.enviadoEmpenho) return 'AGUARDANDO_RECEBIMENTO_EMPENHO';
        return 'AGUARDANDO_ENVIO_EMPENHO';
    };

    const autoSave = async (overrideValues?: any) => {
        const currentValues = {
            selectedItems,
            enviadoEmpenho,
            recebidoEmpenho,
            dataRecebimentoEmpenho,
            reqArte,
            arteAprovada,
            arteEnviada,
            codigoRastreio,
            semRastreio,
            prazo,
            conferido,
            ...overrideValues
        };

        const status = calculateStatus(currentValues);

        const entregaData = {
            id_empenho: isNew ? data.id : data.id_empenho,
            empenhoNumero: isNew ? data.numero : data.empenhoNumero,
            fornecedorNome: isNew ? data.fornecedorNome || data.empresa || "Fornecedor" : data.fornecedorNome,
            tipo: isNew ? data.tipo : data.tipo,
            itens: currentValues.selectedItems,
            status: status,
            etapas: {
                enviadoEmpenho: currentValues.enviadoEmpenho,
                recebidoEmpenho: currentValues.recebidoEmpenho,
                dataRecebimentoEmpenho: currentValues.dataRecebimentoEmpenho ? new Date(currentValues.dataRecebimentoEmpenho).toISOString() : null,
                reqArte: currentValues.reqArte,
                arteAprovada: currentValues.arteAprovada,
                arteEnviada: currentValues.arteEnviada,
                conferido: currentValues.conferido
            },
            rastreio: currentValues.codigoRastreio,
            semRastreio: currentValues.semRastreio,
            prazo: currentValues.prazo ? new Date(currentValues.prazo).toISOString() : null,
            prazoTravado: currentValues.prazoTravado ?? prazoTravado,
            dataPrazoTravado: currentValues.dataPrazoTravado ?? dataPrazoTravado,
            historicoProrrogacoes: currentValues.historicoProrrogacoes ?? historicoProrrogacoes,
            dataAtualizacao: new Date()
        };

        try {
            if (activeId) {
                await updateDoc(doc(db, "entregas", activeId), entregaData);
            } else {
                const docRef = await addDoc(collection(db, "entregas"), {
                    ...entregaData,
                    dataCriacao: new Date()
                });
                setActiveId(docRef.id);
            }
        } catch (error) {
            console.error("Auto-save error:", error);
        }
    };

    // Handle locking the deadline
    const handleTravarPrazo = async () => {
        if (!prazo) return;

        const now = new Date().toISOString();
        setPrazoTravado(true);
        setDataPrazoTravado(now);

        await autoSave({
            prazoTravado: true,
            dataPrazoTravado: now
        });
    };

    // Handle deadline extension
    const handleProrrogacao = async () => {
        if (!motivoProrrogacao.trim()) return;

        let novoPrazo = "";
        let dias = 0;

        if (diasProrrogacao) {
            // Quick option: +5, +15, +30
            const d = new Date(prazo);
            d.setDate(d.getDate() + diasProrrogacao);
            novoPrazo = d.toISOString().split('T')[0];
            dias = diasProrrogacao;
        } else if (dataProrrogacaoCustom) {
            // Custom date
            novoPrazo = dataProrrogacaoCustom;
            const original = new Date(prazo);
            const custom = new Date(dataProrrogacaoCustom);
            dias = Math.ceil((custom.getTime() - original.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (!novoPrazo) return;

        const novoRegistro = {
            dataProrrogacao: new Date().toISOString(),
            prazoAnterior: prazo,
            prazoNovo: novoPrazo,
            diasAdicionados: dias,
            motivo: motivoProrrogacao.trim()
        };

        const novoHistorico = [...historicoProrrogacoes, novoRegistro];

        setPrazo(novoPrazo);
        setHistoricoProrrogacoes(novoHistorico);
        setShowProrrogacao(false);
        setMotivoProrrogacao("");
        setDiasProrrogacao(null);
        setDataProrrogacaoCustom("");

        await autoSave({
            prazo: novoPrazo,
            historicoProrrogacoes: novoHistorico
        });
    };

    const handleNext = async () => {
        if (currentStep === 7) {
            await handleFinish();
            return;
        }

        let nextStep = currentStep + 1;

        // Skip logic
        if (currentStep === 3 && reqArte === false) {
            nextStep = 6; // Skip to Rastreio
        }

        setCurrentStep(nextStep);

        // We trigger autoSave to update status if needed, though status is mostly driven by data fields.
        // But moving steps might imply we are "waiting" for the next thing.
        // Actually, our calculateStatus is based on fields (checkboxes), not currentStep.
        // So just moving steps doesn't necessarily change status unless a field changed.
        // But that's fine, the user wants status to update "where they stopped".
        // "Where they stopped" is usually defined by what they have completed.
        // So calculateStatus is correct.
    };

    const handleBack = () => {
        let prevStep = currentStep - 1;
        if (currentStep === 6 && reqArte === false) {
            prevStep = 3;
        }
        if (prevStep < 0) {
            onClose();
            return;
        }
        setCurrentStep(prevStep);
        // We should also save the status of the previous step? 
        // Maybe not strictly necessary, but good for consistency.
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const totalLiquidado = selectedItems.reduce((acc, item) => {
                const qtd = parseFloat(item.quantidadeSolicitada || item.quantidade) || 0;
                const val = parseFloat(item.valorGanho) || 0;
                return acc + (qtd * val);
            }, 0);

            let sobra = 0;
            if (data.tipo === 'ESTIMATIVO') {
                const valorOriginal = isNew ? parseFloat(data.valorEmpenhado) : parseFloat(data.valores?.original || 0);
                sobra = valorOriginal - totalLiquidado;
            }

            const entregaData = {
                status: 'LIQUIDADO',
                valores: {
                    liquidado: totalLiquidado,
                    sobra: sobra > 0 ? sobra : 0
                },
                dataLiquidacao: new Date(),
                etapas: {
                    enviadoEmpenho, recebidoEmpenho, dataRecebimentoEmpenho,
                    reqArte, arteAprovada, arteEnviada, conferido: true
                }
            };

            if (activeId) {
                await updateDoc(doc(db, "entregas", activeId), entregaData);
            }

            const empenhoId = isNew ? data.id : data.id_empenho;
            if (data.tipo !== 'GLOBAL') {
                await updateDoc(doc(db, "empenhos", empenhoId), { status: 'LIQUIDADO' });
            }

            if (sobra > 0) {
                const empenhoRef = doc(db, "empenhos", empenhoId);
                const empenhoSnap = await getDoc(empenhoRef);
                if (empenhoSnap.exists()) {
                    const ncId = empenhoSnap.data().id_nc;
                    if (ncId) {
                        const ncRef = doc(db, "ncs", ncId);
                        const ncSnap = await getDoc(ncRef);
                        if (ncSnap.exists()) {
                            const currentSaldo = parseFloat(ncSnap.data().saldoDisponivel || 0);
                            await updateDoc(ncRef, {
                                saldoDisponivel: currentSaldo + sobra
                            });
                        }
                    }
                }
            }

            onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Render Steps
    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Seleção
                return (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">O que será entregue?</h3>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                            {selectedItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                    <div className="flex-1 mr-4">
                                        <p className="text-sm font-medium text-slate-200">{item.descricao}</p>
                                        <p className="text-xs text-slate-500 mt-1">Disponível: {item.quantidade}</p>
                                    </div>
                                    <Input
                                        type="number"
                                        className="w-24 bg-slate-950 border-slate-700 text-right"
                                        value={item.quantidadeSolicitada}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            const newItems = [...selectedItems];
                                            newItems[idx].quantidadeSolicitada = Math.min(val, item.quantidade);
                                            setSelectedItems(newItems);
                                            // Debounced save for inputs
                                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                            saveTimeoutRef.current = setTimeout(() => autoSave({ selectedItems: newItems }), 1000);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 1: // Envio Empenho
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Envio do Empenho</h3>
                            <p className="text-slate-400">O empenho já foi enviado para o fornecedor?</p>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={() => {
                                    const newVal = !enviadoEmpenho;
                                    setEnviadoEmpenho(newVal);
                                    autoSave({ enviadoEmpenho: newVal });
                                }}
                                className={cn(
                                    "flex items-center p-4 rounded-lg border-2 transition-all w-full text-left",
                                    enviadoEmpenho ? "border-emerald-500 bg-emerald-900/20" : "border-slate-800 bg-slate-900/50"
                                )}
                            >
                                <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4", enviadoEmpenho ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-600")}>
                                    {enviadoEmpenho && <CheckCircle className="w-4 h-4" />}
                                </div>
                                <span className={cn("font-bold", enviadoEmpenho ? "text-emerald-400" : "text-slate-300")}>Sim, empenho enviado</span>
                            </button>
                        </div>
                    </div>
                );

            case 2: // Recebimento Empenho
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MailCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Recebimento do Empenho</h3>
                            <p className="text-slate-400">O fornecedor confirmou o recebimento?</p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <button
                                onClick={() => {
                                    const newVal = !recebidoEmpenho;
                                    setRecebidoEmpenho(newVal);
                                    // Set default date to today if checking
                                    let newDate = dataRecebimentoEmpenho;
                                    if (newVal && !newDate) {
                                        newDate = new Date().toISOString().split('T')[0];
                                        setDataRecebimentoEmpenho(newDate);
                                    }

                                    // Auto-calculate deadline if reqArte is FALSE (already decided)
                                    let newPrazo = prazo;
                                    if (reqArte === false && newDate) {
                                        const d = new Date(newDate);
                                        d.setDate(d.getDate() + 30);
                                        newPrazo = d.toISOString().split('T')[0];
                                        setPrazo(newPrazo);
                                    }

                                    autoSave({ recebidoEmpenho: newVal, dataRecebimentoEmpenho: newDate, prazo: newPrazo });
                                }}
                                className={cn(
                                    "flex items-center p-4 rounded-lg border-2 transition-all w-full text-left",
                                    recebidoEmpenho ? "border-emerald-500 bg-emerald-900/20" : "border-slate-800 bg-slate-900/50"
                                )}
                            >
                                <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4", recebidoEmpenho ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-600")}>
                                    {recebidoEmpenho && <CheckCircle className="w-4 h-4" />}
                                </div>
                                <span className={cn("font-bold", recebidoEmpenho ? "text-emerald-400" : "text-slate-300")}>Sim, recebimento confirmado</span>
                            </button>

                            {recebidoEmpenho && (
                                <div className="flex items-center gap-3 justify-center animate-in fade-in slide-in-from-top-2">
                                    <span className="text-sm text-slate-500">Data do recebimento:</span>
                                    <input
                                        type="date"
                                        value={dataRecebimentoEmpenho}
                                        onChange={(e) => {
                                            const newDate = e.target.value;
                                            setDataRecebimentoEmpenho(newDate);

                                            // Auto-calculate deadline if reqArte is FALSE
                                            let newPrazo = prazo;
                                            if (reqArte === false && newDate) {
                                                const d = new Date(newDate);
                                                d.setDate(d.getDate() + 30);
                                                newPrazo = d.toISOString().split('T')[0];
                                                setPrazo(newPrazo);
                                            }

                                            autoSave({ dataRecebimentoEmpenho: newDate, prazo: newPrazo });
                                        }}
                                        className="bg-transparent border-b border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-blue-500 w-32 text-center"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 3: // Arte?
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-purple-900/30 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Palette className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Definição de Arte</h3>
                            <p className="text-slate-400">Necessita de aprovação de arte/layout?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button
                                onClick={() => { setReqArte(true); autoSave({ reqArte: true }); }}
                                className={cn("p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3", reqArte === true ? "border-blue-500 bg-blue-900/20" : "border-slate-800 bg-slate-900/50")}
                            >
                                <CheckCircle className={cn("w-8 h-8", reqArte === true ? "text-blue-500" : "text-slate-600")} />
                                <span className={cn("font-bold", reqArte === true ? "text-blue-400" : "text-slate-300")}>Sim, precisa</span>
                            </button>
                            <button
                                onClick={() => {
                                    setReqArte(false);

                                    // Auto-calculate deadline: Recebimento Empenho + 30 days
                                    let newPrazo = prazo;
                                    if (dataRecebimentoEmpenho) {
                                        const d = new Date(dataRecebimentoEmpenho);
                                        d.setDate(d.getDate() + 30);
                                        newPrazo = d.toISOString().split('T')[0];
                                        setPrazo(newPrazo);
                                    }

                                    autoSave({ reqArte: false, prazo: newPrazo });
                                }}
                                className={cn("p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3", reqArte === false ? "border-blue-500 bg-blue-900/20" : "border-slate-800 bg-slate-900/50")}
                            >
                                <Circle className={cn("w-8 h-8", reqArte === false ? "text-blue-500" : "text-slate-600")} />
                                <span className={cn("font-bold", reqArte === false ? "text-blue-400" : "text-slate-300")}>Não, envio direto</span>
                            </button>
                        </div>
                    </div>
                );

            case 4: // Aprovação Arte
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-yellow-900/30 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Aprovação de Arte</h3>
                            <p className="text-slate-400">A arte foi aprovada?</p>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={() => {
                                    const newVal = !arteAprovada;
                                    setArteAprovada(newVal);
                                    autoSave({ arteAprovada: newVal });
                                }}
                                className={cn("flex items-center p-4 rounded-lg border-2 transition-all w-full text-left", arteAprovada ? "border-emerald-500 bg-emerald-900/20" : "border-slate-800 bg-slate-900/50")}
                            >
                                <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4", arteAprovada ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-600")}>
                                    {arteAprovada && <CheckCircle className="w-4 h-4" />}
                                </div>
                                <span className={cn("font-bold", arteAprovada ? "text-emerald-400" : "text-slate-300")}>Sim, arte aprovada</span>
                            </button>
                        </div>
                    </div>
                );

            case 5: // Envio Arte
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-orange-900/30 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Envio da Arte</h3>
                            <p className="text-slate-400">A arte foi enviada ao fornecedor?</p>
                        </div>
                        <div className="mt-8">
                            <button
                                onClick={() => {
                                    const newVal = !arteEnviada;
                                    setArteEnviada(newVal);

                                    // Auto-calculate deadline: Today + 30 days
                                    let newPrazo = prazo;
                                    if (newVal) {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 30);
                                        newPrazo = d.toISOString().split('T')[0];
                                        setPrazo(newPrazo);
                                    }

                                    autoSave({ arteEnviada: newVal, prazo: newPrazo });
                                }}
                                className={cn("flex items-center p-4 rounded-lg border-2 transition-all w-full text-left", arteEnviada ? "border-emerald-500 bg-emerald-900/20" : "border-slate-800 bg-slate-900/50")}
                            >
                                <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4", arteEnviada ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-600")}>
                                    {arteEnviada && <CheckCircle className="w-4 h-4" />}
                                </div>
                                <span className={cn("font-bold", arteEnviada ? "text-emerald-400" : "text-slate-300")}>Sim, arte enviada</span>
                            </button>
                        </div>
                    </div>
                );

            case 6: // Rastreio
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-indigo-900/30 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Truck className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Acompanhamento</h3>
                            <p className="text-slate-400">Informe o rastreio. Ao avançar, você confirma o recebimento.</p>
                        </div>

                        <div className="space-y-4 mt-6">
                            <div className="space-y-2">
                                <Label>Código de Rastreio</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={codigoRastreio}
                                        onChange={e => {
                                            setCodigoRastreio(e.target.value);
                                            setSemRastreio(false);
                                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                            saveTimeoutRef.current = setTimeout(() => autoSave({ codigoRastreio: e.target.value, semRastreio: false }), 1000);
                                        }}
                                        placeholder="Ex: BR123456789BR"
                                        className="bg-slate-950 border-slate-700 h-12"
                                        disabled={semRastreio}
                                    />
                                    <Button
                                        variant={semRastreio ? "default" : "outline"}
                                        className={cn("h-12 px-4", semRastreio ? "bg-slate-700" : "border-slate-700")}
                                        onClick={() => {
                                            const newVal = !semRastreio;
                                            setSemRastreio(newVal);
                                            if (newVal) setCodigoRastreio("");

                                            // Auto-calculate deadline if setting "Sem Rastreio" (or just generally if deadline is empty)
                                            let newPrazo = prazo;
                                            if (newVal && !newPrazo && dataRecebimentoEmpenho) {
                                                const d = new Date(dataRecebimentoEmpenho);
                                                d.setDate(d.getDate() + 30);
                                                newPrazo = d.toISOString().split('T')[0];
                                                setPrazo(newPrazo);
                                            }

                                            autoSave({ semRastreio: newVal, codigoRastreio: newVal ? "" : codigoRastreio, prazo: newPrazo });
                                        }}
                                    >
                                        Sem código
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-800">
                                <div className="flex justify-between items-center">
                                    <Label className="text-slate-400">Prazo de Entrega</Label>
                                    <span className="text-xs text-slate-500">
                                        {prazoTravado ? "✓ Confirmado" : prazo ? "Calculado automaticamente" : "Defina uma data limite"}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                        <Input
                                            type="date"
                                            value={prazo}
                                            onChange={e => {
                                                if (!prazoTravado) {
                                                    setPrazo(e.target.value);
                                                    autoSave({ prazo: e.target.value });
                                                }
                                            }}
                                            className="bg-slate-950 border-slate-700 pl-10 h-10 text-slate-300"
                                            disabled={prazoTravado}
                                        />
                                    </div>
                                    {prazo && !prazoTravado && (
                                        <Button
                                            onClick={handleTravarPrazo}
                                            className="bg-emerald-600 hover:bg-emerald-500 h-10 px-4"
                                        >
                                            <Check className="w-4 h-4 mr-1" /> OK
                                        </Button>
                                    )}
                                    {prazoTravado && (
                                        <div className="flex items-center px-3 bg-emerald-900/20 border border-emerald-500/30 rounded h-10">
                                            <Lock className="w-4 h-4 text-emerald-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Seção de Prorrogação - só aparece quando travado */}
                                {prazoTravado && (
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                        {!showProrrogacao ? (
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowProrrogacao(true)}
                                                className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                                            >
                                                <CalendarPlus className="w-4 h-4 mr-2" /> Prorrogar Prazo
                                            </Button>
                                        ) : (
                                            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold text-slate-300">Prorrogar Prazo</span>
                                                    <button onClick={() => {
                                                        setShowProrrogacao(false);
                                                        setMotivoProrrogacao("");
                                                        setDiasProrrogacao(null);
                                                        setDataProrrogacaoCustom("");
                                                    }} className="text-slate-500 hover:text-slate-300">✕</button>
                                                </div>

                                                {/* Quick options */}
                                                <div className="flex gap-2">
                                                    {[5, 15, 30].map((dias) => (
                                                        <button
                                                            key={dias}
                                                            onClick={() => {
                                                                setDiasProrrogacao(dias);
                                                                setDataProrrogacaoCustom("");
                                                            }}
                                                            className={cn(
                                                                "flex-1 py-2 px-3 rounded border text-sm font-bold transition-all",
                                                                diasProrrogacao === dias
                                                                    ? "border-orange-500 bg-orange-500/20 text-orange-400"
                                                                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                                                            )}
                                                        >
                                                            +{dias}
                                                        </button>
                                                    ))}
                                                    <div className="relative flex-1">
                                                        <CalendarPlus className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                                                        <input
                                                            type="date"
                                                            value={dataProrrogacaoCustom}
                                                            onChange={(e) => {
                                                                setDataProrrogacaoCustom(e.target.value);
                                                                setDiasProrrogacao(null);
                                                            }}
                                                            className={cn(
                                                                "w-full py-2 pl-8 pr-2 rounded border text-sm bg-transparent transition-all",
                                                                dataProrrogacaoCustom
                                                                    ? "border-orange-500 text-orange-400"
                                                                    : "border-slate-700 text-slate-400"
                                                            )}
                                                            min={prazo}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Motivo obrigatório */}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500">Motivo *</Label>
                                                    <Textarea
                                                        value={motivoProrrogacao}
                                                        onChange={(e) => setMotivoProrrogacao(e.target.value)}
                                                        placeholder="Descreva o motivo da prorrogação..."
                                                        className="bg-slate-950 border-slate-700 text-sm resize-none h-16"
                                                    />
                                                </div>

                                                {/* Confirmar */}
                                                <Button
                                                    onClick={handleProrrogacao}
                                                    disabled={!motivoProrrogacao.trim() || (!diasProrrogacao && !dataProrrogacaoCustom)}
                                                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50"
                                                >
                                                    Confirmar Prorrogação
                                                </Button>

                                                {/* Histórico de prorrogações */}
                                                {historicoProrrogacoes.length > 0 && (
                                                    <div className="pt-3 border-t border-slate-800">
                                                        <span className="text-[10px] uppercase tracking-wider text-slate-600">Histórico ({historicoProrrogacoes.length})</span>
                                                        <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                                                            {historicoProrrogacoes.map((h, idx) => (
                                                                <div key={idx} className="text-[11px] text-slate-500 flex justify-between">
                                                                    <span>+{h.diasAdicionados} dias</span>
                                                                    <span className="truncate max-w-[150px]" title={h.motivo}>{h.motivo}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 7: // Liquidação
                return (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Conferência e Liquidação</h3>
                            <p className="text-slate-400">Confira os itens recebidos para finalizar.</p>
                        </div>

                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4 mt-4">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="conferido"
                                    checked={conferido}
                                    onCheckedChange={(c) => {
                                        setConferido(c as boolean);
                                        autoSave({ conferido: c as boolean });
                                    }}
                                    className="w-6 h-6 border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <Label htmlFor="conferido" className="text-base cursor-pointer">
                                    Material/Serviço conferido e sem defeitos
                                </Label>
                            </div>
                        </div>

                        {conferido && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Resumo da Liquidação</h4>
                                <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-300">{item.descricao}</span>
                                            <span className="font-mono text-emerald-400">{formatMoney(item.valorGanho * (item.quantidadeSolicitada || item.quantidade))}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between items-center font-bold">
                                        <span className="text-white">Total</span>
                                        <span className="text-emerald-400">
                                            {formatMoney(selectedItems.reduce((acc, item) => acc + (item.valorGanho * (item.quantidadeSolicitada || item.quantidade)), 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header / Progress */}
            <div className="flex items-center justify-between px-1 mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">Etapa {currentStep + 1} de {STEPS.length}</span>
                </div>
                {activeId && (
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => {
                        if (confirm("Tem certeza que deseja excluir esta entrega?")) {
                            deleteDoc(doc(db, "entregas", activeId)).then(onSuccess);
                        }
                    }}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </Button>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-1 py-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between pt-6 border-t border-slate-800 mt-4">
                <Button variant="ghost" onClick={handleBack} disabled={loading}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {currentStep === 0 ? "Cancelar" : "Voltar"}
                </Button>
                <Button onClick={handleNext} disabled={loading || (currentStep === 7 && !conferido)} className="bg-blue-600 hover:bg-blue-500 min-w-[120px]">
                    {loading ? "Salvando..." : currentStep === 7 ? "Finalizar" : "Próximo"}
                    {!loading && currentStep !== 7 && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
            </div>
        </div>
    );
}

