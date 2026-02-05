export interface ItemProcesso {
    id: string;
    descricao: string;
    quantidade: number;
    valorUnitarioRef: number;
}

export type ProcessoStatus = "AGUARDANDO_FORNECEDOR" | "AGUARDANDO_EMPENHO" | "AGUARDANDO_ENTREGA" | "AGUARDANDO_LIQUIDACAO" | "AGUARDANDO_INICIO_ENTREGA" | "AGUARDANDO_ENVIO_ARTE" | "AGUARDANDO_APROVACAO_ARTE" | "EM_PRODUCAO" | "ENVIADO" | "AGUARDANDO_RECEBIMENTO" | "EM_ANDAMENTO" | "CONCLUIDO" | "ATIVO" | "SUSPENSO" | "CANCELADO";

export interface Processo {
    id?: string;
    numero: string;
    modalidade: "PREGAO" | "DISPENSA" | "ADESAO" | "INEXIGIBILIDADE";
    objetoResumo: string;
    descricao?: string; // Alias para objetoResumo
    modo: "SIMPLES" | "DETALHADO";

    // Novos Campos
    categoria: "MATERIAL" | "SERVICO";
    tipoFornecimento: "REMESSA_UNICA" | "SRP";
    status: ProcessoStatus;

    valorTotalEstimado?: number;
    valorTotal?: number; // Alias para valorTotalEstimado
    itens?: ItemProcesso[];

    dataCriacao: any;
    dataAtualizacao?: any;
    dataVigenciaAta?: string; // Obrigatório para SRP - prazo de vigência da ata
}

export interface Fornecedor {
    id?: string;
    empresa: string;
    cnpj: string;
    telefone: string;
    email?: string;
    processosVinculados?: any[];
    dataCadastro: any;
}
