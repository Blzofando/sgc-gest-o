"use client";

import { useMemo } from "react";

export interface Notificacao {
    id: string;
    tipo: string;
    modulo: 'ENTREGA' | 'NC' | 'EMPENHO' | 'PROCESSO';
    prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
    titulo: string;
    descricao: string;
    entidadeId: string;
    entidadeRef: string;
    dataCriacao: Date;
    diasRestantes?: number;
    diasAtraso?: number;
}

interface NotificacaoLida {
    id: string;
    dispensada: boolean;
    dataLeitura: Date;
}

// Calcula diferença em dias entre duas datas
const diffDays = (date1: Date, date2: Date): number => {
    const diffTime = date1.getTime() - date2.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export function useNotifications(
    entregas: any[],
    ncs: any[],
    empenhos: any[],
    processos: any[],
    notificacoesLidas: NotificacaoLida[] = []
) {
    const notifications = useMemo(() => {
        const result: Notificacao[] = [];
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const lidasMap = new Map(notificacoesLidas.map(n => [n.id, n]));

        // ========================================
        // 🚚 ENTREGAS
        // ========================================
        entregas.forEach(e => {
            if (e.status === 'LIQUIDADO') return;

            const prazo = e.prazo ? new Date(e.prazo) : null;
            const dataAtualizacao = e.dataAtualizacao?.toDate?.() || new Date(e.dataAtualizacao);
            const entidadeRef = e.empenhoNumero || e.id;

            // 1. Prazo de entrega
            if (prazo) {
                prazo.setHours(0, 0, 0, 0);
                const diasRestantes = diffDays(prazo, hoje);

                if (diasRestantes < 0) {
                    // ATRASADA
                    const id = `entrega-atrasada-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'ENTREGA_ATRASADA',
                            modulo: 'ENTREGA',
                            prioridade: 'ALTA',
                            titulo: `Entrega ${entidadeRef} está atrasada`,
                            descricao: `${Math.abs(diasRestantes)} dias de atraso`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje,
                            diasAtraso: Math.abs(diasRestantes)
                        });
                    }
                } else if (diasRestantes <= 5) {
                    // 5 DIAS
                    const id = `entrega-prazo-5-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'PRAZO_5_DIAS',
                            modulo: 'ENTREGA',
                            prioridade: 'ALTA',
                            titulo: `Entrega ${entidadeRef} vence em ${diasRestantes} dias`,
                            descricao: `Prazo: ${prazo.toLocaleDateString('pt-BR')}`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje,
                            diasRestantes
                        });
                    }
                } else if (diasRestantes <= 10) {
                    // 10 DIAS
                    const id = `entrega-prazo-10-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'PRAZO_10_DIAS',
                            modulo: 'ENTREGA',
                            prioridade: 'MEDIA',
                            titulo: `Entrega ${entidadeRef} vence em ${diasRestantes} dias`,
                            descricao: `Prazo: ${prazo.toLocaleDateString('pt-BR')}`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje,
                            diasRestantes
                        });
                    }
                }
            }

            // 2. Sem atualização há 15 dias
            if (dataAtualizacao) {
                const diasSemAtualizacao = diffDays(hoje, dataAtualizacao);
                if (diasSemAtualizacao >= 15) {
                    const id = `entrega-sem-atualizacao-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'SEM_ATUALIZACAO',
                            modulo: 'ENTREGA',
                            prioridade: 'MEDIA',
                            titulo: `Entrega ${entidadeRef} sem atualização`,
                            descricao: `${diasSemAtualizacao} dias sem movimentação`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }

            // 3. Aguardando confirmação de recebimento do empenho (5 dias)
            if (e.status === 'AGUARDANDO_RECEBIMENTO_EMPENHO' && e.etapas?.enviadoEmpenho) {
                const dataEnvio = e.etapas.dataEnvioEmpenho
                    ? new Date(e.etapas.dataEnvioEmpenho)
                    : dataAtualizacao;
                const diasAguardando = diffDays(hoje, dataEnvio);

                if (diasAguardando >= 5) {
                    const id = `entrega-aguardando-confirmacao-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'AGUARDANDO_CONFIRMACAO_EMPENHO',
                            modulo: 'ENTREGA',
                            prioridade: 'MEDIA',
                            titulo: `${entidadeRef}: Sem confirmação do empenho`,
                            descricao: `${diasAguardando} dias aguardando confirmação do fornecedor`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }

            // 4. Aguardando aprovação de arte (3 dias)
            if (e.status === 'AGUARDANDO_APROVACAO_ARTE') {
                const dataStatus = dataAtualizacao;
                const diasAguardando = diffDays(hoje, dataStatus);

                if (diasAguardando >= 3) {
                    const id = `entrega-aguardando-arte-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'AGUARDANDO_APROVACAO_ARTE',
                            modulo: 'ENTREGA',
                            prioridade: 'MEDIA',
                            titulo: `${entidadeRef}: Arte aguardando aprovação`,
                            descricao: `${diasAguardando} dias aguardando aprovação`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }

            // 5. Aguardando envio de arte para fornecedor (3 dias)
            if (e.status === 'AGUARDANDO_ENVIO_ARTE') {
                const diasAguardando = diffDays(hoje, dataAtualizacao);

                if (diasAguardando >= 3) {
                    const id = `entrega-aguardando-envio-arte-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'AGUARDANDO_ENVIO_ARTE',
                            modulo: 'ENTREGA',
                            prioridade: 'BAIXA',
                            titulo: `${entidadeRef}: Arte aprovada, aguardando envio`,
                            descricao: `${diasAguardando} dias com arte aprovada sem enviar`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }

            // 6. Aguardando definição sobre arte (3 dias)
            if (e.status === 'AGUARDANDO_DEFINICAO_ARTE') {
                const diasAguardando = diffDays(hoje, dataAtualizacao);

                if (diasAguardando >= 3) {
                    const id = `entrega-definicao-arte-${e.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'AGUARDANDO_DEFINICAO_ARTE',
                            modulo: 'ENTREGA',
                            prioridade: 'BAIXA',
                            titulo: `${entidadeRef}: Definir se precisa de arte`,
                            descricao: `${diasAguardando} dias aguardando definição`,
                            entidadeId: e.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }
        });

        // ========================================
        // 💳 NOTAS DE CRÉDITO
        // ========================================
        ncs.forEach(nc => {
            if (nc.recolhidoManual) return;

            const prazo = nc.prazo && nc.prazo !== 'IMEDIATO' ? new Date(nc.prazo) : null;
            const valorTotal = nc.valorTotal || 0;
            const totalEmpenhado = nc.totalEmpenhado || 0;
            const saldoDisponivel = valorTotal - totalEmpenhado - (nc.valorRecolhido || 0);
            const percentualSaldo = valorTotal > 0 ? saldoDisponivel / valorTotal : 0;

            if (saldoDisponivel <= 0.01) return; // Sem saldo

            const entidadeRef = nc.numero || nc.id;

            if (prazo) {
                prazo.setHours(0, 0, 0, 0);
                const diasRestantes = diffDays(prazo, hoje);

                // NC com saldo >10% e prazo expirando em 5 dias
                if (diasRestantes <= 5 && percentualSaldo > 0.10) {
                    const id = `nc-urgente-${nc.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'NC_SALDO_PRAZO_URGENTE',
                            modulo: 'NC',
                            prioridade: 'ALTA',
                            titulo: `NC ${entidadeRef}: Saldo alto e prazo expirando`,
                            descricao: `${(percentualSaldo * 100).toFixed(0)}% disponível, vence em ${diasRestantes} dias`,
                            entidadeId: nc.id,
                            entidadeRef,
                            dataCriacao: hoje,
                            diasRestantes
                        });
                    }
                } else if (diasRestantes <= 5) {
                    const id = `nc-prazo-5-${nc.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'NC_PRAZO_5_DIAS',
                            modulo: 'NC',
                            prioridade: 'ALTA',
                            titulo: `NC ${entidadeRef} vence em ${diasRestantes} dias`,
                            descricao: `Saldo disponível: R$ ${saldoDisponivel.toLocaleString('pt-BR')}`,
                            entidadeId: nc.id,
                            entidadeRef,
                            dataCriacao: hoje,
                            diasRestantes
                        });
                    }
                } else if (diasRestantes <= 10) {
                    const id = `nc-prazo-10-${nc.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'NC_PRAZO_10_DIAS',
                            modulo: 'NC',
                            prioridade: 'MEDIA',
                            titulo: `NC ${entidadeRef} vence em ${diasRestantes} dias`,
                            descricao: `Saldo disponível: R$ ${saldoDisponivel.toLocaleString('pt-BR')}`,
                            entidadeId: nc.id,
                            entidadeRef,
                            dataCriacao: hoje,
                            diasRestantes
                        });
                    }
                }
            }

            // NC com saldo parado há 30 dias
            const dataUltimoEmpenho = nc.dataUltimoEmpenho
                ? new Date(nc.dataUltimoEmpenho)
                : nc.dataEmissao ? new Date(nc.dataEmissao) : null;

            if (dataUltimoEmpenho) {
                const diasParado = diffDays(hoje, dataUltimoEmpenho);
                if (diasParado >= 30) {
                    const id = `nc-parada-${nc.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'NC_SALDO_PARADO',
                            modulo: 'NC',
                            prioridade: 'BAIXA',
                            titulo: `NC ${entidadeRef}: Saldo parado`,
                            descricao: `${diasParado} dias sem movimentação, saldo R$ ${saldoDisponivel.toLocaleString('pt-BR')}`,
                            entidadeId: nc.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }
        });

        // ========================================
        // 📦 EMPENHOS
        // ========================================
        empenhos.forEach(emp => {
            if (emp.status === 'LIQUIDADO' || emp.status === 'CONCLUIDO') return;

            const dataEmissao = emp.dataEmissao?.toDate?.() || new Date(emp.dataEmissao);
            const entidadeRef = emp.numero || emp.id;

            // Empenho sem entrega há 30 dias
            const temEntrega = entregas.some(e => e.id_empenho === emp.id);
            if (!temEntrega) {
                const diasSemEntrega = diffDays(hoje, dataEmissao);
                if (diasSemEntrega >= 30) {
                    const id = `empenho-sem-entrega-${emp.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'EMPENHO_SEM_ENTREGA',
                            modulo: 'EMPENHO',
                            prioridade: 'MEDIA',
                            titulo: `Empenho ${entidadeRef} sem entrega iniciada`,
                            descricao: `${diasSemEntrega} dias desde a emissão`,
                            entidadeId: emp.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }
        });

        // ========================================
        // 📋 PROCESSOS
        // ========================================
        processos.forEach(proc => {
            if (proc.status === 'CONCLUIDO' || proc.status === 'CANCELADO') return;

            const dataCriacao = proc.dataCriacao?.toDate?.() || new Date(proc.dataCriacao);
            const dataAtualizacao = proc.dataAtualizacao?.toDate?.() || dataCriacao;
            const entidadeRef = proc.numero || proc.id;

            // Aguardando fornecedor há 15 dias
            if (proc.status === 'AGUARDANDO_FORNECEDOR') {
                const diasAguardando = diffDays(hoje, dataAtualizacao);
                if (diasAguardando >= 15) {
                    const id = `processo-aguardando-fornecedor-${proc.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'PROCESSO_AGUARDANDO_FORNECEDOR',
                            modulo: 'PROCESSO',
                            prioridade: 'MEDIA',
                            titulo: `Processo ${entidadeRef}: Aguardando fornecedor`,
                            descricao: `${diasAguardando} dias sem vínculo de fornecedor`,
                            entidadeId: proc.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }

            // Aguardando empenho há 10 dias
            if (proc.status === 'AGUARDANDO_EMPENHO') {
                const diasAguardando = diffDays(hoje, dataAtualizacao);
                if (diasAguardando >= 10) {
                    const id = `processo-aguardando-empenho-${proc.id}`;
                    if (!lidasMap.get(id)?.dispensada) {
                        result.push({
                            id,
                            tipo: 'PROCESSO_AGUARDANDO_EMPENHO',
                            modulo: 'PROCESSO',
                            prioridade: 'MEDIA',
                            titulo: `Processo ${entidadeRef}: Aguardando empenho`,
                            descricao: `${diasAguardando} dias sem empenho emitido`,
                            entidadeId: proc.id,
                            entidadeRef,
                            dataCriacao: hoje
                        });
                    }
                }
            }
        });

        // Ordenar por prioridade
        const prioridadeOrder = { 'ALTA': 0, 'MEDIA': 1, 'BAIXA': 2 };
        return result.sort((a, b) => prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade]);

    }, [entregas, ncs, empenhos, processos, notificacoesLidas]);

    // Agrupar por prioridade
    const grouped = useMemo(() => ({
        alta: notifications.filter(n => n.prioridade === 'ALTA'),
        media: notifications.filter(n => n.prioridade === 'MEDIA'),
        baixa: notifications.filter(n => n.prioridade === 'BAIXA')
    }), [notifications]);

    return {
        notifications,
        grouped,
        count: notifications.length,
        countAlta: grouped.alta.length
    };
}
