---
status: completed
title: n8n — implementar Code - Format Push (fanout 1 commit = 1 mensagem)
type: backend
complexity: medium
dependencies:
    - task_05
---

# Task 6: n8n — implementar Code - Format Push (fanout 1 commit = 1 mensagem)

## Overview

Implementa o formatter do evento `push`: para cada commit dentro de `body.commits[]`, gera um item separado contendo `targetChannelUrl` e `discordPayload` (embed verde com repo/branch/autor/SHA/link). A regra de granularidade "1 commit = 1 mensagem" do PRD é implementada aqui via array fanout.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST adicionar node `Code - Format Push` conectado à saída `push` do Switch criado na task_05.
- MUST iterar `body.commits[]` e retornar 1 item por commit (não 1 item por push).
- MUST montar cada `discordPayload` com `username: "Future Station GitHub"`, embed verde (color `0x2ecc71`), título `repo · branch`, descrição com mensagem de commit (apenas primeira linha), fields para `Autor` e `Commit` (short SHA em backticks), author com avatar do sender, timestamp ISO, footer com SHA curto.
- MUST setar `targetChannelUrl` para `$vars.DISCORD_WH_TESTE` na Phase 1 (a task_12 trocará para `$vars.DISCORD_WH_COMMITS`).
- MUST NOT injetar `<@&dev-alerts>` mention (push não é evento crítico).
- MUST ignorar pushes vazios (`commits.length === 0`, ex.: branch creation) retornando array vazio.
- SHOULD truncar mensagens de commit > 2000 chars (limite do `content` Discord).
</requirements>

## Subtasks
- [x] 6.1 Adicionar node `Code - Format Push` em modo JavaScript após branch `push` do Switch.
- [x] 6.2 Implementar fanout sobre `body.commits[]`.
- [x] 6.3 Montar embed verde com campos repo, branch, autor, SHA, link, timestamp.
- [x] 6.4 Setar `targetChannelUrl = $vars.DISCORD_WH_TESTE` (Phase 1 routing).
- [x] 6.5 Tratar caso de array vazio (branch creation, tag push sem commits) retornando `[]`.

## Implementation Details

Estrutura do item de saída segue o tipo `FormattedItem` no TechSpec "Core Interfaces". Cor do embed segue mapping em TechSpec section "Data Models → DiscordEmbed". O Code retorna um array; n8n processa cada elemento como item separado downstream.

Referência: TechSpec section "Implementation Design → Core Interfaces" (FormattedItem) e "Build Order" passo 8.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Core Interfaces; Build Order step 8.
- `.compozy/tasks/discord-novo/adrs/adr-006.md` — justifica Code-per-event.

### Dependent Files
- `task_10.md` — HTTP Request consumirá os itens emitidos por este formatter.
- `task_12.md` — substituirá `$vars.DISCORD_WH_TESTE` por `$vars.DISCORD_WH_COMMITS`.

### Related ADRs
- [ADR-006: One Code Node per Event Type](adrs/adr-006.md) — modelo de formatter por evento.
- [ADR-003: Organize by Event Type](adrs/adr-003.md) — push vai para um canal específico (commits).

## Deliverables
- Node `Code - Format Push` no workflow `WF-GH-Discord`, conectado à branch `push` do Switch.
- Saída do node emite N itens onde N = `commits.length` do payload de entrada.
- Cada item carrega `targetChannelUrl` (apontando para `$vars.DISCORD_WH_TESTE`) e `discordPayload` completo.
- Unit tests com 80%+ coverage **(REQUIRED)**.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests (pin-data):
  - [ ] Push com 3 commits → emite 3 itens, cada um com `discordPayload.embeds[0].title` distinto, todos com `color === 0x2ecc71`.
  - [ ] Push com 1 commit → emite 1 item, embed contém repo full_name, branch, autor.commit name, short SHA (7 chars), link válido.
  - [ ] Push com 0 commits (branch creation) → emite 0 itens.
  - [ ] Commit message > 2000 chars → embed description truncada com sufixo `…`.
  - [ ] Cada item tem `targetChannelUrl === $vars.DISCORD_WH_TESTE` durante Phase 1.
- Integration tests:
  - [ ] Workflow Execute Manually com payload `push` real-shape (3 commits) → 3 outputs do node, formato JSON válido para Discord webhook execute.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Cada commit num push gera 1 item de saída com embed verde correto.
- Nenhum item carrega mention de role (verificar `discordPayload.content` ausente ou vazio).
- Push vazio não emite mensagens fantasma.
