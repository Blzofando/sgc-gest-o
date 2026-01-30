# 🚀 PROMPT DE RECONSTRUÇÃO - SGC GESTÃO v2.0

## 📋 CONTEXTO

Você é um agente especializado em desenvolvimento web moderno. Sua missão é **reconstruir e melhorar** o sistema SGC-Gestão com base na análise completa realizada e documentada na pasta `docs/` deste projeto.

**ANTES DE QUALQUER AÇÃO**, leia TODOS os seguintes documentos na ordem:

1. `docs/00-VISAO-GERAL.md` - Arquitetura macro e fluxo de dados
2. `docs/02-TIPOS-E-DOMINIO.md` - Entidades e enums existentes
3. `docs/99-RELATORIO-FINAL.md` - Síntese de problemas e recomendações
4. `docs/12-AUDITORIA-UI-UX.md` - Inconsistências visuais identificadas
5. Demais documentos conforme necessidade: `03-AUTENTICACAO.md` a `11-DASHBOARD.md`

---

## 🎯 OBJETIVO PRINCIPAL

Recriar o SGC-Gestão como um sistema **eficiente, consistente e escalável**, mantendo todas as funcionalidades existentes mas corrigindo os problemas identificados.

---

## 📐 REGRAS OBRIGATÓRIAS (NÃO NEGOCIÁVEIS)

### 1. TIPAGEM FORTE
```typescript
// ❌ PROIBIDO
const [dados, setDados] = useState<any[]>([]);

// ✅ OBRIGATÓRIO
interface Processo { id: string; numero: string; ... }
const [dados, setDados] = useState<Processo[]>([]);
```

### 2. DESIGN TOKENS CENTRALIZADOS
Criar arquivo `src/styles/tokens.css` com:
```css
:root {
  /* Superfícies */
  --surface-1: theme('colors.slate.900');  /* Cards, containers */
  --surface-2: theme('colors.slate.950');  /* Inputs, modais */
  
  /* Cores de Ação */
  --action-primary: theme('colors.blue.600');
  --action-success: theme('colors.emerald.600');
  --action-danger: theme('colors.red.600');
  
  /* Spacing */
  --page-padding: theme('spacing.6');
  --card-padding: theme('spacing.4');
}
```

### 3. STATUS UNIFICADOS
Criar enum único para todos os status no sistema:
```typescript
// src/types/status.ts
export const STATUS = {
  // Processos
  AGUARDANDO_FORNECEDOR: 'AGUARDANDO_FORNECEDOR',
  AGUARDANDO_EMPENHO: 'AGUARDANDO_EMPENHO',
  AGUARDANDO_ENTREGA: 'AGUARDANDO_ENTREGA',
  
  // Entregas
  EM_PRODUCAO: 'EM_PRODUCAO',
  ENVIADO: 'ENVIADO',
  ENTREGUE: 'ENTREGUE',
  
  // Financeiro
  EMPENHADO: 'EMPENHADO',
  LIQUIDADO: 'LIQUIDADO',
  
  // Genéricos
  ATIVO: 'ATIVO',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO',
  SUSPENSO: 'SUSPENSO',
} as const;

export type StatusType = typeof STATUS[keyof typeof STATUS];

export const STATUS_CONFIG: Record<StatusType, { label: string; color: string; icon: string }> = {
  AGUARDANDO_FORNECEDOR: { label: 'Aguardando Fornecedor', color: 'yellow', icon: 'Clock' },
  // ... todos os outros
};
```

### 4. COMPONENTES COMPARTILHADOS OBRIGATÓRIOS
Criar/usar estes componentes em `src/components/shared/`:

| Componente | Uso | Nunca fazer inline |
|------------|-----|---------------------|
| `PageHeader` | Título de toda página | `<h1>` solto |
| `StatusBadge` | Badge de status | Classes de cor inline |
| `ConfirmDialog` | Confirmações | `confirm()` nativo |
| `LoadingState` | Estados de loading | Spinners inline |
| `MoneyDisplay` | Exibição de valores | `{formatMoney(...)}` |
| `EmptyState` | Listas vazias | `<p>Nenhum resultado</p>` |

### 5. ESTRUTURA DE PASTAS
```
src/
├── app/
│   └── (dashboard)/
│       ├── processos/
│       ├── ncs/
│       ├── empenhos/
│       ├── entregas/
│       ├── fornecedores/
│       └── page.tsx (dashboard)
├── components/
│   ├── ui/           # shadcn/ui (não mexer)
│   └── shared/       # Componentes reutilizáveis
├── features/
│   └── [modulo]/
│       ├── components/  # Componentes específicos
│       ├── hooks/       # Hooks do módulo
│       └── services/    # Lógica de negócio
├── lib/
│   ├── firebase.ts
│   ├── formatters.ts
│   └── utils.ts
├── types/
│   ├── index.ts      # Todas as interfaces
│   └── status.ts     # Enum de status
└── styles/
    └── tokens.css    # Design tokens
```

