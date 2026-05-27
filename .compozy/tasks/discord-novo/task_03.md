---
status: completed
title: Discord — criar 8 webhooks de canal e capturar URLs
type: infra
complexity: low
dependencies:
    - task_02
---

# Task 3: Discord — criar 8 webhooks de canal e capturar URLs

## Overview

Gera um webhook do tipo "Channel Webhook" para cada um dos 8 canais novos. Cada webhook produz uma URL no formato `https://discord.com/api/webhooks/{id}/{token}` que será o destino direto dos HTTP Request nodes do n8n. As URLs são tratadas como segredos e copiadas imediatamente para as Variables do n8n na task_04 — não devem ser persistidas em arquivos do repositório nem em transcripts.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar 1 webhook por canal listado, exatamente 8 webhooks no total, usando `mcp__discord__discord_create_webhook`.
- MUST nomear cada webhook de forma identificável (sugestão: `n8n-WF-GH-Discord` ou similar) — não usar o nome default.
- MUST capturar a URL completa de cada webhook (id + token) imediatamente após a criação.
- MUST NOT salvar nenhuma URL de webhook em arquivos do repositório, commits, screenshots compartilhados ou logs.
- MUST passar as URLs para a task_04 via canal seguro (Variables do n8n) e não via transcript/arquivo.
- SHOULD anotar o webhook ID separadamente para permitir rotação ou deleção futura via MCP.
</requirements>

## Subtasks
- [ ] 3.1 Criar webhook em `#github-teste` e capturar URL.
- [ ] 3.2 Criar webhooks em `#github-commits`, `#github-pull-requests`, `#github-releases`, `#github-actions` e capturar URLs.
- [ ] 3.3 Criar webhooks em `#n8n-logs`, `#deploys`, `#erros-producao` e capturar URLs.
- [ ] 3.4 Transferir as 8 URLs diretamente para n8n Variables (executar como parte da task_04) sem persistência intermediária.

## Implementation Details

Cada webhook é criado com `mcp__discord__discord_create_webhook` informando `channelId` e um `name` consistente. A URL retornada não é recuperável após a sessão de criação — é necessário capturar imediatamente. Em caso de perda, deletar o webhook e recriar.

Referência: TechSpec sections "Integration Points → Discord Webhooks API" e "Development Sequencing → Build Order" passo 6.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Build Order step 6.
- `.compozy/tasks/discord-novo/_prd.md` — High-Level Technical Constraints (webhook URLs como segredos).
- `.compozy/tasks/discord-novo/task_02.md` — fornece os channelIds.

### Dependent Files
- `task_04.md` — armazenará as URLs em `$vars.DISCORD_WH_*`.

### Related ADRs
- [ADR-004: HTTP Request to Discord Channel Webhook](adrs/adr-004.md) — Razão de existir um webhook por canal de destino.

## Deliverables
- 8 webhooks criados, um por canal-alvo, com URLs capturadas em local seguro.
- Mapeamento (em memória ou em ferramenta de senhas) entre nome lógico (`DISCORD_WH_COMMITS`, etc.) e URL.
- Webhook IDs (snowflake) registrados separadamente para gerenciamento futuro.
- Unit tests com 80%+ coverage **(REQUIRED)** — verificações pós-criação.
- Integration tests de entrega **(REQUIRED)**.

## Tests
- Unit tests:
  - [ ] Cada `discord_create_webhook` retorna um objeto com `id`, `token` e `url` não-nulos.
  - [ ] As 8 URLs casam com o regex `https://discord.com/api/webhooks/\d+/[\w-]+`.
  - [ ] Cada webhook está associado ao `channelId` correto (consultar via MCP get).
- Integration tests:
  - [ ] POST manual a cada uma das 8 URLs com payload `{ "content": "ping" }` resulta em status 204 e uma mensagem aparecendo no canal correspondente.
  - [ ] Apagar a mensagem de teste após validação (limpeza).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- 8 URLs de webhook capturadas e transferidas para n8n Variables sem trânsito por arquivos persistentes.
- Cada URL valida com POST manual (mensagem-teste aparece no canal correto e é deletada).
- Nenhuma URL aparece em arquivos do repositório ou logs de comando.
