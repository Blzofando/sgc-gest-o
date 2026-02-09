# Formatação nas Variáveis de Email

## Visão Geral

Adicionado suporte a modificadores de formatação nas variáveis de email, permitindo personalizar como o texto é exibido nas mensagens.

## Como Usar

### Sintaxe

```
*variavel:modificador*
*variavel:modificador1:modificador2*
```

### Modificadores Disponíveis

| Modificador | Descrição | Exemplo |
|-------------|-----------|---------|
| `:upper` | CAIXA ALTA | `*nome:upper*` → `SILVA` |
| `:lower` | minúsculas | `*nome:lower*` → `silva` |
| `:title` | Iniciais Maiúsculas | `*nome_completo:title*` → `João Da Silva` |
| `:capitalize` | Primeira maiúscula | `*nome:capitalize*` → `Silva` |
| `:bold` | Negrito (Markdown) | `*nome:bold*` → `**SILVA**` |
| `:underline` | Sublinhado (Unicode) | `*nome:underline*` → `S̲I̲L̲V̲A̲` |

### Combinando Modificadores

Os modificadores podem ser combinados em sequência:

```
*nome_completo:title:bold* → **João Da Silva**
*fornecedor:upper:bold* → **EMPRESA ABC**
```

A ordem dos modificadores importa: são aplicados da esquerda para a direita.

## Variáveis Disponíveis

| Variável | Descrição |
|----------|-----------|
| `*nome*` | Nome de guerra do usuário |
| `*nome_completo*` | Nome completo do usuário |
| `*posto*` | Posto/Graduação do usuário |
| `*telefone*` | Telefone do usuário |
| `*fornecedor*` | Nome da empresa fornecedora |
| `*cnpj*` | CNPJ do fornecedor |
| `*email_fornecedor*` | Email do fornecedor |
| `*empenho*` | Número do empenho |
| `*nc*` | Número da Nota de Crédito |
| `*processo*` | Número do processo |
| `*modalidade*` | Modalidade do processo |
| `*valor*` | Valor empenhado formatado |
| `*prazo*` | Data do prazo de entrega |
| `*dias_restantes*` | Dias restantes/atraso até o prazo |
| `*data_hoje*` | Data atual |

## Exemplos de Uso

### Template de Solicitação de Status

```
Assunto: Solicitação de Status - Empenho *empenho*

Prezados(as) da *fornecedor:title*,

Solicito informações sobre o status do empenho *empenho:bold* no valor de *valor*.

Atenciosamente,
*posto* *nome:title:bold*
Tel: *telefone*
```

### Template Formal

```
À empresa *fornecedor:upper*,

REFERÊNCIA: Processo nº *processo* / NC *nc*

Em atenção ao empenho *empenho:bold*, solicitamos posicionamento quanto à entrega prevista para *prazo*.

*posto:upper* *nome_completo:upper*
```

## Arquivos Modificados

- `src/features/email/components/ContactEmailModal.tsx` - Lógica de formatação
- `src/app/(dashboard)/configuracoes/page.tsx` - Interface de configuração atualizada
- `src/app/(dashboard)/fornecedores/page.tsx` - Botão "Entrar em Contato" adicionado

## Acesso

1. **Configurações** → **Predefinições de Email** → Botão "Variáveis" para ver todas as opções
2. **Fornecedores** → Clique no fornecedor → Botão "Entrar em Contato" ao lado do email
