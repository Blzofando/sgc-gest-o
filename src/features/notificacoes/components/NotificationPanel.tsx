"use client";

import { useRouter } from "next/navigation";
import {
    Clock, AlertTriangle, CreditCard, Package, FileText,
    Truck, Palette, X, ChevronRight, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Notificacao } from "../hooks/useNotifications";
import { cn } from "@/app/lib/utils";

interface NotificationPanelProps {
    notifications: Notificacao[];
    grouped: {
        alta: Notificacao[];
        media: Notificacao[];
        baixa: Notificacao[];
    };
    onDispensarNotificacao: (n: Notificacao) => void;
    onClose: () => void;
}

const moduloConfig = {
    ENTREGA: { icon: Truck, color: "text-blue-400", bg: "bg-blue-500/10" },
    NC: { icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    EMPENHO: { icon: Package, color: "text-purple-400", bg: "bg-purple-500/10" },
    PROCESSO: { icon: FileText, color: "text-amber-400", bg: "bg-amber-500/10" }
};

const prioridadeConfig = {
    ALTA: { label: "Urgente", color: "text-red-400", border: "border-red-500/30" },
    MEDIA: { label: "Atenção", color: "text-orange-400", border: "border-orange-500/30" },
    BAIXA: { label: "Info", color: "text-slate-400", border: "border-slate-700" }
};

function NotificationItem({
    notificacao,
    onDispensar,
    onNavigate
}: {
    notificacao: Notificacao;
    onDispensar: () => void;
    onNavigate: () => void;
}) {
    const config = moduloConfig[notificacao.modulo];
    const prioConfig = prioridadeConfig[notificacao.prioridade];
    const Icon = config.icon;

    return (
        <div className={cn(
            "group relative p-3 rounded-lg border transition-all hover:bg-slate-900/50",
            prioConfig.border
        )}>
            <div className="flex gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate pr-6">
                        {notificacao.titulo}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {notificacao.descricao}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onDispensar(); }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                    title="Dispensar"
                >
                    <X className="w-3 h-3" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(); }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                    title="Ir para item"
                >
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

export function NotificationPanel({
    notifications,
    grouped,
    onDispensarNotificacao,
    onClose
}: NotificationPanelProps) {
    const router = useRouter();

    const handleNavigate = (n: Notificacao) => {
        onClose();
        // Navegar para o módulo correto
        switch (n.modulo) {
            case 'ENTREGA':
                router.push('/entregas');
                break;
            case 'NC':
                router.push('/ncs');
                break;
            case 'EMPENHO':
                router.push('/empenhos');
                break;
            case 'PROCESSO':
                router.push('/processos');
                break;
        }
    };

    if (notifications.length === 0) {
        return (
            <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">Tudo em dia!</p>
                <p className="text-slate-600 text-xs mt-1">Nenhuma notificação pendente</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-200">Notificações</h3>
                    <p className="text-xs text-slate-500">{notifications.length} pendentes</p>
                </div>
                {grouped.alta.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                        {grouped.alta.length} urgente{grouped.alta.length > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Content */}
            <ScrollArea className="max-h-[400px]">
                <div className="p-2 space-y-4">
                    {/* Alta Prioridade */}
                    {grouped.alta.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold px-2 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Urgentes
                            </p>
                            <div className="space-y-2">
                                {grouped.alta.map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        notificacao={n}
                                        onDispensar={() => onDispensarNotificacao(n)}
                                        onNavigate={() => handleNavigate(n)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Média Prioridade */}
                    {grouped.media.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-orange-400 font-bold px-2 mb-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Atenção
                            </p>
                            <div className="space-y-2">
                                {grouped.media.map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        notificacao={n}
                                        onDispensar={() => onDispensarNotificacao(n)}
                                        onNavigate={() => handleNavigate(n)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Baixa Prioridade */}
                    {grouped.baixa.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold px-2 mb-2">
                                Informativo
                            </p>
                            <div className="space-y-2">
                                {grouped.baixa.map(n => (
                                    <NotificationItem
                                        key={n.id}
                                        notificacao={n}
                                        onDispensar={() => onDispensarNotificacao(n)}
                                        onNavigate={() => handleNavigate(n)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
