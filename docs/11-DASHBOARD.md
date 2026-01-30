# 11 - DASHBOARD - Análise Detalhada

## 1. Visão Geral

| Atributo | Valor |
|----------|-------|
| **Propósito** | Visão consolidada com KPIs e gráficos do sistema |
| **Responsabilidades** | Agregação de dados, visualização, filtro por ND |
| **Posição na Arquitetura** | 📊 **ANALYTICS** - Página inicial do sistema |

O Dashboard é a **página inicial** do sistema, acessível em `/` após login.

---

## 2. Arquivos Analisados

| Arquivo | Caminho | Linhas | Bytes |
|---------|---------|--------|-------|
| **page.tsx** | `src/app/(dashboard)/page.tsx` | 401 | 20.615 |
| **TOTAL** | - | **401** | **20.615** |

**Complexidade**: 🟡 Média

---

## 3. KPIs Exibidos

| KPI | Cálculo | Cor |
|-----|---------|-----|
| **Processos Abertos** | `status !== CONCLUIDO/CANCELADO/SUSPENSO` | 🔵 Azul |
| **Processos Finalizados** | `status === CONCLUIDO` | 🟢 Verde |
| **NCs Recebidas** | Soma de créditos (filtrável por ND) | 🟣 Roxo |
| **Valor Empenhado** | Soma de `valorEmpenhado` (filtrável) | 🔵 Azul |
| **Valor Recolhido** | Soma de `valores.recolhido` | 🟡 Amarelo |
| **Valor Liquidado** | Soma de `valores.liquidado` | 🟢 Verde |

---

## 4. Funções Principais

### 4.1 Carregamento Paralelo

```typescript
// page.tsx:44-49
const [procSnap, empSnap, entSnap, ncSnap] = await Promise.all([
    getDocs(collection(db, "processos")),
    getDocs(collection(db, "empenhos")),
    getDocs(collection(db, "entregas")),
    getDocs(collection(db, "ncs"))
]);
```

---

### 4.2 Extração de NDs Disponíveis

```typescript
// page.tsx:57-60
const nds = new Set<string>();
ncs.forEach((nc) => nc.creditos?.forEach((c) => { if (c.nd) nds.add(c.nd) }));
empenhos.forEach((e) => { if (e.nd) nds.add(e.nd) });
setAvailableNDs(Array.from(nds).sort());
```

---

### 4.3 Filtragem por ND

```typescript
// page.tsx:89-120
// NCs: Filtrar créditos específicos
let valorNcsRecebidas = 0;
ncs.forEach((nc) => {
    const creditosFiltrados = selectedND === "TODAS"
        ? nc.creditos
        : nc.creditos.filter((c) => c.nd === selectedND);
    valorNcsRecebidas += creditosFiltrados.reduce(...);
});

// Empenhos: Filtrar por campo ND
const empenhosFiltrados = selectedND === "TODAS"
    ? empenhos
    : empenhos.filter((e) => e.nd === selectedND);

// Entregas: Filtrar pelo empenho vinculado
const entregasFiltradas = selectedND === "TODAS"
    ? entregas
    : entregas.filter((ent) => {
        const emp = empenhos.find((e) => e.id === ent.id_empenho);
        return emp && emp.nd === selectedND;
    });
```

---

## 5. Visualizações

### 5.1 Gráfico de Pizza (Processos)

```typescript
// page.tsx:181-215 - SVG com motion
<svg viewBox="0 0 200 200">
    <motion.circle
        cx="100" cy="100" r="80"
        stroke="#60a5fa"  // Azul - Abertos
        strokeDasharray={`${percentAbertos * 5.03} ${100 * 5.03}`}
        initial={{ strokeDasharray: "0 503" }}
        animate={{ strokeDasharray: `${percentAbertos * 5.03}...` }}
    />
    <motion.circle
        stroke="#34d399"  // Verde - Finalizados
        strokeDashoffset={-percentAbertos * 5.03}
    />
</svg>
```

### 5.2 Gráfico de Barras (Orçamento)

```typescript
// page.tsx:261-286
{orcamentoData.map((item, idx) => (
    <div className="h-3 bg-slate-800 rounded-full">
        <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: item.color }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, delay: idx * 0.1 }}
        />
    </div>
))}
```

---

## 6. Estrutura da UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard Geral                                                 │
│ Visão clara e intuitiva dos processos e orçamento.              │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   🥧 PROCESSOS             │   📊 EXECUÇÃO ORÇAMENTÁRIA        │
│   ┌─────────┐              │   [Filtro: Todas as Naturezas ▼]  │
│   │   42    │  Abertos: 30 │                                    │
│   │ Total   │  Finaliz: 12 │   NCs Recebidas  ████████░░ R$ 100k│
│   └─────────┘              │   Empenhado      ██████░░░░ R$ 80k │
│                            │   Recolhido      ██░░░░░░░░ R$ 10k │
│                            │   Liquidado      ████░░░░░░ R$ 40k │
├────────────────────────────┼────────────────────────────────────┤
│   💳 EMPENHOS              │   📦 NOTAS DE CRÉDITO             │
│   Total: 25                │   Total: 8                        │
│   Valor: R$ 80.000         │   Valor: R$ 100.000               │
├────────────────────────────┴────────────────────────────────────┤
│ [Processos Abertos] [Processos Finalizados] [Recolhido] [Liqui] │
│      30                   12              R$ 10k      R$ 40k    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Componentes

### `SummaryCard`

```typescript
// page.tsx:384-399
function SummaryCard({ title, value, icon: Icon, color, bgColor }) {
    return (
        <Card>
            <CardContent>
                <p className="text-xs uppercase">{title}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <Icon className={`h-6 w-6 ${color}`} />
            </CardContent>
        </Card>
    );
}
```

---

## 8. Dependências

| Biblioteca | Uso |
|------------|-----|
| `framer-motion` | Animações dos gráficos |
| `firebase/firestore` | Agregação de dados |
| `@/components/ui` | Card, Select |

---

## 9. Padrões e Code Smells

### ✅ Boas Práticas

| Prática | Descrição |
|---------|-----------|
| **Promise.all** | Carregamento paralelo de 4 coleções |
| **Filtro por ND** | Permite análise segmentada |
| **Animações** | Gráficos com transições suaves |
| **Componente reutilizável** | SummaryCard |

### ⚠️ Code Smells

| Problema | Localização | Severidade |
|----------|-------------|------------|
| **Tipagem `any`** | page.tsx:21-26, 384 | 🟠 Média |
| **Lógica no componente** | Cálculos no useEffect | 🟡 Baixa |
| **SVG magic numbers** | `5.03` (circunferência) | 🟢 Mínima |

---

## 📋 Resumo da Análise

| Métrica | Valor |
|---------|-------|
| **Linhas de Código** | 401 |
| **Arquivos** | 1 |
| **KPIs** | 6 |
| **Gráficos** | 2 (Pizza + Barras) |
| **Coleções consultadas** | 4 |
| **Nível de Maturidade** | 🟢 Alto |

### Veredicto Final

O Dashboard é **bem implementado e visualmente rico**:
- ✅ Gráficos animados com framer-motion
- ✅ Filtro dinâmico por Natureza de Despesa
- ✅ Promise.all para performance

Melhorias sugeridas:
1. Extrair lógica de cálculos para hooks
2. Tipar corretamente os dados agregados
3. Adicionar mais filtros (período, UG, etc.)

---

## 🏁 ANÁLISE COMPLETA

Este foi o último módulo funcional. Agora criarei o **Relatório Final** consolidando toda a análise.
