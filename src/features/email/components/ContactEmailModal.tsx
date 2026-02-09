"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Mail, Loader2, ExternalLink, ChevronRight } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { formatMoney } from "@/app/lib/formatters";

interface Predefinicao {
    id: string;
    nome: string;
    assunto: string;
    mensagem: string;
}

interface ContactContext {
    fornecedorNome?: string;
    fornecedorCnpj?: string;
    fornecedorEmail?: string; // pode ter múltiplos separados por vírgula
    empenhoNumero?: string;
    ncNumero?: string;
    processoNumero?: string;
    modalidade?: string;
    valorEmpenhado?: number;
    prazo?: string;
    itens?: Array<{ descricao: string; quantidade?: number; valorGanho?: number }>;
}

interface ContactEmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    context: ContactContext;
}

export function ContactEmailModal({ open, onOpenChange, context }: ContactEmailModalProps) {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [predefinicoes, setPredefinicoes] = useState<Predefinicao[]>([]);
    const [emailSelectOpen, setEmailSelectOpen] = useState(false);
    const [emailOptions, setEmailOptions] = useState<string[]>([]);
    const [pendingTemplate, setPendingTemplate] = useState<{ assunto: string; mensagem: string } | null>(null);

    useEffect(() => {
        if (open) {
            fetchPredefinicoes();
        }
    }, [open]);

    const fetchPredefinicoes = async () => {
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

    // Calcular dias restantes
    const calcularDiasRestantes = () => {
        if (!context.prazo) return "N/A";
        const prazoDate = new Date(context.prazo);
        const hoje = new Date();
        prazoDate.setHours(0, 0, 0, 0);
        hoje.setHours(0, 0, 0, 0);
        const diff = Math.ceil((prazoDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return `${Math.abs(diff)} dias de atraso`;
        if (diff === 0) return "Hoje";
        return `${diff} dias`;
    };

    // Aplicar modificadores de formatação usando Unicode
    const aplicarFormatacao = (valor: string, modificadores: string[]): string => {
        let resultado = valor;

        // Mapa de caracteres para Unicode Bold (Sans-Serif Bold)
        const toBold = (text: string): string => {
            const boldMap: Record<string, string> = {
                'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
                'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
                'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
                'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
                'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
                'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
                '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
            };
            return text.split('').map(c => boldMap[c] || c).join('');
        };

        // Mapa de caracteres para Unicode Italic (Sans-Serif Italic)
        const toItalic = (text: string): string => {
            const italicMap: Record<string, string> = {
                'A': '𝘈', 'B': '𝘉', 'C': '𝘊', 'D': '𝘋', 'E': '𝘌', 'F': '𝘍', 'G': '𝘎', 'H': '𝘏', 'I': '𝘐', 'J': '𝘑',
                'K': '𝘒', 'L': '𝘓', 'M': '𝘔', 'N': '𝘕', 'O': '𝘖', 'P': '𝘗', 'Q': '𝘘', 'R': '𝘙', 'S': '𝘚', 'T': '𝘛',
                'U': '𝘜', 'V': '𝘝', 'W': '𝘞', 'X': '𝘟', 'Y': '𝘠', 'Z': '𝘡',
                'a': '𝘢', 'b': '𝘣', 'c': '𝘤', 'd': '𝘥', 'e': '𝘦', 'f': '𝘧', 'g': '𝘨', 'h': '𝘩', 'i': '𝘪', 'j': '𝘫',
                'k': '𝘬', 'l': '𝘭', 'm': '𝘮', 'n': '𝘯', 'o': '𝘰', 'p': '𝘱', 'q': '𝘲', 'r': '𝘳', 's': '𝘴', 't': '𝘵',
                'u': '𝘶', 'v': '𝘷', 'w': '𝘸', 'x': '𝘹', 'y': '𝘺', 'z': '𝘻'
            };
            return text.split('').map(c => italicMap[c] || c).join('');
        };

        for (const mod of modificadores) {
            switch (mod.toLowerCase()) {
                case 'upper':
                    resultado = resultado.toUpperCase();
                    break;
                case 'lower':
                    resultado = resultado.toLowerCase();
                    break;
                case 'title':
                    resultado = resultado.replace(/\w\S*/g, txt =>
                        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                    );
                    break;
                case 'capitalize':
                    resultado = resultado.charAt(0).toUpperCase() + resultado.slice(1).toLowerCase();
                    break;
                case 'bold':
                    resultado = toBold(resultado);
                    break;
                case 'italic':
                    resultado = toItalic(resultado);
                    break;
                case 'underline':
                    resultado = resultado.split('').map(c => c + '\u0332').join('');
                    break;
            }
        }

        return resultado;
    };

    // Formatar telefone para (XX) XXXXX-XXXX
    const formatarTelefone = (tel: string): string => {
        if (!tel) return "";
        // Remove tudo que não é número
        const numeros = tel.replace(/\D/g, '');
        if (numeros.length === 11) {
            return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
        } else if (numeros.length === 10) {
            return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
        }
        return tel;
    };

    // Calcular saudação baseada na hora
    const getSaudacao = (): string => {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return "Bom dia";
        if (hora >= 12 && hora < 18) return "Boa tarde";
        return "Boa noite";
    };

    // Mapa de variáveis para seus valores
    const getValorVariavel = (variavel: string): string => {
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const prazoFormatado = context.prazo
            ? new Date(context.prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
            : "N/A";

        const mapa: Record<string, string> = {
            'nome': userData?.nomeGuerra || "",
            'nome_completo': userData?.nomeCompleto || "",
            'posto': userData?.postoGrad || "",
            'telefone': formatarTelefone(userData?.telefone || ""),
            'fornecedor': context.fornecedorNome || "",
            'cnpj': context.fornecedorCnpj || "",
            'email_fornecedor': context.fornecedorEmail?.split(",")[0]?.trim() || "",
            'empenho': context.empenhoNumero || "",
            'nc': context.ncNumero || "",
            'processo': context.processoNumero || "",
            'modalidade': context.modalidade || "",
            'valor': context.valorEmpenhado ? formatMoney(context.valorEmpenhado) : "",
            'prazo': prazoFormatado,
            'dias_restantes': calcularDiasRestantes(),
            'data_hoje': dataHoje,
            'saudacao': getSaudacao()
        };

        return mapa[variavel] || "";
    };

    // Gerar lista de itens formatada
    const gerarListaItens = (): string => {
        if (!context.itens || context.itens.length === 0) return "";
        return context.itens.map((item) => {
            const qty = item.quantidade ? ` (${item.quantidade}x)` : "";
            return `• ${item.descricao}${qty}`;
        }).join("\n");
    };

    // Substituir variáveis no texto (com suporte a modificadores)
    const substituirVariaveis = (texto: string): string => {
        let resultado = texto;

        // 1. Primeiro processar variáveis *variavel* ou *variavel:mod1:mod2*
        resultado = resultado.replace(/\*([a-zA-Z_]+)((?::[a-zA-Z]+)*)\*/g, (match, variavel, mods) => {
            // Caso especial para itens
            if (variavel === 'itens') {
                return gerarListaItens();
            }

            const valor = getValorVariavel(variavel);
            if (!valor) return "";

            const modificadores = mods ? mods.slice(1).split(':').filter(Boolean) : [];
            return modificadores.length > 0 ? aplicarFormatacao(valor, modificadores) : valor;
        });

        // 2. Depois processar formatação de texto livre [texto:modificador]
        resultado = resultado.replace(/\[([^\]]+):([a-zA-Z:]+)\]/g, (match, textoLivre, mods) => {
            const modificadores = mods.split(':').filter(Boolean);
            return aplicarFormatacao(textoLivre, modificadores);
        });

        return resultado;
    };

    // Abrir Gmail Web
    const abrirEmail = (email: string, assunto: string, mensagem: string) => {
        const assuntoProcessado = substituirVariaveis(assunto);
        const mensagemProcessada = substituirVariaveis(mensagem);

        // Gmail Web URL
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(assuntoProcessado)}&body=${encodeURIComponent(mensagemProcessada)}`;
        window.open(gmailUrl, '_blank');
        onOpenChange(false);
    };

    // Selecionar predefinição
    const handleSelectPredefinicao = (pred: Predefinicao) => {
        const emails = context.fornecedorEmail?.split(",").map(e => e.trim()).filter(Boolean) || [];

        if (emails.length > 1) {
            // Múltiplos emails - perguntar qual usar
            setEmailOptions(emails);
            setPendingTemplate({ assunto: pred.assunto, mensagem: pred.mensagem });
            setEmailSelectOpen(true);
        } else {
            // Um ou nenhum email
            const email = emails[0] || "";
            abrirEmail(email, pred.assunto, pred.mensagem);
        }
    };

    // Selecionar email específico
    const handleSelectEmail = (email: string) => {
        if (pendingTemplate) {
            abrirEmail(email, pendingTemplate.assunto, pendingTemplate.mensagem);
        }
        setEmailSelectOpen(false);
        setPendingTemplate(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-400" />
                            Entrar em Contato
                        </DialogTitle>
                        <DialogDescription>
                            {context.fornecedorNome ? (
                                <span>Enviar email para <strong className="text-white">{context.fornecedorNome}</strong></span>
                            ) : (
                                "Selecione um template de email"
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        </div>
                    ) : predefinicoes.length === 0 ? (
                        <div className="py-8 text-center text-slate-500">
                            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma predefinição de email cadastrada.</p>
                            <p className="text-sm mt-2">Acesse Configurações para criar templates.</p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[400px]">
                            <div className="space-y-2 pr-4">
                                {predefinicoes.map((pred) => (
                                    <button
                                        key={pred.id}
                                        onClick={() => handleSelectPredefinicao(pred)}
                                        className="w-full text-left p-4 bg-slate-900 border border-slate-800 rounded-lg hover:border-blue-500/50 hover:bg-slate-900/80 transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors">
                                                    {pred.nome}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1 truncate">
                                                    {substituirVariaveis(pred.assunto)}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    )}

                    {context.fornecedorEmail && (
                        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {context.fornecedorEmail}
                            </span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog de seleção de email */}
            <Dialog open={emailSelectOpen} onOpenChange={setEmailSelectOpen}>
                <DialogContent className="sm:max-w-[400px] bg-slate-950 border-slate-800 text-slate-100">
                    <DialogHeader>
                        <DialogTitle>Selecionar Email</DialogTitle>
                        <DialogDescription>
                            O fornecedor possui múltiplos emails. Selecione para qual deseja enviar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        {emailOptions.map((email, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                className="w-full justify-start border-slate-700 hover:border-blue-500 hover:bg-blue-500/10"
                                onClick={() => handleSelectEmail(email)}
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                {email}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
