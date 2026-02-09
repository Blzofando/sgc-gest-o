"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db, auth } from "@/app/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from "firebase/firestore";
import { Plus, Pencil, Trash2, Mail, HelpCircle, Save, Loader2, Copy, User, Phone, Shield, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/providers/AuthProvider";

// Lista de postos/graduações
const POSTOS_GRADUACOES = [
    { valor: "Cap", label: "Capitão", simples: "Cap" },
    { valor: "1º Ten", label: "1º Tenente", simples: "Ten" },
    { valor: "2º Ten", label: "2º Tenente", simples: "Ten" },
    { valor: "Asp", label: "Aspirante", simples: "Asp" },
    { valor: "S Ten", label: "Subtenente", simples: "S Ten" },
    { valor: "1º Sgt", label: "1º Sargento", simples: "Sgt" },
    { valor: "2º Sgt", label: "2º Sargento", simples: "Sgt" },
    { valor: "3º Sgt", label: "3º Sargento", simples: "Sgt" },
    { valor: "Cb", label: "Cabo", simples: "Cb" },
    { valor: "Sd EP", label: "Soldado EP", simples: "Sd" },
    { valor: "Sd EV", label: "Soldado EV", simples: "Sd" },
];

// Avatares SVG por posto - insígnias do Exército Brasileiro
const getAvatarSVG = (posto: string, size = 100) => {
    // Cores e insígnias por posto
    const getConfig = (p: string) => {
        // Oficiais - estrelas douradas
        if (p === "Cap") {
            return { bg: "#1e40af", accent: "#fbbf24", insignia: "stars", count: 3 };
        } else if (p === "1º Ten") {
            return { bg: "#1e40af", accent: "#fbbf24", insignia: "stars", count: 2 };
        } else if (p === "2º Ten" || p === "Asp") {
            return { bg: "#1e40af", accent: "#fbbf24", insignia: "stars", count: 1 };
        }
        // Subtenente - losango
        else if (p === "S Ten") {
            return { bg: "#7c3aed", accent: "#c4b5fd", insignia: "diamond", count: 1 };
        }
        // Sargentos - 3 gaivotas (chevrons)
        else if (p.includes("Sgt")) {
            return { bg: "#059669", accent: "#34d399", insignia: "chevrons", count: 3 };
        }
        // Cabo - 2 gaivotas
        else if (p === "Cb") {
            return { bg: "#d97706", accent: "#fcd34d", insignia: "chevrons", count: 2 };
        }
        // Soldado EP - 1 gaivota
        else if (p === "Sd EP") {
            return { bg: "#6b7280", accent: "#9ca3af", insignia: "chevrons", count: 1 };
        }
        // Soldado EV - sem insígnia
        else {
            return { bg: "#6b7280", accent: "#9ca3af", insignia: "none", count: 0 };
        }
    };

    const config = getConfig(posto);

    // Renderizar insígnia baseado no tipo
    const renderInsignia = () => {
        if (config.insignia === "stars") {
            // Estrelas para oficiais
            const starPositions = config.count === 3
                ? [{ x: 42, y: 78 }, { x: 50, y: 78 }, { x: 58, y: 78 }]
                : config.count === 2
                    ? [{ x: 45, y: 78 }, { x: 55, y: 78 }]
                    : [{ x: 50, y: 78 }];

            return starPositions.map((pos, i) => (
                <text key={i} x={pos.x} y={pos.y} textAnchor="middle" fill={config.accent} fontSize="10">★</text>
            ));
        } else if (config.insignia === "diamond") {
            // Losango para Subtenente
            return (
                <polygon
                    points="50,70 56,78 50,86 44,78"
                    fill={config.accent}
                    stroke="#fff"
                    strokeWidth="0.5"
                />
            );
        } else if (config.insignia === "chevrons") {
            // Gaivotas (V com ponta para cima)
            const chevrons = [];
            for (let i = 0; i < config.count; i++) {
                const y = 84 - (i * 5);
                chevrons.push(
                    <path
                        key={i}
                        d={`M 42 ${y} L 50 ${y - 4} L 58 ${y}`}
                        stroke={config.accent}
                        strokeWidth="2.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                );
            }
            return chevrons;
        }
        return null;
    };

    return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-full">
            {/* Fundo do avatar */}
            <circle cx="50" cy="50" r="48" fill={config.bg} />

            {/* Brilho */}
            <circle cx="50" cy="50" r="48" fill="url(#shine)" opacity="0.3" />

            {/* Cabeça */}
            <circle cx="50" cy="35" r="18" fill="#fcd9c5" />

            {/* Boina/Quepe */}
            <ellipse cx="50" cy="22" rx="20" ry="8" fill="#1a1a1a" />
            <ellipse cx="50" cy="24" rx="16" ry="6" fill="#2a2a2a" />

            {/* Olhos */}
            <circle cx="43" cy="35" r="3" fill="#1a1a1a" />
            <circle cx="57" cy="35" r="3" fill="#1a1a1a" />
            <circle cx="44" cy="34" r="1" fill="white" />
            <circle cx="58" cy="34" r="1" fill="white" />

            {/* Boca (sorriso) */}
            <path d="M 43 42 Q 50 48 57 42" stroke="#c97c5d" strokeWidth="2" fill="none" />

            {/* Corpo/Farda */}
            <path d="M 25 95 Q 25 60 50 55 Q 75 60 75 95" fill="#2d4a2d" />

            {/* Gola da farda */}
            <path d="M 35 60 L 50 70 L 65 60" stroke="#1a3a1a" strokeWidth="3" fill="none" />

            {/* Insígnia */}
            {renderInsignia()}

            {/* Gradiente de brilho */}
            <defs>
                <radialGradient id="shine" cx="30%" cy="30%">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>
            </defs>
        </svg>
    );
};

// Lista de variáveis disponíveis
const VARIAVEIS_DISPONIVEIS = [
    { variavel: "*nome*", descricao: "Nome de guerra do usuário" },
    { variavel: "*nome_completo*", descricao: "Nome completo do usuário" },
    { variavel: "*posto*", descricao: "Posto/Graduação do usuário" },
    { variavel: "*telefone*", descricao: "Telefone do usuário" },
    { variavel: "*fornecedor*", descricao: "Nome da empresa fornecedora" },
    { variavel: "*cnpj*", descricao: "CNPJ do fornecedor" },
    { variavel: "*email_fornecedor*", descricao: "Email do fornecedor" },
    { variavel: "*empenho*", descricao: "Número do empenho" },
    { variavel: "*nc*", descricao: "Número da Nota de Crédito" },
    { variavel: "*processo*", descricao: "Número do processo" },
    { variavel: "*modalidade*", descricao: "Modalidade do processo" },
    { variavel: "*valor*", descricao: "Valor empenhado formatado" },
    { variavel: "*prazo*", descricao: "Data do prazo de entrega" },
    { variavel: "*dias_restantes*", descricao: "Dias restantes/atraso até o prazo" },
    { variavel: "*data_hoje*", descricao: "Data atual" },
    { variavel: "*saudacao*", descricao: "Bom dia/Boa tarde/Boa noite (automático)" },
    { variavel: "*itens*", descricao: "Lista de itens do empenho (• item)" },
];

// Modificadores de formatação
const MODIFICADORES_FORMATACAO = [
    { modificador: ":upper", descricao: "CAIXA ALTA", exemplo: "*nome:upper* → SILVA" },
    { modificador: ":lower", descricao: "minúsculas", exemplo: "*nome:lower* → silva" },
    { modificador: ":title", descricao: "Iniciais Maiúsculas", exemplo: "*nome_completo:title* → João Da Silva" },
    { modificador: ":capitalize", descricao: "Primeira maiúscula", exemplo: "*nome:capitalize* → Silva" },
    { modificador: ":bold", descricao: "𝗡𝗲𝗴𝗿𝗶𝘁𝗼 (Unicode)", exemplo: "*nome:bold* → 𝗦𝗜𝗟𝗩𝗔" },
    { modificador: ":italic", descricao: "𝘐𝘵𝘢𝘭𝘪𝘤𝘰 (Unicode)", exemplo: "*nome:italic* → 𝘚𝘐𝘓𝘝𝘈" },
    { modificador: ":underline", descricao: "S̲u̲b̲l̲i̲n̲h̲a̲d̲o̲", exemplo: "*nome:underline* → S̲I̲L̲V̲A̲" },
];

interface Predefinicao {
    id?: string;
    nome: string;
    assunto: string;
    mensagem: string;
    ordem: number;
    ativo: boolean;
}

export default function ConfiguracoesPage() {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [predefinicoes, setPredefinicoes] = useState<Predefinicao[]>([]);
    const [formOpen, setFormOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

    // Profile Form State
    const [profileNomeCompleto, setProfileNomeCompleto] = useState("");
    const [profileNomeGuerra, setProfileNomeGuerra] = useState("");
    const [profilePostoGrad, setProfilePostoGrad] = useState("");
    const [profileTelefone, setProfileTelefone] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    // Email Form State
    const [nome, setNome] = useState("");
    const [assunto, setAssunto] = useState("");
    const [mensagem, setMensagem] = useState("");

    // Load profile data from userData
    useEffect(() => {
        if (userData) {
            setProfileNomeCompleto(userData.nomeCompleto || "");
            setProfileNomeGuerra(userData.nomeGuerra || "");
            setProfilePostoGrad(userData.postoGrad || "");
            setProfileTelefone(userData.telefone || "");
        }
    }, [userData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "predefinicoes_email"), orderBy("ordem", "asc"));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Predefinicao));
            setPredefinicoes(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Save Profile
    const handleSaveProfile = async () => {
        if (!user) return;
        setSavingProfile(true);
        try {
            const postoInfo = POSTOS_GRADUACOES.find(p => p.valor === profilePostoGrad);
            const postoGradSimples = postoInfo?.simples || profilePostoGrad;

            await updateDoc(doc(db, "users", user.uid), {
                nomeCompleto: profileNomeCompleto.trim(),
                nomeGuerra: profileNomeGuerra.trim().toUpperCase(),
                postoGrad: profilePostoGrad,
                postoGradSimples: postoGradSimples,
                telefone: profileTelefone.trim(),
            });

            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 3000);
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar perfil");
        } finally {
            setSavingProfile(false);
        }
    };

    const resetForm = () => {
        setNome("");
        setAssunto("");
        setMensagem("");
        setEditingId(null);
    };

    const handleNew = () => {
        resetForm();
        setFormOpen(true);
    };

    const handleEdit = (pred: Predefinicao) => {
        setNome(pred.nome);
        setAssunto(pred.assunto);
        setMensagem(pred.mensagem);
        setEditingId(pred.id || null);
        setFormOpen(true);
    };

    const handleDelete = (id: string) => {
        setConfirmDelete({ open: true, id });
    };

    const confirmDeleteAction = async () => {
        if (!confirmDelete.id) return;
        try {
            await deleteDoc(doc(db, "predefinicoes_email", confirmDelete.id));
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                nome,
                assunto,
                mensagem,
                ordem: editingId ? predefinicoes.find(p => p.id === editingId)?.ordem || 0 : predefinicoes.length,
                ativo: true
            };

            if (editingId) {
                await updateDoc(doc(db, "predefinicoes_email", editingId), payload);
            } else {
                await addDoc(collection(db, "predefinicoes_email"), payload);
            }

            setFormOpen(false);
            resetForm();
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar predefinição");
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="space-y-6 pb-10 animate-in fade-in">
            <PageHeader
                title="Configurações"
                description="Personalize o sistema de acordo com suas necessidades."
            />

            <Tabs defaultValue="perfil" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-800">
                    <TabsTrigger value="perfil" className="data-[state=active]:bg-blue-600">
                        <User className="w-4 h-4 mr-2" /> Meu Perfil
                    </TabsTrigger>
                    <TabsTrigger value="predefinicoes" className="data-[state=active]:bg-blue-600">
                        <Mail className="w-4 h-4 mr-2" /> Predefinições de Email
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Perfil */}
                <TabsContent value="perfil" className="mt-6">
                    <div className="max-w-2xl">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            {/* Avatar Section */}
                            <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-800">
                                <div className="relative">
                                    {getAvatarSVG(profilePostoGrad || userData?.postoGrad || "", 100)}
                                    <div className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full p-1 border-2 border-slate-900">
                                        <Shield className="w-4 h-4 text-blue-400" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {profilePostoGrad || userData?.postoGrad} {profileNomeGuerra || userData?.nomeGuerra}
                                    </h3>
                                    <p className="text-slate-400 text-sm">{userData?.email}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Altere seu posto para ver o avatar mudar!
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Nome Completo</Label>
                                        <Input
                                            value={profileNomeCompleto}
                                            onChange={(e) => setProfileNomeCompleto(e.target.value)}
                                            placeholder="João da Silva Santos"
                                            className="bg-slate-950 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Nome de Guerra</Label>
                                        <Input
                                            value={profileNomeGuerra}
                                            onChange={(e) => setProfileNomeGuerra(e.target.value)}
                                            placeholder="SILVA"
                                            className="bg-slate-950 border-slate-700 uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Posto/Graduação</Label>
                                        <Select value={profilePostoGrad} onValueChange={setProfilePostoGrad}>
                                            <SelectTrigger className="bg-slate-950 border-slate-700">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {POSTOS_GRADUACOES.map((posto) => (
                                                    <SelectItem key={posto.valor} value={posto.valor}>
                                                        {posto.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Telefone</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <Input
                                                value={profileTelefone}
                                                onChange={(e) => setProfileTelefone(e.target.value)}
                                                placeholder="(11) 99999-9999"
                                                className="bg-slate-950 border-slate-700 pl-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button
                                        onClick={handleSaveProfile}
                                        className={`${profileSaved ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-500"}`}
                                        disabled={savingProfile}
                                    >
                                        {savingProfile ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : profileSaved ? (
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        {profileSaved ? "Salvo!" : "Salvar Alterações"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Preview de todos os avatares */}
                        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <h4 className="text-sm font-medium text-slate-400 mb-4">Avatares por Posto/Graduação</h4>
                            <div className="flex flex-wrap gap-4">
                                {POSTOS_GRADUACOES.map((p) => (
                                    <div key={p.valor} className="flex flex-col items-center gap-1">
                                        {getAvatarSVG(p.valor, 48)}
                                        <span className="text-xs text-slate-500">{p.valor}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* TAB: Predefinições de Email */}
                <TabsContent value="predefinicoes" className="mt-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white">Templates de Email</h3>
                            <p className="text-sm text-slate-400">Configure mensagens padrão para comunicação com fornecedores</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)} className="border-slate-700">
                                <HelpCircle className="w-4 h-4 mr-2" /> Variáveis
                            </Button>
                            <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-500">
                                <Plus className="w-4 h-4 mr-2" /> Nova Predefinição
                            </Button>
                        </div>
                    </div>

                    {loading ? <LoadingState text="Carregando..." /> : (
                        <div className="grid gap-4">
                            {predefinicoes.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-lg border border-slate-800">
                                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Nenhuma predefinição criada.</p>
                                    <p className="text-sm">Clique em &quot;Nova Predefinição&quot; para começar.</p>
                                </div>
                            ) : predefinicoes.map((pred) => (
                                <div key={pred.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="text-white font-bold flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-blue-400" />
                                                {pred.nome}
                                            </h4>
                                            <p className="text-sm text-slate-400 mt-1">
                                                <span className="text-slate-500">Assunto:</span> {pred.assunto}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                                                {pred.mensagem}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(pred)} className="text-slate-400 hover:text-blue-400">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(pred.id!)} className="text-slate-400 hover:text-red-400">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Form Dialog */}
            <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[600px] bg-slate-950 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Editar Predefinição" : "Nova Predefinição"}</DialogTitle>
                        <DialogDescription>Configure o template de email com variáveis dinâmicas</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome da Predefinição *</Label>
                            <Input
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Ex: Solicitação de Status"
                                className="bg-slate-900 border-slate-700"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Assunto do Email *</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setHelpOpen(true)} className="h-6 text-xs text-slate-400">
                                    <HelpCircle className="w-3 h-3 mr-1" /> Ver Variáveis
                                </Button>
                            </div>
                            <Input
                                value={assunto}
                                onChange={(e) => setAssunto(e.target.value)}
                                placeholder="Ex: Solicitação de Status - Empenho *empenho*"
                                className="bg-slate-900 border-slate-700"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Corpo da Mensagem *</Label>
                            <Textarea
                                value={mensagem}
                                onChange={(e) => setMensagem(e.target.value)}
                                placeholder="Ex: Prezados, solicito informações sobre o status do empenho *empenho*..."
                                className="bg-slate-900 border-slate-700 min-h-[200px]"
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="border-slate-700">
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Help Dialog - Variáveis */}
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogContent className="sm:max-w-[550px] bg-slate-950 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Variáveis e Formatação</DialogTitle>
                        <DialogDescription>Use estas variáveis no assunto e corpo do email. Adicione modificadores para formatar.</DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-[450px] pr-4">
                        {/* Seção de Variáveis */}
                        <h4 className="text-sm font-bold text-slate-300 mb-3">Variáveis Disponíveis</h4>
                        <div className="space-y-2 mb-6">
                            {VARIAVEIS_DISPONIVEIS.map((v) => (
                                <div key={v.variavel} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-700">
                                    <div>
                                        <code className="text-blue-400 font-mono text-sm">{v.variavel}</code>
                                        <p className="text-xs text-slate-400 mt-0.5">{v.descricao}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(v.variavel)} className="text-slate-500 hover:text-white h-8 w-8">
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Seção de Modificadores */}
                        <h4 className="text-sm font-bold text-slate-300 mb-3 pt-4 border-t border-slate-800">Modificadores de Formatação</h4>
                        <p className="text-xs text-slate-500 mb-3">Adicione após a variável: <code className="text-emerald-400">*variavel:modificador*</code></p>
                        <div className="space-y-2">
                            {MODIFICADORES_FORMATACAO.map((m) => (
                                <div key={m.modificador} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 hover:border-slate-700">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <code className="text-emerald-400 font-mono text-sm">{m.modificador}</code>
                                            <span className="text-xs text-slate-500">{m.descricao}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 font-mono">{m.exemplo}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(m.modificador)} className="text-slate-500 hover:text-white h-8 w-8">
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Dica de combinação */}
                        <div className="mt-4 p-3 bg-blue-900/20 rounded border border-blue-900/50">
                            <p className="text-xs text-blue-300">
                                <strong>Dica:</strong> Combine modificadores! Ex: <code className="text-blue-400">*nome_completo:title:bold*</code> → <strong>João Da Silva</strong>
                            </p>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete */}
            <ConfirmDialog
                open={confirmDelete.open}
                onOpenChange={(open) => setConfirmDelete({ open, id: null })}
                title="Excluir Predefinição"
                description="Tem certeza que deseja excluir esta predefinição?"
                onConfirm={confirmDeleteAction}
                confirmText="Excluir"
                variant="danger"
            />
        </div>
    );
}
