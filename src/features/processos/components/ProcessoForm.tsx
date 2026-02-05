"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { Processo, ItemProcesso } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PlusCircle, Loader2, Save } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters";

interface ProcessoFormProps {
   onSuccess?: () => void;
   dataToEdit?: Processo | null;
}

export function ProcessoForm({ onSuccess, dataToEdit }: ProcessoFormProps) {
   const [loading, setLoading] = useState(false);

   // Campos Básicos
   const [numero, setNumero] = useState("");
   const [modalidade, setModalidade] = useState("PREGAO");
   const [objeto, setObjeto] = useState("");

   // Novos Campos
   const [categoria, setCategoria] = useState("MATERIAL");
   const [tipoFornecimento, setTipoFornecimento] = useState("REMESSA_UNICA");
   const [status, setStatus] = useState("AGUARDANDO_FORNECEDOR");

   const [isDetalhado, setIsDetalhado] = useState(true);
   const [valorTotal, setValorTotal] = useState("");
   const [itens, setItens] = useState<ItemProcesso[]>([]);
   const [dataVigenciaAta, setDataVigenciaAta] = useState("");

   // Carregar dados para edição
   useEffect(() => {
      if (dataToEdit) {
         setNumero(dataToEdit.numero);
         setModalidade(dataToEdit.modalidade);
         setObjeto(dataToEdit.objetoResumo);
         setCategoria(dataToEdit.categoria || "MATERIAL");
         setTipoFornecimento(dataToEdit.tipoFornecimento || "REMESSA_UNICA");
         setStatus(dataToEdit.status || "AGUARDANDO_FORNECEDOR");
         setIsDetalhado(dataToEdit.modo === "DETALHADO");
         setValorTotal(dataToEdit.valorTotalEstimado?.toString() || "");
         setItens(dataToEdit.itens || []);
         setDataVigenciaAta(dataToEdit.dataVigenciaAta || "");
      }
   }, [dataToEdit]);

   const handleAddItem = () => {
      setItens([...itens, { id: crypto.randomUUID(), descricao: "", quantidade: 1, valorUnitarioRef: 0 }]);
   };

   const handleRemoveItem = (id: string) => {
      setItens(itens.filter((i) => i.id !== id));
   };

   const updateItem = (id: string, field: keyof ItemProcesso, value: any) => {
      setItens(itens.map((item) => item.id === id ? { ...item, [field]: value } : item));
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
         const payload: any = {
            numero, modalidade, objetoResumo: objeto,
            categoria, tipoFornecimento, status,
            modo: isDetalhado ? "DETALHADO" : "SIMPLES",
            dataAtualizacao: new Date(),
            ...(isDetalhado ? { itens } : { valorTotalEstimado: parseFloat(valorTotal) || 0 }),
            ...(tipoFornecimento === "SRP" ? { dataVigenciaAta } : {}),
         };

         if (!dataToEdit) {
            payload.dataCriacao = new Date();
            await addDoc(collection(db, "processos"), payload);
            alert("Processo criado com sucesso!");
         } else {
            if (dataToEdit.id) {
               await updateDoc(doc(db, "processos", dataToEdit.id), payload);
               alert("Processo atualizado!");
            }
         }

         if (onSuccess) onSuccess();

         if (!dataToEdit) {
            setNumero(""); setObjeto(""); setItens([]); setValorTotal(""); setDataVigenciaAta("");
         }

      } catch (error) {
         console.error(error);
         alert("Erro ao salvar.");
      } finally {
         setLoading(false);
      }
   };

   return (
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
         {/* Linha 1: Todos os campos principais */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
               <Label>Número do Processo</Label>
               <Input value={numero} onChange={(e) => setNumero(e.target.value)} className="bg-slate-950 border-slate-700" required placeholder="Ex: 2025/001" />
            </div>
            <div className="space-y-2">
               <Label>Modalidade</Label>
               <Select value={modalidade} onValueChange={setModalidade}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="PREGAO">Pregão Eletrônico</SelectItem>
                     <SelectItem value="DISPENSA">Dispensa</SelectItem>
                     <SelectItem value="ADESAO">Adesão/Carona</SelectItem>
                     <SelectItem value="INEXIGIBILIDADE">Inexigibilidade</SelectItem>
                  </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <Label>Categoria</Label>
               <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="MATERIAL">Material / Produto</SelectItem>
                     <SelectItem value="SERVICO">Serviço</SelectItem>
                  </SelectContent>
               </Select>
            </div>
            <div className="space-y-2">
               <Label>Tipo de Fornecimento</Label>
               <Select value={tipoFornecimento} onValueChange={setTipoFornecimento}>
                  <SelectTrigger className="bg-slate-950 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="REMESSA_UNICA">Remessa Única</SelectItem>
                     <SelectItem value="SRP">SRP (Registro de Preço)</SelectItem>
                  </SelectContent>
               </Select>
            </div>
         </div>

         {/* Campo de Vigência da Ata - apenas para SRP */}
         {tipoFornecimento === "SRP" && (
            <div className="space-y-2 animate-in fade-in bg-blue-900/20 p-4 rounded border border-blue-800">
               <Label className="text-blue-300">Prazo de Vigência da Ata *</Label>
               <Input
                  type="date"
                  value={dataVigenciaAta}
                  onChange={(e) => setDataVigenciaAta(e.target.value)}
                  className="bg-slate-950 border-slate-700 max-w-xs"
                  required
               />
               <p className="text-xs text-slate-400">Data até a qual a ata estará disponível para empenho.</p>
            </div>
         )}

         <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} className="bg-slate-950 border-slate-700 min-h-16 resize-none" required />
         </div>

         <div className="flex items-center space-x-3 bg-slate-900 p-3 rounded border border-slate-800">
            <Label className="text-xs uppercase font-bold text-slate-400 w-32">Modo de Cadastro</Label>
            <span className={`text-sm ${!isDetalhado ? 'text-white font-bold' : 'text-slate-500'}`}>Valor Global</span>
            <Switch checked={isDetalhado} onCheckedChange={setIsDetalhado} />
            <span className={`text-sm ${isDetalhado ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>Itens Detalhados</span>
         </div>

         {!isDetalhado ? (
            <div className="space-y-2 animate-in fade-in">
               <Label>Valor Total Estimado (R$)</Label>
               <Input type="number" step="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className="bg-slate-950 border-slate-700 text-green-400 font-mono text-lg" required={!isDetalhado} />
            </div>
         ) : (
            <div className="space-y-4 animate-in fade-in">
               <div className="flex justify-between items-center">
                  <Label className="text-blue-300">Itens do Processo</Label>
                  <Button type="button" size="sm" onClick={handleAddItem} variant="outline" className="border-slate-700 text-slate-300 hover:text-white"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item</Button>
               </div>
               <div className="rounded-md border border-slate-800 overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                     <TableHeader className="bg-slate-950 sticky top-0">
                        <TableRow>
                           <TableHead className="w-[45%]">Descrição</TableHead>
                           <TableHead className="w-[15%] text-center">Qtd</TableHead>
                           <TableHead className="w-[25%] text-right">Valor Ref.</TableHead>
                           <TableHead className="w-[15%]"></TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody className="bg-slate-900/50">
                        {itens.map((item) => (
                           <TableRow key={item.id}>
                              <TableCell><Input value={item.descricao} onChange={(e) => updateItem(item.id, "descricao", e.target.value)} className="bg-transparent border-none h-8 focus:ring-0" placeholder="Item..." /></TableCell>
                              <TableCell><Input type="number" value={item.quantidade} onChange={(e) => updateItem(item.id, "quantidade", Number(e.target.value))} className="bg-transparent border-slate-800 h-8 text-center" /></TableCell>
                              <TableCell><Input type="number" step="0.01" value={item.valorUnitarioRef} onChange={(e) => updateItem(item.id, "valorUnitarioRef", Number(e.target.value))} className="bg-transparent border-slate-800 h-8 text-right font-mono" /></TableCell>
                              <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></Button></TableCell>
                           </TableRow>
                        ))}
                        {itens.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-4">Nenhum item adicionado.</TableCell></TableRow>}
                     </TableBody>
                  </Table>
               </div>
               {itens.length > 0 && (
                  <div className="text-right text-slate-400 text-sm">Total Estimado: <span className="text-white font-mono font-bold text-lg ml-2">{formatMoney(itens.reduce((acc, i) => acc + (i.quantidade * i.valorUnitarioRef), 0))}</span></div>
               )}
            </div>
         )}

         <div className="flex justify-end pt-4">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white min-w-[200px] font-semibold" disabled={loading}>
               {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <><Save className="mr-2 h-4 w-4" /> {dataToEdit ? "Salvar Alterações" : "Salvar Processo"}</>}
            </Button>
         </div>
      </form>
   );
}