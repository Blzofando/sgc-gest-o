# 12 - AUDITORIA DE INTERFACE E UX

## 📋 Sumário Executivo

Esta auditoria identifica **inconsistências visuais e funcionais** no SGC-Gestão, destacando padrões duplicados, estilos não unificados e oportunidades de melhoria.

---

## 🎨 1. CORES DE FUNDO INCONSISTENTES

### Problema
Uso misto de `bg-slate-900` e `bg-slate-950` sem padrão claro.

| Cor | Ocorrências | Contexto Atual |
|-----|-------------|----------------|
| `bg-slate-900` | 50+ | Cards, sidebars, tabelas |
| `bg-slate-950` | 67+ | Inputs, selects, modais |

### Exemplos de Inconsistência

```tsx
// ❌ INCONSISTENTE - Mesma página, cores diferentes
<FilterBar className="bg-slate-900 ..." />           // FilterBar
<Input className="bg-slate-950 border-slate-700" />  // Dentro do mesmo contexto
<Card className="bg-slate-900 border-slate-800" />   // Cards
```

### ✅ Recomendação
Criar tokens de design no `globals.css`:

```css
:root {
  --surface-1: 15 23 42;    /* slate-900 - Cards, containers */
  --surface-2: 2 6 23;      /* slate-950 - Inputs, deep layers */
  --surface-3: 30 41 59;    /* slate-800 - Hover states */
}

.bg-surface-1 { background-color: rgb(var(--surface-1)); }
.bg-surface-2 { background-color: rgb(var(--surface-2)); }
```

---

## 📝 2. HEADERS DE PÁGINA DUPLICADOS

### Problema
Existe um componente `PageHeader.tsx`, mas **não é usado** em todas as páginas.

```tsx
// ✅ Componente existe em:
// src/components/shared/PageHeader.tsx

// ❌ MAS páginas definem inline:
// processos/page.tsx:136
<h1 className="text-3xl font-bold text-white">Processos</h1>

// ncs/page.tsx:181
<h1 className="text-3xl font-bold text-white">Notas de Crédito</h1>

// empenhos/page.tsx:128
<h1 className="text-3xl font-bold text-white">Empenhos</h1>

// page.tsx:162  (Dashboard - tem tracking-tight extra!)
<h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Geral</h1>
```

### Inconsistência Extra
O Dashboard adiciona `tracking-tight` que as outras páginas não têm.

### ✅ Recomendação
Usar `PageHeader` em todas as páginas:

```tsx
// Em todas as pages:
<PageHeader 
  title="Processos" 
  description="Gerencie os processos licitatórios."
/>
```

---

## 🔘 3. CORES DE BOTÃO PRIMÁRIO

### Problema
Diferentes módulos usam cores diferentes para ação primária:

| Módulo | Cor Primária | Classe |
|--------|--------------|--------|
| **Processos** | 🔵 Azul | `bg-blue-600` |
| **Fornecedores** | 🔵 Azul | `bg-blue-600` |
| **Empenhos** | 🔵 Azul | `bg-blue-600` |
| **NCs** | 🟢 Verde | `bg-emerald-600` |
| **Entregas** | 🔵 Azul | `bg-blue-600` |

### Exemplos

```tsx
// ❌ NCs usa verde (desvio do padrão)
<Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
  Nova NC
</Button>

// ✅ Outros módulos usam azul
<Button className="bg-blue-600 hover:bg-blue-500 text-white">
  Novo Empenho
</Button>
```

### ✅ Recomendação
Padronizar **azul para criação**, **verde para sucesso/confirmação**:

```tsx
// Criar variantes de botão:
<Button variant="primary">Novo Registro</Button>    // bg-blue-600
<Button variant="success">Confirmar</Button>        // bg-emerald-600
```

---

## ⚠️ 4. FEEDBACKS NATIVOS DO BROWSER

### Problema
Uso de `confirm()` nativo para confirmações de deleção encontrado em vários locais.

### Arquivos Afetados
- `processos/page.tsx` - Exclusão de processo
- `ncs/page.tsx` - Exclusão de NC / Recolhimento
- `empenhos/page.tsx` - Exclusão de empenho
- `fornecedores/page.tsx` - Exclusão de fornecedor
- `EntregaWizard.tsx` - Exclusão de entrega

### ✅ Recomendação
Usar `AlertDialog` do Radix UI:

