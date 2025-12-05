"use client";

import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, DollarSign } from "lucide-react";
import { formatMoney } from "@/app/lib/formatters";

interface NCFormProps {
  onSuccess?: () => void;
  initialData?: any;
  ncId?: string;
}

export function NCForm({ onSuccess, initialData, ncId }: NCFormProps) {
  const [loading, setLoading] = useState(false);

  // Cabeçalho
  const [numero, setNumero] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [ugEmitente, setUgEmitente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imediato, setImediato] = useState(false);
  const [dataLimite, setDataLimite] = useState("");

  // Créditos
  const [creditos, setCreditos] = useState<any[]>([]);

  // Estado do Novo Crédito
  const [newCredit, setNewCredit] = useState({
    nd: "",
    ptres: "",
    fonte: "",
    ugr: "",
    pi: "",
    valor: ""
  });

  useEffect(() => {
    if (initialData) {
      setNumero(initialData.numero || "");
      setDataEmissao(initialData.dataEmissao || new Date().toISOString().split('T')[0]);
      setUgEmitente(initialData.ugEmitente || "");
      setDescricao(initialData.descricao || "");
      setCreditos(initialData.creditos || []);

      if (initialData.prazo === "IMEDIATO") {
        setImediato(true);
      } else {
        setImediato(false);
        setDataLimite(initialData.prazo || "");
      }
    }
  }, [initialData]);

  const addCredit = () => {
    if (!newCredit.nd || !newCredit.valor) {
      alert("Preencha pelo menos ND e Valor.");
      return;
    }
    setCreditos([...creditos, { ...newCredit, id: Date.now() }]);
    setNewCredit({ nd: "", ptres: "", fonte: "", ugr: "", pi: "", valor: "" });
  };

  const removeCredit = (id: number) => {
    setCreditos(creditos.filter(c => c.id !== id));
  };

  const valorTotal = creditos.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creditos.length === 0) {
      alert("Adicione pelo menos um crédito.");
      return;
    }
    setLoading(true);
    try {
      const data = {
        numero,
        dataEmissao,
        ugEmitente,
        descricao,
        prazo: imediato ? "IMEDIATO" : dataLimite,
        creditos,
        valorTotal,
        // Se for edição, não reseta o saldoDisponivel, apenas atualiza se necessário (mas a lógica de saldo é complexa, melhor deixar o page.tsx recalcular ou atualizar aqui se mudou o total)
        // Simplificação: Atualiza valorTotal. O saldoDisponivel deve ser recalculado no page.tsx ou aqui se quisermos persistir.
        // Como o saldo é derivado (Total - Empenhado), e o empenhado tá em outra coleção, aqui só salvamos os dados da NC.
        // Mas o campo 'saldoDisponivel' existe no documento? Sim, foi criado no addDoc.
        // Se editarmos o valor, o saldo muda.
        // Vamos assumir que o saldoDisponivel é recalculado na visualização, mas se persistirmos, precisamos atualizar.
        // Por segurança, vamos atualizar o saldoDisponivel = valorTotal (reset) APENAS se for criação.
        // Se for edição, teríamos que saber o empenhado para atualizar o saldo.
        // Como não temos os empenhos aqui, vamos evitar mexer no saldoDisponivel na edição, ou assumir que o usuário sabe o que faz.
        // O ideal é o saldo ser calculado em tempo de execução no page.tsx.
        // Vou manter a lógica de criação. Na edição, vou atualizar apenas os campos editáveis.
        ...(ncId ? {} : { saldoDisponivel: valorTotal, dataCriacao: new Date() })
      };

      if (ncId) {
        await updateDoc(doc(db, "ncs", ncId), data);
        alert("NC Atualizada com Sucesso!");
      } else {
        await addDoc(collection(db, "ncs"), data);
        alert("NC Lançada com Sucesso!");
      }

      if (onSuccess) onSuccess();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Cabeçalho */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Número da NC</Label>
          <Input value={numero} onChange={e => setNumero(e.target.value)} className="bg-slate-950 border-slate-700" required placeholder="Ex: 2024NC000123" />
        </div>
        <div className="space-y-2">
          <Label>Data de Emissão</Label>
          <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} className="bg-slate-950 border-slate-700" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>UG Emitente (Opcional)</Label>
          <Input value={ugEmitente} onChange={e => setUgEmitente(e.target.value)} className="bg-slate-950 border-slate-700" placeholder="Ex: 158123" />
        </div>
        <div className="space-y-2">
          <Label className="mb-2 block">Prazo para Empenho</Label>
          <div className="flex items-center gap-2 h-10">
            <Checkbox checked={imediato} onCheckedChange={(c) => setImediato(!!c)} />
            <span className="text-sm text-slate-300 mr-4">Imediato</span>
            {!imediato && (
              <Input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)} className="bg-slate-950 border-slate-700 w-full" required={!imediato} />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição (Opcional)</Label>
        <Input value={descricao} onChange={e => setDescricao(e.target.value)} className="bg-slate-950 border-slate-700" placeholder="Observações sobre a nota..." />
      </div>

      {/* Área de Créditos */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" /> Créditos Recebidos</h3>
          <span className="text-xs text-slate-500">Total: {formatMoney(valorTotal)}</span>
        </div>

        {/* Formulário de Adição de Crédito */}
        <div className="grid grid-cols-12 gap-2 items-end bg-slate-950 p-3 rounded border border-slate-800/50">
          <div className="col-span-4 space-y-1">
            <Label className="text-xs">Natureza (ND)</Label>
            <Select value={newCredit.nd} onValueChange={(v) => setNewCredit({ ...newCredit, nd: v })}>
              <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="339030">33.90.30 - Material Consumível</SelectItem>
                <SelectItem value="339039">33.90.39 - Serviço</SelectItem>
                <SelectItem value="449052">44.90.52 - Material permanente</SelectItem>
                <SelectItem value="339015">33.90.15 - Diárias</SelectItem>
                <SelectItem value="339033">33.90.33 - Passagens</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">PTRES</Label>
            <Input value={newCredit.ptres} onChange={e => setNewCredit({ ...newCredit, ptres: e.target.value })} className="h-8 bg-slate-900 border-slate-700 text-xs" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Fonte</Label>
            <Input value={newCredit.fonte} onChange={e => setNewCredit({ ...newCredit, fonte: e.target.value })} className="h-8 bg-slate-900 border-slate-700 text-xs" />
          </div>
          <div className="col-span-3 space-y-1">
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" step="0.01" value={newCredit.valor} onChange={e => setNewCredit({ ...newCredit, valor: e.target.value })} className="h-8 bg-slate-900 border-slate-700 text-xs text-emerald-400 font-bold" />
          </div>
          <div className="col-span-1">
            <Button type="button" size="sm" onClick={addCredit} className="h-8 w-full bg-emerald-600 hover:bg-emerald-500"><Plus className="h-4 w-4" /></Button>
          </div>

          {/* Linha 2 de campos opcionais */}
          <div className="col-span-6 space-y-1 mt-2">
            <Label className="text-xs">UGR (Opcional)</Label>
            <Input value={newCredit.ugr} onChange={e => setNewCredit({ ...newCredit, ugr: e.target.value })} className="h-8 bg-slate-900 border-slate-700 text-xs" />
          </div>
          <div className="col-span-6 space-y-1 mt-2">
            <Label className="text-xs">PI (Opcional)</Label>
            <Input value={newCredit.pi} onChange={e => setNewCredit({ ...newCredit, pi: e.target.value })} className="h-8 bg-slate-900 border-slate-700 text-xs" />
          </div>
        </div>

        {/* Lista de Créditos */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
          {creditos.map((c, idx) => (
            <div key={c.id} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 flex-1">
                <span className="text-slate-300 font-bold">{c.nd}</span>
                <span className="text-emerald-400 font-mono text-right">{formatMoney(parseFloat(c.valor))}</span>
                <div className="col-span-2 text-xs text-slate-500 flex gap-3">
                  {c.ptres && <span>PTRES: {c.ptres}</span>}
                  {c.fonte && <span>Fonte: {c.fonte}</span>}
                  {c.ugr && <span>UGR: {c.ugr}</span>}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeCredit(c.id)} className="h-6 w-6 text-slate-500 hover:text-red-500 ml-2">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {creditos.length === 0 && <p className="text-center text-xs text-slate-600 py-2">Nenhum crédito adicionado.</p>}
        </div>
      </div>

      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" disabled={loading}>
        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : (ncId ? "Atualizar Nota de Crédito" : "Lançar Nota de Crédito")}
      </Button>
    </form>
  );
}