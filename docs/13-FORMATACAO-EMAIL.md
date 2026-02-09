# Formatação de Email

## Variáveis

| Variável | Descrição |
|----------|-----------|
| `*nome*` | Nome de guerra |
| `*nome_completo*` | Nome completo |
| `*posto*` | Posto/Graduação |
| `*telefone*` | Tel formatado (XX) XXXXX-XXXX |
| `*fornecedor*` | Nome da empresa |
| `*cnpj*` | CNPJ |
| `*empenho*` | Nº do empenho |
| `*nc*` | Nº da NC |
| `*processo*` | Nº do processo |
| `*valor*` | Valor empenhado |
| `*prazo*` | Data do prazo |
| `*dias_restantes*` | Dias restantes/atraso |
| `*data_hoje*` | Data atual |
| `*saudacao*` | Bom dia/Boa tarde/Boa noite |
| `*itens*` | Lista de itens (• item) |

## Modificadores

| Mod | Resultado | Gmail |
|-----|-----------|:-----:|
| `:upper` | MAIÚSCULO | ✔️ |
| `:lower` | minúsculo | ✔️ |
| `:title` | Iniciais Maiúsculas | ✔️ |
| `:bold` | 𝗡𝗲𝗴𝗿𝗶𝘁𝗼 | ✔️ |
| `:italic` | 𝘐𝘵𝘢𝘭𝘪𝘤𝘰 | ✔️ |
| `:underline` | S̲u̲b̲l̲i̲n̲h̲a̲d̲o̲ | ✔️ |

## Sintaxe

```
# Variáveis
*variavel*
*variavel:modificador*
*nome:upper:bold*

# Texto livre
[qualquer texto:bold]
[importante:underline]
```

## Exemplo

```
*saudacao*,

Referente ao empenho *empenho:bold*, solicito:

*itens*

[Aguardo retorno:bold:underline]

*posto* *nome:title*
Tel: *telefone*
```