```tsx
// ❌ Atual (nativo)
if (!confirm("Tem certeza?")) return;

// ✅ Sugerido (componente)
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
    <AlertDialogDescription>
      Esta ação não pode ser desfeita.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 📐 5. ESPAÇAMENTOS INCONSISTENTES

### Problema
A maioria das páginas usa `space-y-6`, mas existem variações:

| Página | Classe | Padding Extra |
|--------|--------|---------------|
| Processos | `space-y-6` | - |
| NCs | `space-y-6` | - |
| Empenhos | `space-y-6` | - |
| **Entregas** | `space-y-6 pb-10` | ✅ Tem padding bottom |

### ✅ Recomendação
O `pb-10` de Entregas está correto para evitar que o conteúdo fique atrás do footer móvel. **Aplicar em todas as páginas**.

---

## 🏗️ 6. BORDER-RADIUS NÃO PADRONIZADO

### Problema
Diferentes valores de arredondamento:

| Elemento | Classe | Pixels |
|----------|--------|--------|
| Cards grandes | `rounded-xl` | 12px |
| Inputs | `rounded-md` | 6px |
| Badges | `rounded` | 4px |
| Alguns botões | `rounded-full` | 9999px |

### ✅ Recomendação
Definir tokens de radius:

```css
:root {
  --radius-sm: 4px;    /* badges, chips */
  --radius-md: 6px;    /* inputs, buttons */
  --radius-lg: 12px;   /* cards, modais */
  --radius-full: 9999px;  /* avatares, pills */
}
```

---

## 📊 7. TABELAS COM ESTILOS VARIADOS

### Problema
Cada página implementa tabelas de forma diferente:

| Página | Header | Body | Hover |
|--------|--------|------|-------|
| Processos | `bg-slate-950` | inline | `hover:bg-slate-900/50` |
| Fornecedores | `bg-slate-900/50` | `bg-slate-900` | N/A |
| NCs | `bg-slate-950/50` | inline | N/A |
| Empenhos | `bg-slate-950/50` | inline | N/A |

### ✅ Recomendação
Criar componente `DataTable` unificado ou estilizar o `Table` do shadcn/ui.

---

## 🔔 8. LOADING STATES INCONSISTENTES

### Problema
Cada página implementa loading diferente:

```tsx
// Dashboard - Spinner circular personalizado
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500">

// Outras páginas - Lucide Loader2
<Loader2 className="animate-spin inline text-blue-500" />

// Algumas páginas - Com texto
<Loader2 className="animate-spin" /> Carregando...
```

### ✅ Recomendação
Criar componente `LoadingState`:

```tsx
<LoadingState text="Carregando processos..." />
```

---

## 💰 9. FORMATAÇÃO DE VALORES

### ✅ Padrão Consistente!
`formatMoney()` é usado corretamente em **50+ locais**.

Cores de valores seguem padrão semântico:
- `text-emerald-400` → Valores positivos/disponíveis
- `text-blue-400` → Valores empenhados
- `text-purple-400` → Valores de NC
- `text-slate-400` → Valores recolhidos/neutros

---

## 📱 10. RESPONSIVIDADE

### Problema
Algumas áreas não têm breakpoints otimizados:

| Área | Issue |
|------|-------|
| Tabela de Processos | Scroll horizontal forçado em mobile |
| Cards de Entregas | Grid 4 colunas fixo |
| FilterBar | Empilhamento não otimizado |

### ✅ Recomendação
Revisar grids com padrão progressivo:

```tsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

---

## 📋 RESUMO DAS PRIORIDADES

| Prioridade | Issue | Impacto | Esforço |
|------------|-------|---------|---------|
| 🔴 Alta | Cores de fundo inconsistentes | Visual | 🟢 Baixo |
| 🔴 Alta | Headers duplicados | Manutenção | 🟢 Baixo |
| 🟠 Média | confirm() nativo | UX | 🟡 Médio |
| 🟠 Média | Botões primários variados | Consistência | 🟢 Baixo |
| 🟡 Baixa | Tabelas variadas | Manutenção | 🟡 Médio |
| 🟡 Baixa | Loading states | UX | 🟢 Baixo |

---

## ✅ PRÓXIMOS PASSOS

1. [ ] Criar arquivo `design-tokens.css` com variáveis
2. [ ] Padronizar uso de `PageHeader` em todas as páginas
3. [ ] Criar componente `ConfirmDialog` para confirmações
4. [ ] Unificar cor primária de botões (azul = criar, verde = confirmar)
5. [ ] Criar componente `LoadingState` reutilizável
6. [ ] Adicionar `pb-10` em todas as páginas do dashboard
