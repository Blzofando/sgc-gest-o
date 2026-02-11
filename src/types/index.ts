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
    tipoFornecimento: "REMESSA_UNICA" | "SRP" | "REMESSA_CONTINUA";
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

// ====== DIÁRIAS ======

export interface MilitarFavorecido {
    id: string;                    // UUID
    nome: string;                  // Nome de guerra do militar
    numDiarias: number;            // Quantidade de diárias (ex: 1.5)
    valorUnitario: number;         // Valor de cada diária (R$)
}

export interface Diaria {
    id?: string;                       // ID Firestore
    numeroDiex: string;                // Número do DIEX de autorização
    missao: string;                    // Descrição da missão
    local: string;                     // Local de destino
    dataHoraIda: any;                  // Timestamp Firebase
    dataHoraVolta: any;                // Timestamp Firebase
    militares: MilitarFavorecido[];    // Lista de favorecidos

    // Financeiro
    id_nc: string;                     // FK → ncs (NC de crédito vinculada)
    valorTotal: number;                // Soma de todos militares (calculado)

    // Controle
    observacoes?: string;              // Observações opcionais

    // Timestamps
    dataCriacao: any;                  // Timestamp Firebase
    dataAtualizacao?: any;             // Timestamp Firebase
}
