export interface ItemProcesso {
    id: string;
    descricao: string;
    quantidade: number;
    valorUnitarioRef: number;
}

export type ProcessoStatus = "AGUARDANDO_FORNECEDOR" | "AGUARDANDO_EMPENHO" | "AGUARDANDO_ENTREGA" | "AGUARDANDO_LIQUIDACAO" | "CONCLUIDO" | "ATIVO" | "SUSPENSO";

export interface Processo {
    id?: string;
    numero: string;
    modalidade: "PREGAO" | "DISPENSA" | "ADESAO" | "INEXIGIBILIDADE";
    objetoResumo: string;
    modo: "SIMPLES" | "DETALHADO";

    // Novos Campos
    categoria: "MATERIAL" | "SERVICO";
    tipoFornecimento: "REMESSA_UNICA" | "REMESSA_CONTINUA";
    status: ProcessoStatus;

    valorTotalEstimado?: number;
    itens?: ItemProcesso[];

    dataCriacao: any;
    dataAtualizacao?: any;
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
