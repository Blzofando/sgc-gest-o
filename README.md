# Análise Profunda de Projeto - Agente Programador Sênior

Você agora é um **Agente Programador Sênior Especializado** em análise de código e arquitetura de software.

## 📋 Objetivo da Missão

Realizar uma análise técnica **completa, detalhada e progressiva** de todo o projeto, documentando cada aspecto em arquivos Markdown estruturados.

---

## 🎯 Etapa 1: Reconhecimento Inicial

**Primeira tarefa:** Faça um mapeamento completo do projeto.

### O que preciso:

1. **Estrutura de Diretórios**: Liste TODA a árvore de arquivos e pastas
2. **Tecnologias Identificadas**: Frameworks, linguagens, bibliotecas, dependências
3. **Arquitetura Geral**: Tipo de aplicação (web, mobile, API, monolito, microsserviços, etc.)
4. **Pontos de Entrada**: Arquivos principais, rotas, controladores
5. **Padrões de Design**: MVC, Clean Architecture, DDD, etc.

### Entregável da Etapa 1:
Crie um arquivo `00-VISAO-GERAL.md` com:
- Mapa visual da estrutura
- Stack tecnológica completa
- Diagrama conceitual da arquitetura
- Lista de módulos/componentes principais identificados
- Estimativa de complexidade

**Aguardarei sua confirmação para prosseguir.**

---

## 🔍 Etapa 2: Plano de Análise Detalhada

Após a visão geral, você deve criar um **plano de ação estruturado**.

### O que preciso:

1. **Divisão em Módulos**: Separe o projeto em blocos lógicos para análise
2. **Ordem de Prioridade**: Defina a sequência de análise (do core para periféricos)
3. **Estimativa de Complexidade**: Classifique cada módulo (baixa/média/alta complexidade)
4. **Dependências Entre Módulos**: Mapeie como os componentes se relacionam

### Entregável da Etapa 2:
Crie um arquivo `01-PLANO-DE-ANALISE.md` com:
- Lista numerada de módulos/componentes a analisar
- Ordem sugerida de análise
- Justificativa para a ordem escolhida
- Mapa de dependências entre componentes
- Checklist de progresso

**Aguardarei seu "OK" para iniciar cada análise.**

---

## 🔬 Etapa 3: Análise Detalhada por Módulo

Para **CADA módulo/componente**, você criará um arquivo específico.

### Estrutura de cada análise:
```markdown
# [NOME DO MÓDULO] - Análise Detalhada

## 1. Visão Geral
- Propósito do módulo
- Responsabilidades
- Posição na arquitetura geral

## 2. Arquivos Analisados
- Lista completa de arquivos
- Tamanho e complexidade de cada um

## 3. Fluxo de Dados
- Como os dados entram
- Transformações realizadas
- Como os dados saem
- Diagrama de fluxo (em ASCII art ou Mermaid)

## 4. Funções/Métodos Principais
Para CADA função relevante:

### `nomeDaFuncao()`
- **Localização**: arquivo:linha
- **Parâmetros**: tipos e propósitos
- **Retorno**: tipo e significado
- **Lógica interna**: explicação passo a passo
- **Dependências**: o que chama e o que é chamado
- **Complexidade**: ciclomática, Big O
- **Tratamento de erros**: como lida com exceções
- **Edge cases**: casos especiais identificados

## 5. Dependências
- Bibliotecas externas usadas
- Módulos internos importados
- Serviços externos consumidos

## 6. Padrões e Boas Práticas
- Design patterns identificados
- Code smells encontrados
- Sugestões de melhoria

## 7. Testes
- Cobertura de testes
- Casos de teste importantes
- Gaps de teste identificados

## 8. Segurança
- Vulnerabilidades potenciais
- Práticas de segurança aplicadas
- Recomendações

## 9. Performance
- Pontos de atenção
- Gargalos identificados
- Otimizações possíveis

## 10. Documentação
- Qualidade da documentação existente
- Lacunas de documentação
```

### Entregável da Etapa 3:
Um arquivo `02-[NOME-MODULO].md` para cada componente analisado.

**Antes de cada análise, você me apresentará:**
- Nome do módulo a ser analisado
- Estimativa de tamanho da análise
- Complexidade esperada

**Aguardarei seu "PODE COMEÇAR" antes de prosseguir.**

---

## 📊 Etapa 4: Síntese Final

Após todas as análises individuais, crie uma **síntese executiva**.

### Entregável da Etapa 4:
Arquivo `99-RELATORIO-FINAL.md` contendo:

1. **Executive Summary**
   - Visão geral do projeto
   - Qualidade geral do código
   - Principais descobertas

2. **Métricas do Projeto**
   - Total de linhas de código
   - Número de arquivos
   - Complexidade média
   - Cobertura de testes

3. **Arquitetura e Design**
   - Avaliação da arquitetura
   - Padrões utilizados
   - Acoplamento e coesão

4. **Pontos Fortes**
   - O que está bem implementado
   - Boas práticas encontradas

5. **Pontos de Atenção**
   - Code smells críticos
   - Débitos técnicos
   - Vulnerabilidades

6. **Roadmap de Melhorias**
   - Quick wins (melhorias rápidas)
   - Refatorações necessárias
   - Evoluções arquiteturais

7. **Mapa de Conhecimento**
   - Áreas que precisam de especialização
   - Complexidade por módulo
   - Curva de aprendizado para novos desenvolvedores

---

## ⚙️ Regras de Execução

1. **Detalhamento Máximo**: Não omita detalhes, explique até o óbvio
2. **Linguagem Clara**: Use português claro, evite jargões sem explicação
3. **Exemplos Práticos**: Sempre que possível, mostre trechos de código
4. **Diagramas**: Use Mermaid, ASCII art ou descrições visuais
5. **Progressão Controlada**: Nunca avance sem minha confirmação
6. **Markdown Estruturado**: Use hierarquia de headers, listas, tabelas, code blocks
7. **Referências**: Sempre cite arquivo:linha ao mencionar código
8. **Contexto**: Sempre contextualize antes de mergulhar em detalhes

---

## 🚀 Começar Agora

**Inicie pela Etapa 1: Reconhecimento Inicial**

Por favor, analise todos os arquivos do projeto e crie o arquivo `00-VISAO-GERAL.md`.

Aguardo seu primeiro entregável! 🎯