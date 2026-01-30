"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { useNotifications, Notificacao } from "../hooks/useNotifications";
import { NotificationPanel } from "./NotificationPanel";

interface NotificationBellProps {
    entregas: any[];
    ncs: any[];
    empenhos: any[];
    processos: any[];
}

export function NotificationBell({ entregas, ncs, empenhos, processos }: NotificationBellProps) {
    const [open, setOpen] = useState(false);
    const [notificacoesLidas, setNotificacoesLidas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Carregar notificações lidas do Firestore
    useEffect(() => {
        const fetchLidas = async () => {
            try {
                const snap = await getDocs(collection(db, "notificacoes_lidas"));
                setNotificacoesLidas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Erro ao carregar notificações lidas:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLidas();
    }, []);

    const { notifications, grouped, count, countAlta } = useNotifications(
        entregas, ncs, empenhos, processos, notificacoesLidas
    );

    // Dispensar notificação
    const handleDispensarNotificacao = async (notificacao: Notificacao) => {
        try {
            // Verificar se já existe
            const existente = notificacoesLidas.find(n => n.notificacaoId === notificacao.id);
            if (existente) return;

            await addDoc(collection(db, "notificacoes_lidas"), {
                notificacaoId: notificacao.id,
                dispensada: true,
                dataLeitura: new Date(),
                tipo: notificacao.tipo,
                modulo: notificacao.modulo,
                entidadeId: notificacao.entidadeId
            });

            // Atualizar estado local
            setNotificacoesLidas(prev => [...prev, {
                notificacaoId: notificacao.id,
                dispensada: true,
                dataLeitura: new Date()
            }]);
        } catch (error) {
            console.error("Erro ao dispensar notificação:", error);
        }
    };

    if (loading) {
        return (
            <Button variant="ghost" size="icon" className="relative text-slate-400">
                <Bell className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-slate-400 hover:text-white hover:bg-slate-800"
                >
                    <Bell className="h-5 w-5" />
                    {count > 0 && (
                        <span className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white px-1 ${countAlta > 0 ? 'bg-red-500' : 'bg-orange-500'
                            }`}>
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[380px] p-0 bg-slate-950 border-slate-800"
                align="end"
                sideOffset={8}
            >
                <NotificationPanel
                    notifications={notifications}
                    grouped={grouped}
                    onDispensarNotificacao={handleDispensarNotificacao}
                    onClose={() => setOpen(false)}
                />
            </PopoverContent>
        </Popover>
    );
}
