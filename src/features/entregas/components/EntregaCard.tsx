import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Clock, CheckCircle, AlertCircle, Eye, Play, ArrowRight, Palette, Send, FileCheck } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters";

interface EntregaCardProps {
    data: any;
    type: 'EMPENHO' | 'ENTREGA';
    onAction: (data: any) => void;
    onViewItems: (data: any) => void;
}

export function EntregaCard({ data, type, onAction, onViewItems }: EntregaCardProps) {
    const isEmpenho = type === 'EMPENHO';

    // Se for Empenho, usa dados do empenho. Se for Entrega, usa dados da entrega.
    const numero = isEmpenho ? data.numero : data.empenhoNumero;
    const fornecedor = isEmpenho ? data.fornecedorNome : data.fornecedorNome; // Assumindo que vamos denormalizar ou buscar
    const valor = isEmpenho
        ? data.valorEmpenhado
        : (data.valores?.liquidado || data.itens?.reduce((acc: number, item: any) => acc + (item.valorGanho * (item.quantidadeSolicitada || item.quantidade || 0)), 0) || 0);
    const status = isEmpenho ? "Aguardando Início" : data.status;

    // Status Colors & Labels
    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'Aguardando Início':
                return { color: 'bg-slate-700 text-slate-300', label: 'Novo' };
            case 'AGUARDANDO_ENVIO_EMPENHO':
                return { color: 'bg-slate-800 text-slate-400 border-slate-700', label: 'Envio Empenho' };
            case 'AGUARDANDO_DEFINICAO_ARTE':
                return { color: 'bg-purple-900/30 text-purple-400 border-purple-800', label: 'Def. Arte' };
            case 'AGUARDANDO_APROVACAO_ARTE':
                return { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800', label: 'Aprov. Arte' };
            case 'AGUARDANDO_ENVIO_ARTE':
                return { color: 'bg-orange-900/30 text-orange-400 border-orange-800', label: 'Envio Arte' };
            case 'EM_PRODUCAO':
                return { color: 'bg-blue-900/30 text-blue-400 border-blue-800', label: 'Em Produção' };
            case 'ENVIADO':
                return { color: 'bg-indigo-900/30 text-indigo-400 border-indigo-800', label: 'Enviado' };
            case 'ENTREGUE':
                return { color: 'bg-emerald-900/30 text-emerald-400 border-emerald-800', label: 'Entregue' };
            case 'LIQUIDADO':
                return { color: 'bg-slate-800 text-slate-500 border-slate-700', label: 'Liquidado' };
            default:
                return { color: 'bg-slate-800 text-slate-400', label: s };
        }
    };

    const statusConfig = getStatusConfig(status);

    // Icon based on status
    const getStatusIcon = (s: string) => {
        if (s.includes('ARTE')) return <Palette className="h-4 w-4 mr-1" />;
        if (s.includes('EMPENHO')) return <Send className="h-4 w-4 mr-1" />;
        if (s === 'ENVIADO') return <Truck className="h-4 w-4 mr-1" />;
        if (s === 'LIQUIDADO') return <CheckCircle className="h-4 w-4 mr-1" />;
        return null;
    };

    // Determine Main Icon
    // Check if data has indication of Service
    const isService = data.categoria === "SERVICOS" || data.tipoFornecimento === "SERVICO" || data.itens?.some((i: any) => i.tipo === "SERVICO");
    const MainIcon = isService ? FileCheck : Package;

    return (
        <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MainIcon className="h-5 w-5 text-emerald-500" />
                            {numero}
                        </h3>
                        <p className="text-sm text-slate-400 truncate max-w-[200px]" title={fornecedor}>{fornecedor}</p>
                    </div>
                    <Badge className={`${statusConfig.color} border w-8 h-8 p-0 flex items-center justify-center rounded-full`} title={statusConfig.label}>
                        {getStatusIcon(status)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-slate-500 uppercase">Valor</p>
                        <p className="font-mono text-slate-200">{formatMoney(valor)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase">Prazo</p>
                        <p className="text-slate-200 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {data.prazo ? new Date(data.prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '---'}
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between gap-2">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" onClick={() => onViewItems(data)}>
                    <Eye className="h-4 w-4 mr-2" /> Itens
                </Button>
                <Button
                    size="sm"
                    className={isEmpenho ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500"}
                    onClick={() => onAction(data)}
                >
                    {isEmpenho ? <><Play className="h-4 w-4 mr-2" /> Iniciar</> : <><ArrowRight className="h-4 w-4 mr-2" /> Avançar</>}
                </Button>
            </CardFooter>
        </Card>
    );
}