---

## ✂️ O QUE REMOVER / SIMPLIFICAR

1. **Código duplicado de cálculos** - Extrair para hooks:
   - `useSaldoNC()` - Cálculo de saldo de NC
   - `useStatusDinamico()` - Determinação de status
   - `useAutopreenchimento()` - Preenchimento automático de forms

2. **Lógica inline em componentes** - Mover para services:
   - Cálculos de totais → `calculationService.ts`
   - Queries Firestore complexas → `[modulo]Service.ts`

3. **Estilos repetidos** - Unificar:
   - `bg-slate-900 border-slate-800` → `.card-surface`
   - `bg-blue-600 hover:bg-blue-500` → variante do Button

---

## 🎨 PADRÕES VISUAIS A SEGUIR

### Cores por Contexto
| Contexto | Cor | Uso |
|----------|-----|-----|
| Ação primária | `blue-600` | Botões de criar, avançar |
| Sucesso | `emerald-600` | Confirmar, liquidar |
| Alerta | `yellow-600` | Avisos, pendências |
| Perigo | `red-600` | Excluir, cancelar |
| Neutro | `slate-400` | Textos secundários |

### Valores Monetários
| Tipo | Cor |
|------|-----|
| Valor total/disponível | `emerald-400` |
| Valor empenhado | `blue-400` |
| Valor recebido (NC) | `purple-400` |
| Valor liquidado | `cyan-400` |
| Valor recolhido | `slate-400` |

---

## 📝 PLANO DE IMPLEMENTAÇÃO SUGERIDO

### Fase 1: Fundação (Prioridade Alta)
- [ ] Criar `types/index.ts` com todas as interfaces
- [ ] Criar `types/status.ts` com enum unificado
- [ ] Criar `styles/tokens.css`
- [ ] Criar componentes shared: `PageHeader`, `StatusBadge`, `ConfirmDialog`

### Fase 2: Refatoração de Módulos
- [ ] Processos: Extrair lógica, usar types, componentes shared
- [ ] NCs: Padronizar cor de botão (blue), usar StatusBadge
- [ ] Empenhos: Extrair `useSaldoNC()`, `useAutopreenchimento()`
- [ ] Entregas: Quebrar `EntregaWizard.tsx` em componentes menores
- [ ] Fornecedores: Extrair busca inteligente para hook

### Fase 3: Polish
- [ ] Dashboard: Revisar, manter
- [ ] Responsividade: Testar todos os breakpoints
- [ ] Animações: Padronizar transições
- [ ] Testes: Adicionar E2E para fluxos críticos

---

## ⚠️ RESTRIÇÕES E GUARDRAILS

### NÃO FAZER
- ❌ Mudar a stack tecnológica (Next.js + Firebase)
- ❌ Reorganizar estrutura de dados no Firestore
- ❌ Remover funcionalidades existentes
- ❌ Criar novos módulos além dos existentes
- ❌ Adicionar bibliotecas sem justificativa clara
- ❌ Usar `any` em TypeScript

### SEMPRE FAZER
- ✅ Consultar os docs antes de alterar um módulo
- ✅ Manter compatibilidade com dados existentes
- ✅ Usar componentes shadcn/ui já configurados
- ✅ Seguir o padrão de cores documentado
- ✅ Tipar todos os estados e props
- ✅ Testar fluxos após refatoração

---

## 📊 CRITÉRIOS DE SUCESSO

O projeto estará completo quando:

1. [ ] **Zero `any`** no código TypeScript
2. [ ] **Todos os headers** usando `PageHeader`
3. [ ] **Todos os confirm** usando `ConfirmDialog`
4. [ ] **Cores de botão** padronizadas por ação
5. [ ] **Status** usando `STATUS_CONFIG` único
6. [ ] **Valores** usando `MoneyDisplay`
7. [ ] **Componentes grandes** divididos (max ~200 linhas)
8. [ ] **Hooks extraídos** para lógica repetida
9. [ ] **Design tokens** aplicados globalmente
10. [ ] **Build sem erros** e todas as páginas funcionando

---

## 🚦 COMO COMEÇAR

1. **Leia todos os documentos** na pasta `docs/`
2. **Crie o plano de implementação** detalhado em `docs/PLANO-RECONSTRUCAO.md`
3. **Aguarde aprovação** antes de iniciar código
4. **Implemente por fases**, validando cada uma antes de prosseguir

---

## 💡 LIBERDADES CRIATIVAS PERMITIDAS

Você TEM autonomia para:
- Renomear variáveis/funções para maior clareza
- Reorganizar imports
- Adicionar comentários explicativos
- Melhorar nomes de componentes
- Otimizar queries Firestore
- Adicionar validações que faltam
- Melhorar UX de formulários
- Adicionar feedback visual (loading, success, error)

---

**LEMBRE-SE**: O objetivo é MELHORAR, não RECRIAR do zero. Mantenha o que funciona, corrija o que está errado, padronize o que está inconsistente.
