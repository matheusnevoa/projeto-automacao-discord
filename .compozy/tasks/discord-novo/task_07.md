---
status: completed
title: n8n — implementar Code - Format PR
type: backend
complexity: low
dependencies:
    - task_05
---

# Task 7: n8n — implementar Code - Format PR

## Overview

Implementa o formatter do evento `pull_request`: cada evento PR (opened, synchronized, review_requested, reviewed, closed, merged) vira uma única mensagem com embed laranja contendo título, autor, branch origem → destino, status atual e link. Não emite múltiplas mensagens para sub-eventos repetitivos.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST adicionar node `Code - Format PR` conectado à saída `pull_request` do Switch.
- MUST mapear `body.action` para um status legível: `opened`, `synchronized` → "Atualizado", `closed` + `pull_request.merged === true` → "Merged", `closed` + `merged === false` → "Fechado", `review_requested` → "Review solicitado", `submitted` (de review) → "Review submetido".
- MUST montar embed cor laranja (`0xe67e22`) com título = `repo · #N · title`, fields autor + branch (`head.ref → base.ref`) + status.
- MUST setar `targetChannelUrl = $vars.DISCORD_WH_TESTE` na Phase 1.
- MUST NOT injetar `<@&dev-alerts>` mention.
- SHOULD ignorar actions que não geram valor (ex.: `labeled`, `unlabeled`, `assigned` sem context relevante) retornando `[]`.
</requirements>

## Subtasks
- [x] 7.1 Adicionar node `Code - Format PR` em JavaScript após branch `pull_request` do Switch.
- [x] 7.2 Mapear `body.action` (e `merged`) para status legível.
- [x] 7.3 Montar embed laranja com title/fields/url.
- [x] 7.4 Setar `targetChannelUrl = $vars.DISCORD_WH_TESTE`.
- [x] 7.5 Filtrar actions irrelevantes (labeled/unlabeled/assigned) retornando array vazio.

## Implementation Details

Mesma estrutura do `Code - Format Push` mas sem fanout (1 evento → 1 item). Cor e shape do embed definidos no TechSpec section "Data Models → DiscordEmbed".

Referência: TechSpec section "Implementation Design → Core Interfaces" e "Build Order" passo 11.

### Relevant Files
- `.compozy/tasks/discord-novo/_techspec.md` — Core Interfaces; Build Order step 11.
- `.compozy/tasks/discord-novo/adrs/adr-006.md`.

### Dependent Files
- `task_10.md` — HTTP Request consumirá os itens deste formatter.
- `task_12.md` — substituirá `$vars.DISCORD_WH_TESTE` por `$vars.DISCORD_WH_PRS`.

### Related ADRs
- [ADR-006: One Code Node per Event Type](adrs/adr-006.md).

## Deliverables
- Node `Code - Format PR` no workflow, conectado à branch `pull_request`.
- Saída emite 1 item por evento relevante, 0 itens para actions filtradas.
- Unit tests com 80%+ coverage **(REQUIRED)**.
- Integration tests **(REQUIRED)**.

## Tests
- Unit tests (pin-data):
  - [x] `action=opened` → emite 1 item com status "Aberto", color `0xe67e22`.
  - [x] `action=closed, merged=true` → status "Merged".
  - [x] `action=closed, merged=false` → status "Fechado".
  - [x] `action=labeled` → emite 0 itens (filtrado).
  - [x] Embed contém `head.ref → base.ref` no field branch.
  - [x] Nenhum item tem `discordPayload.content` (sem mention).
- Integration tests:
  - [ ] Execute Manually do workflow com payload `pull_request opened` → 1 output, format valido para Discord.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Cada PR action relevante produz 1 mensagem com status correto.
- Actions ruidosas (label, assign) são silenciadas.
